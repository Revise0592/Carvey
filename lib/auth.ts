import "server-only";

import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createAdminUser, getAdminById, getAdminByUsername, hasAdminUser } from "./db";
import { changePasswordForAdmin, changeUsernameForAdmin } from "./account";

const cookieName = "carvey_session";

const runtimeSecret = crypto.randomBytes(32).toString("base64");

function sessionSecret() {
  const secret = process.env.CARVEY_SESSION_SECRET;
  if (secret && secret.length >= 24) return secret;
  return runtimeSecret;
}

function sign(value: string) {
  return crypto.createHmac("sha256", sessionSecret()).update(value).digest("base64url");
}

function makeToken(userId: number) {
  const value = `${userId}.${Date.now()}`;
  return `${value}.${sign(value)}`;
}

function readToken(token: string | undefined) {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const value = `${parts[0]}.${parts[1]}`;
  if (sign(value) !== parts[2]) return null;
  return Number(parts[0]);
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
  const jar = await cookies();
  jar.set(cookieName, makeToken(user.id), {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  });
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
  jar.delete(cookieName);
}

export async function currentUser() {
  const jar = await cookies();
  const userId = readToken(jar.get(cookieName)?.value);
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
