"use strict";

const fs = require("fs");
const path = require("path");

const {
  formatSize,
  parseArgs,
  readJson,
  renderDownloadPage,
  renderLatestScript,
  sha256File,
  writeJson,
  writeText
} = require("./release-utils");

const rootDir = path.resolve(__dirname, "..");
const config = readJson(path.join(rootDir, "release-config.json"), {});
const args = parseArgs(process.argv.slice(2));
const apkArg = args.apk;

if (!apkArg || typeof apkArg !== "string") {
  console.error("Informe o caminho do APK com --apk <arquivo>.");
  process.exit(1);
}

const sourceApk = path.resolve(rootDir, apkArg);
if (!fs.existsSync(sourceApk)) {
  console.error(`APK não encontrado: ${sourceApk}`);
  process.exit(1);
}

const buildInfo = readJson(path.join(rootDir, config.workingVersionFile), null);
if (!buildInfo) {
  console.error("Nenhuma release preparada. Execute primeiro: npm run release:prepare");
  process.exit(1);
}

const latestFile = path.join(rootDir, config.latestFile);
const releasesFile = path.join(rootDir, config.releasesFile);
const releasesData = readJson(releasesFile, { generatedAt: null, releases: [] });

const targetDir = path.join(rootDir, "downloads", "apk");
fs.mkdirSync(targetDir, { recursive: true });

const fileName = `${config.apkBaseName}-v${buildInfo.versionName}.apk`;
const targetFile = path.join(targetDir, fileName);
fs.copyFileSync(sourceApk, targetFile);

const stat = fs.statSync(targetFile);
const releasedAt = new Date().toISOString();
const releasedAtLabel = new Date(releasedAt).toLocaleString("pt-BR", {
  dateStyle: "short",
  timeStyle: "short"
});
const entry = {
  appName: config.appName,
  appId: config.appId,
  versionName: buildInfo.versionName,
  versionCode: buildInfo.versionCode,
  channel: buildInfo.channel,
  notes: buildInfo.notes,
  fileName,
  sizeBytes: stat.size,
  sizeLabel: formatSize(stat.size),
  sha256: sha256File(targetFile),
  releasedAt,
  releasedAtLabel,
  downloadUrl: config.downloadBaseUrl + fileName,
  downloadPath: `./apk/${fileName}`
};

const nextReleases = [
  entry,
  ...releasesData.releases.filter((item) => item.versionName !== entry.versionName)
];

writeJson(latestFile, {
  generatedAt: releasedAt,
  latest: entry
});
writeJson(releasesFile, {
  generatedAt: releasedAt,
  releases: nextReleases
});
writeText(
  path.join(rootDir, config.latestScriptFile),
  renderLatestScript(entry)
);

const pageHtml = renderDownloadPage(config, entry, nextReleases);
fs.writeFileSync(path.join(rootDir, config.downloadPagePath), pageHtml, "utf8");

console.log(`Release publicada: downloads/apk/${fileName}`);
