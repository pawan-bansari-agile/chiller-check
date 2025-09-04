import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import { UserActionLogService } from "../userActionLog/userActionLog.service";
import { CryptoService } from "../services/crypto.service";
import { verify } from "jsonwebtoken";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(
    private userActionLogService: UserActionLogService,
    private configService: ConfigService,
    private cryptoService: CryptoService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();

    // You can also use host to get the request object
    let letData: unknown = {};
    const { url, body, headers } = request;
    const timestamp = new Date();
    if (
      headers.authorization &&
      headers.authorization.split(" ")[0] === "Bearer"
    ) {
      const secretKey = this.configService.get("auth.secret");
      let encryptedToken = headers.authorization.split(" ")[1];
      // Allow public routes like login/reset-password/etc
      const publicPaths = [
        "/auth/login",
        "/auth/verifyOtp",
        "/auth/resetPassword",
        "/auth/health",
        "/auth/resendOtp",
        "/auth/forgotPassword",
        "/uploadMultipleFile",
      ];
      if (publicPaths.includes(url)) {
        encryptedToken = this.cryptoService.decryptData(encryptedToken);
      }
      letData = verify(encryptedToken, secretKey);
    }

    // You might want to customize this part based on your needs
    this.userActionLogService.addRecords({
      letData,
      url,
      headers,
      body,
      timestamp,
    });

    return next.handle().pipe(
      tap(() => {
        // You can add additional logic after the response is processed, if needed
      }),
    );
  }
}
