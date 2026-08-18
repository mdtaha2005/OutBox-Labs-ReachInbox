import { Request, Response, NextFunction } from "express";
import { AuthService } from "../services/auth.service.js";
import { AuthenticatedUser } from "../types/index.js";

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  // Check cookie or Authorization header
  let token = req.cookies?.token;

  if (!token && req.headers.authorization) {
    const parts = req.headers.authorization.split(" ");
    if (parts.length === 2 && parts[0] === "Bearer") {
      token = parts[1];
    }
  }

  if (!token) {
    res.status(401).json({ error: "Unauthorized: Authentication required" });
    return;
  }

  const user = AuthService.verifyToken(token);
  if (!user) {
    res.status(401).json({ error: "Unauthorized: Invalid or expired token" });
    return;
  }

  req.user = user;
  next();
}