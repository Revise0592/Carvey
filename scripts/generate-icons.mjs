import sharp from "sharp";
import { mkdir } from "fs/promises";

await mkdir("public/icons", { recursive: true });

const source = "public/icons/Carvey-light.png";

await sharp(source).resize(192, 192).png().toFile("public/icons/icon-192.png");
console.log("✓ icon-192.png");

await sharp(source).resize(512, 512).png().toFile("public/icons/icon-512.png");
console.log("✓ icon-512.png");

// Maskable: add ~10% safe-zone padding (icon fills ~80% of canvas)
const maskableSize = 512;
const padding = Math.round(maskableSize * 0.1);
const iconSize = maskableSize - padding * 2;
await sharp(source)
  .resize(iconSize, iconSize)
  .extend({ top: padding, bottom: padding, left: padding, right: padding, background: "#0f766e" })
  .png()
  .toFile("public/icons/icon-maskable-512.png");
console.log("✓ icon-maskable-512.png");
