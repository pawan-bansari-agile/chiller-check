// remove
/* eslint-disable @typescript-eslint/no-explicit-any */
import { google } from "googleapis";
import * as fs from "fs";
import * as path from "path";
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";

const CREDENTIALS_PATH = path.join(__dirname, "../../../credentials.json");
const s3 = new S3Client({
  region: process.env.S3_REGION || process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
  },
});

const BUCKET = process.env.S3_BUCKETS!;
const CREDENTIALS_KEY =
  process.env.S3_CREDENTIALS_KEY || "gmail-credentials.json";

const TOKEN_KEY = process.env.S3_TOKEN_KEY || "gmail-token.json";

async function loadCredentialsFile(): Promise<any> {
  try {
    const res = await s3.send(
      new GetObjectCommand({ Bucket: BUCKET, Key: CREDENTIALS_KEY }),
    );
    const credentialsStr = await res.Body?.transformToString();
    if (!credentialsStr) throw new Error("Empty credentials.json in S3");

    // Ensure local path exists
    fs.writeFileSync(CREDENTIALS_PATH, credentialsStr, "utf-8");

    console.log("✅ credentials.json fetched from S3");
    return JSON.parse(credentialsStr);
  } catch (e: any) {
    console.error("❌ Failed to fetch credentials.json from S3:", e.message);
    throw e;
  }
}

// const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf-8'));
// const { client_id, client_secret, redirect_uris } = credentials.installed;

// const s3 = new S3Client({ region: process.env.S3_REGION });

// export const oauth2Client = new google.auth.OAuth2(
//   client_id,
//   client_secret,
//   redirect_uris[0]
// );

async function getTokenFromS3(): Promise<any | null> {
  try {
    const res = await s3.send(
      new GetObjectCommand({ Bucket: BUCKET, Key: TOKEN_KEY }),
    );
    const tokenStr = await res.Body?.transformToString();
    return tokenStr ? JSON.parse(tokenStr) : null;
  } catch (e: any) {
    // No token yet or access issue; we’ll log gently and continue unauthenticated
    console.log("S3 token not found yet (first auth expected).");
    return null;
  }
}

export async function saveTokenToS3(token: any) {
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: TOKEN_KEY,
      Body: JSON.stringify(token),
      ContentType: "application/json",
    }),
  );
  console.log("✅ Gmail token saved to S3");
}

export let oauth2Client: any;

// Load token at startup (fire and forget)
(async () => {
  if (process.env.APP_ENV != "local") {
    const credentials = await loadCredentialsFile();
    const { client_id, client_secret, redirect_uris } = credentials.installed;

    oauth2Client = new google.auth.OAuth2(
      client_id,
      client_secret,
      redirect_uris[0],
    );

    const token = await getTokenFromS3();
    if (token) {
      oauth2Client.setCredentials(token);
      console.log("✅ Gmail token loaded from S3");
    } else {
      console.log(
        "⚠️ No Gmail token in S3. First-time auth needed via /gmail/auth-url",
      );
    }

    // Persist any refreshes automatically
    oauth2Client.on("tokens", async (tokens) => {
      if (tokens.refresh_token || tokens.access_token) {
        await saveTokenToS3(tokens);
      }
    });
  }
})();
