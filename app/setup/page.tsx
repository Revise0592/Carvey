import { redirect } from "next/navigation";
import { setupAction } from "../actions";
import { hasAdminUser } from "@/lib/db";
import { CarLogo } from "@/components/CarLogo";

export const dynamic = "force-dynamic";

export default function SetupPage() {
  if (hasAdminUser()) redirect("/login");
  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="brand-mark"><CarLogo size={22} /></div>
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
