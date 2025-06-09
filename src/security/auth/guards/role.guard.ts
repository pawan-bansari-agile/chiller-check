import { Injectable, CanActivate, ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AUTH_IS_PUBLIC_KEY } from "src/common/constants";
import { Role } from "src/common/constants/enum.constant";
import { ROLES_KEY } from "src/common/decorators/role.decorator";
import { AuthExceptions } from "src/common/helpers/exceptions";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    console.log("requiredRoles: ", requiredRoles);
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      AUTH_IS_PUBLIC_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles) {
      return true;
    }
    if (isPublic) {
      return true;
    }
    const { user } = context.switchToHttp().getRequest();
    console.log("user: ", user);

    const roleGuard = requiredRoles.some((role) => user?.role == role);
    console.log("roleGuard: ", roleGuard);
    if (!roleGuard) {
      throw AuthExceptions.UserNotAuthorizedAccess();
    } else {
      return roleGuard;
    }
  }
}
