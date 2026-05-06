import Image from "next/image";
import { brandIconPaths } from "@/lib/theme-branding";

export function BrandLogo() {
  return (
    <span className="brand-logo" aria-label="Carvey" role="img">
      <Image
        className="brand-logo-image brand-logo-light"
        src={brandIconPaths.light}
        alt=""
        fill
        sizes="(max-width: 480px) 156px, 214px"
        unoptimized
      />
      <Image
        className="brand-logo-image brand-logo-dark"
        src={brandIconPaths.dark}
        alt=""
        fill
        sizes="(max-width: 480px) 156px, 214px"
        unoptimized
      />
    </span>
  );
}
