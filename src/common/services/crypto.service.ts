import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as crypto from "crypto";

@Injectable()
export class CryptoService {
  constructor(private configService: ConfigService) {}
  hashData(data: string): string {
    const hash = crypto.createHash("sha256");
    hash.update(data);
    return hash.digest("hex");
  }

  encryptData(data: string): string {
    const cipher = crypto.createCipher(
      "aes-256-cbc",
      this.configService.get("express.cryptoSecretKey"),
    );
    let encrypted = cipher.update(data, "utf8", "hex");
    encrypted += cipher.final("hex");
    return encrypted;
  }

  decryptData(encryptedData: string): string {
    const decipher = crypto.createDecipher(
      "aes-256-cbc",
      this.configService.get("express.cryptoSecretKey"),
    );
    let decrypted = decipher.update(encryptedData, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  }
}
