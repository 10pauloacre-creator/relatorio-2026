"use strict";

const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const files = [
  "index.html",
  "casavequia.html",
  "casavequia-alunos-1serie.html",
  "casavequia-alunos-2serie.html",
  "casavequia-alunos-3serie.html",
  "casavequia-alunos-6ano.html",
  "herminio.html",
  "herminio-alunos-1serie.html",
  "herminio-alunos-2serie.html",
  "herminio-alunos-3serie.html",
  "herminio-alunos-8-9ano.html",
  "planejamento-aulas-2026.html"
];

const LOADER_PATTERN =
  /<style id="relatorios-preload-fix">[\s\S]*?<script defer src="downloads\/latest\.js(?:\?v=[^"]+)?"><\/script>\s*/g;

files.forEach((relativePath) => {
  const filePath = path.join(rootDir, relativePath);
  if (!fs.existsSync(filePath)) return;

  const source = fs.readFileSync(filePath, "utf8");
  const cleaned = source.replace(LOADER_PATTERN, "");
  if (cleaned !== source) {
    fs.writeFileSync(filePath, cleaned, "utf8");
    console.log(`Loader removido: ${relativePath}`);
  }
});
