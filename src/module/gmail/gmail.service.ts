/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, Logger } from "@nestjs/common";
import { google } from "googleapis";
// import * as fs from 'fs';
// import * as path from 'path';
import { oauth2Client } from "./oauth2-client";
import { LoggerService } from "src/common/logger/logger.service";
import { InjectModel } from "@nestjs/mongoose";
import { User, UserDocument } from "src/common/schema/user.schema";
import { Model } from "mongoose";
// import { AuthExceptions } from 'src/common/helpers/exceptions';
import { LogService } from "../log/log.service";
import { FileUploadLogDto } from "../log/dto/logs.dto";
import {
  GmailHistory,
  GmailHistoryDocument,
} from "src/common/schema/gmail-history.schema";
import {
  GmailState,
  GmailStateDocument,
} from "src/common/schema/gmail-state.schema";
import {
  ProcessedMessage,
  ProcessedMessageDocument,
} from "src/common/schema/processed-message.schema";

@Injectable()
export class GmailService {
  private readonly logger = new Logger(GmailService.name);

  constructor(
    private readonly loggerService: LoggerService,
    private readonly logService: LogService,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(GmailHistory.name)
    private readonly gmailModel: Model<GmailHistoryDocument>,
    @InjectModel(GmailState.name)
    private readonly gmailStateModel: Model<GmailStateDocument>,
    @InjectModel(ProcessedMessage.name)
    private readonly processedMessageModel: Model<ProcessedMessageDocument>,
  ) {
    // Ensure folders exist
    // for (const dir of [
    //   path.join(process.cwd(), 'downloads'),
    //   path.join(process.cwd(), 'logs'),
    // ]) {
    //   if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    // }
  }

  async watchInbox() {
    const gmail = google.gmail({ version: "v1", auth: oauth2Client });
    const topicName = `projects/${process.env.CLIENT_GCP_PROJECT_ID}/topics/${process.env.CLIENT_PUBSUB_TOPIC}`;
    console.log("✌️topicName --->", topicName);
    const res = await gmail.users.watch({
      userId: "me",
      requestBody: {
        labelIds: ["INBOX"],
        topicName,
      },
    });
    this.logger.log(`Watch registered: ${JSON.stringify(res.data)}`);
  }

  // Old working code. Dont touch
  async checkUnreadEmails() {
    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    const res = await gmail.users.messages.list({
      userId: "me",
      q: "is:unread",
    });
    const messages = res.data.messages || [];
    if (!messages.length) {
      this.logger.log("No unread messages");
      return;
    }

    for (const m of messages) {
      const full = await gmail.users.messages.get({ userId: "me", id: m.id! });

      const fromHeader = full.data.payload?.headers?.find(
        (h) => h.name === "From",
      );
      const raw = fromHeader?.value ?? "";
      const match = raw.match(/<([^>]+)>/);
      const fromEmail = (match ? match[1] : raw).trim().toLowerCase();

      const existingUser = await this.userModel.findOne({ email: fromEmail });

      if (!existingUser) {
        this.logReason(m.id!, `Sender not allowed: ${fromEmail}`);
        // throw AuthExceptions.AccountNotExist();
      }

      // Collect attachment parts recursively (handle nested multiparts)
      const parts = this.flattenParts(full.data.payload);
      const attachments = parts.filter(
        (p) => p.filename && p.filename.endsWith(".xlsx"),
      );

      if (!attachments.length) {
        this.logReason(m.id!, "No valid CSV/Excel attachment");
        continue;
      }

      for (const part of attachments) {
        if (!part.body?.attachmentId) continue;
        const att = await gmail.users.messages.attachments.get({
          userId: "me",
          messageId: m.id!,
          id: part.body.attachmentId,
        });
        const data = att.data.data;
        if (data) {
          const fileDto: FileUploadLogDto = {
            file: {
              buffer: () => Buffer.from(data, "base64"), // Not actually used by your service, but included for DTO compatibility
              type: "file",
              format: "binary",
            },
            buffer: Buffer.from(data, "base64"), // Actual binary buffer
          };

          // Call your log import method directly
          await this.logService.importLogExcel(fileDto, {
            user: { _id: existingUser._id },
          } as unknown as Request);
        }

        // const filePath = path.join('downloads', part.filename!);
        // fs.writeFileSync(filePath, Buffer.from(data, 'base64'));
        this.logger.log(`Processed ${part.filename}`);
      }

      // Mark email as read
      await gmail.users.messages.modify({
        userId: "me",
        id: m.id!,
        requestBody: { removeLabelIds: ["UNREAD"] },
      });
    }
  }

  // v1 dont touch
  async processHistory(historyId: string) {
    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    const last = await this.gmailModel.findOne().sort({ historyId: -1 });
    const startHistoryId = last?.lastHistoryId?.toString();

    const historyRes = await gmail.users.history.list({
      userId: "me",
      startHistoryId: startHistoryId || historyId,
      historyTypes: ["messageAdded"],
    });

    const histories = historyRes.data.history || [];
    if (!histories.length) {
      this.logger.log("No new messages in history");
      return;
    }

    const newMessageIds = histories
      .flatMap((h) => h.messagesAdded || [])
      .map((m) => m.message?.id)
      .filter(Boolean) as string[];
    console.log("✌️newMessageIds --->", newMessageIds);

    this.logger.log(`Found ${newMessageIds.length} new messages`);

    for (const msgId of newMessageIds) {
      await this.processMessage(gmail, msgId);
    }

    // Save the latest historyId
    await this.gmailModel.create({ lastHistoryId: historyId });
  }

  async handlePushHistoryId(incomingHistoryId: string) {
    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    this.logger.log(`Incoming historyId ${incomingHistoryId}`);

    // 1) atomically claim this historyId for processing
    const filter = {
      _id: "gmail_state",
      $or: [
        { historyId: { $exists: false } }, // first-time
        {
          $and: [
            { historyId: { $lt: incomingHistoryId } },
            { processing: { $ne: true } },
          ],
        }, // not already processing and older
      ],
    };

    const update = {
      $set: {
        processing: true,
        processingHistoryId: incomingHistoryId,
        processingAt: new Date(),
      },
    };

    // return the document *before* update so we can know previous historyId
    const prev = await this.gmailStateModel
      .findOneAndUpdate(filter, update, { upsert: true, new: false })
      .lean()
      .exec();

    if (!prev && (await this.gmailStateModel.countDocuments({}))) {
      // If prev is null but doc exists, it means our filter didn't match -> either
      // - we've already processed this or a later historyId, or
      // - another worker claimed it.
      this.logger.log(
        `History ${incomingHistoryId} already claimed/processed. skipping.`,
      );
      return;
    }
    // prev can be null when upsert created a doc (no previous historyId).
    const previousHistoryId = prev?.historyId;
    this.logger.log(
      `Claimed history ${incomingHistoryId}, previousHistoryId=${previousHistoryId}`,
    );

    // Now process in try/catch; on error we must reset processing flag so future attempts can handle it
    try {
      let messageIds: string[] = [];

      if (previousHistoryId) {
        // normal path: we have a previous historyId -> ask history.list for changes
        const historyRes = await gmail.users.history.list({
          userId: "me",
          startHistoryId: previousHistoryId,
          historyTypes: ["messageAdded"],
        });

        const histories = historyRes?.data?.history || [];
        messageIds = histories
          .flatMap((h: any) =>
            (h.messagesAdded || []).map((ma: any) => ma.message?.id),
          )
          .filter(Boolean);
      } else {
        // No previous history => first run (maybe we didn't seed it when registering the watch).
        // Fallback: list unread messages (safer than trying to iterate histories from unknown start)
        const listRes = await gmail.users.messages.list({
          userId: "me",
          q: "is:unread",
        });
        messageIds = (listRes?.data?.messages || []).map((m: any) => m.id);
      }

      // Deduplicate message IDs
      messageIds = Array.from(new Set(messageIds));
      this.logger.log(`✌️newMessageIds ---> ${JSON.stringify(messageIds)}`);
      if (!messageIds.length) {
        this.logger.log("No new message IDs found for this history window");
      }

      // Process each messageId. Use ProcessedMessage collection with unique index to avoid duplicates.
      for (const msgId of messageIds) {
        // ensure we only process each message id once
        try {
          await this.processedMessageModel.create({ messageId: msgId });
        } catch (err) {
          // duplicate key means another worker/process already processed this message -> skip
          if ((err as any).code === 11000) {
            this.logger.log(`Message ${msgId} already processed, skipping`);
            continue;
          }
          throw err; // unexpected DB error
        }

        try {
          await this.processMessage(gmail, msgId);
        } catch (err) {
          // If message-specific processing fails, log and continue with other messages.
          this.logger.error(
            `Error processing message ${msgId}: ${err?.stack || err?.message || err}`,
          );
          // optionally: record failed message to a "failed" collection
        }
      }

      // success -> mark historyId as processed and clear processing flag
      await this.gmailStateModel
        .updateOne(
          { processingHistoryId: incomingHistoryId },
          {
            $set: { historyId: incomingHistoryId, processing: false },
            $unset: { processingHistoryId: 1, processingAt: 1 },
          },
        )
        .exec();

      this.logger.log(`Completed processing for history ${incomingHistoryId}`);
    } catch (err) {
      this.logger.error(
        "Processing failed: " + (err?.stack || err?.message || err),
      );
      // reset processing flag to allow retry later
      await this.gmailStateModel
        .updateOne(
          { processingHistoryId: incomingHistoryId },
          {
            $unset: { processingHistoryId: 1, processingAt: 1 },
            $set: { processing: false },
          },
        )
        .exec();
      // rethrow so controller can log (but controller will still return 200)
      throw err;
    }
  }

  private async processMessage(gmail: any, msgId: string) {
    const full = await gmail.users.messages.get({ userId: "me", id: msgId });

    const fromHeader = full.data.payload?.headers?.find(
      (h) => h.name === "From",
    );
    const raw = fromHeader?.value ?? "";
    const match = raw.match(/<([^>]+)>/);
    const fromEmail = (match ? match[1] : raw).trim().toLowerCase();
    console.log("✌️fromEmail --->", fromEmail);

    const existingUser = await this.userModel.findOne({ email: fromEmail });
    if (!existingUser) {
      this.logReason(msgId, `Sender not allowed: ${fromEmail}`);
      return;
    }

    const parts = this.flattenParts(full.data.payload);
    const attachments = parts.filter(
      (p) =>
        p.filename &&
        (p.filename.endsWith(".csv") || p.filename.endsWith(".xlsx")),
    );

    if (!attachments.length) {
      this.logReason(msgId, "No valid CSV/Excel attachment");
      return;
    }

    for (const part of attachments) {
      if (!part.body?.attachmentId) continue;
      const att = await gmail.users.messages.attachments.get({
        userId: "me",
        messageId: msgId,
        id: part.body.attachmentId,
      });

      const data = att.data.data;
      console.log("✌️data --->", data);
      if (data) {
        const buffer = Buffer.from(data, "base64");
        const fileDto: FileUploadLogDto = {
          file: { buffer: () => buffer, type: "file", format: "binary" },
          buffer,
        };

        await this.logService.importLogExcel(fileDto, {
          user: { _id: existingUser._id },
        } as any);

        this.logger.log(`Processed ${part.filename}`);
      }
    }

    // Mark email as read
    await gmail.users.messages.modify({
      userId: "me",
      id: msgId,
      requestBody: { removeLabelIds: ["UNREAD"] },
    });
  }

  private logReason(messageId: string, reason: string) {
    // const logPath = path.join("logs", `${messageId}.log`);
    this.loggerService.log("Initial CMS loaded successfully.");

    // fs.writeFileSync(logPath, reason);
    this.logger.warn(`Message ${messageId}: ${reason}`);
  }

  private flattenParts(payload: any): any[] {
    const out: any[] = [];
    function walk(p?: any) {
      if (!p) return;
      if (p.parts && Array.isArray(p.parts)) p.parts.forEach(walk);
      if (p.filename || p.mimeType || p.body) out.push(p);
    }
    walk(payload);
    return out;
  }
}
