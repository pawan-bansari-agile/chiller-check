import { Controller, Get, Post, Req } from "@nestjs/common";
import { oauth2Client, saveTokenToS3 } from "./oauth2-client";
import { GmailService } from "./gmail.service";
import { Public } from "src/security/auth/auth.decorator";

@Public()
@Controller("gmail")
export class GmailController {
  constructor(private readonly gmailService: GmailService) {}

  @Get("auth-url")
  getAuthUrl() {
    if (process.env.APP_ENV != "local") {
      return {
        url: oauth2Client.generateAuthUrl({
          access_type: "offline",
          prompt: "consent", // ensure refresh_token first time
          scope: ["https://www.googleapis.com/auth/gmail.modify"], // needed to mark read
        }),
      };
    }
  }

  @Get("oauth2callback")
  async oauth2callback(@Req() req) {
    const { code } = req.query;
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    await saveTokenToS3(tokens);
    return "✅ Authenticated & token saved to S3. You can close this tab.";
  }

  @Post("pubsub/push")
  async handlePubSubPush(@Req() req) {
    console.log("push event recieved");

    const raw = req.body?.message?.data;
    if (!raw) {
      console.warn("No message.data in push body");
      return "OK";
    }

    const messageData = JSON.parse(
      // Buffer.from(req.body.message.data, 'base64').toString('utf-8')
      Buffer.from(raw, "base64").toString("utf-8"),
    );

    console.log("Push event received", messageData);

    // const historyId = messageData.historyId;
    const historyId = String(messageData.historyId);
    if (!historyId) {
      console.warn("No historyId in push event");
      return "No historyId";
    }
    // const historyId = messageData.historyId;
    // await this.gmailService.checkUnreadEmails();
    // await this.gmailService.processHistory(historyId);
    await this.gmailService.handlePushHistoryId(historyId);
    return "OK";
  }

  @Post("watch")
  async watch() {
    if (process.env.APP_ENV != "local") {
      await this.gmailService.watchInbox();
      return "Watch registered";
    }
  }
}
