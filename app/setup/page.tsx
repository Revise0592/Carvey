import { redirect } from "next/navigation";
import { setupAction } from "../actions";
import { BrandLogo } from "@/components/BrandLogo";
import { hasAdminUser } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function SetupPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (hasAdminUser()) redirect("/login");
  const { error } = await searchParams;
  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="auth-header auth-header-wordmark">
          <div className="auth-header-copy">
            <BrandLogo />
            <h1>Set up Carvey</h1>
            <p>Create your admin account.</p>
          </div>
        </div>
        {error ? <p className="error">Use a username of 2 to 48 characters and a password of at least 8 characters.</p> : null}
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
