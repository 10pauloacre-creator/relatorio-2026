# CLAUDE.md — Diário Escolar 2026
## Prof. Paulo Roberto Ramalho Magalhães · E.E. Rural Pe. Carlos Casavequia · Senador Guiomard – AC

---

## 1. OBJETIVO DO PROJETO

Plataforma **RELATORIO SKIN** (relatorio.skin): site público de apresentação (`index.html`), tela de conta (`entrar.html`), a tela **Escolas** de toda conta (`escolas.html`), o diário do administrador (`casavequia.html`, `herminio.html`), a página de cada escola do professor (`meu-diario.html?escola=<id>`) e o perfil (`perfil.html`). O diário escolar digital contém:
- Relatos diários de aula organizados por turma (1ª, 2ª, 3ª Série, 6º Ano)
- Presença, atividades e ocorrências comportamentais por aluno
- Contador de h/aulas por disciplina com barra de progresso
- Planejamento anual de todas as disciplinas por bimestre
- Cronograma semanal e contador de aulas

**Como o site é atualizado:** O professor escreve um rascunho de texto livre → Claude gera o HTML formatado → injeta nos marcadores do `index.html` → faz `git push` → GitHub Pages / GitHub atualiza o site em ~2 minutos.

---

## 2. REPOSITÓRIO E ARQUIVOS

```
C:\Projetos\AXION PROEDUQ\RELATORIO-SKIN\
├── index.html          ← Site de apresentação RELATORIO SKIN (público)
├── entrar.html         ← Tela de conta (login/cadastro)
├── escolas.html        ← Escolas de toda conta (Etapa 14): cadastro pelo INEP
├── perfil.html         ← Perfil do professor (foto, Restritos, zona de perigo)
├── casavequia.html     ← DIÁRIO PRINCIPAL do administrador (~1,1 MB)
├── herminio.html       ← Diário da 2ª escola
├── meu-diario.html     ← Página de UMA escola do professor (?escola=<id>)
├── CLAUDE.md           ← Este arquivo
├── manifest.json       ← PWA manifest
├── sw.js               ← Service worker (cache offline)
├── icon-192.png
├── icon-512.png
├── assets/             ← Imagens e recursos estáticos
├── firebase-config.js  ← Config Firebase (Firestore para status do plano anual)
└── *.py                ← Scripts Python de manutenção (podem ser deletados)
```

**GitHub:** `https://github.com/10pauloacre-creator/relatorio-2026`
**Vercel:** projeto `relatorios` na conta `10pauloacre-creator` (equipe `10pauloacre-creators-projects`), ligado ao GitHub desde 19/09/2026 → domínio oficial **`https://relatorio.skin`** (o `relatorios-ten-pi.vercel.app` foi removido em 19/09/2026; `www.relatorio.skin` não existe). Cada push na `main` publica nos dois lugares (GitHub Pages e Vercel). O `vercel.json` roda `npm run build:pages` e serve só `dist/` (a mesma lista de `scripts/build-web-release.js`). O branch `gh-pages` também gera uma prévia no Vercel, sem efeito.
**Branch:** `main`
**Último commit:** `f5dc531` — relatos 09-10/04, contador e plano LGG renovados

---

## 3. ESTRUTURA DO index.html

### Seções HTML (navegadas por abas na navbar)

| ID da Seção | Aba | Conteúdo |
|---|---|---|
| `sec-all` | Visão Geral | Relatos gerais de todas as turmas |
| `sec-t1` | 1ª Série | Relatos detalhados + presença + atividades |
| `sec-t2` | 2ª Série | Relatos detalhados + presença + atividades |
| `sec-t3` | 3ª Série | Relatos detalhados + presença + atividades |
| `sec-t6` | 6º Ano | Relatos de Artes do 6º Ano |
| `sec-plano` | Plano Anual | Planejamento por disciplina/bimestre |
| `sec-cron` | Cronograma | Grade horária semanal |
| `sec-cont` | Contador | Progresso de h/aulas por disciplina |

### Marcadores de Injeção (onde novos relatos são inseridos)

```html
<!-- RELATOS_INICIO -->   ← seção geral (sec-all)
<!-- T1_INICIO -->        ← sec-t1 (1ª Série)
<!-- T2_INICIO -->        ← sec-t2 (2ª Série)
<!-- T3_INICIO -->        ← sec-t3 (3ª Série)
```
> **Nota:** O 6º Ano (`sec-t6`) não tem marcador automático — relatos são injetados manualmente por script Python.

### Funções JavaScript Principais

| Função | O que faz |
|---|---|
| `aba(id, btn)` | Troca de aba na navbar |
| `tog(h)` | Abre/fecha um relato (accordion) |
| `itab(btn, pid)` | Troca sub-aba dentro de um relato (Relato/Presença/Atividades) |
| `abrirModalRelato()` | Abre o modal "✏️ Novo Relato" |
| `fecharModalRelato()` | Fecha o modal |
| `toggleConfigGH()` | Mostra/esconde campos de configuração |
| `salvarConfigGH()` | Salva credenciais no localStorage |
| `carregarConfigGH()` | Lê credenciais do localStorage ao abrir modal |
| `voltarEtapa1()` | Reseta modal para etapa 1 (rascunho) |
| `gerarComIA()` | Chama Groq API, gera HTML, mostra preview |
| `publicarNoGitHub()` | Busca arquivo do GitHub, injeta HTML, faz PUT |
| `_extrairSecao(texto, chave)` | Parseia resposta da IA (delimitadores `===SECAO_X===`) |
| `renderPresenca()` | Renderiza grade de presença a partir do objeto `PRESENCA` |
| `renderAtividades()` | Renderiza grade de atividades a partir do objeto `ATIVIDADES` |
| `renderCont()` | Renderiza cards do contador de aulas |

### Objetos de Dados JavaScript (atualizados manualmente a cada relato)

```javascript
// Alunos por turma (números de chamada)
const ALUNOS = { t1: [...], t2: [...], t3: [...], t6: [...] }

// Presença: faltaram = sem justificativa, faltJ = justificados
const PRESENCA = {
  'pl-t1-MMDD': { turma:'t1', faltaram:[n,n,...], faltJ:[n,...] },
  ...
}

// Atividades: fez = entregou, naoFez = não entregou
const ATIVIDADES = {
  'atv-t1-MMDD': { turma:'t1', fez:[n,...], naoFez:[...], parcial: true/false },
  ...
}

// Contador de h/aulas por disciplina (atualizado a cada relato)
const DISC = [
  { g:'lp', t:'1ª Série', d:'Língua Portuguesa', sw:2, feitas:8, bim:20, tot:80 },
  ...
]
```

**Formato do idData:** `MMDD` — ex: 07 de abril = `0407`, 10 de abril = `0410`

---

## 4. CREDENCIAIS E SEGREDOS

> ⚠️ As chaves reais NÃO ficam no código — ficam no `localStorage` do navegador.

| Segredo | Onde fica | Como configurar |
|---|---|---|
| **Token GitHub** | `localStorage('gh_token')` | Gerar em github.com → Settings → Developer → Personal Access Tokens (permissões: `repo` + `workflow`) |
| **Chave API Groq** | `localStorage('gemini_key')` | Obter em console.groq.com/keys (tier gratuito) |
| **Usuário GitHub** | `localStorage('gh_user')` | `10pauloacre-creator` |
| **Repositório** | `localStorage('gh_repo')` | `relatorio-2026` |

> O campo no modal chama-se "Chave API Groq" mas a variável localStorage ainda usa o nome `gemini_key` (legado da migração Gemini→Groq).

---

## 5. FLUXO DE PUBLICAÇÃO AUTOMÁTICA (Modal "✏️ Novo Relato")

```
1. Professor clica em "✏️ Novo Relato"
2. Escreve rascunho de texto livre
3. Clica em "🤖 Gerar com Groq"
   → POST https://api.groq.com/openai/v1/chat/completions
   → Modelo: llama-3.3-70b-versatile
   → Resposta parseada em 4 blocos: ===SECAO_GERAL===, ===SECAO_T1===, ===SECAO_T2===, ===SECAO_T3===
4. Preview do HTML gerado é exibido
5. Clica em "🚀 Publicar no GitHub"
   → GET github.com/repos/.../contents/index.html  (busca SHA + conteúdo)
   → Se arquivo >1MB: usa download_url para buscar conteúdo bruto
   → Injeta HTML nos marcadores (<!-- RELATOS_INICIO -->, etc.)
   → PUT github.com/repos/.../contents/index.html  (envia novo conteúdo + SHA)
6. Site atualiza em ~2 minutos
```

---

## 6. FLUXO MANUAL (quando Claude faz diretamente)

Quando o professor envia o rascunho **diretamente no chat**, Claude:

1. Escreve HTML dos relatos (formato `.ea` accordion) para cada turma
2. Injeta via `Edit` tool nos marcadores do `index.html` local
3. Atualiza `PRESENCA` com faltaram/faltJ por número de chamada
4. Atualiza `DISC` (contador de h/aulas) com as novas horas
5. Atualiza `📅 Última atualização: DD/MM/AAAA`
6. Faz `git add index.html && git commit && git push`

---

## 7. FORMATO DO RELATO (padrão HTML interno)

### Entrada de relato (`.ea` accordion)
```html
<div class="ea">
  <div class="eh" onclick="tog(this)">
    <div class="edb"><div class="d">DD</div><div class="my">Mes 2026</div></div>
    <div class="em">
      <div class="ed">DISCIPLINA — Xh/aula</div>
      <div class="ec">
        <span class="ch ch-h">⏰ HORÁRIO</span>
        <span class="ch ch-p">👥 X presentes</span>
        <span class="ch ch-i">📖 TEMA</span>
        <span class="ch ch-a">⚠️ N obs.</span>
      </div>
    </div>
    <div class="et">▾</div>
  </div>
  <div class="ec2">
    <div class="itabs">
      <button class="itab on" onclick="itab(this,'r-tX-MMDD')">📄 Relato</button>
      <button class="itab" onclick="itab(this,'p-tX-MMDD')">👥 Presença</button>
      <button class="itab" onclick="itab(this,'a-tX-MMDD')">📝 Atividades</button>
    </div>
    <div class="ipane on" id="r-tX-MMDD">
      <!-- LEMBRETE (opcional): .lembrete > .lembrete-tag + .lembrete-txt -->
      <!-- CONTEÚDO: .st + .ct -->
      <!-- COMPORTAMENTO: .st + .ol > .oi(.nt) > .oi-ic + div > .oa + .od -->
      <!-- FALTAS: .st + .ng -->
      <!-- ANÁLISE IA: .ai2 > .ai2h + .ai2i(...) + .ai2s -->
    </div>
    <div class="ipane" id="p-tX-MMDD">
      <div class="pres-av">...</div>
      <div id="pl-tX-MMDD" class="pres-grid"></div>  <!-- renderizado por JS -->
    </div>
    <div class="ipane" id="a-tX-MMDD">...</div>
  </div>
</div>
```

### Bloco Análise IA (`.ai2`)
```html
<div class="ai2">
  <div class="ai2h"><div class="tg">✦ Análise IA</div><span>RESUMO_SITUACAO</span></div>
  <div class="ai2i">
    <div class="ai2a">NOME DO ALUNO</div>
    <div class="ai2p CLASSE">NÍVEL obs. — tipo</div>  <!-- CLASSE: warn | grave | (vazio+style) -->
    <div class="ai2t">Recomendação.</div>
  </div>
  <div class="ai2s">💡 SUGESTÃO PEDAGÓGICA.</div>
</div>
```
- `ai2p warn` → 1ª/2ª ocorrência
- `ai2p grave` → 3ª+ ou grave
- `ai2p` com `style="color:var(--ai)"` → destaque positivo

---

## 8. TURMAS E ALUNOS

| Turma | ID | Alunos | Disciplinas |
|---|---|---|---|
| 1ª Série E.M. | `t1` | 15 | LP, T.Ling., T.C.H. |
| 2ª Série E.M. | `t2` | 23 | LP, T.Ling., T.C.H., Artes |
| 3ª Série E.M. | `t3` | 18 | LP, T.Ling., T.C.H., Artes |
| 6º Ano E.F. | `t6` | 36 | Artes (herdada — 4 aulas já lecionadas por outra professora) |

---

## 9. CONTADOR DE AULAS — ESTADO ATUAL (21/04/2026)

| Disciplina | Turma | H/aulas dadas | Meta bimestral | Meta anual |
|---|---|---|---|---|
| LP | 1ª Série | 10 | 20 | 80 |
| LP | 2ª Série | 15 | 30 | 120 |
| LP | 3ª Série | 15 | 30 | 120 |
| T.Ling. | 1ª Série | 2 | 10 | 40 |
| T.Ling. | 2ª Série | 4 | 10 | 40 |
| T.Ling. | 3ª Série | 4 | 10 | 40 |
| T.C.H. | 1ª Série | 2 | 10 | 40 |
| T.C.H. | 2ª Série | 6 | 20 | 80 |
| T.C.H. | 3ª Série | 2 | 10 | 40 |
| Artes | 6º Ano | 6 | 10 | 40 |
| Artes | 2ª Série | 1 | 10 | 40 |
| Artes | 3ª Série | 1 | 10 | 40 |

> **Atenção 6º Ano:** O professor herdou a turma após 4 aulas de outra professora. O contador parte de 5 (4 anteriores + 1 do professor em 10/04) + 1 virtual em 17/04 = 6.

---

## 10. COMANDOS QUE O PROFESSOR COSTUMA DAR

```
"Suba o relatório de hoje: [rascunho livre]"
→ Claude gera HTML, injeta, atualiza PRESENCA e DISC, faz push

"Verifique se o contador está correto"
→ Claude confere DISC vs relatos existentes

"Atualize o plano anual de [disciplina]"
→ Claude substitui os painéis bim-panel no sec-plano

"Finalize" / "Continue de onde parou"
→ Claude conclui a última tarefa em andamento

"Já fez push no GitHub?"
→ Claude verifica e faz git push se necessário
```

---

## 11. BUGS CORRIGIDOS

| Bug | Causa | Correção |
|---|---|---|
| Botão "✏️ Novo Relato" não clicava | Aspa simples não escapada na linha 6190 do JS | `\'` nos atributos onclick do array `prompt` |
| String não fechada travando todo o JS | Faltava `'` no final da linha 6197 | Adicionado `'` antes da vírgula |
| "Marcador RELATOS_INICIO não encontrado" | Arquivo >1MB: GitHub API não retorna `content` inline | Fallback para `download_url` quando `fileData.content` é vazio |
| Erro UTF-8 ao publicar | `decodeURIComponent(escape(atob(...)))` quebrava com caracteres portugueses | Substituído por `new TextDecoder('utf-8').decode(Uint8Array.from(...))` |
| **Relatos somem após reload** | SW cache `v7` nunca atualizado + `index.html` pré-cacheado. Browsers serviam HTML desatualizado do cache | Bumped cache para `v8`, removido `index.html` e URL raiz da lista ASSETS no `sw.js` |
| Relato `r-t3-0410b` sem aba Presença | Aba 👥 esquecida na criação | Adicionadas aba e div `pl-t3-0410b` |
| **Casavequia trava ao abrir (só rola, não clica)** | `pcRefreshPresencaVisuals`/`pcRefreshAtividadesVisuals` faziam um `document.querySelectorAll` por aluno de cada relato: ~4.600 varreduras de um DOM de 57 mil elementos (~260 milhões de visitas a nós) a cada sync do Supabase | `pcIndexarCelulas()`/`pcIndexarStats()` indexam `[data-pres]`/`[data-atv]`/`[data-stat]` numa única varredura; as funções passaram a consultar o índice |
| **Casavequia trava ao abrir (2ª causa)** | `editor.js`: `_editorIsProtectedElement` testava 30 seletores (matches + closest) por elemento em 57 mil nós, e `_editorCapturarBaselineProtegido` serializava `outerHTML` de raízes protegidas aninhadas (`.ea > .ec2 > .ipane`) — custo quadrático a cada `pushNow` | Seletor único combinado `EDITOR_PROTECTED_SELECTOR`; marcação apenas das raízes protegidas mais externas; `_editorIndexarNodes()` no lugar dos `querySelector` por chave |

| **Tela de conta travada (21/09/2026)** | Em `entrar.html`, `#abertura` e `#voltando` têm `hidden`, mas as classes `.rel-auth-gate`/`.voltando` trazem `display:flex`, que vence o atributo. A partir da 2ª visita a abertura ficava invisível (opacidade 0) por cima de tudo e engolia cliques e digitação. Também: brilhos do fundo vazavam (rolagem lateral de 220 px e espaço vazio abaixo do cartão) e `backdrop-filter` pesado sobre brilhos animados | `[hidden]{display:none!important}` na página e `.rel-auth-gate[hidden]` no script; abertura removida do DOM quando não é usada e com `pointer-events:none`; trava só com rolagem vertical, brilhos em `position:fixed`, sem `backdrop-filter`; cartão compacto em telas baixas |

| **Modo escuro ilegível em modais (21/09/2026)** | `--vd`/`--vm` viram cor de fundo no escuro: título, rótulos e tópicos do Novo Diário sumiam; feriados do calendário herdavam o texto azul-escuro da paleta clara; o modal "Relatórios diários" mantinha a coluna creme e a barra verde | Regras `html.dark-2026` no próprio `novo-diario.js` (`injetarEstilo`) e em `dark-mode-2026.css` (calendário: título do feriado em vermelho e o resto em branco; `pc-diary-*`/`rh-diary-*` em grafite + laranja). Novo Diário ganhou ✕ e Esc: com algo escrito pergunta "Salvar / Sair sem salvar / Continuar editando" (`pedirFechar`, `prepararFechar`) |

> **Regra da tela de conta:** depois de mexer em `entrar.html` ou no CSS/HTML da trava em `supabase-report-sync.js`, rode `npm run check:login` (precisa de `npm i --no-save puppeteer-core` e Chrome/Edge instalado). Ele abre a página local em 7 tamanhos de tela e falha com camada invisível por cima, elemento `hidden` ainda na tela, rolagem lateral, espaço vazio, botão fora de alcance ou campo que não aceita digitação. Nunca dê `display` por classe a um elemento que usa o atributo `hidden` sem uma regra `[hidden]{display:none!important}`.

> **Regra de ouro após esses bugs:** nunca colocar `document.querySelector(All)` dentro de laço que percorre alunos/relatos. Indexe o DOM uma vez e consulte o índice. O DOM da Casavequia tem ~57 mil elementos.

---

## 12. BACKUP

**Arquivo:** `backup/backup-YYYYMMDD.json`  
**Conteúdo:** DISC, PRESENÇA, ALUNOS, lista de relatos, config, relatório de vistoria  
**Regra:** Atualizar o backup a cada novo relato (`cp` ou reescrever o JSON com os novos dados)

Backup atual: `backup/backup-20260424.json`

---

## 13. PENDÊNCIAS E PRÓXIMOS PASSOS

### Imediato
- [ ] Testar o botão "✏️ Novo Relato" com a chave Groq configurada no navegador (fluxo completo)
- [ ] Adicionar marcador `<!-- T6_INICIO -->` na seção do 6º Ano para injeção automática

### Em breve
- [ ] Relatos com apenas 2 abas (aulas virtuais sem atividade formal) mostrarão aviso do `verificarAbasRelatos()` — é esperado; pode ser ignorado ou adicionar aba vazia se incomodar

### Quando o professor enviar novo relato
1. Ele escreve rascunho no chat
2. Claude gera HTML → injeta → atualiza PRESENCA + DISC → atualiza `backup/backup-YYYYMMDD.json` → `git push`
3. Ou: usar o botão "✏️ Novo Relato" diretamente no site (fluxo automático via Groq)

### Não implementado ainda
- [ ] IA interna da página para edição antes de publicar (foi descartado por ora)
- [ ] Histórico de versões por data
- [ ] Validação do HTML gerado pela IA antes de injetar

---

## 14. REGRAS FIXAS DO PROJETO

1. **Vanilla JS apenas** — sem React, Vue ou qualquer framework
2. **Arquivo único** — tudo em `index.html`, sem múltiplos arquivos HTML
3. **Commits diretos na main** — sem branches, sem PRs
4. **Encoding UTF-8** sempre — usar `TextDecoder`/`TextEncoder` para base64
5. **Não usar `onclick` inline com aspas simples dentro de strings JS** — escapar com `\'`
6. **Não usar scripts Python em produção** — são apenas para manutenção pontual
7. **Todo relato diário OBRIGATORIAMENTE deve ter 3 abas:** `📄 Relato`, `👥 Presença` e `📝 Atividades` — a função `verificarAbasRelatos()` exibe aviso visual quando alguma falta
8. **Botões do Plano Anual em linha única:** `[ N ]  Título          [📅 Planj.][✓ Aplic.][⤳ Pulad.][📋 SIMAED]`
9. **Notificações desativadas no mobile** (≤680px ou User-Agent Mobi/Android/iPhone)

---

## 15. NOTAS BIMESTRAIS ↔ BIBLIOTECA DIGITAL (Supabase compartilhado)

O Relatório e a Biblioteca Digital (`C:\Projetos\AXION PROEDUQ\BIBLIOTECA-DIGITAL`) usam o **mesmo projeto Supabase** (`vgceathgwvtmjxbdpecr`). A integração é feita por tabelas e funções nesse banco. Os SQL ficam em `supabase/2026-09-16-etapa*.sql`.

**Decisões do professor:** nota do bimestre = média entre trabalhos (0–10) e prova (0–10). Comportamento **desconta nota** desde 17/09/2026 (Etapa 8B; antes só era registrado). A integração vale para as duas escolas. O 6º Ano fica fora da Biblioteca.

**Login:** `supabase-report-sync.js` exige a conta admin (`10pauloacre@gmail.com`, a mesma da Biblioteca). `report_sync_state` só é lido e gravado por essa conta.

**Tabelas oficiais** (só o admin lê e grava):
| Tabela | Conteúdo |
|---|---|
| `relatorio_turmas` / `relatorio_aluno_vinculo` | painel do Relatório → aluno da Biblioteca (mesma escola, grupo e série; vínculo refeito por gatilho) |
| `relatorio_metas_bimestrais` | h/aula por bimestre, total do ano e crédito anterior de cada turma/disciplina (enviados pela página) |
| `relatorio_bimestres_por_carga` (view) | início, fim, horas e situação de cada bimestre, **medidos pela soma de aulas** |
| `relatorio_turmas_diarias` | turma do diário (`t1`, `t23`, `t89`…) → painéis |
| `relatorio_aulas` | uma linha por aula; `atividade_vale_ponto` é decisão do professor |
| `relatorio_lancamentos` | presença e atividade de cada aluno em cada aula |
| `relatorio_ocorrencias` | observações `.oi` com data, horário e aluno; `gravidade*` é decisão do professor |

**Bimestre = soma de aulas, NUNCA calendário** (decisão do professor). Com meta de 10 h/aula, o 1º bimestre termina na 10ª, o 2º na 20ª… O bimestre de cada aula (`b`) vem da mesma distribuição do contador: `pcDiaryAssignBimestersByLoad` na Casavequia (chave do relato `p-<código>`) e `rhColetarMapaBimestresPanes` na Hermínio. A aula que cruza o limite fica no bimestre em que começou. "Aguardando" fica fora do cálculo de nota até ser marcado como fez ou não fez.

**Nota de trabalho (Etapa 3):** view `relatorio_notas_trabalho`. Valor de cada atividade = 10 ÷ atividades que valem ponto no bimestre. Nota = 10 × fez ÷ (fez + não fez); "aguardando" e "pendente" ficam fora. O interruptor "vale ponto" (`instalarInterruptorValePonto`, inserido ao abrir a aba 📝 Atividades, com `data-runtime-ui` que o `editor.js` remove antes de salvar o layout) fica em `valePonto` no payload diário e chega ao banco como `vp`.

**Escala do boletim:** o professor vê e digita trabalhos 0–10 e prova 0–10, e a nota do bimestre é a média. O **armazenamento continua em 0–5** (campos `trabalhos`/`prova`): média exibida = soma armazenada, notas antigas intactas e `boletim_normalizado` compatível. Em `casavequia-alunos-shared.js` use `paraExibicao`/`formatNota10` e nunca exiba o valor cru. O módulo `assets/js/notas-bimestrais.js` busca a nota calculada no banco (`usarNumero:false` para turmas do diário que juntam séries).

**Motor único do boletim:** `assets/js/boletim-regras.js`. A Biblioteca tem uma **cópia idêntica** (`assets/js/boletim-regras.js`, usada pelo perfil do aluno). Depois de alterar, rode `node scripts/check-copias-compartilhadas.js --copiar` e faça commit nos dois repositórios. Regras:
- a nota do bimestre só fecha com trabalho E prova;
- bimestres automáticos (`relatorio_regras_escola`; Casavequia = 3º e 4º; Hermínio = nenhum, sem recuperação): o padrão é o cálculo de trabalhos e a prova da Biblioteca (view `relatorio_provas_bimestrais`, 0–10). O professor pode ajustar à mão (origem "ajuste"), e o ajuste vale até ele voltar ao automático;
- recuperação semestral: o 2º recupera o 1º e o 4º recupera o 3º; se ainda houver bimestre abaixo de 7, prova única (`aluno.recuperacao[disciplina]["1"|"2"]`, já em 0–10). Com 7 ou mais, recupera os bimestres; abaixo disso, reprovado.

O aluno vê o boletim em `get_meu_boletim(aluno_id, progress_session_token)`: só a sessão do próprio aluno ou o admin. **Hermínio: boletins com cálculo próprio** (decisão do professor, inclusive o `autofillMissingGrades`); desde 18/09/2026 recebem o desconto por comportamento e o bônus do Ranking de Poder por `assets/js/herminio-regras-extras.js` (Etapa 8E), com os mesmos dados do banco. **Prova da Biblioteca vence na Hermínio (Etapa 9C, 19/09/2026):** quando o aluno fez a Avaliação Bimestral no livro, a nota de prova do bimestre é a da Biblioteca, mesmo com nota já lançada (inclusive as do autofill); sem prova feita, fica a manual. No banco: `relatorio_regras_escola.prova_biblioteca_vence` (só Hermínio) faz o `get_meu_boletim` ignorar a prova digitada. Nos painéis: `HerminioRegrasExtras.aplicarProvas` grava a nota (0–10 ÷ 2, prova com duas casas) a cada carga (1 min) e o rótulo vira "Nota de prova · prova da Biblioteca"; editar esse campo não adianta, a prova volta. SQL em `supabase/2026-09-19-etapa9c-herminio-prova-biblioteca.sql`.

**Chave de disciplina (Etapa 8E):** `relatorio_disciplina_chave()` (banco) e `HerminioRegrasExtras.chave()` (painel) igualam "Língua Inglesa"/"Inglês", "Língua Espanhola"/"Espanhol" e "Artes"/"Arte". O `get_meu_boletim` e o desconto comparam disciplina por ela; sem isso, nota de trabalho, prova e desconto de Inglês e Espanhol da Hermínio se perdiam. SQL em `supabase/2026-09-18-etapa8e-regras-herminio.sql`.

**Segurança e tempo real (Etapas 8C e 8D):**
- **`boletim_normalizado` fechada:** a view roda como dono do banco e estava aberta para a chave pública, que lia nome e notas de todos. Agora só responde ao professor logado (`private.is_relatorio_admin`); `report-boletim-api.js` (página de notas do admin na Biblioteca) envia o token da sessão. O aluno vê o próprio boletim só por `get_meu_boletim`. Desde 19/09/2026 (Etapa 9B) a página de notas do admin (`bimester-grades-admin.js`) NÃO usa mais essa view (só tinha as notas digitadas, em 0–5, e mostrava todo mundo com 0,0): ela chama `get_meu_boletim` de cada aluno da turma (6 em paralelo) e calcula com `boletim-regras.js`, igual ao perfil do aluno; o botão da linha abre o Relatório Individual.
- **Aviso em tempo real:** gatilhos por instrução em `relatorio_lancamentos`, `relatorio_ocorrencias`, `relatorio_aulas` e `report_sync_state` mandam `realtime.send` no canal público "relatorio-atualizado" (evento "atualizado"), no máximo um a cada 5 s. O aviso só leva a hora, nenhum dado. O boletim aberto no app busca de novo em 6–10 s; com o app em segundo plano, busca ao voltar. Falha no aviso nunca atrapalha a gravação.

**Desconto por comportamento (Etapa 8B, decisão de 17/09/2026):** SQL em `supabase/2026-09-17-etapa8b-provas-no-relatorio-e-desconto-conduta.sql`.
- **Valores:** leve 0,25 · médio 0,5 · grave 1,0 · muito grave 2,0 por ocorrência de quem praticou o ato (`relatorio_pontos_conduta`).
- **Onde desconta:** na nota do bimestre da disciplina em que aconteceu, até 2,0 por bimestre, com a nota nunca abaixo de 0. Entra antes da recuperação, então o bimestre seguinte ou a recuperação semestral ainda podem recuperar.
- **Não descontam:** vítima, testemunha, envolvido, destaque, "sem infração", registros positivos e ocorrência sem disciplina.
- **Dados:** `relatorio_desconto_conduta` (boletim do aluno, `descontoConduta` em cada bimestre) e view `relatorio_descontos_conduta` (painel). O motor aplica em `calcularBimestre` (`notaSemDesconto`, `descontoConduta`, `ocorrenciasConduta`).
- **Interruptor por escola:** `relatorio_regras_escola.desconto_conduta`, ligado nas duas escolas (Hermínio desde 18/09/2026).
- **IA:** o prompt da classificação avisa que a gravidade custa nota; por isso, na dúvida, o nível menor.

**Relatório Individual Anual do Aluno (Etapas 7 e 8):** um documento só, para o professor e para o aluno, montado a partir do modelo do professor (`docs/modelo_relatorio_individual_anual_aluno.html`, na Biblioteca). SQL em `supabase/2026-09-17-etapa7-relatorio-individual.sql`.
- **Dados:** RPC `relatorio_individual(aluno, bimestre, sessão)` devolve notas (via `get_meu_boletim`), aulas com tema, presença e atividade, frequência em h/aula e as ocorrências com data, horário e gravidade. Lê o administrador ou o próprio aluno com a sessão dele.
- **Documento:** `assets/js/relatorio-individual.js` (cópia idêntica nos dois repositórios, conferida por `scripts/check-copias-compartilhadas.js`) devolve o HTML completo: cabeçalho oficial, identificação, 1 Notas, 2 Relatório de provas, 3 Atividades feitas, 4 Observações e assinatura. Imagens em `assets/img/relatorio-individual/` (Relatório) e `assets/images/relatorio-individual/` (Biblioteca); passe o caminho ABSOLUTO em `recursos`, porque a janela nasce em about:blank.
- **Impressão:** abre em janela própria com "🖨️ Imprimir / Salvar PDF" (`window.print()`); o PDF sai pela tela de impressão do navegador. Padrão A4, margem 15 mm, Times New Roman 12pt.
- **Sempre anual e sempre atual:** o documento é montado na hora, então cada novo relato, prova, atividade ou observação entra na abertura seguinte. "Última atualização" = data do registro mais recente.
- **Onde fica:** painel do professor, no perfil do aluno ("Relatorio Individual Anual", com escolha do componente curricular); e perfil do aluno na Biblioteca, na aba BOLETIM ("📄 MEU RELATÓRIO").
- **Relatório de provas:** cada Avaliação Bimestral do livro aparece como o aluno vê ao terminar a prova (nota, aproveitamento, acertos, erros, não respondidas, tempo e desempenho por habilidade), a partir da view `relatorio_provas_livros` (log de respostas de `quiz_results`).
- **Comportamento:** coluna "Comportamento" na tabela de notas (desconto aplicado) e "Pontos perdidos" por ocorrência nas observações.

**Bônus do Ranking de Poder (Etapa 6):** a tela do ranking promete "+N na média" por nível. Decisão do professor: o +N vale sobre a soma anual, ou seja, +N÷4 só na **média final do ano**. SQL em `supabase/2026-09-17-etapa6-bonus-ranking-poder.sql`.
- **Tabela:** Novato e Aprendiz +0, Camponês +0,25, Gladiador +0,5, Rei +1,5, Mago Supremo +2.
- **Limites:** máximo de 10, uma casa decimal. Não muda as notas dos bimestres nem a recuperação.
- **Onde é calculado:** no motor (`nivelPoder`, `mediaFinal`), que usa os mesmos limites de pontos do `recalc_nivel`.
- **Interruptor por escola:** `relatorio_regras_escola.bonus_poder`, ligado nas duas escolas (Hermínio desde 18/09/2026).
- **Dados:** pontos em `relatorio_poder_alunos` (painel) e `pontosPoder` no `get_meu_boletim` (aluno).

**Aluno novo entra sozinho (Etapa 5B):** a lista de alunos da Biblioteca é a fonte. Detalhes em `supabase/2026-09-17-etapa5b-alunos-novos-automaticos.sql`.
- **Registro:** o gatilho em `alunos` (cadastro ou troca de turma) registra em `relatorio_alunos_adicionados` todo aluno de uma turma do Relatório que não está na lista fixa das páginas.
- **Listas das páginas:** o módulo `assets/js/relatorio-alunos-adicionados.js` é carregado antes das listas `ALUNOS`, `ALUNOS_RH` e `STUDENTS` dos painéis e acrescenta esses alunos no fim, com o próximo número livre. Se a lista mudou, a página recarrega uma vez.
- **Data de entrada (`de`):** aulas anteriores aparecem como "Entrou dd/mm", sem presença nem atividade.
- **Chamada no banco:** a publicação grava a chamada completa em `relatorio_chamada`, com o 4º item do aluno no retrato = adicionado, e limpa quem já foi fixado na página.
- **Não renumerar à mão:** para fixar o aluno no HTML, use o mesmo número que ele já recebeu.
- **Vínculo imediato (Etapa 9B, `supabase/2026-09-19-etapa9b-sincronia-notas.sql`):** `relatorio_sincronizar_vinculos` também vincula os alunos de `relatorio_alunos_adicionados`, com o mesmo id/número do `completarPainel` (maior da lista fixa + ordem), e um gatilho roda no cadastro. Antes o vínculo só nascia quando o painel da turma era salvo de novo, e a prova do aluno novo não chegava a lugar nenhum (caso Clarisse, 2ª Série). `get_meu_boletim` inclui o aluno vinculado mesmo fora da lista salva e devolve `scopeKey`.
- **Turma nova:** exige criar a aba ou painel e a linha em `relatorio_turmas` e `relatorio_turmas_diarias`. O resto (vínculo, notas, provas, observações, relatório) é automático.

**Prova só com login (Biblioteca):**
- **No livro:** `prova-runtime.js` só inicia a prova com o aluno logado (sessão em `bdm-aluno`) ou com o admin.
- **No banco:** o gatilho `trg_quiz_results_prova_login` só aceita resultado "prova-..." com o cabeçalho `x-bdm-sessao` válido do próprio aluno (enviado por `quiz-save-runtime.js`).
- **Admin:** o resultado vira "prova-...-teste-N", rótulo "Teste (N)", fora do boletim.

**Prova da Biblioteca no boletim (Etapa 5):** a view `relatorio_provas_bimestrais` lê as Avaliações Bimestrais dos livros (`prova-runtime.js`), gravadas em `quiz_results` com `quiz_id` "prova-<tema>" e "prova-<tema>-rec". Detalhes em `supabase/2026-09-17-etapa5-provas-dos-livros.sql`.
- **Nota:** acertos ÷ questões × 10, valendo a maior entre a prova e a recuperação do livro.
- **Bimestre, escola e série:** saem do caminho do livro. O resultado só entra no painel da mesma escola e série.
- **Sistema antigo** (`bimester_grades`): continua valendo onde tiver nota.
- **Prioridade:** a prova digitada pelo professor vence; sem ela, entra a da Biblioteca. No painel da Casavequia, o campo "Nota de prova" mostra a da Biblioteca quando não há nota digitada (e os botões −/+ partem dela). No 3º e 4º bimestres da Casavequia, a da Biblioteca é o padrão, com ajuste opcional.
- **Detalhe da prova:** `notas-bimestrais.js` (`obterProvaDetalhe`) e `get_meu_boletim` (`provaDetalhe`) mostram a prova e a recuperação do livro.
- **Risco conhecido:** a correção da prova é feita no aparelho do aluno, e `quiz_results` aceita inserção com a chave pública. O primeiro resultado fica travado, e só o admin apaga (`reset_prova_aluno`).

**Conduta: gravidade e Observações (Etapas 4 e 4B):** a Edge Function `classificar-ocorrencias` fica no repositório da Biblioteca. As regras do professor (tabela de níveis, regras operacionais, distinções e interferência na aula) estão em `supabase/functions/_comum/conduta.ts`. Deploy: `supabase functions deploy classificar-ocorrencias --no-verify-jwt --use-api` (a própria função confere o acesso). SQL em `supabase/2026-09-17-etapa4b-observacoes-conduta.sql`.
- **A gravidade da IA vale sem confirmação** (decisão de 17/09/2026). O professor pode trocar no selo (`relatorio_definir_gravidade`, origem "professor"), e a troca nunca é sobrescrita.
- A IA classifica **só o ato** (`nivel_base`). A reincidência fica no banco (`relatorio_aplicar_classificacao`): com 2 ou mais registros da mesma categoria em 60 dias, sobe no máximo 1 nível. Conversa, celular, atividade, material e desatenção não passam de médio só por repetição. Cola é grave de saída. Acidente é `sem_infracao`.
- **Observações:** cada relato aberto ganha "📝 Observações", com texto e horário (padrão: agora, ajustável). O texto vai para `relatorio_observacoes`. A IA cria uma linha em `relatorio_ocorrencias` por envolvido, com `origem='observacao'` e `papel` autor/vítima/testemunha/envolvido/destaque, ligada ao aluno. A publicação dos relatos nunca remove essas linhas.
- **Segundo plano:** o pg_cron `relatorio-ia-conduta` roda a cada minuto e chama a função só quando há trabalho. O token fica em `private.relatorio_ia_config` e não sai do banco. Cada falha espera mais antes da nova tentativa, até 5 tentativas.
- **Privacidade:** os nomes da turma viram «A7» antes de ir para a IA (`pseudonimizar`).
- A ficha do aluno no painel da Casavequia mostra tudo em "Conduta registrada pela IA" (`assets/js/relatorio-conduta-aluno.js`).
- `relatorio-lancamentos.js` mostra "☁️ Banco atualizado às HH:MM", confirmando que os relatos, inclusive os escritos à mão no HTML, chegaram ao banco. A publicação só acontece quando a página é aberta com o login do professor.
- **Comportamento desconta nota** (Etapa 8B, abaixo).

**Publicação:** `assets/js/relatorio-lancamentos.js` + `pcMontarRetratoLancamentos()` (casavequia.html) e `rhMontarRetratoLancamentos()` (herminio-main.js) enviam o retrato completo para `relatorio_publicar_lancamentos` a cada mudança (debounce de 4s, só envia quando algo mudou). O montador reaproveita as regras de exibição (`_atvStatus`, `pcResolvePresenceStatus`, `rhGetEstadoAtual`). **Se mudar uma dessas regras, o retrato muda junto.** Se o retrato vier menor que 80% do que já está publicado, nada é marcado como removido.

---

## 16. PROJEÇÕES INTEGRADAS (aba Contador das duas escolas)

`planejamento-aulas-2026.html` é uma página só, embutida em iframe na aba Contador. Sem parâmetro atende a Casavequia; com `?escola=herminio` atende a Hermínio (config em `ESCOLAS_PLANEJADOR`). Cada escola tem chaves próprias no localStorage e escopos próprios no Supabase (`casavequia:*` / `herminio:projection-seed|planner-state:shared-v1`).
- **Semente:** a página da escola monta turmas, disciplinas, metas, aulas lançadas (mesma soma do Contador), registros datados e calendário — `pcBuildProjectionSeed()` (casavequia.html) e `rhBuildProjectionSeed()` (herminio-main.js).
- **Ciclo de estudos da Hermínio (rodízio, decisão de 18/09/2026):** configurado só em `assets/js/herminio-ciclo.js` e simulado por `assets/js/projecao-ciclo.js` (o mesmo motor serve o Contador e a tela de projeções). Uma turma por vez: quando a anterior encerra TODAS as disciplinas, a seguinte já começa, inclusive no restante do mesmo dia. Nenhum horário fica vago: o motor percorre os dias num laço único, e cada horário passa para a próxima disciplina ou para a próxima turma. Cada trilha tem dias fixos; a disciplina da vez ocupa os dias até completar a carga anual, e a próxima da fila assume em seguida. Ordem atual: 8º/9º (LP seg/qua/qui + Arte ter/qua/sex) → 2ª/3ª (LP seg/qua/qui; Espanhol → Inglês → Arte → Redação ter/qua/sex). Se a disciplina encerra no meio do dia, as horas restantes já vão para a próxima (mesmo de outra trilha). Quando uma trilha acaba, a disciplina ainda ativa assume os dias dela. A 1ª Série (`concluidas: ['t1']`) encerrou o ciclo: aparece concluída e o banco recebe como `credito` as horas que faltavam para fechar os bimestres. A linha do tempo marca "começa/encerra/assume" e o término do ano letivo (23/12/2026). Na grade da tela, seg–sex vêm do ciclo (bloqueados). O **sábado** é editável: as horas vão para a disciplina da linha se ela estiver na vez; senão, para a disciplina ativa da turma. O Contador recebe o sábado por `rhResolveProjectionRuntimeState`.
- **Sábado na grade (as duas escolas):** a coluna "Sáb" (`WEEK` com `k:6`) vale 0 por padrão. Sábado sem feriado nem recesso só projeta aula quando a grade tiver horas nele, e o Contador da Casavequia (`pcProjectionBuildDays`) segue a mesma regra.
- **Regra dos 15 minutos (Hermínio, 18/09/2026):** o dia de 4h15 (2h + 2h15) conta 4 h/aula e sobra 15 min. `rhMapaHorasExtras()` soma os minutos por turma e disciplina, na ordem das datas, e a cada 60 min o relato em que a hora fecha ganha +1 h/aula dentro de `rhHorasOficiaisCard` — então o Contador, o bimestre de cada aula e a frequência enviados ao banco usam a mesma conta. Relatos em `RH_HORAS_OFICIAIS_POR_RELATO` ficam como estão. Nas projeções, o resto de minutos segue acumulando (`minutosExtras` na trilha) e o dia aparece como "4h + 1 extra".
- **Contador:** os cartões usam as datas projetadas (grade + feriados + recesso). Bimestres já concluídos mostram a data real em que a soma dos relatos atingiu a meta.

---

## 17. CONTAS DE PROFESSORES (Etapa 9, 19/09/2026)

Toda página que carrega `supabase-report-sync.js` exige conta. O tipo de acesso vem de `<html data-acesso>`:
- **vazio (padrão)**: páginas das escolas do administrador (Casavequia, Hermínio, painéis de alunos, projeções, projetos pessoais). Só a conta `10pauloacre@gmail.com`; outra conta é levada a `meu-diario.html`.
- **`inicio`** (`index.html`): qualquer conta; o administrador vê as escolas, os demais vão para o Meu Diário.
- **`professor`** (`meu-diario.html`): qualquer conta, com os próprios dados.

**Tela de conta:** Entrar · Criar conta (nome, e-mail, senha ≥ 8 com letras e números; confirmação por e-mail) · Esqueci a senha (link → "nova senha") · Entrar com o Google (o botão só aparece quando o provedor estiver ligado no Supabase). Sair apaga do aparelho as cópias locais com o id do usuário.

**Dados particulares:** tabela `professor_dados (user_id, scope_key, payload)`, RLS só do dono, no Realtime. `createScopeSync({perUser:true})` grava nela. O Meu Diário usa `meu-diario:estrutura:v1` (escolas, turmas, alunos, disciplinas) e `meu-diario:diarios:v1` (diários do `novo-diario.js`, adaptador próprio via `NovoDiario.iniciar`). Os dados do administrador continuam em `report_sync_state`/`relatorio_*` (só admin).

**Meu Diário completo (Etapa 11, 19/09/2026):** a conta do professor tem a mesma estética e as mesmas ferramentas da conta do administrador, em versão manual.
- **Visual:** cabeçalho `.cab`, abas `.nav-w/.nb`, títulos `.th/.tb/.ti`, números `.sr/.sc2` e cards `.ea` iguais aos da Casavequia. Botões ☀️/🌙 (`setModo`, chave `modo-tema`) e modo escuro grafite do `dark-mode-2026.js`. Os tokens `--md-*` (superfície, título, acento) são redefinidos em `html.dark-2026`: não use `var(--vd)`/`var(--vm)` como cor de texto nas partes novas, porque no escuro eles viram fundo.
- **Abas:** Início · turmas · 📚 Plano de Aulas · 🗂 Sequências · 📖 Livros · 📆 Calendário · 📊 Contador · 🤖 I.A · ⚙️ Turmas e alunos.
- **Módulos:** `meu-diario.html` expõe `window.MeuDiario` (estrutura, turmas, `criarTurma`, `adicionarAlunos`, `adicionarDisciplina`, `abrirOverlay`, `status`…) e chama os módulos de `window.MD_MODULOS` (`iniciar`, `desenhar`, `aposDiarios`, `inicioHtml`, `exportar`, `aoAbrir`).
- **`assets/js/meu-diario-recursos.js`:** plano (turma → disciplina → bimestre, botões Planj./Aplic./Pulad./📋 Lançado; a aula fica riscada quando está "Aplicada" ou quando um diário da turma/disciplina tem o assunto igual ao título), sequências e livros (cartões por bimestre, edição e histórico) e calendário (mês, tipos de evento, 📘 nos dias com diário). Escopo `meu-diario:recursos:v1` em `professor_dados`. Número de bimestres = `round(total/meta)`, igual ao Contador. API `window.MeuDiarioRecursos`.
- **`assets/js/meu-diario-ia.js`:** chat com a chave do próprio professor (Gemini, OpenAI, Claude ou Groq), chamada direto do navegador. A chave fica só no `localStorage` do aparelho (`md_ia_<uid>`), assim como a conversa (`md_ia_chat_<uid>`). Lê fotos (reduzidas a 1600 px), PDF (nativo; no Groq vira texto pelo pdf.js), .docx (mammoth), planilhas (SheetJS) e texto, com as bibliotecas carregadas do jsDelivr só quando precisa. A IA recebe um retrato dos dados e propõe ações num bloco ```acoes```; cada ação vira um cartão e só muda o diário no "Aplicar" (ou com "aplicar automaticamente"). Ações: `criar_diario`, `editar_diario`, `criar_turma`, `adicionar_alunos`, `transferir_aluno`, `adicionar_disciplina`, `plano_bimestre`, `plano_status`, `sequencia`, `livro`, `evento_calendario`, `remover_evento`. Não existe ação que apague diário. "Ocultar nomes" (padrão) troca os alunos por «T1.7» no texto enviado (um regex único) e desfaz na resposta; nas ações, o aluno pode vir por número, código ou nome (busca aproximada na turma).
- **IA da plataforma (Etapa 12, 20/09/2026):** opção padrão da aba I.A para quem não tem chave salva. A página chama a Edge Function `assistente-ia` (repositório da Biblioteca), que usa as chaves grátis do projeto pela fila de `_comum/ia.ts` (com anexo, só modelos `visao: true`). Limites por conta e por dia: **20 mensagens** (`ia_consumir_cota('assistente', 20)`, conferido na função) e **4 diários criados pela IA** (`ia_consumir_cota('diarios', 4)`, chamado pela página antes de cada `criar_diario` vindo de resposta da plataforma — `m.prov === "plataforma"`). Anexos: até 4 por mensagem e 7 MB. Nesta opção os nomes vão SEMPRE como código (`ocultarNomes()`). A tela mostra "restam X de Y hoje" (`ia_saldo`). O administrador não tem cota. Com chave própria não há limite da plataforma. **Planos futuros:** uma linha em `private.ia_plano` (`limite_assistente`, `limite_diarios`, `ate`) sobe o teto da conta sem mexer no código. SQL em `supabase/2026-09-20-etapa12-ia-da-plataforma.sql` (a cota ganhou a coluna `tipo`; a versão antiga `ia_consumir_cota(int)` grava no tipo "geral"). Deploy: `supabase functions deploy assistente-ia --no-verify-jwt --use-api` (na pasta da Biblioteca).
- **I.A nas escolas do administrador (20/09/2026):** Casavequia e Hermínio têm a aba "🤖 I.A" com o mesmo assistente (`meu-diario-ia.js`), ligado por `assets/js/escola-ia.js`. A ponte cria o botão e a `#sec-ia` (`data-runtime-ui`), injeta o visual e entrega uma API no formato de `window.MeuDiario` montada de `NovoDiario.adaptador()` (turmas, alunos, disciplinas) e `NovoDiario.diarios()/salvar()`. Nas escolas só existem as ações `criar_diario` e `editar_diario` (`M.acoes`); os relatos escritos à mão no HTML vão como contexto só de leitura (`relatos_da_pagina`, 12 por turma). Histórico da conversa separado por lugar (`md_ia_chat_<uid>_casavequia|herminio`). IA da plataforma **ilimitada** para o administrador (a cota devolve `ilimitado`). Na Hermínio, `NovoDiario.salvar` calcula `minutos` pelo horário (`comHoras:false`).
- **Aba Geral (21/09/2026):** `renderGeral()` em `novo-diario.js` põe na `#sec-all` os diários lançados pelo "+ Novo Diário" (sem `origem`): um card por dia (`data-novo-diario="geral-AAAA-MM-DD"`, `data-runtime-ui`) com uma linha "Turma (início–fim) — Disciplina: assunto" por aula. Se o dia já tem card escrito no HTML, as linhas entram no fim do relato dele. Antes a aula só aparecia na aba da turma.
- **Cabeçalho (21/09/2026):** faixa de cima com "← Escolas" à esquerda e ☀️/🌙 à direita (Meu Diário, AEE e Perfil). No Meu Diário, abaixo do nome da escola fica o mesmo botão "📅 Ano letivo AAAA ▾" das escolas do administrador (`ano-letivo.js` em modo local: `RelatorioAnoLetivo.configurar({atual, anos, abrir, baixar})`, ligado por `ligarAnoLetivo()`), com os números de cada ano calculados das turmas e diários da conta, "Abrir" (`mudarAno`), "⬇️ Baixar todos os dados" (JSON do ano) e "+ Iniciar o ano letivo" seguinte. "Sair" fica só no Perfil (cartão 🚪 Conta); o nome não aparece no cabeçalho. "🔀 Mudar painel" = `ContaSkin.ocupacao.botaoPainel(el, escola, "regente"|"aee")`: some com 1 ocupação; com 2+, lista as ocupações e abre o painel escolhido.
- **`NovoDiario.salvar(dados)`** (novo em `novo-diario.js`): grava um diário pronto, criando ou atualizando pelo `id`. É o caminho da I.A.
- Política (seção 5, 6 e 8) e Termos (seção 6) já falam do assistente com chave própria.

**Sincronia imediata:** gravação com debounce de 250–300 ms + Realtime; ao voltar para a aba, ao ganhar foco ou ao voltar a internet, todos os escopos buscam de novo e reenviam o que ficou pendente (`recuperarTudo`). Medido: ~0,5 s entre dois navegadores.

**IA para todos:** `organizar-relato` aceita qualquer conta logada, com cota de 40 pedidos/dia (`ia_consumir_cota`, `private.ia_uso`); o administrador não tem cota.

**Porta de contas com a Biblioteca (Etapa 13, 21/09/2026) — decisão do professor:** as contas do RELATORIO SKIN NÃO têm acesso nem integração de dados com a Biblioteca Digital (integração futura, a definir de forma segura e individual). Admin = só `10pauloacre@gmail.com`; alunos da Biblioteca = só os pré-cadastrados pelo professor.
- **Incidente:** login com o Google no relatorio.skin voltou para a Biblioteca, porque `https://relatorio.skin/**` não está em Authentication → URL Configuration → Redirect URLs, e o Supabase usa a Site URL (Biblioteca). A Biblioteca já estava aberta como admin nesse navegador. Nenhuma conta nova virou admin (conferido no banco).
- **Correções:** a Biblioteca (`assets/js/supabase-config.js`) devolve ao `relatorio.skin/entrar.html` todo retorno `?code=` que não nasceu nela, e apaga/recusa qualquer sessão que não seja do administrador (também em `auth/login.html` e `index.html`). No banco, `private.is_admin()`, `private.is_relatorio_admin()` e `bdm_e_professor()` exigem o e-mail do administrador; `handle_new_user` só cria perfil em `profiles` para ele (antes todo professor novo ganhava perfil "aluno" e aparecia nos painéis da Biblioteca); `profiles` só aceita INSERT/UPDATE dele. SQL em `supabase/2026-09-21-etapa13-admin-so-email.sql`.
- **Nunca** conceder admin só por `profiles.role`; sempre o e-mail do administrador junto.

**Segurança corrigida junto (o cadastro já estava aberto):** gatilho `profiles_trava_role` impede que uma conta se promova a `role='admin'` (o `private.is_admin()` confia nessa coluna); `alunos` só é lida pelo professor (`bdm_e_professor()`). SQL em `supabase/2026-09-19-etapa9-contas-de-professores.sql`.

## 20. MARCA RELATORIO SKIN E SITE PÚBLICO (20/09/2026)

O site passou a se chamar **RELATORIO SKIN** ("RELATORIO" pequeno, "SKIN" em destaque; assinatura "Gestão docente inteligente"). A AXION PROEDUQ continua como marca-mãe, no rodapé.

**Páginas:**
| Página | O que é | Acesso |
|---|---|---|
| `index.html` | Site de apresentação (hero, problema, vitrine, módulos, demonstração, fluxo, segurança, sobre, CTA, rodapé legal) | público, sem login |
| `entrar.html` | Tela de conta, com abertura da marca na primeira visita do aparelho (`localStorage: skin-abertura`). `?modo=criar` abre na aba Criar conta. Depois de entrar: todos → `escolas.html` | `data-acesso="inicio"` |
| `escolas.html` | Escolas da conta (seção 21). Administrador: Casavequia, Hermínio e Projetos pessoais fixos + escolas cadastradas | qualquer conta |

O "← Início" da Casavequia e da Hermínio aponta para `escolas.html`. O `manifest.json` abre o app em `entrar.html`.

**Paleta (sem nenhum tom azulado):** fundo `#0D0E0D`, superfícies `#131512`/`#181B17`/`#20231E`, bordas `#30352D`; texto `#F3F1E9`/`#B6B7AE`/`#7E8279`; marca verde-sálvia `#A7B58A`, destaque `#C2CE9E`, hover `#D2DBB3`; areia `#D6CBB8`, dourado `#B89B69`; sucesso `#6F9B71`, aviso `#C29A5B`, erro `#B9635D`. Tipografia: Manrope (títulos) + Inter (texto). Raios: botão 9px, card 14px, painel 18px.

**Animações (todas respeitam `prefers-reduced-motion`):** entrada em sequência do hero, linha de progresso de 2px no topo, revelação por `IntersectionObserver`, esteira de recursos que pausa no hover, painel do hero que acompanha o cursor, vitrine grudada que troca de tela na rolagem, seletores da demonstração com marcador deslizante e números que contam, linha do fluxo que enche, brilho que segue o cursor nos cards e leve atração magnética nos botões principais.

**Tela de conta (`supabase-report-sync.js`):** mesma identidade (grafite + sálvia), logo no topo do cartão, entrada animada do cartão e dos campos, e link "← Voltar ao site" nas páginas com `<html data-auth-voltar="index.html">` (`entrar.html`, `meu-diario.html`, `escolas.html`). `auth.showLogin(mensagem, modo)` aceita "criar" e "esqueci". O fundo da trava usa `--rel-trava-bg` (padrão `#0D0E0D`), que a página pode redefinir.

**Ícone do app (21/09/2026):** só o símbolo "S" (sem texto, legível em 48 px) sobre fundo grafite com brilho verde, recortado de `assets/icons/icon-relatorio.skin.png`. O manifest usa `assets/app/icone-{192,512}.png` e `icone-maskable-{192,512}.png` (símbolo em 52%, dentro da área segura). Nomes novos forçam a troca do ícone nos celulares com o app instalado: ao mudar o ícone de novo, use outro nome de arquivo. `icon-192/512.png`, `maskable-icon-512.png`, `apple-touch-icon.png`, `favicon-16/32x32.png` e `favicon.ico` (16/32/48) têm a mesma arte. **Ícones antigos:** gerados a partir de `assets/icons/icon-relatorio.skin.png` (quadrado) e `assets/icons/logo-relatorio.skin.png` (horizontal) — `icon-192/512`, `maskable-icon-512` (13% de folga), `apple-touch-icon`, `favicon-16/32`, `favicon.ico`, `iconv2.png` e os `mipmap-*` do Android (`ic_launcher`, `_round`, `_foreground`). As versões web da marca ficam em `assets/marca/skin-marca[-sm].webp`, `skin-icone[-sm].webp` e `skin-simbolo.webp` (o "S" sozinho, usado no cabeçalho do site).

**Regra:** nada de azul, roxo azulado, neon ou ilustração escolar infantil nas páginas da marca. O verde é cor de ação e destaque, nunca o fundo.

**Marca AXION no site e no app (decisão de 20/09/2026):**
- **Bem visível** no rodapé do site (`index.html`, 210 px), na tela inicial do administrador (`escolas.html`, 230 px) e na tela de conta de qualquer página (`.rel-auth-marca`, 172 px, opacidade 1) — sempre com "PROPRIEDADE DA AXION PROEDUQ".
- **Discreta dentro do app**: `supabase-report-sync.js` acrescenta sozinho `.rel-axion-rodape` no fim do `body` quando a página é liberada (104 px, opacidade 0,3, 0,75 no hover, `data-runtime-ui="axion"`). Pula páginas em iframe, a tela inicial (`data-acesso="inicio"`) e páginas que já mostram a marca grande (`.marca-logo`, `.rodape-axion`). Não é preciso editar página por página.

**Páginas públicas (20/09/2026):** `index.html` (site de apresentação), `privacidade.html` (Política de Privacidade, LGPD) e `termos.html` (Termos de Serviço) NÃO carregam `supabase-report-sync.js`, então abrem sem conta. Links legais completos no rodapé do `index.html` (Privacidade, Termos, Cookies e LGPD, com âncoras `#cookies` e `#direitos`) e na tela de login (`.rel-auth-legal`, em todas as páginas trancadas). Estão em `scripts/build-web-release.js`, que o GitHub Pages usa: página nova só é publicada se entrar nessa lista. Ao ligar um serviço novo (IA, hospedagem, analytics), atualize a seção 6 da política. A seção 9 (prazo de guarda) promete guarda por tempo indeterminado, por ano letivo (seção 18 abaixo).

**Pendências do professor (painel do Supabase):** ligar o Google (Authentication → Providers, com Client ID/Secret do Google Cloud) e incluir `https://relatorio.skin/**` e `https://10pauloacre-creator.github.io/relatorio-2026/**` em Authentication → URL Configuration → Redirect URLs (a URL da Biblioteca que já está lá fica). No Google Cloud, a origem autorizada é `https://relatorio.skin`. O repositório é **público**: os relatos escritos no HTML (com nomes de alunos) continuam legíveis no código-fonte, mesmo com a página trancada.

---

## 18. ANO LETIVO E DADOS PERMANENTES (Etapa 10, 19/09/2026)

**Decisão do professor:** todos os dados ficam guardados para sempre e podem ser recuperados e consultados a qualquer momento, por ano letivo. SQL em `supabase/2026-09-19-etapa10-ano-letivo-permanente.sql`.

**Botão "📅 Ano letivo AAAA ▾"** no cabeçalho (`header.cab .cab-t`) da Casavequia e da Hermínio (`assets/js/ano-letivo.js`, com `data-runtime-ui`). Lista os anos com registros (`relatorio_anos_letivos`) com aulas, dias, h/aula, turmas, alunos, ocorrências e versões guardadas. "Abrir AAAA" leva à página de arquivo do ano (`arquivo/anos-letivos.json`); "⬇️ Baixar todos os dados" gera o JSON completo do ano (`relatorio_exportar_ano`: aulas, lançamentos, ocorrências, observações, chamada, metas, estado das páginas e lixeira).

**A página diz a escola e o ano:** `<html data-escola-slug="…" data-ano-letivo="2026">`. `RelatorioLancamentos.dataIsoDoCodigo` usa esse ano (os códigos dos relatos só têm dia e mês), e o retrato publicado leva `ano`.

**O que garante a permanência (banco):**
- **Lixeira permanente** (`relatorio_lixeira`): toda linha apagada de aulas, lançamentos, ocorrências, observações, chamada, alunos adicionados, metas e `report_sync_state` é copiada antes. A lixeira não aceita UPDATE nem DELETE.
- **Histórico diário** do estado das páginas (`relatorio_estado_historico`, gatilho em `report_sync_state`): a última versão de cada dia. Só a versão do dia muda; as anteriores são imutáveis. Consultar: `relatorio_versoes_estado(scope)`. Restaurar: `relatorio_restaurar_estado(scope, dia)` (a versão atual vai para a lixeira antes).
- **Contas dos professores:** `professor_dados_historico` (mesma regra, o dono lê o próprio histórico; sai junto se a conta for apagada, direito do titular).
- **Chamada por ano** (`relatorio_chamada_historico`, `na_lista` = ainda na lista da página).
- **Virada do ano sem colisão:** `relatorio_id_aula(slug, código, data)`: 2026 mantém `escola:código`; de 2027 em diante, `escola:AAAA:código`. A publicação só compara (trava dos 80%) e marca como removidas as aulas/ocorrências dos anos presentes no retrato.

**Virada do ano (fazer nesta ordem):**
1. Com a página ainda com os relatos do ano que termina: `node scripts/arquivar-ano-letivo.js 2026` (opcional `--ate AAAA-MM-DD`; padrão = hoje). Cria `arquivo/2026/casavequia.html` e `herminio.html` e registra em `arquivo/anos-letivos.json`. Commit e push.
2. Só depois, trocar os relatos da página pelos do ano novo, atualizar `ALUNOS` etc., e mudar `data-ano-letivo` nas duas páginas e `anoAtual` no `anos-letivos.json` para o ano novo. Nunca mude o `data-ano-letivo` com relatos do ano anterior na página: a publicação dataria essas aulas no ano novo.
3. As chaves de escopo `*:shared-v1` continuam as mesmas: o arquivo do ano lê o estado como estava na data do arquivamento, no histórico.

**Página de arquivo** (`data-arquivo-ate`): `supabase-report-sync.js` lê cada escopo por `relatorio_estado_ate` e nunca grava nem escuta o tempo real; a publicação dos lançamentos e a IA das observações ficam desligadas; `<base href="../../">`; o `localStorage` fica isolado em memória (só as chaves `sb-*` da sessão passam). Limitações conhecidas: o iframe de projeções e o Firebase do plano anual continuam lendo os dados atuais; os scripts em `assets/` são os atuais do site.

---

## 19. MARCA AXION PROEDUQ (19/09/2026)

"AXION PROEDUQ · Tecnologia que move a educação." é a marca que abriga o Relatório (relatorio.skin), a Biblioteca Digital (biblioteca-ac.com) e os projetos futuros.
- **Página institucional:** `axion-proeduq.html` (pública, sem login): quem somos, propósito, princípios, valores, plataformas, integração, objetivos, identidade visual e contato. Links para os dois domínios são absolutos, então a mesma página serve aos dois sites.
- **Logos:** originais em `assets/icons/axion-bg-escuro.png` e `axion-bg-claro.png`; versões recortadas para a web em `assets/marca/` (`axion-escuro[-sm].webp`, `axion-claro[-sm].webp`, `plataforma-*.webp`).
- **Onde aparece:** rodapé da página inicial (`.marca`, com "PROPRIEDADE DA AXION PROEDUQ" e os links legais), rodapé da tela de login (`.rel-auth-marca`, em `supabase-report-sync.js`) e, na Biblioteca, rodapé da tela de abertura (`#splash-marca`) e dos painéis (`.marca-axion` nos `.content-footer`).
- **Cópia idêntica nos dois repositórios:** a página e as imagens de `assets/marca/` estão em `scripts/check-copias-compartilhadas.js`. Alterou aqui, rode `node scripts/check-copias-compartilhadas.js --copiar` e faça commit nos dois.
- Na página inicial, a regra global `a:not(.projetos-pessoais) > img` dá 320 px às imagens; a logo usa seletor mais específico. O rodapé é `<div>` e não `<footer>`, porque `dark-mode-2026.css` pinta `footer`.

---

## 21. ESCOLAS PELO INEP, ANO LETIVO E PERFIL (Etapa 14, 21/09/2026)

**Fluxo de toda conta:** login → `escolas.html`. Conta nova vê só "CADASTRE SUA ESCOLA". O cadastro busca no catálogo do INEP (Estado › Município › Escola, ou o código INEP de 8 dígitos) e mostra os dados do Censo e o link do QEdu. Cada escola vira um botão (ícone ou imagem escolhidos em ⚙️ Configurações da escola) que abre `meu-diario.html?escola=<id>`. Sem `?escola` ou com escola inexistente, o Meu Diário volta para `escolas.html`. `professorHome` = `escolas.html`.

**Catálogo do INEP (banco):** `inep_escolas` (≈212 mil escolas em atividade ou paralisadas, Censo Escolar 2024) e `inep_municipios`, lidas só pelas funções `inep_municipios_da_uf(uf)`, `inep_buscar_escolas(municipio, termo)` e `inep_escola(codigo)` (conta logada). Carga: `node scripts/importar-escolas-inep.js <microdados_ed_basica_AAAA.csv> --aplicar` (baixar o zip em download.inep.gov.br/dados_abertos/microdados_censo_escolar_AAAA.zip; lotes de 2000 linhas, `INEP_LOTE` muda; lote maior derruba a CLI). Rodar de novo com o Censo novo substitui tudo. SQL em `supabase/2026-09-21-etapa14-escolas-inep-perfil.sql`. Casavequia = INEP 12014877.

**Dados da escola:** continuam no escopo `meu-diario:estrutura:v1`. Cada escola: `{id, nome, icone, imagem (data URL 400px), inep:{codigo, nome, uf, municipio, municipioCodigo, rede, localizacao, endereco, …}}`. `professor_escolas` guarda o vínculo conta ↔ INEP no banco (para a futura plataforma da escola oferecer turmas e alunos). Administrador: o vínculo da Casavequia e da Hermínio fica em `E.fixas.{casavequia|herminio}.inep` (selo "🔗 Vincular ao INEP" abaixo do botão).

**Ano letivo:** cada turma tem `ano`; turma sem `ano` (anterior à Etapa 14) = 2026 (`ANO_LEGADO`). A página da escola abre no ano corrente (a escolha do seletor "📅 Ano letivo" vale só na sessão) e mostra só as turmas daquele ano: abas, contador, diários, plano, sequências e livros. `MeuDiario.estrutura()` devolve essa **vista** (escola + ano), então os módulos (recursos e I.A) já enxergam só ela; `MeuDiario.escolaAtual()` e `.ano()`. Eventos do calendário ganham `escolaId` (os antigos, sem escola, aparecem em todas). **Importar do ano anterior:** copia turmas (nome com a série avançada, 7º → 8º), alunos (sem transferidos, renumerados), disciplinas e metas, e — por `MeuDiarioRecursos.copiarTurma` — plano de aulas e sequências (livros opcional), com os status zerados. Diários, presença, atividades, notas e contador começam em branco. **Nunca gravar antes do primeiro fetch** (`carregado`/`pronto`): um aparelho desatualizado apagaria o que foi feito em outro.

**Cadastro de turma:** manual (formulário) ou 🤖 I.A (a aba I.A abre com a mensagem pronta; o professor anexa a foto/PDF/planilha da chamada e a ação `criar_turma` cria na escola e no ano abertos).

**Zona de perigo** (fim de ⚙️ Configurações da escola): excluir turma, todas as turmas do ano, a escola; também remover aluno e disciplina. Tudo passa por `ContaSkin.confirmarPerigo` (confirmação + senha, conferida no banco por `conta_verificar_senha`; conta só do Google digita o e-mail). Excluir apaga os diários (`NovoDiario.removerTurmas`) e plano/sequências/livros/eventos (`MeuDiarioRecursos.removerTurmas`).

**Perfil (`perfil.html`, escopo `meu-diario:perfil:v1`):** foto redonda (data URL 360px), nome, nascimento (idade), disciplinas, formação, cidade/UF, contato, Lattes, sobre. **Restritos:** matrícula, certificados (bucket privado `professor-arquivos`, pasta `<user_id>/certificados/`, PDF/Word até 10 MB, link assinado de 5 min) e links do Drive (planos de curso, sequências, relatórios) — hoje só o dono vê; a gestão da escola verá quando a plataforma da escola estiver ligada. **Zona de perigo:** trocar senha (ou criar, em conta do Google) e excluir conta (`conta_excluir`: apaga arquivos pela página e a conta em cascata; a conta do administrador não se exclui). O botão redondo do perfil (`ContaSkin.chip`) fica no topo de `escolas.html` e da página da escola.

**Módulo compartilhado:** `assets/js/conta-skin.js` (`window.ContaSkin`): perfil, chip, seletor do INEP, confirmação com senha, redução de imagem, vínculo em `professor_escolas`.

---

## 22. OCUPAÇÃO NA ESCOLA E EDUCAÇÃO ESPECIAL (Etapa 15, 21/09/2026)

**Ocupação obrigatória por escola** (`escola.ocupacoes`, uma ou mais): `regente`, `mediador`, `assistente`, `aee`. Pedida no cadastro da escola (INEP ou manual), ao abrir uma escola antiga sem ocupação (escolas.html e meu-diario.html) e trocável pelo selo "🧑‍🏫" abaixo do botão ou em ⚙️ Configurações. Escolas fixas do administrador: `E.fixas.{id}.ocupacoes` (padrão regente). Roteamento em `ContaSkin.ocupacao.destino`: com `regente` → layout do diário (prioridade), senão → `aee.html?escola=<id>`. Regente + outra ocupação: botão "🔀 Mudar painel: AEE" no cabeçalho do diário (e "Mudar painel: Regente" no AEE); nas fixas, selo "♿ Painel AEE".

**Aluno compartilhado (banco, não professor_dados):** `aee_alunos` (perfil, deficiências, CID, laudo, foto, `perfil` jsonb com comunicação, necessidades, potencialidades, estratégias, cuidados, crise, disciplinas, responsáveis e `pei`), `aee_vinculos` (quem acessa e com que papel), `aee_registros` (diario, atendimento, avaliacao, ocorrencia, comunicado, relatorio, nota com disciplina/bimestre), `aee_documentos` + bucket privado `aee-arquivos` (`<aluno_id>/<pasta>/…`). **Código do aluno** `AEE-XXXX-XXXX` (`private.aee_novo_codigo`): quem tem o código entra por `aee_vincular` e passa a ver o mesmo perfil. No futuro o Conex-ED (gestão escolar) cadastra todos os alunos da escola com o código. RLS: lê quem é vinculado; edita perfil/PEI quem é mediador, assistente ou AEE (`private.aee_editor`); cada registro só é alterado por quem escreveu; excluir aluno só mediador/AEE com senha (`aee_excluir_aluno`). SQL em `supabase/2026-09-21-etapa15-aee-alunos.sql`.

**aee.html:** mediador/assistente → uma aba por aluno (nome em destaque); AEE → "📋 Alunos do AEE" com indicadores e filtros (nome/código, deficiência, série, mediador, ordem por registro mais antigo; alerta de 14 dias sem registro) + abas dos alunos abertos; regente só → abre `?aluno=` a partir do cartão "♿ Alunos da Educação Especial" em ⚙️ Configurações do diário (vínculo pelo código com a disciplina). Sub-abas do aluno: Perfil · Disciplinas e boletim (nota mais recente de cada disciplina/bimestre) · Registros (filtros) · PEI (metas com situação) · Documentos (7 pastas) · Equipe (código para compartilhar, remover profissional) · Relatório individual (janela de impressão A4 com identificação, perfil, PEI, boletim, registros do período e parecer).

**I.A do AEE:** a mesma `meu-diario-ia.js`, com ganchos novos que qualquer página pode usar: `M.sistema(F)` (prompt próprio), `M.aplicarAcao(a, F)` e `M.descreverAcao(a, F)` (ações próprias; devolver `undefined`/`null` passa para as ações padrão). F = `{hoje, pseudonimizar, restaurar, ocultarNomes, mapaAlunos}`. No AEE os alunos viram «T1.n»; ações `registro_aee`, `meta_pei`, `atualizar_perfil_aee`. O prompt é de educação inclusiva (PEI, DUA, LBI, linguagem não capacitista, sem diagnóstico nem conduta de saúde).

## 23. LAYOUT NO CELULAR (21/09/2026)

`assets/css/mobile-2026.css` vale para todas as páginas: `supabase-report-sync.js` injeta sozinho (caminho tirado do próprio `src` do script) e as páginas sem conta (`index`, `privacidade`, `termos`, `axion-proeduq`, `downloads/index`, `mapa-rural-manager`) têm o `<link>` à mão. Página nova sem o script de conta precisa do `<link>`. Regras: campos com 16 px no celular (o iPhone dá zoom abaixo disso), `select`/mídia com `max-width:100%`, tabelas `.md-tabela`/`.aee-tab` rolam dentro do bloco, modais viram folha inferior, `.md-row` quebra linha, e o "← Início" fixo da Casavequia/Hermínio vira absoluto com espaço no cabeçalho. Conferência: auditoria em 390 e 360 px (rolagem lateral e elementos vazando) em todas as páginas, com e sem conta.

