import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const supportedProfiles = new Set(["local", "staging", "prod"]);
const profile = process.argv[2]?.trim();

if (!profile || !supportedProfiles.has(profile)) {
  console.error("Usage: node scripts/set-app-profile.mjs <local|staging|prod>");
  process.exit(1);
}

const currentFilePath = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFilePath);
const targetPath = path.resolve(currentDir, "../src/config/app-profile.ts");
const fileContent = `export const activeAppProfile = "${profile}" as const;\n`;

fs.writeFileSync(targetPath, fileContent, "utf8");
console.log(`Active app profile set to ${profile}`);
