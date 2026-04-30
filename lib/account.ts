import bcrypt from "bcryptjs";
import { getAdminById, updateAdminPassword, updateAdminUsername } from "./db";

export function changeUsernameForAdmin(userId: number, username: string) {
  updateAdminUsername(userId, username);
}

export async function changePasswordForAdmin(userId: number, currentPassword: string, nextPassword: string) {
  const user = getAdminById(userId);
  if (!user) return false;
  const ok = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!ok) return false;
  const passwordHash = await bcrypt.hash(nextPassword, 12);
  updateAdminPassword(userId, passwordHash);
  return true;
}
