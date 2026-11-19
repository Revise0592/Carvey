import { cleanUpDataDirectory } from "./housekeeping";
import { runDailyNotifications } from "./notifications";
import { runScheduledBackup } from "./scheduled-backups";

/**
 * The in-process scheduler, started once from instrumentation.ts when the server boots. Every 15
 * minutes it runs whatever is due: the daily notification digest, the nightly backup, and a daily
 * clean-up of the data directory. Each job decides for itself whether it is due.
 */

let started = false;
let lastCleanUp = 0;

export async function runScheduledJobs(now = new Date()) {
  const jobs: Array<[string, () => Promise<unknown>]> = [
    ["notification check", () => runDailyNotifications({ now })],
    ["backup", () => runScheduledBackup({ now })],
    ["clean-up", async () => {
      if (now.getTime() - lastCleanUp < 24 * 60 * 60 * 1000) return;
      lastCleanUp = now.getTime();
      await cleanUpDataDirectory(now.getTime());
    }]
  ];
  for (const [name, job] of jobs) {
    try {
      await job();
    } catch (error) {
      console.error(`[Carvey] Scheduled ${name} failed:`, error);
    }
  }
}

export function startScheduler(intervalMs = 15 * 60 * 1000) {
  if (started) return;
  started = true;
  const tick = () => void runScheduledJobs();
  setTimeout(tick, 30_000).unref?.();
  setInterval(tick, intervalMs).unref?.();
}
