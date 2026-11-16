import bcrypt from "bcryptjs";
import { getAdminById, updateAdminPassword, updateAdminUsername } from "./db";
import { reauthKeys, withThrottle } from "./security/throttle";

export function changeUsernameForAdmin(userId: number, username: string) {
  updateAdminUsername(userId, username);
}

/** Returns "ok", "invalid" (wrong current password) or "throttled" (too many wrong guesses). */
export async function changePasswordForAdmin(userId: number, currentPassword: string, nextPassword: string) {
  const user = getAdminById(userId);
  if (!user) return "invalid" as const;
  const outcome = await withThrottle(reauthKeys(userId), () => bcrypt.compare(currentPassword, user.passwordHash));
  if (outcome.status === "throttled") return "throttled" as const;
  if (outcome.status === "failed") return "invalid" as const;
  const passwordHash = await bcrypt.hash(nextPassword, 12);
  updateAdminPassword(userId, passwordHash);
  return "ok" as const;
}
