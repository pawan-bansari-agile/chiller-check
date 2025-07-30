// common/guards/global-access.guard.ts
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import mongoose from "mongoose";
import { AUTH_IS_PUBLIC_KEY } from "src/common/constants";
import { Role } from "src/common/constants/enum.constant";
import { RESPONSE_ERROR } from "src/common/constants/response.constant";

@Injectable()
export class UserAccessGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const user = req.user;

    const isPublic = this.reflector.getAllAndOverride<boolean>(
      AUTH_IS_PUBLIC_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (isPublic) {
      return true;
    }

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
    if (publicPaths.includes(req.route.path)) {
      return true;
    }

    // If no user (unauthenticated), block
    if (!user || !user.role) {
      console.log("inside user access guard");
      throw new ForbiddenException(RESPONSE_ERROR.UNAUTHORIZED_USER);
    }

    // Admins can access everything
    if (user.role === Role.ADMIN) return true;

    // Auto-extract module and action from route
    const method = req.method.toUpperCase();
    console.log("✌️method --->", method);
    const path = req.route.path; // e.g., /company/:id or /user
    console.log("✌️path --->", path);

    const module = this.getModuleFromPath(path); // e.g. "user"
    console.log("✌️module --->", module);
    const action = this.getActionFromMethod(method, path); // e.g. "edit"
    console.log("✌️action --->", action);

    if (
      module === "user" &&
      ["view", "edit"].includes(action) &&
      this.isAccessingOwnProfile(req, user._id)
    ) {
      return true;
    }

    // Check permissions
    const modulePerms = user.permissions[module];
    console.log("✌️modulePerms --->", modulePerms);
    if (!modulePerms || !modulePerms[action]) {
      throw new ForbiddenException(RESPONSE_ERROR.INSUFFICIENT_PERMISSIONS);
    }

    return true;
  }

  private getModuleFromPath(path: string): string {
    // Basic logic: take first segment of path as module
    const segments = path.split("/").filter(Boolean);
    return segments[0]; // e.g., "user" from "/user/:id"
  }

  private getActionFromMethod(
    method: string,
    path: string,
  ): "view" | "add" | "edit" | "toggleStatus" {
    // Normalize for matching
    const normalizedPath = path.toLowerCase();
    console.log("✌️normalizedPath --->", normalizedPath);

    if (method === "POST") {
      console.log("inside the user access guard");
      console.log("✌️normalizedPath --->", normalizedPath);
      if (normalizedPath.includes("create")) return "add";
      if (normalizedPath.includes("list") || normalizedPath.includes("findall"))
        return "view";
      // if (normalizedPath.includes('findAll')) return 'view';
      // return 'add';
    }

    if (method === "GET") {
      return "view";
    }

    if (method === "PUT") {
      return "edit";
    }

    if (method === "PATCH") {
      if (normalizedPath.includes("status")) return "toggleStatus";
      return "edit";
    }

    // if (method === 'DELETE') {
    //   return 'toggleStatus';
    // }

    return "view"; // Default fallback
  }

  private isAccessingOwnProfile(req, userId: string): boolean {
    const paramId = req.params?.id;
    if (!paramId) return false;

    try {
      return new mongoose.Types.ObjectId(paramId).equals(userId);
    } catch {
      return false;
    }
  }
}
