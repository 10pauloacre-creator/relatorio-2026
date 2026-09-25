#!/usr/bin/env node
/* =====================================================================
   render.js — transforma cena.html em vídeo MP4.
   1. Abre cena.html no Chrome/Edge sem janela (puppeteer-core).
   2. Lê os eventos sonoros declarados nas cenas → saida/eventos.json.
   3. Chama trilha.py (Python) → saida/trilha.wav (música + efeitos).
   4. Tira os quadros um a um (window.renderAt(t)) e envia ao ffmpeg.
   5. Junta vídeo + áudio → ../RELATORIO-SKIN-video-marketing.mp4 (+ capa PNG).
   O vídeo do site (assets/video/relatorio-skin-60s.mp4) é a EDIÇÃO DO PROFESSOR
   (1min40, 25/09/2026): o render NÃO mexe nele. Só com --atualizar-site ou
   --so-site ele é trocado pela versão 720p deste mestre.

   Uso:
     node render.js                      vídeo completo (1920×1080, 30 fps)
     node render.js --quadros 2,16.4,52  só esses quadros em PNG (saida/quadros)
     node render.js --previa             vídeo rápido em 960×540 (saida/previa.mp4)
     node render.js --so-audio           só refaz a trilha e junta com o último vídeo mudo
     node render.js --atualizar-site     vídeo completo E substitui o vídeo do site pelo mestre
     node render.js --so-site [--capa 18.66]  só substitui a versão do site (assets/video) pelo mestre
   ===================================================================== */
'use strict';
const fs = require('fs');
const path = require('path');
const { spawn, spawnSync } = require('child_process');
const { once } = require('events');
const { pathToFileURL } = require('url');
const puppeteer = require('puppeteer-core');
const ffmpeg = process.env.FFMPEG_PATH || require('ffmpeg-static');

const AQUI = __dirname;
const SAIDA = path.join(AQUI, 'saida');
const FINAL = path.join(AQUI, '..', 'RELATORIO-SKIN-video-marketing.mp4');
const CAPA = path.join(AQUI, '..', 'RELATORIO-SKIN-video-capa.png');
const arg = n => { const i = process.argv.indexOf(n); return i < 0 ? null : (process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : true); };
const PREVIA = !!arg('--previa');
const FPS = +(arg('--fps') || (PREVIA ? 15 : 30));
const ESCALA = PREVIA ? .5 : 1;

function navegador() {
  const opcoes = [process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    '/usr/bin/google-chrome', '/usr/bin/chromium', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].filter(Boolean);
  const achado = opcoes.find(p => fs.existsSync(p));
  if (!achado) throw new Error('Chrome ou Edge não encontrado. Defina CHROME_PATH.');
  return achado;
}
const python = () => process.env.PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
const hms = s => { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + 'min' + String(s % 60).padStart(2, '0') + 's'; };

async function abrir() {
  const browser = await puppeteer.launch({
    executablePath: navegador(), headless: true,
    args: ['--hide-scrollbars', '--allow-file-access-from-files', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--force-color-profile=srgb', '--font-render-hinting=none']
  });
  const page = await browser.newPage();
  page.on('pageerror', e => console.error('[cena] erro:', e.message));
  page.on('console', m => { if (m.type() === 'error') console.error('[cena]', m.text()); });
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: ESCALA });
  await page.goto(pathToFileURL(path.join(AQUI, 'cena.html')).href, { waitUntil: 'networkidle0', timeout: 90000 });
  await page.waitForFunction('window.PRONTO === true', { timeout: 60000 });
  return { browser, page };
}
async function quadro(page, t) {
  await page.evaluate(tt => window.renderAt(tt), t);
  return page.screenshot({ type: 'png', optimizeForSpeed: true });
}
function roda(cmd, args, nome) {
  const r = spawnSync(cmd, args, { stdio: 'inherit' });
  if (r.status !== 0) throw new Error(nome + ' falhou (código ' + r.status + ').');
}

async function main() {
  fs.mkdirSync(SAIDA, { recursive: true });
  const { browser, page } = await abrir();
  const DUR = await page.evaluate(() => window.DURACAO);

  // Quadros avulsos para conferir as cenas.
  const lista = arg('--quadros');
  if (lista) {
    const pasta = path.join(SAIDA, 'quadros'); fs.mkdirSync(pasta, { recursive: true });
    for (const t of String(lista).split(',').map(Number)) {
      const png = await quadro(page, t);
      fs.writeFileSync(path.join(pasta, 't' + t.toFixed(2).padStart(6, '0') + '.png'), png);
    }
    console.log('Quadros salvos em', pasta);
    await browser.close(); return;
  }

  // Eventos sonoros → trilha (Python).
  const eventos = await page.evaluate(() => window.eventosSonoros());
  const evPath = path.join(SAIDA, 'eventos.json'), wav = path.join(SAIDA, 'trilha.wav');
  fs.writeFileSync(evPath, JSON.stringify({ duracao: DUR, eventos }, null, 1));
  console.log(eventos.length + ' efeitos sonoros sincronizados com as cenas.');
  console.log('Compondo a trilha (Python)…');
  roda(python(), [path.join(AQUI, 'trilha.py'), evPath, wav, String(DUR)], 'trilha.py');

  const mudo = path.join(SAIDA, PREVIA ? 'previa-mudo.mp4' : 'video-mudo.mp4');
  if (!arg('--so-audio')) {
    const total = Math.round(DUR * FPS);
    const ff = spawn(ffmpeg, ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
      '-vf', 'format=yuv420p,noise=c0s=5:c0f=t+u', '-c:v', 'libx264', '-preset', PREVIA ? 'veryfast' : 'slow', '-crf', PREVIA ? '26' : '18', '-pix_fmt', 'yuv420p', '-r', String(FPS), mudo], { stdio: ['pipe', 'inherit', 'inherit'] });
    const inicio = Date.now();
    for (let f = 0; f < total; f++) {
      const png = await quadro(page, f / FPS);
      if (!ff.stdin.write(png)) await once(ff.stdin, 'drain');
      if (f % FPS === 0 || f === total - 1) {
        const pass = (Date.now() - inicio) / 1000, falta = pass / (f + 1) * (total - f - 1);
        process.stdout.write('\rQuadro ' + (f + 1) + '/' + total + ' · ' + hms(pass) + ' · falta ~' + hms(falta) + '   ');
      }
      if (!PREVIA && Math.abs(f / FPS - 52.8) < .5 / FPS) fs.writeFileSync(CAPA, png);
    }
    ff.stdin.end(); await once(ff, 'close');
    process.stdout.write('\n');
  }
  await browser.close();

  const destino = PREVIA ? path.join(SAIDA, 'previa.mp4') : FINAL;
  roda(ffmpeg, ['-y', '-loglevel', 'error', '-i', mudo, '-i', wav, '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-shortest', '-movflags', '+faststart', destino], 'ffmpeg (juntar áudio)');
  console.log('Pronto:', destino);
  if (!PREVIA && arg('--atualizar-site')) versaoSite();
  else if (!PREVIA) console.log('O vídeo do site (edição do professor) ficou como está. Use --atualizar-site para trocá-lo.');
}

// Versão para o site (720p) + capa do player, em assets/video/ (publicados com o site).
// Substitui a edição do professor: só roda com --atualizar-site ou --so-site.
function versaoSite() {
  const WEB = path.join(AQUI, '..', '..', 'assets', 'video');
  fs.mkdirSync(WEB, { recursive: true });
  console.log('Gerando a versão do site (720p) e a capa…');
  roda(ffmpeg, ['-y', '-loglevel', 'error', '-i', FINAL, '-vf', 'scale=1280:720:flags=lanczos', '-c:v', 'libx264', '-preset', 'slow', '-crf', '25', '-profile:v', 'high', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', path.join(WEB, 'relatorio-skin-60s.mp4')], 'ffmpeg (versão do site)');
  roda(ffmpeg, ['-y', '-loglevel', 'error', '-ss', String(arg('--capa') || 18.66), '-i', FINAL, '-frames:v', '1', '-vf', 'scale=1280:720:flags=lanczos', '-q:v', '3', path.join(WEB, 'relatorio-skin-capa.jpg')], 'ffmpeg (capa)');
  console.log('Site:', WEB);
}

if (arg('--so-site')) { versaoSite(); } else main().catch(e => { console.error(e); process.exit(1); });
