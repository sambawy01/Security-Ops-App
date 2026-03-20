import { randomUUID } from 'node:crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { redis } from './redis.js';

const SALT_ROUNDS = 10;
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

export async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, SALT_ROUNDS);
}

export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pin, hash);
}

export interface TokenPayload {
  officerId: string;
  role: string;
  zoneId: string | null;
  deviceId: string | null;
}

export function signAccessToken(payload: TokenPayload): string {
  return jwt.sign({ ...payload, jti: randomUUID() }, config.JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
}

export function signRefreshToken(payload: TokenPayload): string {
  return jwt.sign({ ...payload, jti: randomUUID() }, config.JWT_REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, config.JWT_SECRET) as TokenPayload;
}

export function verifyRefreshToken(token: string): TokenPayload {
  return jwt.verify(token, config.JWT_REFRESH_SECRET) as TokenPayload;
}

export async function revokeToken(token: string, expiresInSec: number): Promise<void> {
  await redis.setex(`revoked:${token}`, expiresInSec, '1');
}

export async function isTokenRevoked(token: string): Promise<boolean> {
  return (await redis.exists(`revoked:${token}`)) === 1;
}
