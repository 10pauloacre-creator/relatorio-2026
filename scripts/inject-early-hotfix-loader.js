"use strict";

const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const version = "20260720a";
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

const loader =
  '<style id="relatorios-preload-fix">html[data-hotfix-pending="1"] body{visibility:hidden}</style>' +
  '<script>document.documentElement.setAttribute("data-hotfix-pending","1");window.__RELATORIOS_CLEAR_PENDING__=function(){try{document.documentElement.removeAttribute("data-hotfix-pending");var s=document.getElementById("relatorios-preload-fix");if(s&&s.parentNode)s.parentNode.removeChild(s);}catch(e){}};window.setTimeout(window.__RELATORIOS_CLEAR_PENDING__,4000);</script>' +
  `<script defer src="downloads/latest.js?v=${version}"></script>`;

files.forEach((relativePath) => {
  const filePath = path.join(rootDir, relativePath);
  if (!fs.existsSync(filePath)) return;

  const source = fs.readFileSync(filePath, "utf8");
  const cleaned = source.replace(/<style id="relatorios-preload-fix">[\s\S]*?downloads\/latest\.js\?v=[^"]+"><\/script>/, "");

  if (!/<title>/.test(cleaned)) return;

  const next = cleaned.replace(/(<title>[\s\S]*?<\/title>)/, `$1 ${loader}`);
  if (next !== source) {
    fs.writeFileSync(filePath, next, "utf8");
    console.log(`Atualizado: ${relativePath}`);
  }
});
