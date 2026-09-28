#!/usr/bin/env node
/*
 * Publica o modelo "Magic link" do Supabase Auth (o e-mail do código de
 * verificação) a partir de supabase/emails/codigo-verificacao.html e testa
 * as duas versões numa caixa descartável (mail.tm):
 *   • RELATORIO SKIN (conta sem user_metadata.bdm): assunto "... de verificação do RELATORIO SKIN";
 *   • Biblioteca Digital (user_metadata.bdm = true): assunto "... da Biblioteca Digital".
 * Se um dos e-mails não chegar ou vier errado, volta ao modelo anterior.
 *
 * O modelo leva a marca data-modelo="__VERSAO__", trocada aqui por um código
 * do conteúdo: é assim que o teste sabe se o Supabase já está usando o modelo
 * novo (a mudança pode levar um ou dois minutos para valer). Enquanto o e-mail
 * vier sem a marca, o script espera 1 minuto e tenta de novo (até 5 vezes).
 *
 * Uso:  node scripts/publicar-modelo-email.js [--sem-teste]
 * Chaves: SUPABASE_ACCESS_TOKEN e SUPABASE_SERVICE_ROLE_KEY no ambiente ou no
 * ../BIBLIOTECA-DIGITAL/SUPABASE_PROJECT.env. O script nunca imprime chaves.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const RAIZ = path.resolve(__dirname, '..');
const ARQ_MODELO = path.join(RAIZ, 'supabase', 'emails', 'codigo-verificacao.html');
const ARQ_ENV = path.resolve(RAIZ, '..', 'BIBLIOTECA-DIGITAL', 'SUPABASE_PROJECT.env');
const ARQ_CONFIG_PUBLICA = path.resolve(RAIZ, '..', 'BIBLIOTECA-DIGITAL', 'assets', 'js', 'supabase-config.js');
const ASSUNTO = '{{ .Token }} é o seu código {{ if .Data.bdm }}da Biblioteca Digital{{ else }}de verificação do RELATORIO SKIN{{ end }}';
const SEM_TESTE = process.argv.includes('--sem-teste');
const TENTATIVAS = 5;

function lerEnv() {
  const env = {};
  if (fs.existsSync(ARQ_ENV)) {
    for (const linha of fs.readFileSync(ARQ_ENV, 'utf8').split(/\r?\n/)) {
      const m = linha.match(/^\s*(?:export\s+)?([A-Z0-9_]+)\s*[=:]\s*(.*?)\s*$/);
      if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
  for (const k of ['SUPABASE_ACCESS_TOKEN', 'SUPABASE_PROJECT_REF', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_ANON_KEY']) {
    if (process.env[k]) env[k] = process.env[k];
  }
  return env;
}

const env = lerEnv();
const REF = env.SUPABASE_PROJECT_REF || 'vgceathgwvtmjxbdpecr';
const URL_SB = `https://${REF}.supabase.co`;
const TOKEN = env.SUPABASE_ACCESS_TOKEN;
const SERVICE = env.SUPABASE_SERVICE_ROLE_KEY;
const PUBLICA = env.SUPABASE_ANON_KEY
  || ((fs.existsSync(ARQ_CONFIG_PUBLICA) && fs.readFileSync(ARQ_CONFIG_PUBLICA, 'utf8').match(/SUPABASE_ANON\s*=\s*['"]([^'"]+)/)) || [])[1];

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

async function gestao(metodo, corpo) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/config/auth`, {
    method: metodo,
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`API de gestão ${metodo} ${r.status}: ${t.slice(0, 200)}`);
  return t ? JSON.parse(t) : {};
}

function modeloSemComentario() {
  const bruto = fs.readFileSync(ARQ_MODELO, 'utf8');
  let html = bruto.replace(/^\s*<!--[\s\S]*?-->\s*/, '').trim();
  if (html.includes('<!--')) throw new Error('O modelo tem outro comentário HTML: tire antes de publicar.');
  if ((html.match(/__VERSAO__/g) || []).length < 2) {
    throw new Error('O modelo precisa de data-modelo="__VERSAO__" nas duas versões (Biblioteca e RELATORIO SKIN).');
  }
  const versao = crypto.createHash('sha1').update(html + ASSUNTO).digest('hex').slice(0, 10);
  html = html.replace(/__VERSAO__/g, versao);
  const abre = (html.match(/{{\s*if\b/g) || []).length;
  const fecha = (html.match(/{{\s*end\s*}}/g) || []).length;
  if (abre !== fecha) throw new Error(`Modelo com "if" (${abre}) e "end" (${fecha}) desiguais.`);
  if (/{{\s*[^}]*\beq\b/.test(html)) throw new Error('Não use "eq" no modelo (chave ausente quebra o envio).');
  return { html, versao };
}

// ── Caixa descartável (mail.tm) ─────────────────────────────────────
const MAILTM = 'https://api.mail.tm';
async function mt(url, opt = {}) {
  for (let i = 0; i < 5; i++) {
    const r = await fetch(MAILTM + url, opt);
    if (r.status === 429) { await esperar(3000); continue; }
    const t = await r.text();
    if (!r.ok) throw new Error(`mail.tm ${r.status}: ${t.slice(0, 150)}`);
    return t ? JSON.parse(t) : {};
  }
  throw new Error('mail.tm ocupado (429).');
}
async function criarCaixa() {
  const dom = (await mt('/domains'))['hydra:member'][0].domain;
  const address = `axionteste${Math.floor(Math.random() * 900000 + 100000)}@${dom}`;
  const password = 'Cx' + Math.random().toString(36).slice(2) + '9!';
  const json = { 'Content-Type': 'application/json' };
  await mt('/accounts', { method: 'POST', headers: json, body: JSON.stringify({ address, password }) });
  const { token } = await mt('/token', { method: 'POST', headers: json, body: JSON.stringify({ address, password }) });
  return { address, token };
}
async function idsNaCaixa(caixa) {
  const lista = (await mt('/messages', { headers: { Authorization: `Bearer ${caixa.token}` } }))['hydra:member'] || [];
  return new Set(lista.map((m) => m.id));
}
// Espera um e-mail que ainda não estava na caixa (não depende do relógio do computador).
async function esperarEmail(caixa, vistos, segundos = 120) {
  const fim = Date.now() + segundos * 1000;
  while (Date.now() < fim) {
    const lista = (await mt('/messages', { headers: { Authorization: `Bearer ${caixa.token}` } }))['hydra:member'] || [];
    const nova = lista.find((m) => !vistos.has(m.id));
    if (nova) return mt('/messages/' + nova.id, { headers: { Authorization: `Bearer ${caixa.token}` } });
    await esperar(4000);
  }
  return null;
}

// ── Auth ─────────────────────────────────────────────────────────────
async function pedirCodigo(email, dados) {
  const r = await fetch(`${URL_SB}/auth/v1/otp`, {
    method: 'POST',
    headers: { apikey: PUBLICA, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, create_user: true, data: dados }),
  });
  if (!r.ok) throw new Error(`Auth /otp ${r.status}: ${(await r.text()).slice(0, 200)}`);
}
async function adminUsuario(metodo, id, corpo) {
  const r = await fetch(`${URL_SB}/auth/v1/admin/users/${id}`, {
    method: metodo,
    headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, 'Content-Type': 'application/json' },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  if (!r.ok) throw new Error(`Auth admin ${metodo} ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return r.status === 204 ? {} : r.json().catch(() => ({}));
}
async function idDoUsuario(email) {
  const r = await fetch(`${URL_SB}/auth/v1/admin/users?per_page=50&filter=${encodeURIComponent(email)}`, {
    headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` },
  });
  const j = await r.json().catch(() => ({}));
  const u = (j.users || []).find((x) => String(x.email).toLowerCase() === email.toLowerCase());
  return u && u.id;
}

function resumo(msg) {
  return `Assunto: "${msg.subject}". Texto: "${String(msg.text || '').replace(/\s+/g, ' ').trim().slice(0, 160)}"`;
}

/**
 * Pede códigos para uma caixa nova até o e-mail vir com a marca do modelo
 * novo, e então confere o texto. dados = user_metadata da conta de teste
 * (entra na criação da conta, no 1º pedido).
 */
async function testarVersao(nome, dados, versao, confere) {
  const caixa = await criarCaixa();
  console.log(`  ${nome}: caixa de teste ${caixa.address}`);
  try {
    for (let tentativa = 1; tentativa <= TENTATIVAS; tentativa++) {
      const vistos = await idsNaCaixa(caixa);
      await pedirCodigo(caixa.address, dados);
      const msg = await esperarEmail(caixa, vistos);
      if (!msg) throw new Error(`${nome}: o e-mail não chegou em 2 minutos.`);
      const html = [].concat(msg.html || []).join('');
      if (!html.includes(versao)) {
        if (tentativa < TENTATIVAS) {
          console.log(`  ${nome}: o Supabase ainda mandou o modelo antigo (tentativa ${tentativa} de ${TENTATIVAS}). Espero 1 minuto e tento de novo…`);
          await esperar(62000); // o Auth só manda outro código ao mesmo e-mail depois de 60 s
          continue;
        }
        throw new Error(`${nome}: depois de ${TENTATIVAS} tentativas o Supabase ainda manda o modelo antigo. ${resumo(msg)}`);
      }
      const erro = confere(msg);
      if (erro) throw new Error(`${nome}: o modelo novo chegou, mas ${erro}. ${resumo(msg)}`);
      console.log(`  ${nome} → ${msg.subject}  ✔`);
      return;
    }
  } finally {
    const id = await idDoUsuario(caixa.address).catch(() => null);
    if (id) await adminUsuario('DELETE', id).catch((e) => console.warn('  (não apaguei a conta de teste:', e.message + ')'));
  }
}

async function testar(versao) {
  // 1) Biblioteca: conta com user_metadata.bdm = true (recuperação de senha)
  await testarVersao('Biblioteca', { bdm: true, nome: 'Jarvis', recuperar: true }, versao, (msg) => {
    if (!/Biblioteca Digital/.test(msg.subject)) return 'o assunto não fala da Biblioteca Digital (a condição .Data.bdm não funcionou)';
    if (!/Jarvis/.test(msg.text || '') || !/senha nova/.test(msg.text || '')) return 'o texto não tem o nome ou a frase da senha nova';
    return '';
  });
  // 2) RELATORIO SKIN: conta sem nenhum dado (a chave ausente não pode quebrar o e-mail do professor)
  await testarVersao('RELATORIO SKIN', {}, versao, (msg) => {
    if (!/RELATORIO SKIN/.test(msg.subject) || !/\d{6,10}/.test(msg.subject)) return 'o assunto do RELATORIO SKIN veio errado';
    if (/Biblioteca Digital/.test(msg.text || '')) return 'o professor recebeu o texto da Biblioteca';
    return '';
  });
}

(async () => {
  if (!TOKEN) throw new Error('Falta SUPABASE_ACCESS_TOKEN (ambiente ou SUPABASE_PROJECT.env da Biblioteca).');
  if (!SEM_TESTE && (!SERVICE || !PUBLICA)) throw new Error('Para testar faltam SUPABASE_SERVICE_ROLE_KEY ou a chave pública.');

  const { html, versao } = modeloSemComentario();
  const atual = await gestao('GET');
  const anterior = {
    mailer_subjects_magic_link: atual.mailer_subjects_magic_link,
    mailer_templates_magic_link_content: atual.mailer_templates_magic_link_content,
  };
  const pastaTmp = path.join(RAIZ, 'tmp');
  fs.mkdirSync(pastaTmp, { recursive: true });
  const copia = path.join(pastaTmp, `magic-link-antes-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(copia, JSON.stringify(anterior, null, 2));
  console.log('Modelo anterior guardado em', path.relative(RAIZ, copia));

  await gestao('PATCH', { mailer_subjects_magic_link: ASSUNTO, mailer_templates_magic_link_content: html });
  const conferido = await gestao('GET');
  if (conferido.mailer_templates_magic_link_content !== html || conferido.mailer_subjects_magic_link !== ASSUNTO) {
    throw new Error('O Supabase não guardou o modelo igual ao arquivo.');
  }
  console.log(`Modelo publicado (versão ${versao}). Testando as duas versões; pode levar alguns minutos…`);
  if (SEM_TESTE) return;

  try {
    await testar(versao);
    console.log('✅ As duas versões chegaram certas. Modelo em uso.');
  } catch (e) {
    console.error('❌ Teste falhou:', e.message);
    await gestao('PATCH', anterior);
    console.error('Voltei ao modelo anterior.');
    process.exitCode = 1;
  }
})().catch((e) => {
  console.error('Erro:', e.message);
  process.exitCode = 1;
});
