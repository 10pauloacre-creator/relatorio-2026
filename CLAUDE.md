# CLAUDE.md — Diário Escolar 2026
## Prof. Paulo Roberto Ramalho Magalhães · E.E. Rural Pe. Carlos Casavequia · Senador Guiomard – AC

---

## 1. OBJETIVO DO PROJETO

Site estático (único `index.html`) que funciona como **diário escolar digital** do professor. Contém:
- Relatos diários de aula organizados por turma (1ª, 2ª, 3ª Série, 6º Ano)
- Presença, atividades e ocorrências comportamentais por aluno
- Contador de h/aulas por disciplina com barra de progresso
- Planejamento anual de todas as disciplinas por bimestre
- Cronograma semanal e contador de aulas

**Como o site é atualizado:** O professor escreve um rascunho de texto livre → Claude gera o HTML formatado → injeta nos marcadores do `index.html` → faz `git push` → GitHub Pages / GitHub atualiza o site em ~2 minutos.

---

## 2. REPOSITÓRIO E ARQUIVOS

```
C:\Downloads\relatorio-2026\
├── index.html          ← ARQUIVO PRINCIPAL (6.500+ linhas, ~1.7MB)
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

O Relatório e a Biblioteca Digital (`C:\Users\PAULO ROBERTO\biblioteca-digital-medieval-1`) usam o **mesmo projeto Supabase** (`vgceathgwvtmjxbdpecr`). A integração é feita por tabelas e funções nesse banco. Os SQL ficam em `supabase/2026-09-16-etapa*.sql`.

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

**Sincronia imediata:** gravação com debounce de 250–300 ms + Realtime; ao voltar para a aba, ao ganhar foco ou ao voltar a internet, todos os escopos buscam de novo e reenviam o que ficou pendente (`recuperarTudo`). Medido: ~0,5 s entre dois navegadores.

**IA para todos:** `organizar-relato` aceita qualquer conta logada, com cota de 40 pedidos/dia (`ia_consumir_cota`, `private.ia_uso`); o administrador não tem cota.

**Segurança corrigida junto (o cadastro já estava aberto):** gatilho `profiles_trava_role` impede que uma conta se promova a `role='admin'` (o `private.is_admin()` confia nessa coluna); `alunos` só é lida pelo professor (`bdm_e_professor()`). SQL em `supabase/2026-09-19-etapa9-contas-de-professores.sql`.

**Pendências do professor (painel do Supabase):** ligar o Google (Authentication → Providers, com Client ID/Secret do Google Cloud) e incluir `https://10pauloacre-creator.github.io/relatorio-2026/**` em Authentication → URL Configuration → Redirect URLs. O repositório é **público**: os relatos escritos no HTML (com nomes de alunos) continuam legíveis no código-fonte, mesmo com a página trancada.
