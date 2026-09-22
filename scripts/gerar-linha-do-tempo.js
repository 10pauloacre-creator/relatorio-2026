"use strict";
// Gera a linha do tempo do projeto RELATORIO SKIN a partir do histórico do
// git (um evento por commit) em assets/data/relatorio-skin-linha-do-tempo.json.
// A página de Projetos pessoais lê este arquivo e, ao abrir, busca no GitHub
// os commits mais novos que ele, então a linha do tempo fica sempre em dia
// mesmo sem rodar este script. Rodar de vez em quando deixa o arquivo completo:
//   npm run linha-do-tempo
// Se o git devolver menos commits que o arquivo atual (clone raso no build),
// o arquivo não é sobrescrito.

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const raiz = path.resolve(__dirname, "..");
const saida = path.join(raiz, "assets", "data", "relatorio-skin-linha-do-tempo.json");
const SEP = "\u001f", FIM = "\u001e";

let bruto;
try {
  bruto = execFileSync("git", ["log", "--format=%H" + SEP + "%aI" + SEP + "%s" + SEP + "%b" + FIM], { cwd: raiz, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
} catch (e) {
  console.log("git indisponível; linha do tempo mantida.");
  process.exit(0);
}

const commits = bruto.split(FIM).map((b) => b.replace(/^\s+/, "")).filter(Boolean).map((b) => {
  const [sha, data, titulo, corpo] = b.split(SEP);
  const texto = String(corpo || "")
    .split("\n")
    .filter((l) => !/^Co-Authored-By:|^🤖 Generated/i.test(l.trim()))
    .join("\n").trim();
  return { sha: sha.slice(0, 40), data, titulo: (titulo || "").trim(), corpo: texto.slice(0, 1200) };
}).filter((c) => c.sha && c.data);

let atual = null;
try { atual = JSON.parse(fs.readFileSync(saida, "utf8")); } catch (e) {}
if (atual && Array.isArray(atual.commits) && atual.commits.length > commits.length) {
  console.log("Clone raso (" + commits.length + " commits) — arquivo atual com " + atual.commits.length + " mantido.");
  process.exit(0);
}

fs.mkdirSync(path.dirname(saida), { recursive: true });
fs.writeFileSync(saida, JSON.stringify({
  repositorio: "10pauloacre-creator/relatorio-2026",
  geradoEm: new Date().toISOString(),
  total: commits.length,
  commits
}) + "\n", "utf8");
console.log("Linha do tempo: " + commits.length + " commits → " + path.relative(raiz, saida));
