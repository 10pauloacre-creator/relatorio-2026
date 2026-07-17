"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");
const apkSourceDir = path.join(rootDir, "downloads", "apk");
const apkTargetDir = path.join(distDir, "downloads", "apk");

const buildResult = spawnSync(process.execPath, [path.join(__dirname, "build-web-release.js")], {
  cwd: rootDir,
  stdio: "inherit"
});

if (typeof buildResult.status === "number" && buildResult.status !== 0) {
  process.exit(buildResult.status);
}

if (!fs.existsSync(apkSourceDir)) {
  console.log("Nenhum APK encontrado em downloads/apk/. Build de pages concluido sem arquivos APK.");
  process.exit(0);
}

copyDir(apkSourceDir, apkTargetDir);
console.log("Build de pages pronto em dist/ com downloads/apk/.");

function copyDir(sourceDir, targetDir) {
  fs.mkdirSync(targetDir, { recursive: true });
  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    const source = path.join(sourceDir, entry.name);
    const target = path.join(targetDir, entry.name);
    if (entry.isDirectory()) {
      copyDir(source, target);
      continue;
    }
    fs.copyFileSync(source, target);
  }
}
