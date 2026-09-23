// Confere se os arquivos compartilhados são idênticos nos dois repositórios.
// O boletim do professor (Relatório 2026) e o do aluno (Biblioteca Digital)
// precisam calcular as mesmas notas e gerar o mesmo relatório em PDF, e as
// duas plataformas mostram a mesma página e as mesmas logos da AXION PROEDUQ.
//
//   node scripts/check-copias-compartilhadas.js          → só confere
//   node scripts/check-copias-compartilhadas.js --copiar → copia daqui para a Biblioteca
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// Caminhos a partir da raiz de cada repositório.
const ARQUIVOS = [
  "assets/js/boletim-regras.js",
  "assets/js/relatorio-individual.js",
  "assets/js/meu-diario-ia.js",
  "axion-proeduq.html",
  "assets/marca/axion-escuro.webp",
  "assets/marca/axion-escuro-sm.webp",
  "assets/marca/axion-claro.webp",
  "assets/marca/axion-claro-sm.webp",
  "assets/marca/plataforma-relatorio.webp",
  "assets/marca/plataforma-biblioteca.webp"
];
const TEXTO = /\.(js|html|css|json)$/i;

const biblioteca = process.env.BIBLIOTECA_DIR
  || path.join(__dirname, "..", "..", "BIBLIOTECA-DIGITAL");

function hash(arquivo) {
  // Texto: ignora CRLF/LF, porque o Git no Windows converte finais de linha.
  const conteudo = TEXTO.test(arquivo)
    ? fs.readFileSync(arquivo, "utf8").split("\r\n").join("\n")
    : fs.readFileSync(arquivo);
  return crypto.createHash("sha256").update(conteudo).digest("hex").slice(0, 16);
}

let falhou = false;
ARQUIVOS.forEach(function (nome) {
  const origem = path.join(__dirname, "..", nome);
  const destino = path.join(biblioteca, nome);

  if (process.argv.includes("--copiar")) {
    fs.mkdirSync(path.dirname(destino), { recursive: true });
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
