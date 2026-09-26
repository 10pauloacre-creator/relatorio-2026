#!/usr/bin/env node
"use strict";
// ═══════════════════════════════════════════════════════════════════════════
// Verificador de segurança do RELATORIO SKIN (regras em SEGURANCA.md)
// ───────────────────────────────────────────────────────────────────────────
//   npm run check:seguranca            → varre todos os arquivos do git
//   node scripts/check-seguranca.js --staged   → só o que vai no commit (hook)
//   node scripts/check-seguranca.js --dist     → confere a pasta dist/ (build)
// Sai com código 1 se houver ERRO. AVISO não bloqueia.
// Exceção consciente numa linha: comentário "seguranca:ok <motivo>" na mesma
// linha ou na anterior (o motivo é obrigatório e fica registrado no código).
// ═══════════════════════════════════════════════════════════════════════════

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { acharSegredos } = require("./seguranca/padroes");

const RAIZ = path.resolve(__dirname, "..");
const args = process.argv.slice(2);
const MODO_STAGED = args.includes("--staged");
const MODO_DIST = args.includes("--dist");

const erros = [];
const avisos = [];
const erro = (arq, linha, msg) => erros.push({ arq, linha, msg });
const aviso = (arq, linha, msg) => avisos.push({ arq, linha, msg });

// ── Configuração ───────────────────────────────────────────────────────────

// Arquivos que NUNCA podem entrar no repositório (é público).
const CAMINHOS_PROIBIDOS = [
  [/(^|\/)\.env(\.[^/]*)?$/i, "arquivo .env (segredos)"],
  [/\.(pem|key|p12|pfx|jks|keystore)$/i, "chave privada / keystore de assinatura"],
  [/(^|\/)firebase-config\.js$/i, "configuração local do Firebase"],
  [/(^|\/)(google-services\.json|GoogleService-Info\.plist)$/i, "configuração privada do Google/Firebase"],
  [/service[-_]?account[^/]*\.json$/i, "conta de serviço do Google"],
  [/(^|\/)(jarvis|secrets?|credenciais?)\.(env|json|txt)$/i, "arquivo de credenciais"],
  [/(chrome-profile|\.chrome-[^/]*|User Data)\//i, "perfil de navegador (cookies e senhas)"],
  [/(^|\/)(Login Data|Cookies|Local State|Web Data)$/, "banco de senhas/cookies do navegador"],
  [/(^|\/)\.claude\/settings\.local\.json$/, "configuração pessoal do Claude Code"],
  [/(^|\/)supabase\/\.(temp|branches)\//, "pasta interna da CLI do Supabase"],
  [/(^|\/)(tmp|output)\//, "rascunho/saída gerada (tmp/ e output/ ficam fora do git)"]
];

// Scripts externos só destes endereços, com versão fixa e integrity (SRI).
const HOSTS_SCRIPT = ["cdn.jsdelivr.net", "cdnjs.cloudflare.com"];

// Pastas e arquivos que o build pode publicar (scripts/build-web-release.js).
const PASTAS_PUBLICAVEIS = ["arquivo", "assets", "downloads", "livros"];
const NUNCA_PUBLICAR = /(^|\/)(CLAUDE\.md|SEGURANCA\.md|README\.md|package(-lock)?\.json|firestore\.rules|firebase\.json|vercel\.json|\.gitleaks\.toml|release-config\.json)$|\.(sql|md|ps1|py|env|pem|key|jks|keystore|map)$|(^|\/)(supabase|scripts|docs|backup|fontes|marketing|android|\.claude|\.github|\.githooks|node_modules|tmp|output)\//;

// Migrações SQL novas (a partir desta data) seguem as regras de RLS abaixo.
const SQL_DESDE = "2026-09-26";

// Cabeçalhos que o vercel.json precisa mandar.
const CABECALHOS = ["X-Content-Type-Options", "Referrer-Policy", "X-Frame-Options", "Content-Security-Policy", "Permissions-Policy", "Strict-Transport-Security"];

const BINARIO = /\.(png|jpe?g|gif|webp|ico|bmp|svgz|mp4|webm|mov|mp3|wav|ogg|m4a|pdf|zip|gz|tgz|7z|rar|apk|aab|jar|woff2?|ttf|otf|eot|psd|ai|pma|db|sqlite|bin|dat|exe|dll|so|dylib|class)$/i;

// ── Utilitários ─────────────────────────────────────────────────────────────

function git(argumentos, opcoes) {
  return execFileSync("git", argumentos, Object.assign({ cwd: RAIZ, encoding: "utf8", maxBuffer: 256 * 1024 * 1024 }, opcoes || {}));
}

function temExcecao(linhas, i) {
  const ok = /seguranca:ok\s+\S{3,}/;
  return ok.test(linhas[i] || "") || ok.test(linhas[i - 1] || "");
}

function arquivosDoGit() {
  if (MODO_STAGED) {
    return git(["diff", "--cached", "--name-only", "--diff-filter=ACMR", "-z"]).split("\0").filter(Boolean);
  }
  return git(["ls-files", "-z"]).split("\0").filter(Boolean);
}

function lerConteudo(arq) {
  if (MODO_STAGED) {
    try { return git(["show", ":" + arq]); } catch (e) { return null; }
  }
  try { return fs.readFileSync(path.join(RAIZ, arq), "utf8"); } catch (e) { return null; }
}

// ── Regras ─────────────────────────────────────────────────────────────────

function checarCaminho(arq) {
  for (const [re, motivo] of CAMINHOS_PROIBIDOS) {
    if (re.test(arq)) erro(arq, 0, "arquivo proibido no repositório público: " + motivo + ". Tire do git e ponha no .gitignore.");
  }
}

function checarSegredos(arq, texto) {
  const linhas = texto.split("\n");
  for (const a of acharSegredos(texto)) {
    if (temExcecao(linhas, a.linha - 1)) continue;
    erro(arq, a.linha, "possível segredo (" + a.dica + "): " + a.trecho + ". Segredo fica em variável de ambiente / segredo do Supabase, nunca no código. Se vazou, revogue a chave.");
  }
}

function checarFirestore(arq, texto) {
  if (!/firestore\.rules$|storage\.rules$|database\.rules\.json$/.test(arq)) return;
  texto = texto.replace(/\/\/.*$/gm, "");
  if (/allow\s+[^;]*:\s*if\s+true\b/.test(texto) || /"\.(read|write)"\s*:\s*true/.test(texto)) {
    erro(arq, 0, "regras do Firebase abertas para qualquer pessoa (if true). Use deny-all ou exija login.");
  }
}

function checarSql(arq, texto) {
  if (!/^supabase\/.*\.sql$/.test(arq)) return;
  const nome = path.basename(arq);
  const data = (nome.match(/^(\d{4}-\d{2}-\d{2})/) || [])[1];
  if (!data || data < SQL_DESDE) return;
  const linhas = texto.split("\n");
  const semComentario = (l) => l.replace(/--.*$/, "");

  linhas.forEach((l, i) => {
    const c = semComentario(l);
    if (/\bgrant\b[^;]*\bto\b[^;]*\b(anon|public)\b/i.test(c) && !temExcecao(linhas, i)) {
      erro(arq, i + 1, "GRANT para anon/public (visitante sem login). Se for de propósito, explique com 'seguranca:ok <motivo>'.");
    }
    if (/\b(using|with\s+check)\s*\(\s*true\s*\)/i.test(c) && !temExcecao(linhas, i)) {
      erro(arq, i + 1, "policy com USING/WITH CHECK (true): libera todas as linhas. Restrinja por auth.uid() ou marque 'seguranca:ok <motivo>'.");
    }
    if (/\bdisable\s+row\s+level\s+security\b/i.test(c) && !temExcecao(linhas, i)) {
      erro(arq, i + 1, "RLS desligada numa tabela.");
    }
  });

  // Tabela nova sem RLS no mesmo arquivo.
  const criadas = [...texto.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?([a-z0-9_."]+)/gi)].map((m) => m[1].replace(/"/g, "").toLowerCase());
  for (const t of criadas) {
    const curto = t.replace(/^public\./, "");
    const re = new RegExp("alter\\s+table\\s+(?:if\\s+exists\\s+)?(?:only\\s+)?(?:public\\.)?" + curto.replace(/[.]/g, "\\.").replace(/^private\\\./, "private\\.") + "\\s+enable\\s+row\\s+level\\s+security", "i");
    if (!t.startsWith("private.") && !re.test(texto)) erro(arq, 0, "tabela " + t + " criada sem 'enable row level security' no mesmo arquivo.");
  }

  // Função SECURITY DEFINER sem search_path fixo.
  const blocos = texto.split(/(?=create\s+(?:or\s+replace\s+)?function)/i);
  for (const b of blocos) {
    if (!/^create\s+(or\s+replace\s+)?function/i.test(b)) continue;
    const cab = b.split(/\bas\s+\$[a-z_]*\$/i)[0];
    if (/security\s+definer/i.test(cab) && !/set\s+search_path/i.test(cab)) {
      const nomeFn = (b.match(/function\s+([a-z0-9_.]+)/i) || [])[1] || "?";
      erro(arq, 0, "função SECURITY DEFINER " + nomeFn + " sem 'set search_path' fixo.");
    }
  }
}

function checarHtml(arq, texto) {
  if (!/\.html?$/i.test(arq)) return;
  const linhas = texto.split("\n");
  linhas.forEach((l, i) => {
    const tags = l.match(/<script\b[^>]*\bsrc\s*=\s*["']https?:\/\/[^"']+["'][^>]*>/gi) || [];
    for (const tag of tags) {
      if (temExcecao(linhas, i)) continue;
      const url = (tag.match(/src\s*=\s*["']([^"']+)["']/i) || [])[1];
      let host = "";
      try { host = new URL(url).host; } catch (e) {}
      if (!HOSTS_SCRIPT.includes(host)) { erro(arq, i + 1, "script externo de host não permitido: " + host + " (use " + HOSTS_SCRIPT.join(" ou ") + ")."); continue; }
      if (!/\bintegrity\s*=\s*["']sha(256|384|512)-/i.test(tag)) erro(arq, i + 1, "script externo sem integrity (SRI): " + url);
      if (/@\d+(["'/]|$)/.test(url) || /@latest/.test(url) || (/cdn\.jsdelivr\.net\/npm\//.test(url) && !/@\d+\.\d+\.\d+/.test(url))) {
        erro(arq, i + 1, "script externo sem versão exata (x.y.z): " + url);
      }
    }
    if (/\bon\w+\s*=\s*["'][^"']*\beval\(/i.test(l) && !temExcecao(linhas, i)) erro(arq, i + 1, "eval() em atributo de evento.");
  });
}

function checarJs(arq, texto) {
  if (!/\.(js|mjs|html?)$/i.test(arq) || /^scripts\//.test(arq) || /node_modules/.test(arq)) return;
  const linhas = texto.split("\n");
  linhas.forEach((l, i) => {
    if (/(^|[^.\w])eval\s*\(|new\s+Function\s*\(/.test(l) && !temExcecao(linhas, i)) {
      erro(arq, i + 1, "eval()/new Function(): executa texto como código. Não use.");
    }
    if (/(service_?role_?key|SERVICE_ROLE[A-Z_]*|sb_secret)\s*[:=]\s*["'`][^"'`]{8,}/i.test(l) && !temExcecao(linhas, i)) {
      erro(arq, i + 1, "chave service_role/secreta atribuída no código. Ela nunca vai para o navegador nem para o repositório.");
    }
    if (/(localStorage|sessionStorage)\.setItem\([^)]*(senha|password)/i.test(l) && !temExcecao(linhas, i)) {
      erro(arq, i + 1, "senha gravada no localStorage/sessionStorage.");
    }
  });
}

function checarWorkflow(arq, texto) {
  if (!/^\.github\/workflows\/.*\.ya?ml$/.test(arq)) return;
  const linhas = texto.split("\n");
  linhas.forEach((l, i) => {
    const m = l.match(/^\s*-?\s*uses:\s*([^\s#]+)/);
    if (!m || m[1].startsWith("./")) return;
    if (!/@[0-9a-f]{40}$/.test(m[1]) && !temExcecao(linhas, i)) erro(arq, i + 1, "action sem commit fixo (SHA de 40 caracteres): " + m[1]);
  });
  if (!/^permissions:/m.test(texto)) erro(arq, 0, "workflow sem 'permissions:' explícito (padrão = escrita ampla).");
  if (/pull_request_target/.test(texto)) aviso(arq, 0, "pull_request_target roda com segredos em código de terceiros: evite.");
}

function checarBuild() {
  const arq = "scripts/build-web-release.js";
  let texto = "";
  try { texto = fs.readFileSync(path.join(RAIZ, arq), "utf8"); } catch (e) { return; }
  const pastas = (texto.match(/folderAllowlist\s*=\s*new Set\(\[([^\]]*)\]/) || [])[1] || "";
  for (const p of pastas.match(/"[^"]+"/g) || []) {
    const nome = p.replace(/"/g, "");
    if (!PASTAS_PUBLICAVEIS.includes(nome)) erro(arq, 0, "pasta '" + nome + "' na lista de publicação. Só " + PASTAS_PUBLICAVEIS.join(", ") + " vão para o site.");
  }
  const raiz = (texto.match(/rootFileAllowlist\s*=\s*new Set\(\[([\s\S]*?)\]\)/) || [])[1] || "";
  for (const p of raiz.match(/"[^"]+"/g) || []) {
    const nome = p.replace(/"/g, "");
    if (NUNCA_PUBLICAR.test(nome) || /firebase-config/.test(nome)) erro(arq, 0, "arquivo '" + nome + "' não pode ser publicado.");
  }
}

function checarVercel() {
  let cfg;
  try { cfg = JSON.parse(fs.readFileSync(path.join(RAIZ, "vercel.json"), "utf8")); } catch (e) { erro("vercel.json", 0, "vercel.json ilegível."); return; }
  const todos = new Set();
  for (const h of cfg.headers || []) for (const x of h.headers || []) todos.add(String(x.key).toLowerCase());
  for (const c of CABECALHOS) if (!todos.has(c.toLowerCase())) erro("vercel.json", 0, "falta o cabeçalho de segurança " + c + ".");
}

function checarDadosPessoais(arq, texto) {
  if (!/^(assets|arquivo|downloads|livros)\/.*\.(json|js|html|csv|txt)$/i.test(arq)) return;
  const cpf = texto.match(/\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g);
  if (cpf) erro(arq, 0, "parece conter CPF (" + cpf.length + "x) numa pasta publicada.");
}

function checarDist() {
  const dist = path.join(RAIZ, "dist");
  if (!fs.existsSync(dist)) { erro("dist", 0, "pasta dist/ não existe (rode npm run build:pages antes)."); return; }
  const pilha = [""];
  while (pilha.length) {
    const rel = pilha.pop();
    for (const e of fs.readdirSync(path.join(dist, rel), { withFileTypes: true })) {
      const r = rel ? rel + "/" + e.name : e.name;
      if (r === "tmp/docs" || r.startsWith("tmp/docs/")) { if (e.isDirectory()) pilha.push(r); continue; } // prompts dos livros (build local do APK)
      if (e.isDirectory()) { if (NUNCA_PUBLICAR.test(r + "/")) erro("dist/" + r, 0, "pasta que não pode ser publicada."); else pilha.push(r); continue; }
      if (NUNCA_PUBLICAR.test(r)) erro("dist/" + r, 0, "arquivo que não pode ser publicado.");
      if (!BINARIO.test(r) && fs.statSync(path.join(dist, r)).size < 8 * 1024 * 1024) {
        const t = fs.readFileSync(path.join(dist, r), "utf8");
        for (const a of acharSegredos(t)) erro("dist/" + r, a.linha, "segredo no site publicado (" + a.dica + "): " + a.trecho);
      }
    }
  }
}

// ── Execução ───────────────────────────────────────────────────────────────

if (MODO_DIST) {
  checarDist();
} else {
  for (const arq of arquivosDoGit()) {
    checarCaminho(arq);
    if (BINARIO.test(arq)) continue;
    const texto = lerConteudo(arq);
    if (texto == null || texto.indexOf("\0") >= 0) continue;
    checarSegredos(arq, texto);
    checarFirestore(arq, texto);
    checarSql(arq, texto);
    checarHtml(arq, texto);
    checarJs(arq, texto);
    checarWorkflow(arq, texto);
    checarDadosPessoais(arq, texto);
  }
  if (!MODO_STAGED) { checarBuild(); checarVercel(); }
}

const fmt = (x) => "  " + x.arq + (x.linha ? ":" + x.linha : "") + " — " + x.msg;
if (avisos.length) console.log("⚠️  Avisos (" + avisos.length + "):\n" + avisos.map(fmt).join("\n"));
if (erros.length) {
  console.error("❌ Segurança: " + erros.length + " problema(s). Corrija antes de publicar (regras em SEGURANCA.md):\n" + erros.map(fmt).join("\n"));
  process.exit(1);
}
console.log("✅ Segurança: nenhum problema encontrado" + (MODO_STAGED ? " no commit." : MODO_DIST ? " no site gerado." : "."));
