import jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-jwt-key-change-this-in-production";
const JWT_EXPIRY = (process.env.JWT_EXPIRY || "7d") as SignOptions["expiresIn"];

export interface JWTPayload {
  userId: string;
  role: "master_admin" | "admin" | "employee";
}

export function generateToken(userId: string, role: "master_admin" | "admin" | "employee") {
  return jwt.sign({ userId, role }, JWT_SECRET, {
    expiresIn: JWT_EXPIRY,
  });
}

export function verifyToken(token: string): JWTPayload {
  return jwt.verify(token, JWT_SECRET) as JWTPayload;
}
