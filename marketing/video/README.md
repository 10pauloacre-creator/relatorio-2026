# Vídeo de marketing do RELATORIO SKIN

Vídeo de 60 s (1920×1080, 30 fps, com trilha e efeitos sonoros) que conta o problema do professor e mostra a solução, terminando no convite para criar a conta grátis.

**Arquivos prontos**
- `../RELATORIO-SKIN-video-marketing.mp4` — mestre em 1080p (fica só nesta máquina; não vai para o git).
- `../RELATORIO-SKIN-video-capa.png` — capa (quadro da chamada final).
- `../../assets/video/relatorio-skin-60s.mp4` e `relatorio-skin-capa.jpg` — versão leve usada no site (hero do `index.html`).

## Como é feito (uma linguagem para cada parte)

| Parte | Arquivo | Linguagem |
|---|---|---|
| Cenas, tipografia animada, telas do app | `cena.html` | HTML + CSS + JavaScript |
| Fundo "aurora" animado | `cena.html` (`#frag`) | GLSL (WebGL) |
| Quadro a quadro no Chrome + codificação | `render.js` | Node.js (Puppeteer + ffmpeg) |
| Música e efeitos sonoros sintetizados | `trilha.py` | Python (numpy + scipy) |
| Tudo com um comando no Windows | `gerar-video.ps1` | PowerShell |

- `cena.html` desenha qualquer instante com `window.renderAt(t)` — nada é "ao vivo", então o render é exato e repetível.
- Cada cena declara os próprios sons (`sons: [[tempo, 'efeito', {…}]]`); o `render.js` exporta para `saida/eventos.json` e o `trilha.py` sintetiza cada efeito no mesmo instante. Som e imagem ficam sempre sincronizados.
- A trilha é original, feita do zero (nenhuma amostra de áudio de terceiros): 120 BPM; problema em Lá menor (0–16 s), silêncio, impacto e solução em Dó maior (16–46 s), respiro com piano (46–50 s), refrão e acorde final (50–60 s).
- O granulado de filme é aplicado pelo ffmpeg (filtro `noise`), que também evita faixas nos degradês escuros.

## Roteiro (60 s)

| Tempo | Cena |
|---|---|
| 0–4 s | Domingo, 22h47 — relógio e "passando a chamada a limpo" |
| 4–10 s | A pilha: caderno de chamada, diário, planilha, relatório do AEE… desaba |
| 10–14 s | 167 h por ano só com papelada (50 min/dia × 200 dias) · "É excesso de papel." |
| 14–16 s | "Existe um jeito mais leve." → tudo é sugado → silêncio |
| 16–19 s | Impacto: marca RELATORIO SKIN |
| 19–22 s | Quatro ferramentas viraram uma |
| 22–26 s | Escreva do seu jeito → a I.A. organiza (Relato, Presença, Atividades, Observações) |
| 26–29 s | Chamada em um toque |
| 29–32 s | Frequência Diária pronta (carimbo PDF) |
| 32–35 s | O contador anda sozinho + projeção |
| 35–39 s | 26 ferramentas de I.A. |
| 39–43 s | Inclusão de verdade (PEI, registros, equipe; regente, mediador, assistente, AEE) |
| 43–46 s | No computador e no celular (sincronizado; sem internet salva e sobe depois) |
| 46–50 s | Registre a aula uma vez · Ganhe a noite de volta · o aluno |
| 50–57 s | Crie sua conta grátis → clique, confete, relatorio.skin, selos |
| 57–60 s | Assinatura com a marca AXION PROEDUQ |

Dados da tela são fictícios (Profª Ana Clara Mendes, Escola Municipal Dom Pedro II, 5º Ano A). O "167 h" é a conta do próprio vídeo (50 minutos por dia × 200 dias letivos), mostrada na tela.

## Gerar de novo

Requisitos: Node 18+, Python 3 com `numpy` e `scipy`, Chrome ou Edge instalado.

```powershell
cd marketing\video
.\gerar-video.ps1            # instala o que faltar e gera tudo
```

Ou à mão:

```bash
npm install                  # puppeteer-core + ffmpeg-static
python -m pip install numpy scipy
node render.js               # vídeo completo (~5 min)
node render.js --quadros 2,16.5,52   # só alguns quadros em PNG (saida/quadros)
node render.js --previa      # versão rápida em 960×540
```

Para ver uma cena no navegador: abra `cena.html?t=24.5` (quadro parado) ou `cena.html?tocar=1` (animação em tempo real, sem som).

Para mudar um texto, edite a cena em `cena.html`; para mudar um som, o efeito correspondente em `trilha.py`. Depois de mudar o vídeo, refaça a versão do site com `.\gerar-video.ps1` (ele atualiza `assets/video/`).
