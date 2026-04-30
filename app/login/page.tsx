import { redirect } from "next/navigation";
import { LogIn } from "lucide-react";
import { loginAction } from "../actions";
import { currentUser } from "@/lib/auth";
import { hasAdminUser } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (!hasAdminUser()) redirect("/setup");
  const user = await currentUser();
  if (user) redirect("/garage");
  const params = await searchParams;
  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="brand-mark"><LogIn size={22} /></div>
        <h1>Welcome back</h1>
        <p>Sign in to your household garage.</p>
        {params.error ? <p className="error">Those details did not match.</p> : null}
        <form action={loginAction} className="form-stack">
          <label>
            Username
            <input name="username" autoComplete="username" required />
          </label>
          <label>
            Password
            <input name="password" type="password" autoComplete="current-password" required />
          </label>
          <button className="primary-button" type="submit">Sign in</button>
        </form>
      </section>
    </main>
  );
}
