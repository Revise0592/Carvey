"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export function BackButton({ fallbackHref = "/garage", label = "Back" }: { fallbackHref?: string; label?: string }) {
  const router = useRouter();

  function handleClick() {
    const referrer = document.referrer;

    if (referrer) {
      try {
        const referrerUrl = new URL(referrer);
        if (referrerUrl.origin === window.location.origin) {
          router.back();
          return;
        }
      } catch {
        // Fall back to the provided href if the referrer cannot be parsed.
      }
    }

    router.push(fallbackHref);
  }

  return (
    <button className="secondary-button page-back-button" type="button" onClick={handleClick}>
      <ArrowLeft size={17} />
      {label}
    </button>
  );
}
