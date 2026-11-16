"use client";

import { createContext, useContext, useState, useTransition } from "react";

type ActionResult = { error: string } | undefined | void;

/** Provided by ModalPanel: closes the sheet the form sits in. */
export const CloseModalContext = createContext<(() => void) | null>(null);

/**
 * A form for a server action that may answer `{ error }`. Shows the message above the fields and
 * keeps the sheet open with everything as typed; closes the sheet only once the save worked.
 * Submitting is disabled while a save is running, so a double tap can't create two records.
 *
 * Submits via onSubmit + a transition rather than `action=`, because React resets a form's
 * fields after an `action=` submission, which would wipe the user's input on an error.
 */
export function ActionForm({
  action,
  className,
  children
}: {
  action: (formData: FormData) => Promise<ActionResult> | ActionResult;
  className?: string;
  children: React.ReactNode;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const close = useContext(CloseModalContext);

  return (
    <form
      className={className}
      data-action-form=""
      aria-busy={pending}
      onSubmit={(event) => {
        event.preventDefault();
        if (pending) return;
        const form = event.currentTarget;
        const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLElement | null;
        const formData = new FormData(form, submitter);
        setError(null);
        startTransition(async () => {
          const result = await action(formData);
          if (result && "error" in result && result.error) {
            setError(result.error);
            return;
          }
          close?.();
        });
      }}
    >
      {error ? <p className="error" role="alert">{error}</p> : null}
      <fieldset className="action-form-fields" disabled={pending}>
        {children}
      </fieldset>
    </form>
  );
}
