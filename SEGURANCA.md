# SEGURANÇA — regras obrigatórias do RELATORIO SKIN

> **Leitura obrigatória** para qualquer pessoa ou IA que editar este projeto, antes da primeira mudança.
> O `CLAUDE.md` importa este arquivo; o agente `.claude/agents/guardiao-seguranca.md` o aplica.
> Criado em 26/09/2026 depois da auditoria do GitGuard e da auditoria interna. Nenhuma regra aqui é opcional.

**Por que tanto cuidado:** o repositório no GitHub é **público**, o site guarda dados de **alunos menores de idade** (notas, frequência, conduta, laudos da Educação Especial) e a mesma base Supabase serve a Biblioteca Digital. Um deslize vira vazamento para a internet inteira e fica para sempre no histórico do git.

---

## 1. Sistema de segurança (o que já roda sozinho)

| Camada | Onde | O que faz |
|---|---|---|
| Hook da IA (Claude Code) | `.claude/settings.json` → `scripts/seguranca/hook-claude.js` | Recusa gravar segredo em arquivo versionado; roda a verificação antes de `git commit` (só o que vai no commit) e `git push` (tudo). Bloqueia `--no-verify`. |
| Hooks do git | `.githooks/pre-commit` e `pre-push` (ligados pelo `npm install`, script `prepare`) | Mesma verificação para qualquer pessoa, em qualquer editor. `npm run seguranca:hooks` liga à mão. |
| Verificador | `scripts/check-seguranca.js` (`npm run check:seguranca`) | Segredos, arquivos proibidos, Firestore aberto, regras de RLS nas migrações novas, SRI/versão dos scripts externos, actions sem SHA, cabeçalhos do `vercel.json`, lista de publicação, CPF em pasta pública. `--dist` confere o site gerado. |
| Padrões de segredo | `scripts/seguranca/padroes.js` | Lista única usada pelo verificador, pelo hook e pela linha do tempo (`ocultarSegredos`). |
| CI do GitHub | `.github/workflows/seguranca.yml` | Em todo push/PR e toda segunda: gitleaks (arquivos + commits novos), verificador, build + `--dist`, `npm audit` (raiz e vídeo). |
| Deploy | `.github/workflows/deploy.yml` e `vercel.json` | O site só é publicado se o verificador passar (GitHub Pages) e se o `dist/` estiver limpo (os dois). |
| Dependabot | `.github/dependabot.yml` | PR semanal com atualização de npm e das actions. |
| Cabeçalhos HTTP | `vercel.json` | `nosniff`, `Referrer-Policy`, `X-Frame-Options: SAMEORIGIN`, CSP (`frame-ancestors 'self'; object-src 'none'; base-uri 'self'`), `Permissions-Policy`, HSTS. |
| Agente guardião | `.claude/agents/guardiao-seguranca.md` | Auditoria completa com o modelo mais forte. Chame antes de mudanças sensíveis e periodicamente. |

**Nunca desligue, pule ou afrouxe uma camada para "fazer passar".** Se uma regra deu falso positivo, corrija a regra com cuidado (e explique no commit) ou marque a linha com `seguranca:ok <motivo real>`.

---

## 2. Segredos

1. **Nenhum segredo em arquivo versionado, mensagem de commit, JSON publicado, log, print ou vídeo.** Segredo = chave de API privada (Gemini/Google, OpenAI, OpenRouter, Groq, Anthropic, ElevenLabs, gateway de pagamento), `service_role`/`sb_secret_` do Supabase, token do GitHub, senha SMTP, senha de qualquer conta.
2. Onde cada segredo mora:
   - **Chaves da plataforma** (IA, e-mail, pagamento): segredos das Edge Functions do Supabase (`supabase secrets set`), nunca no front.
   - **Chave do próprio professor** (IA com chave própria): só no `localStorage` do aparelho dele.
   - **Arquivos locais** (`.env`, `jarvis.env`, keystore do Android, `firebase-config.js`): fora do git (`.gitignore`) — confira com `git check-ignore -v <arquivo>`.
3. **Chaves públicas por desenho** (podem aparecer no código): a `sb_publishable_…` do Supabase (a segurança é o RLS) e a URL do projeto. Nada além disso.
4. **Vazou?** Revogue/troque a chave **na hora** no painel do serviço. Apagar do arquivo não adianta: o histórico do git é público. Depois registre abaixo.
5. Mensagem de commit é pública e vai para a linha do tempo (`assets/data/relatorio-skin-linha-do-tempo.json`): nunca cole chave, token ou senha no campo de mensagem.

### Registro de vazamentos
| Data | O quê | Situação |
|---|---|---|
| 05/04/2026 | Chave do Google começando com `AIzaSyDTVh…` colada como **mensagem de commit** (commits `6393481` e `801cd8b`) e copiada para a linha do tempo | Removida da linha do tempo em 26/09/2026. **O professor precisa revogar essa chave** (Google AI Studio → API keys, ou Google Cloud → Credenciais). O histórico do git continua com ela. |
| até 26/09/2026 | Chave web do Firebase `AIzaSyDO-…` (projeto `relatorio-c693d`) no código | É pública por desenho, mas o Firestore estava **aberto** (ver seção 4). Código removido; falta publicar as regras fechadas e, se quiser, excluir o projeto Firebase. |
| 01/07/2026 | Perfil de navegador de teste (`tmp/pdfs/chrome-profile`) commitado | Conferido: 0 cookies e 0 senhas. Sem exposição. Removido em 25/09/2026. |

---

## 3. Banco de dados (Supabase)

Toda migração nova em `supabase/AAAA-MM-DD-etapaNN-*.sql` segue (o verificador cobra a partir de 2026-09-26):

1. **Tabela nova = `enable row level security` no mesmo arquivo**, com policies explícitas. Dado privado nunca tem `using (true)`.
2. **Dono por `auth.uid()`**. Admin = `private.is_relatorio_admin()` (e-mail do administrador); **nunca** só `profiles.role`.
3. **`grant … to anon`** (visitante sem login) só quando o recurso é público de propósito, com `-- seguranca:ok <motivo>` na linha. Toda RPC que visitante pode chamar precisa de limite (tamanho de texto, quantidade por minuto/IP/dia) para não virar spam.
4. **`security definer`** sempre com `set search_path = ''` (ou fixo) e nomes qualificados (`public.x`); `revoke execute on function … from public, anon` e `grant` só para quem usa. Lembre: o Postgres dá EXECUTE a PUBLIC por padrão.
5. **RPC nunca confia no cliente** para identidade, e-mail, papel, plano, preço, desconto, crédito ou "já pagou". Tudo é calculado no banco.
6. **Views com dado pessoal**: `with (security_invoker = true)` ou acesso fechado (revoke de anon/authenticated + função com checagem).
7. **Storage**: bucket privado; policy por pasta `<auth.uid()>/…`; link assinado curto.
8. **Idempotente e reversível**: `create or replace`, `drop policy if exists`, bloco comentado "Para desfazer".
9. **Nunca rode uma migração antiga fora de ordem.** Arquivo que reabriria algo fica neutralizado com `RAISE EXCEPTION` (ex.: `supabase/boletim_api.sql`, que reabria as notas de todos os alunos ao público).
10. Depois de criar o arquivo, o professor roda no **SQL Editor** do Supabase — avise sempre, com o nome do arquivo.

---

## 4. Firebase (desligado)

O Firestore do projeto `relatorio-c693d` tinha `allow read, write: if true` — qualquer pessoa na internet lia e reescrevia os dados, e a Casavequia aplicava no diário o que viesse de lá (inclusive o que ia para o banco de notas). Em 26/09/2026:
- a sincronia do Plano Anual, Livros e timers passou para o Supabase (`assets/js/casavequia-sync-plano.js`, escopo `casavequia:storage:shared-v1`, só admin), com migração única dos dados antigos (só leitura, com validação de formato);
- `firestore.rules` virou deny-all; o SDK e a chave saíram de todas as páginas; `assets/js/firebase.js`, `app.js`, `plano.js` e `firebase-config.example.js` (código morto) foram apagados.

**Passos do professor:** (1) abrir a Casavequia uma vez logado (faz a migração); (2) Firebase Console → Firestore → Regras → colar `firestore.rules` → Publicar; (3) opcional: excluir o projeto Firebase. **Não volte a usar Firestore/Realtime Database** sem regras por usuário autenticado.

---

## 5. Navegador (HTML/JS)

1. **Escape sempre** antes de `innerHTML`/`insertAdjacentHTML`/`outerHTML`/`document.write` quando o valor vem do banco, de outro usuário (ex.: aluno do AEE compartilhado), de IA, de arquivo, da URL ou de `postMessage`. Use o `esc()` do módulo ou `textContent`. Markdown de IA passa pelo conversor seguro (`DocExportar.html`).
2. **URL vinda de dado** em `href`, `src` ou `window.open`: só `https:`/`http:` (valide com `new URL()`), nunca `javascript:`. `window.open` de URL externa com `'noopener,noreferrer'`.
3. **Redirecionamento** (`?volta=`, `next`…) só para página do próprio site: caminho relativo sem `//`, sem `:`.
4. `postMessage`: confira `event.origin` e o formato da mensagem.
5. Proibido `eval`, `new Function`, `setTimeout("texto")`.
6. **Scripts externos** só de `cdn.jsdelivr.net` ou `cdnjs.cloudflare.com`, com **versão exata**, `integrity="sha384-…"` e `crossorigin="anonymous"`. Carregador dinâmico também com SRI. Para calcular: `npm pack <pacote>@<versão>`, extrair e `openssl dgst -sha384 -binary <arquivo> | openssl base64 -A`. Versões em uso: supabase-js 2.117.2, jspdf 2.5.1, jspdf-autotable 3.8.4, html2canvas 1.4.1, pdfjs-dist 3.11.174 (com `isEvalSupported: false`, mitigação da CVE-2024-4367), mammoth 1.8.0, xlsx 0.18.5, docx 9.5.1, jszip 3.10.1.
7. Nada de senha/token em `localStorage` além da sessão do Supabase (`authStorageKey`) e da chave de IA do próprio professor.
8. O "trancar a página" do front é conveniência: **quem protege o dado é o RLS/RPC**. Relatos escritos no HTML ficam legíveis no código-fonte público — não escreva CPF, endereço, telefone, laudo ou diagnóstico no HTML.

---

## 6. Publicação, CI e dependências

1. Só vai para o site o que está em `scripts/build-web-release.js`: pastas `arquivo`, `assets`, `downloads`, `livros` e a lista de arquivos da raiz. **Nunca** acrescente `supabase/`, `docs/`, `backup/`, `scripts/`, `.claude/`, `CLAUDE.md`, `SEGURANCA.md`, SQL ou JSON com dado de aluno.
2. `assets/data/` é público: só dado do projeto, nunca dado pessoal.
3. Actions do GitHub presas por SHA (com a versão em comentário); `permissions:` mínimo em todo workflow; `persist-credentials: false` no checkout.
4. `npm audit --package-lock-only --audit-level=high` limpo na raiz e em `marketing/video`. Atualize pelo Dependabot ou `npm audit fix --package-lock-only` e rode o build.
5. `marketing/video` (Puppeteer + ffmpeg) é ferramenta local: não vai para o site. O `ffmpeg-static` é GPL — tudo bem usar para gerar os vídeos; **não** distribua o binário do ffmpeg junto do site ou do APK.

---

## 7. Checklist antes de cada commit/push

- [ ] `npm run check:seguranca` passou (o hook roda sozinho; não pule).
- [ ] Nenhum dado real de aluno em exemplo, teste, comentário, print ou mensagem de commit.
- [ ] SQL novo: RLS, `search_path`, revoke/grant certos, idempotente, e o professor avisado para rodar.
- [ ] Dado externo escapado; URL validada; script externo com versão exata + SRI.
- [ ] Mudou o que é publicado? `npm run check:seguranca:site`.
- [ ] Mudança sensível (auth, RLS, pagamentos, AEE, uploads, IA)? Chame o agente `guardiao-seguranca`.
- [ ] Funcionalidade nova/pendência resolvida registrada em `assets/data/projeto-relatorio-skin.json` e no `CLAUDE.md`.

---

## 8. Pendências de segurança que dependem do professor

1. **Revogar a chave do Google `AIzaSyDTVh…`** (vazada em mensagem de commit em 05/04/2026).
2. **Firebase:** abrir a Casavequia logado uma vez e depois publicar `firestore.rules` (deny-all); opcional excluir o projeto `relatorio-c693d`.
3. **Rodar no SQL Editor** `supabase/2026-09-26-etapa18-seguranca.sql` e as consultas de conferência do fim dele.
4. **Nomes de alunos no HTML público** (`casavequia.html`, `herminio.html`, `herminio-main.js`, painéis `*-alunos-*.html`) e no histórico do repositório público: tornar o repositório **privado** e planejar a migração dos nomes/relatos para o banco (detalhes em `docs/auditoria-seguranca-2026-09-26.md`, item 3.4). Limpar o histórico só com ordem expressa.
5. **2 fatores (TOTP)** na conta do administrador; **CAPTCHA** no cadastro/login (Supabase → Attack Protection).
6. **APK** só de release assinado com keystore própria (hoje o publicado é de depuração).
7. GitHub: Settings → Code security → *Secret scanning*, *Push protection* e *Dependabot alerts*.
8. Supabase → Authentication: *Leaked password protection* ligado; Redirect URLs só dos domínios oficiais.

## 9. Regras do banco que já valem (Etapa 18)

- **AEE:** quem entra pelo código num aluno que já tem mediador/AEE entra como **regente**; só mediador/AEE mudam funções (`aee_definir_papel`), removem pessoas e trocam o código (`aee_trocar_codigo`). O aluno nunca fica sem mediador/AEE. Autor, função e disciplina de cada registro são carimbados pelo banco; regente com disciplina só lança nota dela. Foto só `data:image/`. O código não vai para o relatório impresso.
- **E-mail:** trocar o e-mail da conta derruba a verificação; só um código enviado depois da troca verifica de novo.
- **Senha de confirmação:** 5 erros → 15 minutos de bloqueio.
- **Limites:** visitante 60 eventos/min no total; leads 3/dia por e-mail e 30/hora no total; pedidos 20/dia por conta com `dados` só com campos conhecidos; `professor_dados` 40 escopos e 50 MB por conta (admin livre); I.A. da plataforma com teto global diário (`planos_config.ia_teto_global_dia`).
- **Pagamento:** o webhook só ativa pedido com valor pago ≥ valor do pedido. Nunca monte a cobrança com valor vindo da página.
- **Indicação:** mesma caixa de e-mail (Gmail com ponto ou +tag) não conta.

## 10. Histórico de auditorias

| Data | Quem | Resultado |
|---|---|---|
| 26/09/2026 | GitGuard (15 achados) + auditoria interna e agente guardião | Ver `docs/auditoria-seguranca-2026-09-26.md`. |
