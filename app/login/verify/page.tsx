import { redirect } from "next/navigation";
import { cancelSecondFactorAction, verifySecondFactorAction } from "@/app/actions";
import { BrandLogo } from "@/components/BrandLogo";
import { currentUser, pendingChallengeUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ error?: string; left?: string }> }) {
  if (await currentUser()) redirect("/garage");
  if (!(await pendingChallengeUser())) redirect("/login?error=expired");
  const params = await searchParams;
  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="auth-header auth-header-wordmark">
          <div className="auth-header-copy">
            <BrandLogo />
            <h1>Two-factor check</h1>
            <p>Enter the 6-digit code from your authenticator app, or one of your recovery codes.</p>
          </div>
        </div>
        {params.error ? (
          <p className="error">That code didn&apos;t work.{params.left ? ` ${params.left} ${params.left === "1" ? "try" : "tries"} left.` : ""}</p>
        ) : null}
        <form action={verifySecondFactorAction} className="form-stack">
          <label>
            Code
            <input name="code" autoComplete="one-time-code" autoCapitalize="off" spellCheck={false} autoFocus required maxLength={32} />
          </label>
          <button className="primary-button" type="submit">Verify</button>
        </form>
        <form action={cancelSecondFactorAction}>
          <button className="secondary-button" type="submit">Use a different account</button>
        </form>
      </section>
    </main>
  );
}
