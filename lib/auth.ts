import "server-only";

import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createAdminUser, createAuthSession, getAdminById, getAdminByUsername, getAuthSession, hasAdminUser, revokeAuthSession } from "./db";
import { changePasswordForAdmin, changeUsernameForAdmin } from "./account";

const cookieName = "carvey_session";
const sessionMaxAgeSeconds = 60 * 60 * 24 * 30;
const sessionMaxAgeMs = sessionMaxAgeSeconds * 1000;

type HeaderLike = {
  get(name: string): string | null;
};

function shouldUseSecureCookies(requestHeaders: HeaderLike | null) {
  if (process.env.NODE_ENV !== "production") return false;
  const forwardedProto = requestHeaders?.get("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase();
  if (forwardedProto) return forwardedProto === "https";
  const protocol = requestHeaders?.get("x-forwarded-protocol")?.split(",")[0]?.trim().toLowerCase();
  return protocol === "https";
}

export function buildSessionCookieOptions(requestHeaders: HeaderLike | null = null) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: shouldUseSecureCookies(requestHeaders),
    path: "/",
    maxAge: sessionMaxAgeSeconds
  };
}

export function createSessionToken() {
  return crypto.randomBytes(24).toString("hex");
}

export function isValidSessionToken(token: string | undefined): token is string {
  return typeof token === "string" && /^[a-f0-9]{48}$/.test(token);
}

function sessionExpiry(now = Date.now()) {
  return new Date(now + sessionMaxAgeMs).toISOString();
}

export function readSessionUserId(token: string | undefined, now = Date.now()) {
  if (!isValidSessionToken(token)) return null;
  const session = getAuthSession(token);
  if (!session || session.revokedAt || Date.parse(session.expiresAt) <= now) return null;
  return session.adminUserId;
}

export async function createFirstAdmin(username: string, password: string) {
  if (hasAdminUser()) throw new Error("Admin user already exists.");
  const passwordHash = await bcrypt.hash(password, 12);
  createAdminUser(username, passwordHash);
}

export async function login(username: string, password: string) {
  const user = getAdminByUsername(username);
  if (!user) return false;
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return false;
  const sessionId = createSessionToken();
  createAuthSession(sessionId, user.id, sessionExpiry());
  const jar = await cookies();
  const requestHeaders = await headers();
  jar.set(cookieName, sessionId, buildSessionCookieOptions(requestHeaders));
  return true;
}

export async function changeUsername(userId: number, username: string) {
  changeUsernameForAdmin(userId, username);
}

export async function changePassword(userId: number, currentPassword: string, nextPassword: string) {
  return changePasswordForAdmin(userId, currentPassword, nextPassword);
}

export async function logout() {
  const jar = await cookies();
  const token = jar.get(cookieName)?.value;
  if (isValidSessionToken(token)) revokeAuthSession(token);
  jar.delete(cookieName);
}

export async function currentUser() {
  const jar = await cookies();
  const userId = readSessionUserId(jar.get(cookieName)?.value);
  if (!userId) return null;
  return getAdminById(userId) ?? null;
}

export async function requireUser() {
  const user = await currentUser();
  if (!user) {
    if (!hasAdminUser()) redirect("/setup");
    redirect("/login");
  }
  return user;
}
