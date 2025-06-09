import { ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuthGuard } from "@nestjs/passport";
import { AuthExceptions } from "src/common/helpers/exceptions";
import { AUTH_IS_PUBLIC_KEY } from "src/common/constants";
import { CryptoService } from "src/common/services/crypto.service";

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  constructor(
    private reflector: Reflector,
    private cryptoService: CryptoService,
  ) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      AUTH_IS_PUBLIC_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (isPublic) {
      return true;
    }
    const request = context.switchToHttp().getRequest();
    const authorizationHeader = request.headers["authorization"];
    if (authorizationHeader) {
      const encryptedToken = authorizationHeader.split(" ")[1];
      const accessToken = this.cryptoService.decryptData(encryptedToken);
      context.switchToHttp().getRequest().headers["authorization"] =
        `Bearer ${accessToken}`;
      return super.canActivate(context);
    } else {
      return false;
    }
  }

  handleRequest(err, user, info) {
    if (info?.name === "TokenExpiredError") {
      throw AuthExceptions.TokenExpired();
    }

    if (info?.name === "JsonWebTokenError") {
      throw AuthExceptions.InvalidToken();
    }

    if (err || !user) {
      throw err || AuthExceptions.ForbiddenException();
    }

    return user;
  }
}
