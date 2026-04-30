import { redirect } from "next/navigation";
import { Wrench } from "lucide-react";
import { setupAction } from "../actions";
import { hasAdminUser } from "@/lib/db";

export const dynamic = "force-dynamic";

export default function SetupPage() {
  if (hasAdminUser()) redirect("/login");
  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="brand-mark"><Wrench size={22} /></div>
        <h1>Set up Carvey</h1>
        <p>Create the household admin account for this garage.</p>
        <form action={setupAction} className="form-stack">
          <label>
            Username
            <input name="username" autoComplete="username" required minLength={2} />
          </label>
          <label>
            Password
            <input name="password" type="password" autoComplete="new-password" required minLength={8} />
          </label>
          <button className="primary-button" type="submit">Create garage</button>
        </form>
      </section>
    </main>
  );
}
