import Image from "next/image";

export function BrandLogo() {
  return (
    <span className="brand-logo" aria-hidden="true">
      <Image className="brand-logo-image brand-logo-light" src="/icons/icon-light.svg" alt="" fill sizes="48px" unoptimized />
      <Image className="brand-logo-image brand-logo-dark" src="/icons/icon-dark.svg" alt="" fill sizes="48px" unoptimized />
    </span>
  );
}
