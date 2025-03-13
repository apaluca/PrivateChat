import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../db/models";

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: number;
        username: string;
      };
    }
  }
}

export function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN format

  if (!token) {
    return res.status(401).json({ error: "Access token is required" });
  }

  const userData = verifyToken(token);

  if (!userData) {
    return res.status(403).json({ error: "Invalid or expired token" });
  }

  // Add user data to request object
  req.user = userData;
  next();
}
