import { HttpStatus, Injectable, NestMiddleware } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import { verify } from "jsonwebtoken";
import { ConfigService } from "@nestjs/config";
import { InjectModel } from "@nestjs/mongoose";

import { Model } from "mongoose";
import { AuthService } from "src/security/auth/auth.service";
import { AuthExceptions } from "../helpers/exceptions";
import { User, UserDocument } from "../schema/user.schema";
import { CryptoService } from "../services/crypto.service";
import { Device, DeviceDocument } from "../schema/device.schema";
import { RESPONSE_ERROR } from "../constants/response.constant";

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
    @InjectModel(Device.name)
    private deviceModel: Model<DeviceDocument>,
    private configService: ConfigService,
    private authService: AuthService,
    private cryptoService: CryptoService,
  ) {}
  async use(req: Request, res: Response, next: NextFunction) {
    if (
      req.headers.authorization &&
      req.headers.authorization.split(" ")[0] === "Bearer"
    ) {
      const secretKey = this.configService.get("auth.secret");
      const encryptedToken: string = req.headers.authorization.split(" ")[1];
      const accessToken = this.cryptoService.decryptData(encryptedToken);
      try {
        // eslint-disable-next-line
        const letData = verify(accessToken, secretKey);
        console.log("✌️letData --->", letData);
        if (letData) {
          const findDevice = await this.deviceModel.findOne({
            accessToken: accessToken,
          });
          if (!findDevice) {
            return res.status(HttpStatus.FORBIDDEN).json({
              statusCode: HttpStatus.FORBIDDEN,
              message: RESPONSE_ERROR.UNAUTHORIZED_USER,
              data: {},
            });
          }
          const user = await this.userModel.findOne({ _id: findDevice.userId });

          if (findDevice && findDevice.accessToken != accessToken) {
            return res.status(HttpStatus.FORBIDDEN).json({
              statusCode: HttpStatus.FORBIDDEN,
              message: RESPONSE_ERROR.UNAUTHORIZED_USER,
              data: {},
            });
          }
          if (!user) {
            throw AuthExceptions.InvalidToken();
          }
          if (user && user.isActive == false) {
            return res.status(HttpStatus.FORBIDDEN).json({
              statusCode: HttpStatus.FORBIDDEN,
              message: RESPONSE_ERROR.ACCOUNT_DEACTIVATED,
              data: {},
            });
          }
          if (user && user.isProfileUpdated == true) {
            return res.status(HttpStatus.FORBIDDEN).json({
              statusCode: HttpStatus.FORBIDDEN,
              message: RESPONSE_ERROR.PROFILE_UPDATE,
              data: {},
            });
          }
          req["user"] = letData;
          next();
        } else {
          return res.status(HttpStatus.FORBIDDEN).json({
            statusCode: HttpStatus.FORBIDDEN,
            message: RESPONSE_ERROR.UNAUTHORIZED_USER,
            data: {},
          });
        }
      } catch (error) {
        if (error?.name === RESPONSE_ERROR.TOKEN_EXPIRED_ERROR) {
          const encryptedToken: string =
            req.headers.authorization.split(" ")[1];
          const accessToken = this.cryptoService.decryptData(encryptedToken);
          this.authService.logoutUser(accessToken);
          return res.status(HttpStatus.FORBIDDEN).json({
            statusCode: HttpStatus.FORBIDDEN,
            message: RESPONSE_ERROR.TOKEN_EXPIRED,
            data: {},
          });
        }
        if (error?.name === RESPONSE_ERROR.JSON_WEB_TOKEN_ERROR) {
          return res.status(HttpStatus.FORBIDDEN).json({
            statusCode: HttpStatus.FORBIDDEN,
            message: RESPONSE_ERROR.UNAUTHORIZED_USER,
            data: {},
          });
        }
        if (error) {
          return res.status(HttpStatus.FORBIDDEN).json({
            statusCode: HttpStatus.FORBIDDEN,
            message: RESPONSE_ERROR.UNAUTHORIZED_USER,
            data: {},
          });
        }
      }
    } else {
      next();
    }
  }
}
