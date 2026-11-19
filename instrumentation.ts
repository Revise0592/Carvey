export async function register() {
  // Only the Node.js server runs the scheduler (notifications, nightly backups, clean-up): it needs
  // SQLite, and the build must not start timers.
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.NEXT_PHASE === "phase-production-build") return;
  if (process.env.CARVEY_DISABLE_SCHEDULER === "true") return;
  const { startScheduler } = await import("./lib/scheduler");
  startScheduler();
}
