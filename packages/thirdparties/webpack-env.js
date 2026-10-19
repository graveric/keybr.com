import { join } from "node:path";

try {
  process.loadEnvFile(join(import.meta.dirname, "lib", "config-env"));
} catch (err) {
  if (err.code !== "ENOENT") {
    throw err;
  }
}

const ENV = {};

for (const key of [
  "GOOGLE_TAG_MANAGER_ID",
  "CLOUDFLARE_ANALYTICS_ID",
  "COOKIEBOT_CLIENT_ID",
]) {
  ENV[`process.env.${key}`] = JSON.stringify(process.env[key]);
}

export { ENV };
