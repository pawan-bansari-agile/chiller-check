import { Injectable } from "@nestjs/common";
import { CryptoService } from "../services/crypto.service";
import * as nodeCrypto from "crypto";

interface PasswordOptions {
  length: number;
  numbers?: boolean;
  symbols?: boolean;
  uppercase?: boolean;
  lowercase?: boolean;
  strict?: boolean;
}

@Injectable()
export class PasswordGeneratorService {
  constructor(private cryptoService: CryptoService) {}

  generatePassword(options: PasswordOptions): {
    plain: string;
    encrypted: string;
    hashed: string;
  } {
    const length = options.length || 12;

    const LOWERCASE = "abcdefghijklmnopqrstuvwxyz";
    const UPPERCASE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const NUMBERS = "0123456789";
    const SYMBOLS = "!#$%^&*()_+[]{}|;:,.<>?";

    let allChars = "";
    if (options.lowercase !== false) allChars += LOWERCASE;
    if (options.uppercase) allChars += UPPERCASE;
    if (options.numbers) allChars += NUMBERS;
    if (options.symbols) allChars += SYMBOLS;

    if (!allChars) {
      throw new Error("At least one character set must be enabled.");
    }

    let password = "";
    while (password.length < length) {
      //   const byte = crypto.randomBytes(1)[0];
      const byte = nodeCrypto.randomBytes(1)[0];

      const char = allChars[byte % allChars.length];
      password += char;
    }

    // Strict mode: ensure at least one character from each required set
    if (options.strict) {
      const tests: { regex: RegExp; valid?: boolean }[] = [];

      if (options.lowercase !== false) tests.push({ regex: /[a-z]/ });
      if (options.uppercase) tests.push({ regex: /[A-Z]/ });
      if (options.numbers) tests.push({ regex: /[0-9]/ });
      if (options.symbols) tests.push({ regex: /[^A-Za-z0-9]/ });

      const isValid = () =>
        tests.every((test) => {
          test.valid = test.regex.test(password);
          return test.valid;
        });

      while (!isValid()) {
        password = "";
        while (password.length < length) {
          //   const byte = crypto.randomBytes(1)[0];
          const byte = nodeCrypto.randomBytes(1)[0];

          const char = allChars[byte % allChars.length];
          password += char;
        }
      }
    }

    return {
      plain: password,
      encrypted: this.cryptoService.encryptData(password),
      hashed: this.cryptoService.hashData(password),
    };
  }
}
