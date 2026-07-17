"use strict";

const fs = require("fs");
const path = require("path");
const { readJson, writeAppBuildScript } = require("./release-utils");

const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");
const releaseConfig = readJson(path.join(rootDir, "release-config.json"), {});

const rootFileAllowlist = new Set([
  "apple-touch-icon.png",
  "botãocasavequia.png",
  "botãoherminio.png",
  "casavequia-alunos-1serie.html",
  "casavequia-alunos-2serie.html",
  "casavequia-alunos-3serie.html",
  "casavequia-alunos-6ano.html",
  "casavequia.html",
  "favicon-16x16.png",
  "favicon-32x32.png",
  "favicon.ico",
  "firebase-config.js",
  "firebase-config.example.js",
  "herminio-alunos-1serie.html",
  "herminio-alunos-2serie.html",
  "herminio-alunos-3serie.html",
  "herminio-alunos-8-9ano.html",
  "herminio.html",
  "icon-192.png",
  "icon-512.png",
  "iconv2.png",
  "index.html",
  "manifest.json",
  "maskable-icon-512.png",
  "planejamento-aulas-2026.html",
  "sw.js"
]);

const folderAllowlist = new Set(["assets", "downloads"]);

const swCleanupSnippet =
  "<script>(function(){if(!('serviceWorker' in navigator))return;window.addEventListener('load',function(){navigator.serviceWorker.getRegistrations().then(function(regs){return Promise.all(regs.map(function(reg){return reg.unregister();}));}).catch(function(){}).finally(function(){if(window.caches&&caches.keys){caches.keys().then(function(keys){return Promise.all(keys.map(function(key){return caches.delete(key);}));}).catch(function(){});}});});})();</script>";

fs.rmSync(distDir, { recursive: true, force: true });
fs.mkdirSync(distDir, { recursive: true });
writeAppBuildScript(rootDir, releaseConfig);

for (const entry of fs.readdirSync(rootDir, { withFileTypes: true })) {
  if (entry.name === "dist" || entry.name === "node_modules" || entry.name === "android") continue;
  const source = path.join(rootDir, entry.name);
  const target = path.join(distDir, entry.name);
  if (entry.isDirectory()) {
    if (!folderAllowlist.has(entry.name)) continue;
    copyDir(source, target);
    continue;
  }
  if (!rootFileAllowlist.has(entry.name)) continue;
  fs.copyFileSync(source, target);
}

const promptDocsSource = path.join(rootDir, "tmp", "docs");
if (fs.existsSync(promptDocsSource)) {
  copyDir(promptDocsSource, path.join(distDir, "tmp", "docs"));
}

const manifestPath = path.join(distDir, "manifest.json");
if (fs.existsSync(manifestPath)) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  manifest.start_url = "./index.html";
  manifest.scope = "./";
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");
}

for (const fileName of ["index.html", "casavequia.html", "herminio.html"]) {
  const filePath = path.join(distDir, fileName);
  if (!fs.existsSync(filePath)) continue;
  const updated = fs
    .readFileSync(filePath, "utf8")
    .replace(swCleanupSnippet, "");
  fs.writeFileSync(filePath, updated, "utf8");
}

console.log("Build web pronto em dist/");

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
