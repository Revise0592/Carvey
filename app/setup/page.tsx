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
        <div className="auth-header">
          <div className="brand-mark auth-mark"><CarLogo size={22} /></div>
          <div>
            <h1>Set up Carvey</h1>
            <p>Create your admin account.</p>
          </div>
        </div>
        <form action={setupAction} className="form-stack">
          <label>
            Username
            <input name="username" autoComplete="username" required minLength={2} />
          </label>
          <label>
            Password
            <input name="password" type="password" autoComplete="new-password" required minLength={8} />
          </label>
          <button className="primary-button" type="submit">Create account</button>
        </form>
      </section>
    </main>
  );
}
