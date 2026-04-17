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

## 9. CONTADOR DE AULAS — ESTADO ATUAL (10/04/2026)

| Disciplina | Turma | H/aulas dadas | Meta bimestral | Meta anual |
|---|---|---|---|---|
| LP | 1ª Série | 8 | 20 | 80 |
| LP | 2ª Série | 9 | 30 | 120 |
| LP | 3ª Série | 11 | 30 | 120 |
| T.Ling. | 1ª Série | 1 | 10 | 40 |
| T.Ling. | 2ª Série | 2 | 10 | 40 |
| T.Ling. | 3ª Série | 2 | 10 | 40 |
| T.C.H. | 1ª Série | 1 | 10 | 40 |
| T.C.H. | 2ª Série | 2 | 20 | 80 |
| T.C.H. | 3ª Série | 1 | 10 | 40 |
| Artes | 6º Ano | 5 | 10 | 40 |
| Artes | 2ª Série | 1 | 10 | 40 |
| Artes | 3ª Série | 1 | 10 | 40 |

> **Atenção 6º Ano:** O professor herdou a turma após 4 aulas de outra professora. O contador parte de 5 (4 anteriores + 1 do professor).

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

## 11. BUGS CORRIGIDOS NESTA SESSÃO

| Bug | Causa | Correção |
|---|---|---|
| Botão "✏️ Novo Relato" não clicava | Aspa simples não escapada na linha 6190 do JS | `\'` nos atributos onclick do array `prompt` |
| String não fechada travando todo o JS | Faltava `'` no final da linha 6197 | Adicionado `'` antes da vírgula |
| "Marcador RELATOS_INICIO não encontrado" | Arquivo >1MB: GitHub API não retorna `content` inline | Fallback para `download_url` quando `fileData.content` é vazio |
| Erro UTF-8 ao publicar | `decodeURIComponent(escape(atob(...)))` quebrava com caracteres portugueses | Substituído por `new TextDecoder('utf-8').decode(Uint8Array.from(...))` |

---

## 12. PENDÊNCIAS E PRÓXIMOS PASSOS

### Imediato
- [ ] Testar o botão "✏️ Novo Relato" com a chave Groq configurada no navegador (fluxo completo)
- [ ] Adicionar marcador `<!-- T6_INICIO -->` na seção do 6º Ano para injeção automática

### Em breve
- [ ] Atualizar `PRESENCA` para 10/04 das turmas que não tiveram presença registrada individualmente (1ª e 2ª série)
- [ ] Atualizar o plano anual das demais disciplinas se houver mudanças

### Quando o professor enviar novo relato
1. Ele escreve rascunho no chat
2. Claude gera HTML → injeta → atualiza PRESENCA + DISC → `git push`
3. Ou: usar o botão "✏️ Novo Relato" diretamente no site (fluxo automático via Groq)

### Não implementado ainda
- [ ] IA interna da página para edição antes de publicar (foi descartado por ora)
- [ ] Histórico de versões por data
- [ ] Validação do HTML gerado pela IA antes de injetar

---

## 13. REGRAS FIXAS DO PROJETO

1. **Vanilla JS apenas** — sem React, Vue ou qualquer framework
2. **Arquivo único** — tudo em `index.html`, sem múltiplos arquivos HTML
3. **Commits diretos na main** — sem branches, sem PRs
4. **Encoding UTF-8** sempre — usar `TextDecoder`/`TextEncoder` para base64
5. **Não usar `onclick` inline com aspas simples dentro de strings JS** — escapar com `\'`
6. **Não usar scripts Python em produção** — são apenas para manutenção pontual
7. **Todo relato diário OBRIGATORIAMENTE deve ter 3 abas:** `📄 Relato`, `👥 Presença` e `📝 Atividades` — a função `verificarAbasRelatos()` exibe aviso visual quando alguma falta
8. **Botões do Plano Anual em linha única:** `[ N ]  Título          [📅 Planj.][✓ Aplic.][⤳ Pulad.][📋 SIMAED]`
9. **Notificações desativadas no mobile** (≤680px ou User-Agent Mobi/Android/iPhone)
