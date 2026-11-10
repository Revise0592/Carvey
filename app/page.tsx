import { redirect } from "next/navigation";
import { hasAdminUser } from "@/lib/db";
import { currentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await currentUser();
  if (user) redirect("/garage");
  redirect(hasAdminUser() ? "/login" : "/setup");
}
