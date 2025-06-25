import { HttpStatus, Injectable } from "@nestjs/common";
import {
  FileMultipleUploadDto,
  MailOptions,
} from "./dto/create-image-upload.dto";
import { CustomError } from "src/common/helpers/exceptions";
import * as path from "path";
import * as fs from "fs";
import {
  S3Client,
  PutObjectCommand,
  CopyObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";
import { SES } from "@aws-sdk/client-ses";
import * as nodemailer from "nodemailer";
import * as smtpTransport from "nodemailer-smtp-transport";
import Mail from "nodemailer/lib/mailer";
import { Cron, CronExpression } from "@nestjs/schedule";
import { folderName, tmpFolderName } from "src/common/constants/enum.constant";
import { CommonService } from "src/common/services/common.service";

@Injectable()
export class ImageUploadService {
  s3 = new S3Client({
    region: process.env.S3_REGION,
    // endpoint: process.env.S3_ENDPOINT,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    },
  });
  bucketS3 = process.env.S3_BUCKETS;
  constructor(private commonService: CommonService) {}

  /**
   * This function is for upload multiple file or image in s3 bucket
   * @param files
   * @param res
   * @param body
   */
  async uploadMultipleFileS3(res, files, params: FileMultipleUploadDto) {
    const fileResult = [];
    if (files && files.length > 0) {
      for (const file of files) {
        console.log("file:---- ", file);
        if (
          file &&
          !file.originalname.match(/\.(jpg|jpeg|png|JPG|json|pdf|doc)$/)
        ) {
          res.status(HttpStatus.BAD_REQUEST).json({
            statusCode: HttpStatus.BAD_REQUEST,
            message:
              "Only jpg,png,jpeg,pdf,doc,docx,mp4,mov,mkv,webm files are allowed!!",
            data: false,
          });
        } else {
          const random = this.commonService.generateRandomString(8, "number");

          const ext = path.extname(file.originalname);
          const filename = `${random}${ext}`;

          fileResult.push({
            name: filename,
          });
          file.buffer = fs.readFileSync(file.path);

          await this.uploadS3(
            file.buffer,
            filename,
            params.moduleName,
            file.mimetype,
          );
        }
      }
      return res.send({
        statusCode: HttpStatus.OK,
        message: "Success",
        data: fileResult,
      });
    }
    return res.send({
      statusCode: HttpStatus.BAD_REQUEST,
      message: "Failure",
      data: [],
    });
  }

  async moveTempToRealFolder(filename) {
    try {
      const sourceKey = `${tmpFolderName}/` + filename;
      const destinationKey = `${folderName}/` + filename;
      // Move to real bucket
      const bucketS3 = process.env.S3_BUCKETS;
      const copyParams = {
        Bucket: bucketS3,
        CopySource: bucketS3 + "/" + sourceKey,
        Key: destinationKey,
      };
      await this.s3.send(
        new CopyObjectCommand(copyParams),
        async (error, data) => {
          console.log("data: ", data);
          if (error) {
            console.log("FAILED to copy file in real folder", error);
          }
          console.log("Image moved to real bucket:");
          // Delete from temp bucket
          const deleteParams = {
            Bucket: bucketS3,
            Key: sourceKey,
          };
          await this.s3.send(
            new DeleteObjectCommand(deleteParams),
            (err, data) => {
              console.log("data: ", data);
              if (err) {
                console.log("FAILED to move file from temp folder", err);
              }
              console.log("Image deleted from temp bucket:");
            },
          );
        },
      );
    } catch (error) {
      console.log("moving image: ", error);
      throw CustomError.UnknownError(error?.message, error?.status);
    }
  }
  /// move file from one folder to another (from temp folder to actual)
  async moveFile(fileName: string) {
    try {
      const sourceKey = `${tmpFolderName}/` + fileName;
      const destinationKey = `${folderName}/` + fileName;
      await this.checkImageWithRetries(fileName, 5);

      /// desired file location where file supposed to move
      const copyParams = {
        Bucket: this.bucketS3,
        CopySource: this.bucketS3 + "/" + sourceKey,
        Key: destinationKey,
      };

      await this.s3.send(new CopyObjectCommand(copyParams));
      /// copying entire temp file to destination folder
      const deleteParams = {
        Bucket: this.bucketS3,
        Key: sourceKey,
      };
      await this.s3.send(new DeleteObjectCommand(deleteParams));
    } catch (error) {
      console.log("moveFile error: ", error);
      // throw error;
    }
  }

  async checkImageWithRetries(fileName: string, retries: number) {
    try {
      for (let i = 0; i < retries; i++) {
        const imageExist = await this.imageExists(fileName);
        if (imageExist) {
          return; // Image found, exit the loop
        }
        // Wait for a specific amount of time before the next retry
        await this.sleep(1000); // Adjust the delay as needed (e.g., 1000 ms = 1 second)
      }
      throw CustomError.UnknownError("No media found after retries!", 404);
    } catch (error) {
      console.log("checkImageWithRetries error", error);
    }
  }
  /// to check whether image is there in GCP or not
  async imageExists(fileName: string) {
    try {
      const destinationKey = `${folderName}/` + fileName;
      const headObjectParams = {
        Bucket: this.bucketS3,
        Key: destinationKey,
      };
      const imageExist = await this.s3.send(
        new HeadObjectCommand(headObjectParams),
      );
      console.log("imageExist: ", imageExist);
      // const [file] = await gc.bucket(bucketName).file(fileName).get();
      return !!imageExist;
    } catch (error) {
      return false;
    }
  }

  // Utility function to sleep for a specified number of milliseconds
  async sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async deleteImage(filename) {
    try {
      const bucketS3 = process.env.S3_BUCKETS;
      const sourceKey = `${folderName}/` + filename;
      // Delete from real bucket
      const deleteParams = {
        Bucket: bucketS3,
        Key: sourceKey,
      };

      await this.s3.send(new DeleteObjectCommand(deleteParams), (err, data) => {
        console.log("data: ", data);
        if (err) {
          console.log("FAILED to Delete file from real folder", err);
        }
        console.log("Image deleted from temp bucket:");
      });
    } catch (error) {
      console.log("delete image: ", error);
      throw CustomError.UnknownError(error?.message, error?.status);
    }
  }
  async sendMailStaging(options: MailOptions) {
    try {
      // Create an instance of AWS SES with your API version, region, and credentials.
      const ses = new SES({
        // apiVersion: process.env.API_VERSION,
        region: process.env.S3_REGION, // Your region will need to be updated
        credentials: {
          accessKeyId: process.env.SES_ACCESS_KEY_ID,
          secretAccessKey: process.env.SES_SECRET_ACCESS_KEY_ID,
        },
      });

      // Send the email using the provided options.
      return await ses.sendEmail({
        Source: process.env.EMAIL_CONFIG_USERNAME.toLowerCase(),
        Destination: {
          ToAddresses: [options.to],
        },
        Message: {
          Body: {
            Html: {
              Data: options.html,
              Charset: "UTF-8",
            },
          },
          Subject: {
            Data: options.subject,
            Charset: "UTF-8",
          },
        },
      });
    } catch (error) {
      console.log("send email func error: ", error);
    }
  }
  public async emailSenderLocal(
    email: string,
    subject: string,
    mailBody: string,
    data?: object,
  ): Promise<nodemailer.SentMessageInfo> {
    try {
      const transport = nodemailer.createTransport(
        smtpTransport({
          host: process.env.EMAIL_CONFIG_HOST,
          port: process.env.EMAIL_CONFIG_PORT,
          //service: 'gmail',
          auth: {
            user: process.env.EMAIL_CONFIG_USERNAME,
            pass: process.env.EMAIL_CONFIG_PASSWORD,
          },
        }),
      );

      const mailOption: Mail.Options = {
        from: process.env.EMAIL_CONFIG_USERNAME,
        to: email,
        subject,
        html: mailBody,
        text: JSON.stringify(data),
      };

      // if (user && user.attachments && user.attachments.length) {
      //   mailOption.attachments = user.attachments;
      // }

      return await transport.sendMail(mailOption);
    } catch (e) {
      console.log("email sender func error ", e);
      // throw new InternalServerErrorException("Internal Server error");
    }
  }
  async sendMailCommFunc(email: string, subject: string, htmlTemplate: string) {
    // Prepare the email configuration options.
    const mailOptions = {
      to: email.toLowerCase(), // Recipient's email address.
      subject: subject || process.env.APP_NAME, // Email subject or fallback to the app name.
      html: htmlTemplate, // HTML content of the email.
    };

    if (process.env.EMAIL_SEND_STATUS == "local") {
      this.emailSenderLocal(email, subject, htmlTemplate);
    } else if (process.env.EMAIL_SEND_STATUS == "staging") {
      // Use the sendMail function to send the email with the prepared options.
      this.sendMailStaging(mailOptions);
    }
  }

  /// deleteing all the images from temp bucket which is unused.
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, { timeZone: "Asia/Kolkata" }) // Runs the cron job daily at midnight
  async deleteAllTempImages() {
    try {
      console.log("cron running");
      const params = {
        Bucket: this.bucketS3,
        Prefix: tmpFolderName,
      };

      const listObjectsResponse = await this.s3.send(
        new ListObjectsV2Command(params),
      );
      if (
        !listObjectsResponse.Contents ||
        listObjectsResponse.Contents.length === 0
      ) {
        console.log("No objects to delete");
        return;
      }

      const keys = listObjectsResponse.Contents?.map((object) => ({
        Key: object.Key,
      }));

      if (keys?.length === 0) {
        console.log("No objects to delete");
        return;
      }
      console.log("Keys to delete:", keys);

      const removeParams = {
        Bucket: this.bucketS3,
        Delete: {
          Objects: keys,
          Quiet: false,
        },
      };

      const command = new DeleteObjectsCommand(removeParams);
      await this.s3.send(command);
    } catch (error) {
      console.error("Error deleting images:", error);
    }
  }

  async uploadS3(file, name, moduleName, mimetype) {
    try {
      const params = {
        Bucket: this.bucketS3,
        Key: `${tmpFolderName}/${moduleName}/` + String(name),
        Body: file,
        CacheControl: "public, max-age=31557600",
        ContentType: mimetype ? mimetype : "image/jpeg", // Set the content type
        ContentDisposition: "inline", // This makes it open in browser if supported
      } as never;
      console.log("81 is::::::::::", params);
      const command = new PutObjectCommand(params);
      console.log("command:::", command);
      await this.s3.send(command);
      return {
        name: String(name),
      };
    } catch (error) {
      console.log("Upload S3 image error: ", error);
      if (error) {
        throw error;
      } else {
        throw CustomError.UnknownError(error?.message, error?.statusCode);
      }
    }
  }
}
