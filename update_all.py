# -*- coding: utf-8 -*-
"""
update_all.py — Atualiza index.html do diário escolar (10/04/2026)
"""
import io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

FILE = "C:/Downloads/relatorio-2026/index.html"

print("Lendo arquivo...")
with open(FILE, 'r', encoding='utf-8') as f:
    html = f.read()

original_len = len(html)
print(f"Arquivo lido: {original_len} bytes")

# ─────────────────────────────────────────────────────────────
# 1. ATUALIZAR DISC COUNTER
# ─────────────────────────────────────────────────────────────
print("\n[1/6] Atualizando DISC counter...")

OLD_DISC = """const DISC=[
  {g:'lp',t:'1ª Série',d:'Língua Portuguesa',sw:2,feitas:8, bim:20,tot:80},
  {g:'lp',t:'2ª Série',d:'Língua Portuguesa',sw:4,feitas:9, bim:30,tot:120},
  {g:'lp',t:'3ª Série',d:'Língua Portuguesa',sw:3,feitas:6, bim:30,tot:120},
  {g:'tl',t:'1ª Série',d:'Trilhas de Linguagens',sw:1,feitas:0,bim:10,tot:40},
  {g:'tl',t:'2ª Série',d:'Trilhas de Linguagens',sw:1,feitas:2,bim:10,tot:40},
  {g:'tl',t:'3ª Série',d:'Trilhas de Linguagens',sw:1,feitas:2,bim:10,tot:40},
  {g:'tc',t:'1ª Série',d:'Trilhas de C. Humanas',sw:1,feitas:0,bim:10,tot:40},
  {g:'tc',t:'2ª Série',d:'Trilhas de C. Humanas',sw:2,feitas:0,bim:20,tot:80},
  {g:'tc',t:'3ª Série',d:'Trilhas de C. Humanas',sw:1,feitas:0,bim:10,tot:40},
  {g:'ar',t:'6º Ano',  d:'Artes',sw:1,feitas:0,bim:10,tot:40},
  {g:'ar',t:'2ª Série',d:'Artes',sw:1,feitas:0,bim:10,tot:40},
  {g:'ar',t:'3ª Série',d:'Artes',sw:1,feitas:0,bim:10,tot:40}
];"""

NEW_DISC = """const DISC=[
  {g:'lp',t:'1ª Série',d:'Língua Portuguesa',sw:2,feitas:8, bim:20,tot:80},
  {g:'lp',t:'2ª Série',d:'Língua Portuguesa',sw:4,feitas:9, bim:30,tot:120},
  {g:'lp',t:'3ª Série',d:'Língua Portuguesa',sw:3,feitas:11,bim:30,tot:120},
  {g:'tl',t:'1ª Série',d:'Trilhas de Linguagens',sw:1,feitas:1,bim:10,tot:40},
  {g:'tl',t:'2ª Série',d:'Trilhas de Linguagens',sw:1,feitas:2,bim:10,tot:40},
  {g:'tl',t:'3ª Série',d:'Trilhas de Linguagens',sw:1,feitas:2,bim:10,tot:40},
  {g:'tc',t:'1ª Série',d:'Trilhas de C. Humanas',sw:1,feitas:1,bim:10,tot:40},
  {g:'tc',t:'2ª Série',d:'Trilhas de C. Humanas',sw:2,feitas:2,bim:20,tot:80},
  {g:'tc',t:'3ª Série',d:'Trilhas de C. Humanas',sw:1,feitas:1,bim:10,tot:40},
  {g:'ar',t:'6º Ano',  d:'Artes',sw:1,feitas:5,bim:10,tot:40},
  {g:'ar',t:'2ª Série',d:'Artes',sw:1,feitas:1,bim:10,tot:40},
  {g:'ar',t:'3ª Série',d:'Artes',sw:1,feitas:1,bim:10,tot:40}
];"""

if OLD_DISC in html:
    html = html.replace(OLD_DISC, NEW_DISC, 1)
    print("  ✓ DISC atualizado")
else:
    print("  ✗ ERRO: DISC não encontrado — verifique o trecho manualmente")

# ─────────────────────────────────────────────────────────────
# 2. ATUALIZAR DATA
# ─────────────────────────────────────────────────────────────
print("\n[2/6] Atualizando data...")

OLD_DATE = "📅 Última atualização: 07/04/2026"
NEW_DATE = "📅 Última atualização: 10/04/2026"

if OLD_DATE in html:
    html = html.replace(OLD_DATE, NEW_DATE, 1)
    print("  ✓ Data atualizada")
else:
    print("  ✗ ERRO: data não encontrada")

# ─────────────────────────────────────────────────────────────
# 3. ADICIONAR ENTRADAS DE PRESENÇA
# ─────────────────────────────────────────────────────────────
print("\n[3/6] Adicionando entradas de presença...")

OLD_PRESENCA_END = "  'pl-t3-0407':{turma:'t3',faltaram:[3,4,13,14],faltJ:[12]}\n};"

NEW_PRESENCA_END = """  'pl-t3-0407':{turma:'t3',faltaram:[3,4,13,14],faltJ:[12]},
  'pl-t2-0409':{turma:'t2',faltaram:[4,6,7,10,15,16,20,21],faltJ:[]},
  'pl-t3-0409':{turma:'t3',faltaram:[],faltJ:[12,13]},
  'pl-t6-0410':{turma:'t6',faltaram:[4,12,14,15,31],faltJ:[3]},
  'pl-t3-0410':{turma:'t3',faltaram:[3,4,14,15,17],faltJ:[12,13]}
};"""

if OLD_PRESENCA_END in html:
    html = html.replace(OLD_PRESENCA_END, NEW_PRESENCA_END, 1)
    print("  ✓ Entradas de presença adicionadas")
else:
    print("  ✗ ERRO: fim do objeto PRESENCA não encontrado")

# ─────────────────────────────────────────────────────────────
# 4. INJETAR RELATOS HTML
# ─────────────────────────────────────────────────────────────
print("\n[4/6] Injetando relatos HTML...")

# 4a — RELATOS_INICIO (seção geral)
MARKER_GERAL = "<!-- RELATOS_INICIO -->"
RELATO_GERAL = """<!-- RELATOS_INICIO -->
<div class="ea"><div class="eh" onclick="tog(this)"><div class="edb"><div class="d">10</div><div class="my">Abr 2026</div></div><div class="em"><div class="ed">Artes · LP · Trilhas — 6º Ano · 1ª · 2ª · 3ª Série</div><div class="ec"><span class="ch ch-h">⏰ 07h–17h15</span><span class="ch ch-i">🎨 Arte · Pré-Enem · Democracia · Cultura Digital</span><span class="ch ch-a">⚠️ 10 obs.</span></div></div><div class="et">▾</div></div><div class="ec2"><div class="ipane on" style="padding:16px 22px"><div class="ct">Sexta-feira intensa. <strong>6º Ano (07h–08h) — Artes:</strong> 1ª aula do professor na turma (herdada após 4 aulas de outra professora). Apresentação e introdução ao conceito de Arte. 30 presentes; 6 faltaram (Anthony Mayksson: just. consulta psiquiátrica). <strong>3ª Série (07h–11h15) — Pré-Enem Legal:</strong> Videoaulas + slide + atividades sobre Gêneros Literários. 11 presentes; 7 faltaram (2 just.: Beatriz e Eduarda). Ocorrências: Natanael, Alonso, Antoniel, Lourival, João Paulo, Kiara, Karina e Gabrielle desatentos — conversa e celular. Hana e Joaiz se destacaram. <strong>1ª Série (14h–16h15) — T.C.H. + T.Ling.:</strong> Democracia Direta e Representativa — leitura, debate e atividade no caderno. Cleiton não participou da leitura; João Pedro não realizou a atividade. Todos trazem na próxima sexta. <strong>2ª Série (15h15–17h15) — Trilhas C.H. (conteúdo LGG):</strong> Cultura Digital Pan-Amazônica. Todos entregaram a atividade. <strong>3ª Série (16h15–17h15) — Trilhas C.H.:</strong> Origens da Democracia e da Cidadania. Atividade ficou para próxima aula.</div></div></div></div>

<div class="ea"><div class="eh" onclick="tog(this)"><div class="edb"><div class="d">09</div><div class="my">Abr 2026</div></div><div class="em"><div class="ed">Artes — 2ª e 3ª Série</div><div class="ec"><span class="ch ch-h">⏰ 15h15–17h15</span><span class="ch ch-p">👥 15 · 16 presentes</span><span class="ch ch-i">🎨 Linguagem Visual · Arte Sustentável</span><span class="ch ch-a">⚠️ 4 obs.</span></div></div><div class="et">▾</div></div><div class="ec2"><div class="ipane on" style="padding:16px 22px"><div class="ct">Quinta-feira. <strong>2ª Série (15h15–16h15) — Artes:</strong> 15 presentes. Formas da Linguagem Visual (Textura, Dimensão, Volume e Direção). Estudo teórico e início da atividade. Ocorrências: Kayo (virado perturbando Êmilly); Wesley Emanuel (batendo caderno); Maria Eduarda e Ana Beatriz (conversando alto); Jorge (conversando com Êmilly e Kayo). 8 faltaram. <strong>3ª Série (16h15–17h15) — Artes:</strong> 16 presentes. Desenvolvimento Sustentável na Arte — análise de obras, criação com materiais reciclados. Alunos pediram para gravar vídeo — concedido. Sem ocorrências. Maria Beatriz e Maria Eduarda: ausentes justificadas (questões médicas).</div></div></div></div>"""

if MARKER_GERAL in html:
    html = html.replace(MARKER_GERAL, RELATO_GERAL, 1)
    print("  ✓ 4a RELATOS_INICIO injetado")
else:
    print("  ✗ ERRO: marcador RELATOS_INICIO não encontrado")

# 4b — T1_INICIO
MARKER_T1 = "<!-- T1_INICIO -->"
RELATO_T1 = """<!-- T1_INICIO -->
<div class="ea"><div class="eh" onclick="tog(this)"><div class="edb"><div class="d">10</div><div class="my">Abr 2026</div></div><div class="em"><div class="ed">Trilhas C.H. + Trilhas de Linguagens — 2 h/aula</div><div class="ec"><span class="ch ch-h">⏰ 14h–16h15</span><span class="ch ch-i">📖 Democracia Direta e Representativa</span><span class="ch ch-a">⚠️ 2 obs.</span></div></div><div class="et">▾</div></div><div class="ec2"><div class="itabs"><button class="itab on" onclick="itab(this,'r-t1-0410')">📄 Relato</button><button class="itab" onclick="itab(this,'p-t1-0410')">👥 Presença</button><button class="itab" onclick="itab(this,'a-t1-0410')">📝 Atividades</button></div><div class="ipane on" id="r-t1-0410"><div class="lembrete"><div class="lembrete-tag">🔔 Lembrete Interno</div><div class="lembrete-txt">Horário de <strong>Trilhas de Linguagens (15h15–16h15)</strong> usado para atividade do conteúdo de <strong>Trilhas C.H.</strong> — Democracia Direta e Representativa. Registrado no SIMAED como T.Ling. conforme grade.</div></div><div class="st">📖 Conteúdo</div><div class="ct"><strong>T.C.H. (14h–15h) — Democracia Direta e Representativa.</strong><br>Continuação da apostila pela sala de aula virtual. Leitura ativa e debate sobre o tema.<br><strong>T.Ling. (15h15–16h15) — Atividade sobre o mesmo tema.</strong><br>Alunos escreveram as perguntas e responderam no caderno. Todos ficam de trazer pronta na próxima aula de sexta.</div><div class="st">🔎 Comportamento</div><div class="ol"><div class="oi"><span class="oi-ic">😶</span><div><div class="oa">Cleiton Silva Santana</div><div class="od">Não quis participar da leitura ativa. 1ª ocorrência — monitorar.</div></div></div><div class="oi"><span class="oi-ic">😶</span><div><div class="oa">João Pedro Gomes da Silva</div><div class="od">Não quis realizar a atividade no caderno. 1ª ocorrência — monitorar.</div></div></div></div><div class="ai2"><div class="ai2h"><div class="tg">✦ Análise IA</div><span>2 obs. leves — recusa de participação</span></div><div class="ai2i"><div class="ai2a">Cleiton</div><div class="ai2p warn">⚠ 1ª obs. — recusa na leitura</div><div class="ai2t">Conversa individual. Verificar se há dificuldade com leitura em voz alta.</div></div><div class="ai2i"><div class="ai2a">João Pedro</div><div class="ai2p warn">⚠ 1ª obs. — recusa na atividade</div><div class="ai2t">Monitorar padrão. Trazer atividade na próxima aula — cobrar na entrada.</div></div><div class="ai2s">💡 Registrar entregas na próxima sexta. Retomar leitura com dinâmica diferente para engajar os dois.</div></div></div><div class="ipane" id="p-t1-0410"><div class="pres-av"><span>ℹ️</span><span>Presença não registrada individualmente nesta aula. Atualizar se necessário.</span></div></div><div class="ipane" id="a-t1-0410"><div class="st">📋 Atividade</div><div class="atv-tema"><strong>Democracia Direta e Representativa — Atividade no caderno</strong><br><span style="font-size:.82rem;color:var(--cm)">T.Ling. 10/04/2026 · Prazo: próxima sexta-feira</span></div><div class="atv-av"><span>📋</span><span>Todos trazem prontas na próxima aula. Cobrar na entrada.</span></div></div></div></div>"""

if MARKER_T1 in html:
    html = html.replace(MARKER_T1, RELATO_T1, 1)
    print("  ✓ 4b T1_INICIO injetado")
else:
    print("  ✗ ERRO: marcador T1_INICIO não encontrado")

# 4c — T2_INICIO
MARKER_T2 = "<!-- T2_INICIO -->"
RELATO_T2 = """<!-- T2_INICIO -->
<div class="ea"><div class="eh" onclick="tog(this)"><div class="edb"><div class="d">10</div><div class="my">Abr 2026</div></div><div class="em"><div class="ed">Trilhas C.H. (conteúdo LGG) — 2 h/aula</div><div class="ec"><span class="ch ch-h">⏰ 15h15–17h15</span><span class="ch ch-i">📖 Cultura Digital Pan-Amazônica</span><span class="ch ch-a">✅ Todos entregaram</span></div></div><div class="et">▾</div></div><div class="ec2"><div class="itabs"><button class="itab on" onclick="itab(this,'r-t2-0410')">📄 Relato</button><button class="itab" onclick="itab(this,'p-t2-0410')">👥 Presença</button><button class="itab" onclick="itab(this,'a-t2-0410')">📝 Atividades</button></div><div class="ipane on" id="r-t2-0410"><div class="lembrete"><div class="lembrete-tag">🔔 Lembrete Interno</div><div class="lembrete-txt">Horário de <strong>Trilhas de C. Humanas</strong> usado para conteúdo de <strong>Linguagens (LGG)</strong> — Cultura Digital Pan-Amazônica. Lançado no SIMAED como T.C.H. conforme grade.</div></div><div class="st">📖 Conteúdo</div><div class="ct"><strong>Cultura Digital Pan-Amazônica.</strong><br>Para antecipar contato com o assunto de LGG, o conteúdo foi abordado no horário de CHS. As 2 horas foram dedicadas à leitura, debate e realização da atividade sobre o tema.</div><div class="st">🔎 Comportamento</div><div class="ol"><div class="oi nt"><span class="oi-ic">✅</span><div><div class="oa" style="color:var(--ai)">Nenhuma ocorrência registrada</div><div class="od">Turma colaborativa — todos entregaram a atividade.</div></div></div></div><div class="st">📋 Entrega</div><div class="ng" style="background:#f0faf4;border-color:#86efac"><span>✅</span><span><strong>Todos os alunos presentes</strong> entregaram a atividade no mesmo dia.</span></div><div class="ai2"><div class="ai2h"><div class="tg">✦ Análise IA</div><span>Sem ocorrências · Entrega total — aula excelente</span></div><div class="ai2s">💡 Registrar como referência positiva de engajamento. Manter dinâmica de leitura + debate + atividade.</div></div></div><div class="ipane" id="p-t2-0410"><div class="pres-av"><span>ℹ️</span><span>Presença não registrada individualmente nesta aula. Atualizar se necessário.</span></div></div><div class="ipane" id="a-t2-0410"><div class="st">📋 Atividade</div><div class="atv-tema"><strong>Cultura Digital Pan-Amazônica — Atividade em sala</strong><br><span style="font-size:.82rem;color:var(--cm)">T.C.H. 10/04/2026 · Todos entregaram</span></div><div class="atv-av"><span>✅</span><span>Entrega completa. Nenhum pendente.</span></div></div></div></div>

<div class="ea"><div class="eh" onclick="tog(this)"><div class="edb"><div class="d">09</div><div class="my">Abr 2026</div></div><div class="em"><div class="ed">Artes — 1 h/aula</div><div class="ec"><span class="ch ch-h">⏰ 15h15–16h15</span><span class="ch ch-p">👥 15 presentes</span><span class="ch ch-i">🎨 Linguagem Visual: Textura, Dimensão, Volume e Direção</span><span class="ch ch-a">⚠️ 4 obs.</span></div></div><div class="et">▾</div></div><div class="ec2"><div class="itabs"><button class="itab on" onclick="itab(this,'r-t2-0409')">📄 Relato</button><button class="itab" onclick="itab(this,'p-t2-0409')">👥 Presença</button><button class="itab" onclick="itab(this,'a-t2-0409')">📝 Atividades</button></div><div class="ipane on" id="r-t2-0409"><div class="st">📖 Conteúdo</div><div class="ct"><strong>Formas da Linguagem Visual: Textura, Dimensão, Volume e Direção.</strong><br>Estudo teórico do tema e início da atividade em sala.</div><div class="st">🔎 Comportamento</div><div class="ol"><div class="oi"><span class="oi-ic">💬</span><div><div class="oa">Kayo dos Anjos Coutinho</div><div class="od">Participativo, porém constantemente virado para trás perturbando Êmilly. 1ª ocorrência.</div></div></div><div class="oi"><span class="oi-ic">🥁</span><div><div class="oa">Wesley Emanuel Lima da Silva</div><div class="od">Batendo caderno na mesa e fazendo barulho. 1ª ocorrência.</div></div></div><div class="oi"><span class="oi-ic">💬</span><div><div class="oa">Maria Eduarda Silva de Jesus · Ana Beatriz Nascimento Maia</div><div class="od">Conversando muito alto mesmo durante a realização da atividade. 1ª ocorrência para ambas.</div></div></div><div class="oi"><span class="oi-ic">💬</span><div><div class="oa">Jorge Arnaldo Félix Pereira</div><div class="od">Conversando com Êmilly e Kayo durante a atividade. 1ª ocorrência.</div></div></div></div><div class="st">📋 Faltas</div><div class="ng"><span>📝</span><span><strong>Antonio Samuel</strong> · <strong>Eslane</strong> · <strong>Everton</strong> · <strong>Francisco Gabriel</strong> · <strong>Luiz Guilherme</strong> · <strong>Maria Clara</strong> · <strong>Sabrina</strong> · <strong>Tamíres</strong> — sem justificativa.</span></div><div class="ai2"><div class="ai2h"><div class="tg">✦ Análise IA</div><span>4 obs. leves · 8 faltas</span></div><div class="ai2i"><div class="ai2a">Kayo · Wesley · Jorge</div><div class="ai2p warn">⚠ 1ª obs.</div><div class="ai2t">Monitorar. Em reincidência: intervenção direta + registro formal.</div></div><div class="ai2i"><div class="ai2a">Maria Eduarda · Ana Beatriz</div><div class="ai2p warn">⚠ 1ª obs. — conversa alta</div><div class="ai2t">Separar os lugares se repetir.</div></div><div class="ai2s">💡 Definir regra clara de silêncio durante atividades. Monitorar padrão de faltas — 8 ausentes em uma aula de Artes é alto.</div></div></div><div class="ipane" id="p-t2-0409"><div class="pres-av"><span>ℹ️</span><span>15 presentes · Faltaram: Antonio Samuel, Eslane, Everton, Francisco Gabriel, Luiz Guilherme, Maria Clara, Sabrina, Tamíres</span></div><div id="pl-t2-0409" class="pres-grid"></div></div><div class="ipane" id="a-t2-0409"><div class="st">📋 Atividade</div><div class="atv-tema"><strong>Linguagem Visual: Textura, Dimensão, Volume e Direção</strong><br><span style="font-size:.82rem;color:var(--cm)">Iniciada em sala · 09/04/2026</span></div><div class="atv-av"><span>📋</span><span>Atividade iniciada em sala. Acompanhar conclusão na próxima aula.</span></div></div></div></div>"""

if MARKER_T2 in html:
    html = html.replace(MARKER_T2, RELATO_T2, 1)
    print("  ✓ 4c T2_INICIO injetado")
else:
    print("  ✗ ERRO: marcador T2_INICIO não encontrado")

# 4d — T3_INICIO
MARKER_T3 = "<!-- T3_INICIO -->"
RELATO_T3 = """<!-- T3_INICIO -->
<div class="ea"><div class="eh" onclick="tog(this)"><div class="edb"><div class="d">10</div><div class="my">Abr 2026</div></div><div class="em"><div class="ed">LP — Pré-Enem Legal · 5 h/aula (SIMAED)</div><div class="ec"><span class="ch ch-h">⏰ 07h–11h15</span><span class="ch ch-p">👥 11 presentes</span><span class="ch ch-i">📖 Gêneros Literários</span><span class="ch ch-a">⚠️ 8 obs.</span></div></div><div class="et">▾</div></div><div class="ec2"><div class="itabs"><button class="itab on" onclick="itab(this,'r-t3-0410a')">📄 Relato</button><button class="itab" onclick="itab(this,'p-t3-0410a')">👥 Presença</button><button class="itab" onclick="itab(this,'a-t3-0410a')">📝 Atividades</button></div><div class="ipane on" id="r-t3-0410a"><div class="lembrete"><div class="lembrete-tag">🔔 Lembrete Interno</div><div class="lembrete-txt">Na prática foram <strong>4 horas de aula do Pré-Enem Legal</strong> (das 8h às 11h15 com o professor presente). Das 7h às 8h os alunos assistiram a videoaula enquanto o professor estava no 6º Ano. No <strong>SIMAED será lançado como 5h/aula</strong> de Língua Portuguesa.</div></div><div class="st">📖 Conteúdo</div><div class="ct"><strong>Pré-Enem Legal — Gêneros Literários.</strong><br>Das 7h às 8h: alunos assistiram a videoaula de forma autônoma (professor no 6º Ano). Das 8h em diante: videoaulas + apresentação e análise de slide + realização das atividades propostas.</div><div class="st">🔎 Comportamento</div><div class="ol"><div class="oi"><span class="oi-ic">💬</span><div><div class="oa">Natanael · Alonso · Antoniel · Lourival · João Paulo · Kiara · Karina · Gabrielle</div><div class="od">Não estavam atentos à videoaula — conversando e mexendo no celular.</div></div></div><div class="oi nt"><span class="oi-ic">⭐</span><div><div class="oa" style="color:var(--ai)">Hana Beatryz · Joaiz Muniz</div><div class="od">Únicos que estavam realmente prestando atenção. Destaque positivo.</div></div></div></div><div class="st">📋 Faltas</div><div class="ng"><span>📝</span><span><strong>Francisco Kevison</strong> · <strong>Gabriel Oliveira</strong> · <strong>Matheus Henrique</strong> · <strong>Mayco Gabriel</strong> · <strong>Sara</strong> — sem justificativa. <strong>Maria Beatriz</strong> e <strong>Maria Eduarda</strong> — justificadas (questões médicas).</span></div><div class="ai2"><div class="ai2h"><div class="tg">✦ Análise IA</div><span>8 desatentos · 2 destaques positivos · 7 faltas</span></div><div class="ai2i"><div class="ai2a">Natanael · Alonso · Antoniel · Lourival · João Paulo · Kiara · Karina · Gabrielle</div><div class="ai2p warn">⚠ Desatenção coletiva durante videoaula</div><div class="ai2t">Considerar pausas com perguntas durante a videoaula. Registrar padrão.</div></div><div class="ai2i"><div class="ai2a">Hana · Joaiz</div><div class="ai2p" style="color:var(--ai)">⭐ Destaque positivo</div><div class="ai2t">Reconhecer publicamente o engajamento.</div></div><div class="ai2s">💡 Videoaulas longas tendem a gerar dispersão. Intercalar com perguntas orais ou mini-atividades a cada 15 min.</div></div></div><div class="ipane" id="p-t3-0410a"><div class="pres-av"><span>ℹ️</span><span>11 presentes · Faltaram: Francisco Kevison, Gabriel Oliveira, Matheus Henrique, Mayco, Sara · Justificadas: Maria Beatriz e Maria Eduarda (questões médicas)</span></div><div id="pl-t3-0410a" class="pres-grid"></div></div><div class="ipane" id="a-t3-0410a"><div class="st">📋 Atividade</div><div class="atv-tema"><strong>Pré-Enem Legal — Gêneros Literários</strong><br><span style="font-size:.82rem;color:var(--cm)">10/04/2026 · 5h/aula SIMAED</span></div><div class="atv-av"><span>📋</span><span>Atividades realizadas em sala durante a aula.</span></div></div></div></div>

<div class="ea"><div class="eh" onclick="tog(this)"><div class="edb"><div class="d">10</div><div class="my">Abr 2026</div></div><div class="em"><div class="ed">Trilhas de C. Humanas — 1 h/aula</div><div class="ec"><span class="ch ch-h">⏰ 16h15–17h15</span><span class="ch ch-i">📖 Origens da Democracia e da Cidadania</span></div></div><div class="et">▾</div></div><div class="ec2"><div class="itabs"><button class="itab on" onclick="itab(this,'r-t3-0410b')">📄 Relato</button><button class="itab" onclick="itab(this,'a-t3-0410b')">📝 Atividades</button></div><div class="ipane on" id="r-t3-0410b"><div class="st">📖 Conteúdo</div><div class="ct"><strong>Origens da Democracia e da Cidadania.</strong><br>Discussão sobre o tema. Atividade ficou para ser realizada na próxima aula.</div><div class="st">🔎 Comportamento</div><div class="ol"><div class="oi nt"><span class="oi-ic">✅</span><div><div class="oa" style="color:var(--ai)">Nenhuma ocorrência registrada</div><div class="od">Turma colaborativa na discussão.</div></div></div></div><div class="ai2"><div class="ai2h"><div class="tg">✦ Análise IA</div><span>Sem ocorrências · Atividade pendente</span></div><div class="ai2s">💡 Cobrar a atividade no início da próxima aula de Trilhas C.H.</div></div></div><div class="ipane" id="a-t3-0410b"><div class="st">📋 Atividade</div><div class="atv-tema"><strong>Origens da Democracia e da Cidadania — Atividade pendente</strong><br><span style="font-size:.82rem;color:var(--cm)">T.C.H. 10/04/2026 · Prazo: próxima aula</span></div><div class="atv-av"><span>📋</span><span>Atividade não realizada nesta aula — cobrar na próxima.</span></div></div></div></div>

<div class="ea"><div class="eh" onclick="tog(this)"><div class="edb"><div class="d">09</div><div class="my">Abr 2026</div></div><div class="em"><div class="ed">Artes — 1 h/aula</div><div class="ec"><span class="ch ch-h">⏰ 16h15–17h15</span><span class="ch ch-p">👥 16 presentes</span><span class="ch ch-i">🎨 Arte Sustentável · Materiais Reciclados</span></div></div><div class="et">▾</div></div><div class="ec2"><div class="itabs"><button class="itab on" onclick="itab(this,'r-t3-0409')">📄 Relato</button><button class="itab" onclick="itab(this,'p-t3-0409')">👥 Presença</button><button class="itab" onclick="itab(this,'a-t3-0409')">📝 Atividades</button></div><div class="ipane on" id="r-t3-0409"><div class="st">📖 Conteúdo</div><div class="ct"><strong>Desenvolvimento Sustentável na Arte: criação com consciência ambiental.</strong><br>Análise de obras com temática sustentável; introdução à criação com materiais reciclados e alternativos. Alunos pediram para gravar um vídeo durante a aula — solicitação concedida.</div><div class="st">🔎 Comportamento</div><div class="ol"><div class="oi nt"><span class="oi-ic">✅</span><div><div class="oa" style="color:var(--ai)">Nenhuma ocorrência registrada</div><div class="od">Turma engajada e colaborativa.</div></div></div></div><div class="st">📋 Faltas</div><div class="ng"><span>📝</span><span><strong>Maria Beatriz</strong> e <strong>Maria Eduarda</strong> — justificadas por questões médicas.</span></div><div class="ai2"><div class="ai2h"><div class="tg">✦ Análise IA</div><span>Sem ocorrências · 2 faltas justificadas · Aula positiva</span></div><div class="ai2s">💡 Turma demonstrou interesse — explorar mais dinâmicas participativas como gravação de vídeo.</div></div></div><div class="ipane" id="p-t3-0409"><div class="pres-av"><span>ℹ️</span><span>16 presentes · Justificadas: Maria Beatriz e Maria Eduarda (questões médicas)</span></div><div id="pl-t3-0409" class="pres-grid"></div></div><div class="ipane" id="a-t3-0409"><div class="st">📋 Atividade</div><div class="atv-tema"><strong>Arte Sustentável — Análise de obras e criação inicial</strong><br><span style="font-size:.82rem;color:var(--cm)">09/04/2026 · Criação com materiais reciclados</span></div><div class="atv-av"><span>📋</span><span>Continuação na próxima aula.</span></div></div></div></div>"""

if MARKER_T3 in html:
    html = html.replace(MARKER_T3, RELATO_T3, 1)
    print("  ✓ 4d T3_INICIO injetado")
else:
    print("  ✗ ERRO: marcador T3_INICIO não encontrado")

# 4e — 6º Ano: substituir placeholder
OLD_T6_SEM = '<div class="sem"><span class="ic">🎨</span><p>Nenhuma aula registrada ainda para o 6º Ano.</p></div>'
NEW_T6_RELATO = '<div class="ea"><div class="eh" onclick="tog(this)"><div class="edb"><div class="d">10</div><div class="my">Abr 2026</div></div><div class="em"><div class="ed">Artes — 1 h/aula · 1ª aula do professor</div><div class="ec"><span class="ch ch-h">⏰ 07h–08h</span><span class="ch ch-p">👥 30 presentes</span><span class="ch ch-i">🎨 O que é Arte? Arte no cotidiano</span></div></div><div class="et">▾</div></div><div class="ec2"><div class="itabs"><button class="itab on" onclick="itab(this,\'r-t6-0410\')">📄 Relato</button><button class="itab" onclick="itab(this,\'p-t6-0410\')">👥 Presença</button></div><div class="ipane on" id="r-t6-0410"><div class="lembrete"><div class="lembrete-tag">🔔 Lembrete Interno</div><div class="lembrete-txt">Esta é a <strong>1ª aula do Prof. Paulo Roberto</strong> com o 6º Ano. A turma já havia recebido <strong>4 aulas de Artes com outra professora</strong>. No <strong>Contador de Aulas</strong>, o total já parte de 5h (4 anteriores + 1 de hoje).</div></div><div class="st">📖 Conteúdo</div><div class="ct"><strong>O que é Arte? Arte no nosso cotidiano.</strong><br>Apresentação do professor à turma. Conhecimento dos alunos. Conceitos introdutórios e linguagens artísticas — alinhamento de ideias e análise do nível de conhecimento da turma.</div><div class="st">🔎 Comportamento</div><div class="ol"><div class="oi nt"><span class="oi-ic">✅</span><div><div class="oa" style="color:var(--ai)">Nenhuma ocorrência registrada</div><div class="od">1ª aula de apresentação — turma receptiva.</div></div></div></div><div class="st">📋 Faltas</div><div class="ng"><span>📝</span><span><strong>Antônio Yuri</strong> · <strong>Guilherme</strong> · <strong>Hagata</strong> · <strong>Isaac</strong> · <strong>Victor</strong> — sem justificativa. <strong>Anthony Mayksson</strong> — justificado (consulta psiquiátrica).</span></div><div class="ai2"><div class="ai2h"><div class="tg">✦ Análise IA</div><span>1ª aula · Sem ocorrências · 30 presentes</span></div><div class="ai2s">💡 Boa adesão para uma 1ª aula. Acompanhar frequência dos ausentes nas próximas semanas.</div></div></div><div class="ipane" id="p-t6-0410"><div class="pres-av"><span>ℹ️</span><span>30 presentes · Faltaram: Antônio Yuri, Guilherme, Hagata, Isaac, Victor · Justificado: Anthony Mayksson (consulta psiquiátrica)</span></div><div id="pl-t6-0410" class="pres-grid"></div></div></div></div>'

if OLD_T6_SEM in html:
    html = html.replace(OLD_T6_SEM, NEW_T6_RELATO, 1)
    print("  ✓ 4e 6º Ano relato injetado")
else:
    print("  ✗ ERRO: placeholder 6º Ano não encontrado")

# 4f — Atualizar header da seção 6º Ano (stats: 0→1 dias, 0→1 h/aulas, 35→36 matriculados)
OLD_T6_HEADER = '<div class="sr"><div class="sc2"><div class="n">0</div><div class="l">Dias de Aula</div></div><div class="sc2"><div class="n">0</div><div class="l">H/aulas</div></div><div class="sc2"><div class="n">35</div><div class="l">Matriculados</div></div><div class="sc2 al"><div class="n">0</div><div class="l">Obs.</div></div></div>'
NEW_T6_HEADER = '<div class="sr"><div class="sc2"><div class="n">1</div><div class="l">Dias de Aula</div></div><div class="sc2"><div class="n">1</div><div class="l">H/aulas</div></div><div class="sc2"><div class="n">36</div><div class="l">Matriculados</div></div><div class="sc2 al"><div class="n">0</div><div class="l">Obs.</div></div></div>'

if OLD_T6_HEADER in html:
    html = html.replace(OLD_T6_HEADER, NEW_T6_HEADER, 1)
    print("  ✓ 4f Header 6º Ano atualizado")
else:
    print("  ✗ ERRO: header 6º Ano não encontrado")

# ─────────────────────────────────────────────────────────────
# 5. SUBSTITUIR PLANO ANUAL — TRILHAS DE LINGUAGENS (12 painéis)
# ─────────────────────────────────────────────────────────────
print("\n[5/6] Substituindo plano anual — Trilhas de Linguagens...")

def find_panel_bounds(content, panel_id):
    """Encontra o início e fim (inclusive) de um bim-panel pelo id."""
    search = f'id="{panel_id}"'
    start = content.find(search)
    if start == -1:
        return -1, -1
    # Encontra o início da tag <div
    tag_start = content.rfind('<div', 0, start)
    if tag_start == -1:
        return -1, -1
    # Conta profundidade de divs a partir do tag_start
    pos = tag_start
    depth = 0
    while pos < len(content):
        open_pos = content.find('<div', pos)
        close_pos = content.find('</div>', pos)
        if open_pos == -1 and close_pos == -1:
            break
        if open_pos != -1 and (close_pos == -1 or open_pos < close_pos):
            depth += 1
            pos = open_pos + 4
        else:
            depth -= 1
            if depth == 0:
                end = close_pos + len('</div>')
                return tag_start, end
            pos = close_pos + 6
    return -1, -1

def replace_panel_content(content, panel_id, new_inner):
    """Substitui o conteúdo interno de um bim-panel mantendo a tag de abertura."""
    start, end = find_panel_bounds(content, panel_id)
    if start == -1:
        print(f"    ✗ ERRO: painel {panel_id} não encontrado")
        return content
    old_block = content[start:end]
    # Extrai a tag de abertura (primeira linha do div)
    close_bracket = old_block.index('>') + 1
    opening_tag = old_block[:close_bracket]
    new_block = opening_tag + '\n' + new_inner + '\n</div>'
    result = content[:start] + new_block + content[end:]
    print(f"    ✓ Painel {panel_id} substituído")
    return result

# ── HELPER: gera lesson-list com bim-header e lesson-items ──
def mk_panel(badge_num, header_html, lessons):
    """
    header_html: string completa do bim-header (sem newline)
    lessons: lista de (num, title, sub)
    """
    items = []
    for num, title, sub in lessons:
        items.append(
            f'<div class="lesson-item lgg ">\n'
            f'  <div class="lesson-num">{num}</div>\n'
            f'  <div class="lesson-text">\n'
            f'    <div class="lesson-title">{title}</div>\n'
            f'    <div class=\'lesson-sub\'>{sub}</div>\n'
            f'  </div>\n'
            f'</div>'
        )
    lesson_list = '\n'.join(items)
    return f'{header_html}\n<div class="lesson-list">\n{lesson_list}\n</div>'

# ══════════════════════════════════════════
# 1ª SÉRIE
# ══════════════════════════════════════════

# d1lgg1_b1
html = replace_panel_content(html, 'd1lgg1_b1', mk_panel(10,
    '<div class="bim-header lgg"><h3>📅 1º Bimestre – Método, Conhecimento e Ciência</h3><span class="badge">10 aulas</span></div>',
    [
        (1, 'O que é linguagem?', 'Conceito amplo de linguagem (verbal, visual, corporal, digital e multimodal) e sua função social'),
        (2, 'A comunicação na história da humanidade', 'Da oralidade primitiva à escrita: como os povos preservaram saberes e identidades'),
        (3, 'Quem somos e de onde falamos?', 'Identidade cultural, lugar de fala e sua influência na produção de sentidos'),
        (4, 'Manifestações sociais e linguagem', 'Como movimentos sociais usam a linguagem para transformar realidades'),
        (5, 'Saberes ancestrais e ciência moderna', 'Diálogo entre conhecimentos tradicionais (indígenas, quilombolas, amazônicos) e o saber científico'),
        (6, 'Slams, rap e hip hop como linguagem', 'Análise e produção de textos orais de resistência e identidade'),
        (7, 'Gêneros digitais em mapeamento', 'Identificação e comparação de gêneros textuais (meme, post, thread, reels, podcast)'),
        (8, 'Fake News e desinformação', 'Como identificar e combater conteúdos falsos nas redes sociais'),
        (9, 'Representatividade nas mídias', 'Análise crítica da presença (ou ausência) de mulheres, negros e povos originários nos meios de comunicação'),
        (10, 'Produção de artigo reflexivo ou diário', 'Escrita individual sobre a relação pessoal com a linguagem e a identidade'),
    ]
))

# d1lgg1_b2
html = replace_panel_content(html, 'd1lgg1_b2', mk_panel(10,
    '<div class="bim-header lgg"><h3>📅 2º Bimestre – Mediação e Intervenção Sociocultural</h3><span class="badge">10 aulas</span></div>',
    [
        (1, 'Gêneros comunicativos orais', 'Debate, seminário, roda de conversa: estrutura, função e técnicas de argumentação'),
        (2, 'Gêneros comunicativos escritos e multimodais', 'Carta, manifesto, infográfico, HQ: quando e como usar cada um'),
        (3, 'Preconceito e estereótipos nas redes sociais', 'Análise de casos reais: racismo, gordofobia e LGBTfobia digital'),
        (4, 'Mediação de conflitos pela linguagem', 'Estratégias de escuta ativa, empatia e negociação em contextos escolares e comunitários'),
        (5, 'Expressão corporal como linguagem', 'O corpo que comunica: dança, teatro, performance e acessibilidade'),
        (6, 'Práticas meditativas e bem-estar', 'Conexão entre saúde mental, equilíbrio emocional e comunicação saudável'),
        (7, 'Intervenção social pela linguagem', 'Como criar campanhas, cartilhas e materiais informativos para a comunidade'),
        (8, 'Código de ética digital', 'Construção coletiva de normas de convivência responsável nas mídias'),
        (9, 'Ensaio e produção artística', 'Preparação de performances, esquetes ou apresentações multimodais para o projeto final'),
        (10, '🎭 PROJETO — "Vozes que Transformam"', 'Teatro, slam ou vídeo curto para alunos do E.F. sobre identidade e comunicação responsável'),
    ]
))

# d1lgg1_b3
html = replace_panel_content(html, 'd1lgg1_b3', mk_panel(10,
    '<div class="bim-header lgg"><h3>📅 3º Bimestre – Inovação e Intervenção Tecnológica</h3><span class="badge">10 aulas</span></div>',
    [
        (1, 'Linguagem, tecnologia e cultura', 'Como as plataformas digitais transformam as formas de se comunicar e criar'),
        (2, 'O que são algoritmos?', 'Funcionamento básico e influência dos algoritmos no que vemos e consumimos'),
        (3, 'Algoritmos nas redes sociais', 'Como TikTok, Instagram e YouTube decidem o que aparece para você'),
        (4, 'Ética na produção de conteúdo digital', 'O que significa ser ético na internet? Casos reais de comportamento digital'),
        (5, 'Inteligência Artificial: ferramentas criativas', 'Introdução ao uso de IA (texto, imagem, áudio) com foco ético e criativo'),
        (6, 'Leis e crimes digitais', 'Marco Civil da Internet, LGPD e responsabilidade jurídica nas redes'),
        (7, 'A história da Inteligência Artificial', 'Linha do tempo: do surgimento da IA às ferramentas atuais'),
        (8, 'Narrativas digitais e criação colaborativa', 'Como produzir conteúdos autorais em ambientes virtuais'),
        (9, 'Campanha digital contra desinformação', 'Planejamento de campanha coletiva sobre fake news e uso consciente da internet'),
        (10, 'Produção final: guia coletivo de ferramentas digitais éticas', 'Cada grupo apresenta uma ferramenta digital, usos criativos e limites éticos'),
    ]
))

# d1lgg1_b4
html = replace_panel_content(html, 'd1lgg1_b4', mk_panel(10,
    '<div class="bim-header lgg"><h3>📅 4º Bimestre – Mundo do Trabalho e Transformação Social</h3><span class="badge">10 aulas</span></div>',
    [
        (1, 'Comunicação na cultura jovem', 'Gírias, tendências e como os jovens criam e transformam a linguagem'),
        (2, 'Linguagem inclusiva e respeitosa', 'Identificação e desconstrução de termos excludentes; como falar com todos'),
        (3, 'Gêneros discursivos no mundo do trabalho', 'E-mail profissional, currículo, carta de apresentação, relatório'),
        (4, 'Perfis profissionais em plataformas digitais', 'Análise de LinkedIn e portfólios: como a linguagem constrói imagem profissional'),
        (5, 'Profissões emergentes e tecnologia', 'Quais carreiras estão sendo criadas pela era digital?'),
        (6, 'Saberes amazônicos e profissões locais', 'Como conhecimentos tradicionais da Amazônia podem se tornar fontes de trabalho e identidade'),
        (7, 'Empreendedorismo e comunicação', 'Como criar materiais de comunicação para um negócio ou projeto social'),
        (8, 'Diálogo intercultural no trabalho', 'Língua estrangeira e língua materna como ferramentas de inclusão e mediação profissional'),
        (9, 'Ensaio e preparação do projeto final', 'Organização dos portfólios, roteiros de podcast ou esquetes profissionais'),
        (10, '🎙️ PROJETO — "Feira de Profissões do Futuro"', 'Estações temáticas sobre profissões digitais, saberes amazônicos e comunicação profissional'),
    ]
))

# ══════════════════════════════════════════
# 2ª SÉRIE
# ══════════════════════════════════════════

# d2lgg_b1
html = replace_panel_content(html, 'd2lgg_b1', mk_panel(10,
    '<div class="bim-header lgg"><h3>📅 1º Bimestre – Método, Conhecimento e Ciência</h3><span class="badge">10 aulas</span></div>',
    [
        (1, 'Cultura digital Pan-Amazônica', 'Como os povos amazônicos se expressam e se comunicam no ambiente digital'),
        (2, 'Produtores de conteúdo e suas influências', 'Quem são os influenciadores? Como moldam opiniões, estilos e comportamentos'),
        (3, 'Informação digital: circulação e veracidade', 'Como uma informação se espalha e como verificar sua autenticidade'),
        (4, 'Leitura e análise de memes', 'O meme como gênero: humor, crítica social, viralização e responsabilidade'),
        (5, 'Threads e narrativas em redes sociais', 'Como histórias são contadas em ambientes digitais em tempo real'),
        (6, 'Literatura amazônica e identidade digital', 'Leitura e debate de obras de autores da Amazônia e sua presença no mundo digital'),
        (7, 'Políticas de privacidade', 'Estudo comparativo de aplicativos: o que concordamos sem ler?'),
        (8, 'Corpos e vozes digitais', 'Como avatares, filtros e personagens online constroem e distorcem identidades'),
        (9, 'Guia de boas práticas digitais', 'Construção coletiva de guia para uso ético e saudável das redes'),
        (10, 'Produção autoral', 'Documentário curto, tirinha ou podcast temático sobre cultura digital amazônica'),
    ]
))

# d2lgg_b2
html = replace_panel_content(html, 'd2lgg_b2', mk_panel(10,
    '<div class="bim-header lgg"><h3>📅 2º Bimestre – Mediação e Intervenção Sociocultural</h3><span class="badge">10 aulas</span></div>',
    [
        (1, 'Impactos psicossociais das redes sociais', 'Ansiedade, comparação, FOMO e solidão digital: como as redes afetam a saúde mental'),
        (2, 'Sustentabilidade digital', 'Lixo eletrônico, consumo consciente de tecnologia e pegada digital'),
        (3, 'Práticas corporais como patrimônio imaterial', 'Danças, rituais e jogos regionais como forma de resistência e identidade cultural'),
        (4, 'Corpo conectado: tecnologia e movimento', 'Uso de softwares e aplicativos para análise de movimento e saúde física'),
        (5, 'Reeducação Postural Global (RPG) e telas', 'Impactos do uso excessivo de dispositivos no corpo e estratégias de bem-estar'),
        (6, 'Campanha sobre uso consciente da tecnologia', 'Produção de posts, cartazes e vídeos curtos com dicas saudáveis'),
        (7, 'Debate: tecnologia nos esportes e na arte', 'Como o digital transformou as práticas corporais e as artes cênicas'),
        (8, 'Catalogação de jogos, danças e rituais regionais', 'Pesquisa e registro de manifestações corporais tradicionais do Acre e Amazônia'),
        (9, 'Ensaio e organização do projeto final', 'Preparação de performances, mostras ou encenações'),
        (10, '🎪 PROJETO — "Festival da Cultura Viva Digital"', 'Mostra integrando danças amazônicas, artes digitais, saúde e identidade'),
    ]
))

# d2lgg_b3
html = replace_panel_content(html, 'd2lgg_b3', mk_panel(10,
    '<div class="bim-header lgg"><h3>📅 3º Bimestre – Inovação e Intervenção Tecnológica</h3><span class="badge">10 aulas</span></div>',
    [
        (1, 'Algoritmos: impacto na cultura e comunicação', 'Como os algoritmos criam bolhas de informação e câmaras de eco'),
        (2, 'Pesquisa sobre algoritmos de recomendação', 'Análise prática: o que YouTube, Spotify e Instagram recomendam e por quê'),
        (3, 'Influenciadores: linguagem e poder', 'Como a estética e a frequência de postagens constroem autoridade digital'),
        (4, 'Conteúdo digital: produção e privacidade', 'Direitos autorais, imagem, dados pessoais e o que acontece com o que postamos'),
        (5, 'IA: uso ético e mercado de trabalho', 'Ferramentas de IA generativa e seus impactos nas profissões criativas'),
        (6, 'Fake news e desinformação avançada', 'Deepfakes, manipulação de imagem e como verificar conteúdo audiovisual'),
        (7, 'Etiqueta digital', 'Netiqueta, comunicação respeitosa e gestão da reputação online'),
        (8, 'Segurança na internet', 'Senhas, golpes digitais, phishing e proteção de dados'),
        (9, 'Direitos digitais e regulação', 'Debate simulado: como o Estado deve regular as redes sociais?'),
        (10, 'Produção de microvídeo educativo ou roteiro de podcast', 'Sobre direitos digitais ou ética online, para divulgação na escola'),
    ]
))

# d2lgg_b4
html = replace_panel_content(html, 'd2lgg_b4', mk_panel(10,
    '<div class="bim-header lgg"><h3>📅 4º Bimestre – Mundo do Trabalho e Transformação Social</h3><span class="badge">10 aulas</span></div>',
    [
        (1, 'Inovações tecnológicas no mundo do trabalho', 'Como a automação e a IA estão mudando as profissões'),
        (2, 'Profissões digitais emergentes', 'UX Design, Marketing Digital, Curador de Conteúdo, Analista de Dados, etc.'),
        (3, 'Língua Estrangeira e identidade', 'Como aprender outra língua transforma perspectivas e amplia oportunidades'),
        (4, 'Língua estrangeira como instrumento profissional', 'Simulações de diálogos em contextos de trabalho'),
        (5, 'Elaboração de currículo e perfil profissional', 'Construção de currículo em língua materna e estrangeira'),
        (6, 'Empreendedorismo digital', 'Como jovens podem criar projetos, canais, produtos ou serviços usando tecnologia'),
        (7, 'Debate: desafios e oportunidades no trabalho do futuro', 'Roda de conversa com foco em juventude, Amazônia e mercado global'),
        (8, 'Entrevista com profissional da área digital', 'Palestra ou conversa com um profissional convidado da comunidade'),
        (9, 'Ensaio e montagem do projeto final', 'Preparação da Feira das Profissões'),
        (10, '🏆 PROJETO — "Feira das Profissões Digitais"', 'Exposição interativa sobre profissões digitais com simulações e demonstrações tecnológicas'),
    ]
))

# ══════════════════════════════════════════
# 3ª SÉRIE
# ══════════════════════════════════════════

# d3lgg_b1
html = replace_panel_content(html, 'd3lgg_b1', mk_panel(10,
    '<div class="bim-header lgg"><h3>📅 1º Bimestre – Método, Conhecimento e Ciência</h3><span class="badge">10 aulas</span></div>',
    [
        (1, 'Gêneros digitais e abordagem investigativa', 'Como analisar posts, stories, vídeos e podcasts como objetos de estudo'),
        (2, 'Suportes e formatos de produção textual', 'Qual suporte usar para cada objetivo comunicativo? Análise comparativa'),
        (3, 'Herança cultural nas mídias digitais', 'Como tradições, mitos e memórias de povos são (ou não) representados online'),
        (4, 'Narrativas visuais e performativas', 'Vídeo mapping, pixel art, fotografia e performance como linguagem artística'),
        (5, 'Memes, vídeos virais e campanhas', 'O que torna um conteúdo viral? Quais são seus efeitos sociais?'),
        (6, 'Privacidade e manipulação algorítmica', 'Como dados pessoais são usados para influenciar decisões'),
        (7, 'Uso responsável da linguagem nos espaços digitais', 'Como nos comunicamos nas redes e o que isso diz sobre nós'),
        (8, 'Cultura participativa nas mídias', 'Fandoms, remix, produção colaborativa e o papel do usuário como co-criador'),
        (9, 'Arte digital como resistência e memória', 'Análise de obras que retratem identidade amazônica e afro-brasileira'),
        (10, 'Produção: portfólio, diário digital ou canal', 'Cada estudante inicia projeto autoral de registro de sua jornada criativa'),
    ]
))

# d3lgg_b2
html = replace_panel_content(html, 'd3lgg_b2', mk_panel(10,
    '<div class="bim-header lgg"><h3>📅 2º Bimestre – Mediação e Intervenção Sociocultural</h3><span class="badge">10 aulas</span></div>',
    [
        (1, 'Memes como crimes digitais', 'Racismo, misoginia e homofobia em forma de "humor": análise e curadoria crítica'),
        (2, 'Corpo, mente e emoções na era digital', 'Registro de tempo de tela e reflexão sobre impactos emocionais'),
        (3, 'Uso excessivo de telas e saúde', 'Debate sobre os efeitos físicos e psicológicos do hiperconsumo digital'),
        (4, 'Acessibilidade digital', 'O que exclui pessoas com deficiência em apps, páginas e vídeos? Como mudar isso?'),
        (5, 'A rede como espaço de intervenção artística', 'Graffiti virtual, performances online e ativismo digital'),
        (6, 'Narrativas transmídia', 'Como uma história pode existir em múltiplas plataformas ao mesmo tempo'),
        (7, 'Saúde e bem-estar nas narrativas digitais', 'Conteúdos sobre equilíbrio emocional e hábitos saudáveis nas redes'),
        (8, 'Reescrita de memes discriminatórios', 'Transformar conteúdos preconceituosos em mensagens de inclusão e respeito'),
        (9, 'Ensaio e produção do projeto final', 'Criação de narrativa transmídia com contos, mitos e lendas amazônicas'),
        (10, '🎭 PROJETO — "Contos da Amazônia Digital"', 'Lendas amazônicas reinterpretadas em teatro + QR codes + mural interativo'),
    ]
))

# d3lgg_b3
html = replace_panel_content(html, 'd3lgg_b3', mk_panel(10,
    '<div class="bim-header lgg"><h3>📅 3º Bimestre – Inovação e Intervenção Tecnológica</h3><span class="badge">10 aulas</span></div>',
    [
        (1, 'IA na produção e no consumo de informações', 'Como textos, imagens e vídeos são gerados por IA e como identificá-los'),
        (2, 'Análise crítica de filtros algorítmicos', 'Como a IA decide o que você vê, lê e acredita'),
        (3, 'Storytelling digital', 'A arte de contar histórias em ambientes digitais: estrutura, emoção e engajamento'),
        (4, 'Ciberativismo', 'Campanhas digitais de sucesso que mudaram leis, comportamentos ou políticas públicas'),
        (5, 'Limites éticos da IA', 'Onde termina a ferramenta e começa o plágio? Autoria, criatividade e responsabilidade'),
        (6, 'Workshop de produção ética de conteúdo com IA', 'Produção supervisionada de textos, imagens e áudios com IA'),
        (7, 'Regulação das mídias digitais', 'Debate: como regular plataformas sem cercear a liberdade de expressão?'),
        (8, 'Campanhas contra desinformação', 'Campanha digital coletiva usando recursos de IA de forma responsável'),
        (9, 'Teatro fórum e roteiro ativista', 'Roteiro para performance ou vídeo sobre ativismo digital'),
        (10, 'Exposição multimodal aberta', 'Apresentação para a comunidade escolar de projetos produzidos com IA'),
    ]
))

# d3lgg_b4
html = replace_panel_content(html, 'd3lgg_b4', mk_panel(10,
    '<div class="bim-header lgg"><h3>📅 4º Bimestre – Mundo do Trabalho e Transformação Social</h3><span class="badge">10 aulas</span></div>',
    [
        (1, 'Linguagens em contextos profissionais', 'Como se comunicar com clareza, ética e adequação em diferentes ambientes'),
        (2, 'IA na mediação do conhecimento profissional', 'Como profissionais de diversas áreas já usam IA no cotidiano'),
        (3, 'Línguas estrangeiras no mercado de trabalho', 'Por que o inglês (e outras línguas) abrem portas? Simulações de diálogos'),
        (4, 'Ascensão das profissões digitais', 'Quais carreiras crescem, quais somem e o que isso significa para os jovens'),
        (5, 'Pesquisa de campo: profissões digitais na Amazônia', 'Entrevistas com profissionais locais que trabalham com tecnologia'),
        (6, 'Produção de currículo e perfil profissional completo', 'Currículo, carta de apresentação e perfil no LinkedIn'),
        (7, 'Glossário em língua estrangeira', 'Dicionário de termos técnicos das áreas digitais em inglês/espanhol'),
        (8, 'Simulação de entrevista e negociação profissional', 'Role-play com foco em comunicação intercultural e ética'),
        (9, 'Ensaio e montagem do projeto final', 'Organização de materiais, roteiros e produções para a exposição conclusiva'),
        (10, '🌟 PROJETO FINAL — "Mostra de Letramento Midiático"', 'Exposição aberta à comunidade sobre fake news, ética da IA, profissões digitais e identidade amazônica'),
    ]
))

print("  ✓ Todos os 12 painéis LGG substituídos")

# ─────────────────────────────────────────────────────────────
# 6. SALVAR ARQUIVO
# ─────────────────────────────────────────────────────────────
print("\n[6/6] Salvando arquivo...")
with open(FILE, 'w', encoding='utf-8') as f:
    f.write(html)

new_len = len(html)
print(f"  Arquivo salvo: {new_len} bytes (delta: +{new_len - original_len} bytes)")
print("\n══════════════════════════════════════")
print("CONCLUÍDO")
print("══════════════════════════════════════")
