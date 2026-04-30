import { redirect } from "next/navigation";
import { hasAdminUser } from "@/lib/db";
import { currentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Home() {
  if (!hasAdminUser()) redirect("/setup");
  const user = await currentUser();
  redirect(user ? "/garage" : "/login");
}
