import { Injectable } from "@nestjs/common";
import * as nodemailer from "nodemailer";
import * as smtpTransport from "nodemailer-smtp-transport";
import Mail from "nodemailer/lib/mailer";
import { AppEnvironment } from "src/common/constants/enum.constant";
import {
  SESClient,
  SendRawEmailCommand,
  SendRawEmailCommandInput,
} from "@aws-sdk/client-ses";

interface EmailOptions {
  to: string | string[];
  html: string;
  subject: string;
  fileName?: string;
}
@Injectable()
export class EmailService {
  private sesClient: SESClient;

  constructor() {
    this.sesClient = new SESClient({
      region: process.env.AWS_SES_REGION,
      // apiVersion: process.env.AWS_SES_API_VERSION,
      credentials: {
        accessKeyId: process.env.AWS_SES_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SES_SECRET_ACCESS_KEY_ID,
      },
    });
  }

  /* Send email */
  public async emailSender(
    options: EmailOptions,
  ): Promise<nodemailer.SentMessageInfo> {
    try {
      // if (process.env.APP_ENV === AppEnvironment.DEVELOPMENT) {
      //   return await this.smtpMail(options);
      // } else
      if (
        process.env.APP_ENV === AppEnvironment.PRODUCTION ||
        process.env.APP_ENV === AppEnvironment.DEVELOPMENT ||
        process.env.APP_ENV === AppEnvironment.STAGING
      ) {
        return await this.sesMail(options);
      } else {
        return {
          html: options?.html,
        };
      }
    } catch (e) {
      console.log("email sender func error:::::", e);
    }
  }

  /* Send email using SMTP for local server */
  public async smtpMail(
    options: EmailOptions,
  ): Promise<nodemailer.SentMessageInfo> {
    try {
      const transporter = nodemailer.createTransport(
        smtpTransport({
          host: process.env.EMAIL_CONFIG_HOST,
          port: +process.env.EMAIL_CONFIG_PORT,
          auth: {
            user: process.env.EMAIL_CONFIG_USERNAME,
            pass: process.env.EMAIL_CONFIG_PASSWORD,
          },
          tls: {
            rejectUnauthorized: false,
          },
        }),
      );

      const mailOptions: Mail.Options = {
        from: process.env.EMAIL_CONFIG_USERNAME,
        to: Array.isArray(options.to) ? options.to : [options.to],
        subject: options.subject,
        html: options.html,
      };

      const result = await transporter.sendMail(mailOptions);
      return result;
    } catch (e) {
      console.log("email sender func error ", e);
    }
  }

  async sesMail(options: EmailOptions) {
    try {
      const rawEmailInput = await this.createRawEmail(options);
      const sendRawEmailCommand = new SendRawEmailCommand(rawEmailInput);
      await this.sesClient.send(sendRawEmailCommand);
    } catch (error) {
      console.error("Error sending email with SES:", error);
    }
  }

  async createRawEmail(
    options: EmailOptions,
  ): Promise<SendRawEmailCommandInput | nodemailer.SentMessageInfo> {
    const boundary = "boundary_" + Date.now().toString();
    const nl = "\r\n";

    const toAddresses = Array.isArray(options.to) ? options.to : [options.to];

    const rawEmail =
      "From: " +
      process.env.AWS_SES_FROM_EMAIL +
      nl +
      "To: " +
      toAddresses.join(", ") +
      nl +
      "Subject: " +
      options.subject +
      nl +
      "Reply-To: " +
      process.env.AWS_SES_FROM_EMAIL +
      nl +
      "MIME-Version: 1.0" +
      nl +
      'Content-Type: multipart/mixed; boundary="' +
      boundary +
      '"' +
      nl +
      nl +
      "--" +
      boundary +
      nl +
      "Content-Type: text/html; charset=utf-8" +
      nl +
      nl +
      options.html +
      nl +
      "--" +
      boundary +
      "--" +
      nl;
    return {
      Source: process.env.AWS_SES_FROM_EMAIL,
      Destinations: toAddresses,
      RawMessage: {
        Data: Buffer.from(rawEmail),
      },
    };
  }
}
