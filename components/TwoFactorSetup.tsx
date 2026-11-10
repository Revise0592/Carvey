"use client";

import { ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { regenerateRecoveryCodesAction, twoFactorSetupAction, type TwoFactorState } from "@/app/actions/auth";

function RecoveryCodes({ codes, message }: { codes: string[]; message: string }) {
  const router = useRouter();
  const text = codes.join("\n");
  return (
    <div className="recovery-codes">
      <p className="success">{message}</p>
      <p className="muted">
        Save these recovery codes somewhere safe, such as a password manager. Each one signs you in once if you lose your phone. They won&apos;t be shown again.
      </p>
      <ol className="recovery-code-list">
        {codes.map((code) => <li key={code}><code>{code}</code></li>)}
      </ol>
      <div className="button-row">
        <button type="button" className="secondary-button" onClick={() => navigator.clipboard?.writeText(text).catch(() => {})}>Copy codes</button>
        <a className="secondary-button" download="carvey-recovery-codes.txt" href={`data:text/plain;charset=utf-8,${encodeURIComponent(`Carvey recovery codes\n\n${text}\n`)}`}>Download</a>
        <button type="button" className="primary-button" onClick={() => router.refresh()}>I&apos;ve saved them</button>
      </div>
    </div>
  );
}

/** Enrolment flow: scan the QR code, confirm a code, then save the recovery codes. */
export function TwoFactorSetup() {
  const [state, action, pending] = useActionState(twoFactorSetupAction, { step: "idle" } as TwoFactorState);

  if (state.step === "codes") return <RecoveryCodes codes={state.recoveryCodes} message={state.message} />;

  if (state.step === "setup") {
    return (
      <div className="totp-setup">
        <ol className="totp-steps">
          <li>Open an authenticator app (1Password, Bitwarden, Google Authenticator, Aegis, Authy…) and scan this code.</li>
          <li>Enter the 6-digit code it shows to finish.</li>
        </ol>
        {/* The SVG is generated server-side from our own otpauth URI; it contains no user HTML. */}
        <div className="totp-qr" role="img" aria-label="QR code for your authenticator app" dangerouslySetInnerHTML={{ __html: state.svg }} />
        <details className="field-hint">
          <summary>Can&apos;t scan it?</summary>
          <p>Enter this key manually (time-based, 6 digits, 30 seconds):</p>
          <code className="totp-secret">{state.secret.match(/.{1,4}/g)?.join(" ")}</code>
        </details>
        {state.error ? <p className="error">{state.error}</p> : null}
        <form action={action} className="record-form">
          <label>
            Code from your app
            <input name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={7} />
          </label>
          <div className="button-row">
            <button className="primary-button" type="submit" name="intent" value="confirm" disabled={pending}>Turn on two-factor</button>
            <button className="secondary-button" type="submit" name="intent" value="cancel" disabled={pending}>Cancel</button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <form action={action} className="record-form">
      {state.error ? <p className="error">{state.error}</p> : null}
      <button className="primary-button" type="submit" name="intent" value="start" disabled={pending}>
        <ShieldCheck size={17} /> Set up two-factor
      </button>
    </form>
  );
}

export function RegenerateRecoveryCodes() {
  const [state, action, pending] = useActionState(regenerateRecoveryCodesAction, { step: "idle" } as TwoFactorState);
  if (state.step === "codes") return <RecoveryCodes codes={state.recoveryCodes} message={state.message} />;
  return (
    <form action={action} className="record-form">
      {state.step === "idle" && state.error ? <p className="error">{state.error}</p> : null}
      <label>
        Current code from your app
        <input name="code" autoComplete="one-time-code" required maxLength={32} />
      </label>
      <button className="secondary-button" type="submit" disabled={pending}>Create new recovery codes</button>
    </form>
  );
}
