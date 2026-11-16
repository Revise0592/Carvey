import packageJson from "../package.json";

/**
 * The running Carvey version. Release images get it from the Git tag they were built from
 * (CARVEY_VERSION, set by .github/workflows/docker-publish.yml), so a release can't report a
 * stale number even if package.json wasn't bumped. Local and development builds fall back to
 * package.json.
 */
export function appVersion(env: Record<string, string | undefined> = process.env) {
  const fromBuild = env.CARVEY_VERSION?.trim().replace(/^[vV]/, "");
  return fromBuild || packageJson.version;
}

/** Short commit the image was built from, when known. Shown next to the version for support. */
export function appCommit(env: Record<string, string | undefined> = process.env) {
  const commit = env.CARVEY_COMMIT?.trim();
  return commit && /^[0-9a-f]{7,40}$/i.test(commit) ? commit.slice(0, 7) : null;
}
