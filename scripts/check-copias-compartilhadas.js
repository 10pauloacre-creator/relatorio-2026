// Confere se os arquivos compartilhados são idênticos nos dois repositórios.
// O boletim do professor (Relatório 2026) e o do aluno (Biblioteca Digital)
// precisam calcular as mesmas notas e gerar o mesmo relatório em PDF.
//
//   node scripts/check-copias-compartilhadas.js          → só confere
//   node scripts/check-copias-compartilhadas.js --copiar → copia daqui para a Biblioteca
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ARQUIVOS = ["boletim-regras.js", "relatorio-individual.js"];

const biblioteca = process.env.BIBLIOTECA_DIR
  || path.join("C:", "Users", "PAULO ROBERTO", "biblioteca-digital-medieval-1");

function hash(arquivo) {
  // Ignora CRLF/LF: o Git no Windows converte finais de linha.
  const texto = fs.readFileSync(arquivo, "utf8").split("\r\n").join("\n");
  return crypto.createHash("sha256").update(texto).digest("hex").slice(0, 16);
}

let falhou = false;
ARQUIVOS.forEach(function (nome) {
  const origem = path.join(__dirname, "..", "assets", "js", nome);
  const destino = path.join(biblioteca, "assets", "js", nome);

  if (process.argv.includes("--copiar")) {
    fs.copyFileSync(origem, destino);
    console.log("Copiado:", nome, "→", destino);
  }

  if (!fs.existsSync(destino)) {
    console.error("Cópia da Biblioteca não encontrada:", destino);
    falhou = true;
    return;
  }

  const a = hash(origem);
  const b = hash(destino);
  if (a !== b) {
    console.error("DIFERENTES: " + nome + " — Relatório", a, "≠ Biblioteca", b, "— rode com --copiar.");
    falhou = true;
    return;
  }
  console.log("OK: " + nome + " idêntico nos dois projetos (" + a + ").");
});

if (falhou) process.exit(1);
