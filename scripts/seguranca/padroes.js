"use strict";
// Padrões de SEGREDOS (chaves privadas de API, tokens, senhas) usados pelo
// check-seguranca.js, pelo gerador da linha do tempo e pelo hook de commit.
// Chave pública de propósito NÃO entra aqui (ex.: sb_publishable_ do Supabase,
// que só funciona com o RLS): veja SEGURANCA.md, seção "Chaves públicas".

const SEGREDOS = [
  { id: "google-api-key", re: /AIza[0-9A-Za-z_-]{35}/g, dica: "chave do Google (Gemini/Cloud/Firebase)" },
  { id: "google-oauth-secret", re: /GOCSPX-[0-9A-Za-z_-]{20,}/g, dica: "segredo OAuth do Google" },
  { id: "openai-anthropic-openrouter", re: /\bsk-(?:proj-|ant-|or-v1-)?[A-Za-z0-9_-]{20,}/g, dica: "chave OpenAI/Anthropic/OpenRouter/DeepSeek" },
  { id: "elevenlabs-ou-sk-hex", re: /\bsk_[a-f0-9]{40,}\b/g, dica: "chave ElevenLabs" },
  { id: "stripe-pagarme", re: /\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{16,}/g, dica: "chave secreta de pagamento" },
  { id: "mercado-pago", re: /\bAPP_USR-[0-9A-Za-z-]{30,}/g, dica: "token do Mercado Pago" },
  { id: "asaas", re: /\$aact_[A-Za-z0-9_]{20,}/g, dica: "chave do Asaas" },
  { id: "groq", re: /\bgsk_[A-Za-z0-9]{20,}/g, dica: "chave do Groq" },
  { id: "huggingface", re: /\bhf_[A-Za-z0-9]{30,}/g, dica: "token Hugging Face" },
  { id: "github-token", re: /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{20,})/g, dica: "token do GitHub" },
  { id: "supabase-secret", re: /\bsb_secret_[A-Za-z0-9_-]{10,}/g, dica: "chave SECRETA do Supabase" },
  { id: "jwt", re: /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, dica: "JWT (service_role ou sessão)" },
  { id: "slack", re: /\bxox[baprs]-[A-Za-z0-9-]{10,}/g, dica: "token do Slack" },
  { id: "aws", re: /\bAKIA[0-9A-Z]{16}\b/g, dica: "chave AWS" },
  { id: "chave-privada", re: /-----BEGIN (?:[A-Z]+ )?PRIVATE KEY-----/g, dica: "chave privada" },
  { id: "senha-em-url", re: /\b[a-z][a-z0-9+.-]*:\/\/[^\s:@/'"]+:[^\s@/'"]{6,}@[^\s'"]+/gi, dica: "senha dentro de URL (postgres://user:senha@…)" }
];

// Troca qualquer segredo encontrado por "[segredo removido]".
function ocultarSegredos(texto) {
  let t = String(texto == null ? "" : texto);
  for (const p of SEGREDOS) t = t.replace(p.re, "[segredo removido]");
  return t;
}

// Lista os segredos de um texto: [{id, dica, linha, trecho}] (trecho mascarado).
function acharSegredos(texto) {
  const achados = [];
  const linhas = String(texto || "").split("\n");
  linhas.forEach((linha, i) => {
    for (const p of SEGREDOS) {
      p.re.lastIndex = 0;
      let m;
      while ((m = p.re.exec(linha))) {
        const v = m[0];
        achados.push({ id: p.id, dica: p.dica, linha: i + 1, trecho: v.slice(0, 6) + "…" + v.slice(-3) });
        if (!p.re.global) break;
      }
    }
  });
  return achados;
}

module.exports = { SEGREDOS, ocultarSegredos, acharSegredos };
