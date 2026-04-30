export function debugEasterEggsEnabled() {
  return ["1", "true", "yes", "on"].includes((process.env.CARVEY_DEBUG_EASTER_EGGS ?? "").toLowerCase());
}
