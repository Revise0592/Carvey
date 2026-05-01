import { redirect } from "next/navigation";
import { loginAction } from "../actions";
import { currentUser } from "@/lib/auth";
import { hasAdminUser } from "@/lib/db";
import { CarLogo } from "@/components/CarLogo";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (!hasAdminUser()) redirect("/setup");
  const user = await currentUser();
  if (user) redirect("/garage");
  const params = await searchParams;
  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="auth-header">
          <div className="brand-mark auth-mark"><CarLogo size={22} /></div>
          <div>
            <h1>Welcome back</h1>
            <p>Sign in to your household garage.</p>
          </div>
        </div>
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
