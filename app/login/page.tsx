import { redirect } from "next/navigation";
import { loginAction } from "../actions";
import { BrandLogo } from "@/components/BrandLogo";
import { currentUser } from "@/lib/auth";
import { hasAdminUser } from "@/lib/db";

export const dynamic = "force-dynamic";

const errors: Record<string, string> = {
  "1": "Those details did not match.",
  expired: "That sign-in took too long or had too many wrong codes. Sign in again.",
  throttled: "Too many failed attempts."
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; wait?: string }> }) {
  if (!hasAdminUser()) redirect("/setup");
  if (await currentUser()) redirect("/garage");
  const params = await searchParams;
  const message = params.error ? errors[params.error] ?? errors["1"] : null;
  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="auth-header auth-header-wordmark">
          <div className="auth-header-copy">
            <BrandLogo />
            <h1>Welcome back</h1>
          </div>
        </div>
        {message ? (
          <p className="error">
            {message}
            {params.error === "throttled" ? ` Try again in about ${Math.max(1, Number(params.wait) || 1)} minute${params.wait === "1" ? "" : "s"}.` : null}
          </p>
        ) : null}
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
