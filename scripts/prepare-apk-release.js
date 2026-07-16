"use strict";

const fs = require("fs");
const path = require("path");

const {
  bumpVersion,
  normalizeNotes,
  parseArgs,
  readJson,
  writeJson
} = require("./release-utils");

const rootDir = path.resolve(__dirname, "..");
const configPath = path.join(rootDir, "release-config.json");
const packageJsonPath = path.join(rootDir, "package.json");
const config = readJson(configPath, {});
const args = parseArgs(process.argv.slice(2));

const latestData = readJson(path.join(rootDir, config.latestFile), { latest: null });
const previous = latestData.latest || null;

const nextVersion =
  typeof args.version === "string"
    ? args.version
    : bumpVersion(previous ? previous.versionName : "1.0.0", args.level || "patch");
const nextCode = args.code
  ? parseInt(args.code, 10)
  : previous
  ? (parseInt(previous.versionCode, 10) || 0) + 1
  : 1;
const notes = normalizeNotes(args.notes, config.defaultReleaseNotes);
const channel = String(args.channel || config.defaultChannel || "debug");

const buildInfo = {
  appName: config.appName,
  appId: config.appId,
  versionName: nextVersion,
  versionCode: nextCode,
  channel,
  notes,
  preparedAt: new Date().toISOString()
};

writeJson(path.join(rootDir, config.workingVersionFile), buildInfo);

const packageJson = readJson(packageJsonPath, {});
packageJson.version = nextVersion;
writeJson(packageJsonPath, packageJson);

const gradlePath = path.join(rootDir, "android", "app", "build.gradle");
if (fs.existsSync(gradlePath)) {
  const original = fs.readFileSync(gradlePath, "utf8");
  const updated = original
    .replace(/versionCode\s+\d+/m, `versionCode ${nextCode}`)
    .replace(/versionName\s+"[^"]+"/m, `versionName "${nextVersion}"`);
  if (updated !== original) {
    fs.writeFileSync(gradlePath, updated, "utf8");
  }
}

console.log(
  `Release preparada: v${buildInfo.versionName} (code ${buildInfo.versionCode}) [${buildInfo.channel}]`
);
