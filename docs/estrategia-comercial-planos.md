# Estratégia comercial dos planos — RELATORIO SKIN

26/09/2026 · Etapa 17. Documento interno (a pasta `docs/` não é publicada).

## 1. Posicionamento e preço

- **Quem compra:** o professor da rede pública, que paga do próprio bolso, compara o preço com "um lanche" e decide pelo tempo que ganha à noite e no fim de semana. Por isso a página abre com **"Menos de R$ 1,70 por dia"** e a calculadora mostra horas e reais do tempo dele.
- **Grátis com todas as ferramentas:** o limite está no **volume**, não nas funções. O professor sente o valor inteiro logo no primeiro dia, e o limite de **1 diário por dia letivo** é o que pesa para quem tem mais de uma turma (quase todos). Esse é o principal gatilho de upgrade.
- **PRO como âncora de volume (R$ 49,90):** cobre a rotina de 3 a 10 turmas com folga (400 diários e 500 pedidos à I.A. por mês). O cartão do meio, com "Mais escolhido", é o que a maioria deve comprar.
- **Plus como isca de conversão (R$ 1 no 1º mês → R$ 99,90):** tira o risco de pagar e leva o professor ao topo. Quem se acostuma a "sem limites" tende a ficar no Plus ou, no mínimo, cair para o PRO em vez de voltar ao Grátis. O efeito "chamariz" também deixa o PRO mais barato na comparação.
- **Anual com 10%:** caixa adiantado e menos cancelamento. Ofereça o anual principalmente depois do 2º mês pago (quem já provou o valor).
- **Preço de fundador (até 31/12/2026):** cria urgência honesta no lançamento e protege a base inicial contra reajustes. Está nos Termos. Se quiser tirar, apague o bloco `.fundador` de `planos.html`, a frase do hero e o parágrafo "Preço de fundador" dos Termos.

## 2. Funil

| Etapa | Onde | Evento |
|---|---|---|
| Visita | site (`index.html`) e `planos.html` | `planos_visita` (com `origem`) |
| Interesse | calculadora, "Mais detalhes" da Biblioteca, perguntas | `calculadora_uso`, `biblioteca_detalhes`, `faq_abrir` |
| Cadastro | `entrar.html?modo=criar` (vindo de qualquer CTA) | `checkout_sem_conta` → `conta_criada` |
| Ativação | 1º diário, 1ª pergunta à I.A. | uso em `private.plano_uso` |
| Momento do limite | modal de limite e lembrete de 80% | `limite_modal`, `nudge_80`, `limite_cta` |
| Intenção de compra | checkout | `checkout_aberto` → `pedido_reservado` / `gateway_iniciar` |
| Indicação | perfil, Escolas, planos, modais | `indicacao_copiar`, `indicacao_whatsapp`, `conta_criada` com `ref` |

O **Painel de vendas** (fim de `planos.html`, só o administrador) mostra o funil e os sinais de interesse.

**Metas iniciais para acompanhar (ajuste com os dados reais):**
- visita → cadastro: 8–15%;
- cadastro → ativação (1º diário em 48 h): 50%+;
- Grátis → pago em 60 dias: 4–8% (com R$ 1 no Plus, a conversão para o 1º pagamento pode passar de 15%, mas meça a retenção no 2º mês);
- Plus R$ 1 → 2º mês pago: 40%+ (abaixo disso, reforce o onboarding do Plus no 1º mês);
- cancelamento mensal do pago: abaixo de 6%.

## 3. Período de lançamento (agora)

O modo `lancamento` avisa e não bloqueia. Isso mantém a boa vontade dos primeiros usuários, mostra o valor dos planos e **reserva pedidos** (`assinatura_pedidos` com `aguardando_gateway`). Quando o gateway entrar:
1. mande um e-mail/WhatsApp para quem tem **pedido reservado** e autorizou mensagens: "o pagamento abriu, a sua condição de lançamento continua guardada";
2. dê uma data para ligar o modo `ativo` (ex.: 15 dias depois) e avise quem já passou dos limites;
3. ligue `modo_limites = 'ativo'` na data prometida.

## 4. Retenção com e-mail e WhatsApp (só para quem autorizou)

A lista sai de `public.consentimentos` (último registro de cada canal com `aceito = true`). Sugestão de régua:

| Quando | Canal | Mensagem |
|---|---|---|
| Dia 0 (cadastro) | e-mail | Boas-vindas + "registre a sua primeira aula em 2 minutos" (link do Meu Diário) |
| Dia 2 sem diário | e-mail | Passo a passo com a I.A.: foto da chamada → turma pronta |
| Dia 7 | WhatsApp | Dica da semana (ferramenta de I.A.) + código de indicação |
| 80% de um limite | e-mail | "Você está aproveitando muito" + PRO/Plus |
| Limite atingido | e-mail | O que renova e quando; oferta do Plus por R$ 1 |
| Plus R$ 1 — dia 20 | e-mail + WhatsApp | O que ele fez no mês (diários, documentos, horas ganhas) antes da renovação |
| 7 dias sem entrar (pago) | WhatsApp | Lembrete gentil + novidade útil |
| Cancelamento | e-mail | Pergunta de 1 clique "por quê?" + oferta de descer para o PRO ou pausar |
| Fim de bimestre | e-mail | "Frequência e relatórios do bimestre em minutos" (pico de uso de documentos) |
| Janeiro/fevereiro | e-mail | Início do ano letivo: importar turmas do ano anterior + anual com 10% |

Regras: sempre com opção de sair (SAIR no WhatsApp, link no e-mail); no WhatsApp, no máximo 2 mensagens por semana; nunca dados de alunos nas mensagens.

## 5. Crescimento

- **Indicação:** o professor está em grupos de WhatsApp da escola. O convite já sai com texto pronto e link com o código. Considere uma campanha no início de cada bimestre ("indique 3 colegas e ganhe 3 meses").
- **Escolas e redes:** os leads do formulário são o caminho para contratos maiores (coordenação e secretaria pagando). Responda em até 2 dias úteis, com uma proposta por faixa de professores (10–29, 30–99, 100+) e implantação acompanhada.
- **Conteúdo:** vídeos curtos das ferramentas de I.A. (plano de aula, prova, comunicado) com o link `relatorio.skin/?utm_source=instagram&utm_campaign=...` — a origem entra no cadastro (`skin_origem`) e no painel.
- **Biblioteca Digital:** é o diferencial do Plus que ninguém mais tem. Grave o vídeo do "Mais detalhes" (colocar o caminho em `VIDEO_BIBLIOTECA` no `planos.html`) mostrando a prova do livro caindo sozinha no boletim.

## 6. Próximos experimentos (quando houver volume)

1. Cartão do anual selecionado por padrão para quem volta à página pela 2ª vez.
2. Limite do Grátis em 2 diários por dia vs. 1 (mede ativação × conversão).
3. Trial de 7 dias do PRO para todo cadastro novo (hoje só para indicados).
4. Página de planos com depoimentos reais (com autorização) no lugar dos ilustrativos do site.
5. Oferta de "volta" (win-back) para quem cancelou: 50% no mês seguinte.

## 7. Cuidados

- Não prometa prazo de pagamento nem funções que ainda não existem. A integração com a Biblioteca está como **liberação gradual** (Etapa 13: separação de contas por segurança).
- Todo valor é calculado no banco (`plano_criar_pedido`); a página só exibe.
- O CDC dá 7 dias de arrependimento com reembolso integral: o gateway precisa permitir estorno fácil.
- Ao escolher o gateway, atualize a Política de Privacidade (seção 6) com o nome da empresa antes da primeira cobrança.
