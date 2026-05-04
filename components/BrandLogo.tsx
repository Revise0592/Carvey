import Image from "next/image";
import { brandIconPaths, brandWordmarkPaths } from "@/lib/theme-branding";

export function BrandLogo() {
  return (
    <span className="brand-logo" aria-hidden="true">
      <Image className="brand-logo-image brand-logo-light" src={brandIconPaths.light.svg} alt="" fill sizes="48px" unoptimized />
      <Image className="brand-logo-image brand-logo-dark" src={brandIconPaths.dark.svg} alt="" fill sizes="48px" unoptimized />
    </span>
  );
}

export function BrandWordmark() {
  return (
    <span className="brand-wordmark-image-wrap" aria-label="Carvey" role="img">
      <Image
        className="brand-wordmark-image brand-wordmark-light"
        src={brandWordmarkPaths.light}
        alt=""
        fill
        sizes="(max-width: 480px) 116px, 132px"
        unoptimized
      />
      <Image
        className="brand-wordmark-image brand-wordmark-dark"
        src={brandWordmarkPaths.dark}
        alt=""
        fill
        sizes="(max-width: 480px) 116px, 132px"
        unoptimized
      />
    </span>
  );
}
