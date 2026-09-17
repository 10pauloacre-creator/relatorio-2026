// Confere se o motor de regras do boletim é idêntico nos dois repositórios.
// O boletim do professor (Relatório 2026) e o do aluno (Biblioteca Digital)
// precisam calcular exatamente as mesmas notas.
//
//   node scripts/check-boletim-regras.js          → só confere
//   node scripts/check-boletim-regras.js --copiar → copia daqui para a Biblioteca
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const origem = path.join(__dirname, "..", "assets", "js", "boletim-regras.js");
const destino = process.env.BIBLIOTECA_DIR
  ? path.join(process.env.BIBLIOTECA_DIR, "assets", "js", "boletim-regras.js")
  : path.join("C:", "Users", "PAULO ROBERTO", "biblioteca-digital-medieval-1", "assets", "js", "boletim-regras.js");

function hash(arquivo) {
  return crypto.createHash("sha256").update(fs.readFileSync(arquivo)).digest("hex").slice(0, 16);
}

if (process.argv.includes("--copiar")) {
  fs.copyFileSync(origem, destino);
  console.log("Copiado para", destino);
}

if (!fs.existsSync(destino)) {
  console.error("Cópia da Biblioteca não encontrada:", destino);
  process.exit(1);
}

const a = hash(origem);
const b = hash(destino);
if (a !== b) {
  console.error("DIFERENTES: Relatório", a, "≠ Biblioteca", b, "— rode com --copiar.");
  process.exit(1);
}
console.log("OK: boletim-regras.js idêntico nos dois projetos (" + a + ").");
