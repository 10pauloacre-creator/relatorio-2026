# Auditoria de segurança — 26/09/2026

Fontes: relatório do GitGuard (scan `cmuiv84ac029i7xtms2sdakrq`, commit `6d76f16`, 15 achados), varredura completa do histórico do git (1.103 commits) com gitleaks 8.28.0 e auditoria manual do código com o agente guardião. Regras resultantes: `SEGURANCA.md`.

Contexto: até esta data o site só era usado pelo próprio professor (várias contas dele). Nenhum sinal de uso por terceiros; tudo aqui é prevenção.

## 1. Achados do GitGuard

| # | Achado | Veredito | O que foi feito |
|---|---|---|---|
| 1 | `extract-zip` 2.0.1 (2 CVEs) em `marketing/video` | **Real** (ferramenta local de vídeo, não vai ao site) | `puppeteer-core` 24 → 25.12.0, que não usa mais `extract-zip`. `npm audit`: 0. |
| 2–4, 9 | "GCP API key" em `projetos-pessoais.js`, `casavequia.html`, `firebase.js`, linha do tempo | **Chave web do Firebase** (pública por desenho), **mas o Firestore estava aberto para o mundo**; e na linha do tempo havia **outra chave do Google, real**, colada como mensagem de commit | Firestore desligado e substituído pelo Supabase (ver 2.1). Chave e SDK removidos do código. Linha do tempo limpa e o gerador/página passaram a esconder segredos. **Professor: revogar a chave `AIzaSyDTVh…`.** |
| 5 | `curl-auth-header` em `.claude/settings.json` | Chave publishable do Supabase (pública) | Linha removida junto com permissões que deixavam uma IA rodar código sem perguntar. |
| 6–8, 10–12 | "generic-api-key" em `editor.js`, `planos.js`, `supabase-report-sync.js`, `novo-diario.js`, `*-alunos-*.html`, `boletim_api.sql` | Falsos positivos (nomes de chaves do `localStorage`) e chave publishable | Liberados no `.gitleaks.toml` por padrão (não por valor). **`boletim_api.sql` era perigoso por outro motivo** (ver 2.2). |
| 13 | Licença GPL do `ffmpeg-static` | Aceitável | Ferramenta local; o binário não é distribuído com o site nem com o APK. Registrado em `SEGURANCA.md`. |

## 2. Achados novos (auditoria interna)

### Corrigidos no código
1. **Firestore aberto (`allow read, write: if true`)** — confirmado por leitura anônima pela API REST. A Casavequia aplicava no diário o que viesse de lá (presença/atividades → banco de notas) e abria URLs de livros vindas dele (`javascript:` possível). Agora: `assets/js/casavequia-sync-plano.js` (Supabase, só admin), migração única validada, `firestore.rules` deny-all, `livAcessar` só abre `http(s)` com `noopener`, texto da "última modificação" escapado. Testado no Chromium (Firestore aberto com dados maliciosos, Firestore fechado).
2. **`supabase/boletim_api.sql` reabria as notas de todos os alunos ao público** se rodado de novo (o próprio cabeçalho mandava). Neutralizado com `RAISE EXCEPTION`; também tinha o nome completo de uma aluna.
3. **Scripts de CDN sem versão fixa** (`@supabase/supabase-js@2` em 20 páginas com sessão de admin) e sem SRI — agora versão exata + `integrity` em todas as tags e nos carregadores dinâmicos (docx, xlsx, jszip, pdf.js, mammoth). Testado em 11 páginas.
4. **pdf.js 3.11.174 (CVE-2024-4367)** — `isEvalSupported: false`.
5. **Dependências da raiz** (`@xmldom/xmldom`, `tar`, `brace-expansion`, via `@capacitor/cli`) — lockfile atualizado, `npm audit`: 0.
6. **`assets/js/data.js`** (não usado) publicava 96 nomes de alunos e registros — removido. `firebase.js`, `app.js`, `plano.js`, `firebase-config.example.js` (mortos) removidos.
7. **URLs sem checagem** em `meu-diario-recursos.js` (abrir livro/sequência) e na ação `livro` da I.A. — só `http(s)`.
8. **AEE (tela):** função definida pela equipe, botão "Trocar código", código fora do relatório impresso.
9. **Android:** `allowBackup="false"`.
10. **Actions do GitHub** presas por SHA, `permissions` mínimas, `persist-credentials: false`, `npm ci --ignore-scripts`.

### Corrigidos no banco — `supabase/2026-09-26-etapa18-seguranca.sql` (professor precisa rodar)
Testado em Postgres 16 com as etapas 9, 12, 14, 15, 15B e 17 reais: cada ataque abaixo passava **antes** e é barrado **depois**; fluxos legítimos (cadastrar/excluir aluno, excluir conta, cota da I.A., pedidos) continuam funcionando.

| Falha | Antes | Depois |
|---|---|---|
| AEE: quem tinha o código escolhia ser "AEE" e podia **excluir o aluno**, apagar laudos e remover a equipe | excluiu | entra como regente; só mediador/AEE gerenciam |
| AEE: autor/função/disciplina do registro vinham do navegador | gravava nota de outra disciplina em nome de outra pessoa | carimbados pelo banco |
| AEE: foto aceitava URL externa (rastreio de IP) | aceitava | só `data:image/` |
| E-mail "verificado" continuava após trocar para outro endereço | verificado | pede código novo |
| Senha de confirmação sem limite de tentativas | ilimitado | bloqueio de 15 min após 5 erros |
| Webhook ativava pedido pago com valor menor | ativava com R$ 1 | recusa |
| Pedido guardava qualquer JSON (5 KB+) | guardava | só campos conhecidos, 20/dia |
| Indicação com a mesma caixa do Gmail (ponto/+tag) | aceitava | recusa |
| Visitante chamava funções que exigem conta; 70 eventos/min | permitido | revogado; 60/min no total |
| Uma conta criava escopos sem limite em `professor_dados` | 45+ | 40 escopos / 50 MB (admin sem limite) |
| Sem teto global da I.A. paga | — | `planos_config.ia_teto_global_dia` (3000) |

## 3. Pendências (dependem de decisão ou acesso do professor)

1. **Revogar a chave do Google `AIzaSyDTVh…`** (commits `6393481` e `801cd8b`, 05/04/2026).
2. **Firebase:** abrir a Casavequia logado uma vez (migração) e publicar `firestore.rules`; opcional excluir o projeto `relatorio-c693d`.
3. **Rodar a Etapa 18** no SQL Editor e as consultas de conferência do fim do arquivo.
4. **CRÍTICO — nomes de alunos no HTML público.** `casavequia.html`, `herminio.html`, `assets/js/herminio-main.js` e os painéis `*-alunos-*.html` têm nomes completos e ocorrências de conduta de menores, legíveis por qualquer pessoa em `view-source:` e no GitHub (a trava de login é só visual). O repositório é público e o histórico guarda tudo, inclusive `backup/backup-20260424.json`. Recomendado, nesta ordem:
   - tornar o repositório **privado** (a Vercel continua publicando; o GitHub Pages grátis para — relatorio.skin não depende dele);
   - projeto de migração: nomes e relatos passam a vir do banco depois do login (o painel já tem os dados em `report_sync_state`, só admin), deixando no HTML só números;
   - depois, limpar o histórico (`git filter-repo`) — **destrutivo, só com autorização expressa**; considerar os dados já expostos.
5. **Conta do administrador com 2 fatores (TOTP)** e, depois, exigir `aal2` nas funções de admin (coordenar com a Biblioteca).
6. **CAPTCHA** (Turnstile/hCaptcha) no cadastro e login: Supabase → Authentication → Attack Protection + `captchaToken` no `supabase-report-sync.js`.
7. **APK:** publicar só build de release assinado com keystore própria; retirar os APKs de depuração de `downloads/apk`.
8. **xlsx 0.18.5** (CVE-2023-30533, CVE-2024-22363): trocar por `https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js` com SRI calculado (o CDN do SheetJS não era acessível daqui). Risco baixo: só lê planilhas do próprio professor.
9. **Biblioteca Digital** (outro repositório): auditar as Edge Functions (`assistente-ia`, `organizar-relato`, `classificar-ocorrencias`, `aluno-email`), políticas `TO authenticated USING (true)` herdadas (agora que o cadastro é aberto) e limitar o re-fetch do canal Realtime "relatorio-atualizado" no app do aluno.
10. Funções antigas com `COALESCE(auth.role(),'service_role') <> 'service_role'`: pela API o `role` sempre existe, então não é explorável hoje; ao reescrever essas funções, troque pela checagem explícita.
11. GitHub: ligar *Secret scanning*, *Push protection* e *Dependabot alerts*.
