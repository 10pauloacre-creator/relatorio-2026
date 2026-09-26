#!/usr/bin/env node
"use strict";
// Hook do Claude Code (PreToolUse), ligado em .claude/settings.json.
// Qualquer IA que editar este projeto passa por aqui ANTES de agir:
//  • Write/Edit/MultiEdit/NotebookEdit: recusa gravar um segredo (chave de API,
//    token, senha em URL…) num arquivo que vai para o git (repositório público).
//  • Bash com "git commit": roda check-seguranca --staged; "git push": a
//    verificação completa. Se falhar, o comando não roda.
// Código de saída 2 = bloqueia e mostra o motivo para a IA corrigir.

const path = require("path");
const { execFileSync } = require("child_process");
const { acharSegredos } = require("./padroes");

const RAIZ = path.resolve(__dirname, "..", "..");

function ler() {
  return new Promise((ok) => {
    let d = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (c) => (d += c));
    process.stdin.on("end", () => ok(d));
    setTimeout(() => ok(d), 3000);
  });
}

function bloquear(msg) {
  process.stderr.write("🔒 Bloqueado pela política de segurança (SEGURANCA.md):\n" + msg + "\n");
  process.exit(2);
}

function ignoradoPeloGit(arq) {
  try {
    execFileSync("git", ["check-ignore", "-q", arq], { cwd: RAIZ, stdio: "ignore" });
    return true;
  } catch (e) {
    return false;
  }
}

function comExcecao(texto, linha) {
  const linhas = String(texto).split("\n");
  const ok = /seguranca:ok\s+\S{3,}/;
  return ok.test(linhas[linha - 1] || "") || ok.test(linhas[linha - 2] || "");
}

(async () => {
  let entrada = {};
  try { entrada = JSON.parse((await ler()) || "{}"); } catch (e) { process.exit(0); }
  const ferramenta = entrada.tool_name || "";
  const t = entrada.tool_input || {};

  if (/^(Write|Edit|MultiEdit|NotebookEdit)$/.test(ferramenta)) {
    const arq = t.file_path || t.notebook_path || "";
    const textos = [t.content, t.new_string, t.new_source].concat((t.edits || []).map((e) => e && e.new_string)).filter((x) => typeof x === "string");
    if (!textos.length) process.exit(0);
    const rel = arq ? path.relative(RAIZ, path.resolve(RAIZ, arq)) : "";
    const dentroDoRepo = rel && !rel.startsWith("..") && !path.isAbsolute(rel);
    if (!dentroDoRepo || ignoradoPeloGit(rel)) process.exit(0);
    for (const texto of textos) {
      const achados = acharSegredos(texto).filter((a) => !comExcecao(texto, a.linha));
      if (achados.length) {
        bloquear("O conteúdo para " + rel + " tem " + achados.map((a) => a.dica + " (" + a.trecho + ")").join(", ") +
          ".\nSegredo nunca vai para arquivo versionado: use segredo do Supabase (Edge Function), variável de ambiente ou localStorage do aparelho do usuário.");
      }
    }
    process.exit(0);
  }

  if (ferramenta === "Bash") {
    const cmd = String(t.command || "");
    const commit = /\bgit\b[^;&|]*\bcommit\b/.test(cmd);
    const push = /\bgit\b[^;&|]*\bpush\b/.test(cmd);
    if (!commit && !push) process.exit(0);
    const args = [path.join(RAIZ, "scripts", "check-seguranca.js")];
    if (commit && !push) args.push("--staged");
    try {
      execFileSync(process.execPath, args, { cwd: RAIZ, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    } catch (e) {
      bloquear(String((e.stdout || "") + (e.stderr || "")).trim() + "\nCorrija e tente de novo. Nunca contorne com --no-verify.");
    }
    if (/--no-verify\b|-c\s+core\.hooksPath=/.test(cmd)) bloquear("Não pule os hooks de segurança (--no-verify / core.hooksPath).");
    process.exit(0);
  }
  process.exit(0);
})();
