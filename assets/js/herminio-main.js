// ═══════════════════════════════════════════════════════ //  DADOS — E.E. RAIMUNDO HERMÍNIO DE MELO // ═══════════════════════════════════════════════════════
/* Alunos por turma */ const ALUNOS_RH = {   t89:[     {n:1,nm:'Ana Clara da Silva Araújo'},     {n:2,nm:'Arthur Miguel de Sousa Nonato'},     {n:3,nm:'Larissa Ferreira de Souza'},     {n:4,nm:'Mailson Pereira Matos'},     {n:5,nm:'Pedro Henrique Ramalho Magalhães'},     {n:6,nm:'Jefferson Garcia Cordeiro'},     {n:7,nm:'Nicole Ferreira de Oliveira'},     {n:8,nm:'Rafaela da Silva Ramalho'},     {n:9,nm:'Ramicléia Ketoly de Oliveira da Costa'},     {n:10,nm:'Rayane Nunes Sampaio'},     {n:11,nm:'Samuel Sólis Severino'}   ],   t1:[     {n:1,nm:'Fernanda Victória Batista Machado'},     {n:2,nm:'Larissa Bruna de Sousa Machado'},     {n:3,nm:'Marlon Pereira Matos'},     {n:4,nm:'Mayron Pereira Matos'},     {n:5,nm:'Miquéias Rocha Macelino dos Santos'}   ],   t23:[     {n:1,nm:'Ana Vitória Simão de Oliveira'},     {n:2,nm:'Átila Estevam Chaves Correa'},     {n:3,nm:'Dayane Nunes de Sousa'},     {n:4,nm:'Fernando Lima Altino'},     {n:5,nm:'Geovana da Silva Conceição'},     {n:6,nm:'Isvi Antony de Azevedo Damião'},     {n:7,nm:'João Vítor Matos de Aguiar'},     {n:8,nm:'Nely de Souza Bonfim'},     {n:9,nm:'Pedro Henrique do Vino Silva'},     {n:10,nm:'Rayely da Costa Lopes'},     {n:11,nm:'Tamyres Soares dos Santos'},     {n:12,nm:'Tiago Oliveira da Silva'},     {n:13,nm:'Aquis Ferreira de Oliveira'},     {n:14,nm:'Diego da Silva Lima'},     {n:15,nm:'Erislene Tavares Ricardo'},     {n:16,nm:'Heloá do Nascimento Fernandes'},     {n:17,nm:'Mariana Soares da Silva'},     {n:18,nm:'Rafael da Silva Ramalho'},     {n:19,nm:'Vitória de Souza Rodrigues'},     {n:20,nm:'Yago de Oliveira Carneiro'}   ] };
/* Presença: faltaram = sem justificativa, faltJ = justificados */ const PRESENCA_RH = {   'pl-t1-0710a':{ turma:'t1', faltaram:[], faltJ:[] },   'pl-t1-0710b':{ turma:'t1', faltaram:[], faltJ:[] },   'pl-t1-0703a':{ turma:'t1', faltaram:[], faltJ:[] },   'pl-t1-0703b':{ turma:'t1', faltaram:[], faltJ:[] },   'pl-t1-0702a':{ turma:'t1', faltaram:[], faltJ:[] },   'pl-t1-0702b':{ turma:'t1', faltaram:[], faltJ:[] },   'pl-t1-0701a':{ turma:'t1', faltaram:[3,5], faltJ:[] },   'pl-t1-0701b':{ turma:'t1', faltaram:[3,5], faltJ:[] },   'pl-t1-0630a':{ turma:'t1', faltaram:[3,5], faltJ:[] },   'pl-t1-0630b':{ turma:'t1', faltaram:[3,5], faltJ:[] },   'pl-t1-0625a':{ turma:'t1', faltaram:[1,5], faltJ:[] },   'pl-t1-0625b':{ turma:'t1', faltaram:[1,5], faltJ:[] },   'pl-t1-0626a':{ turma:'t1', faltaram:[1,3,5], faltJ:[] },   'pl-t1-0626b':{ turma:'t1', faltaram:[1,3,5], faltJ:[] },   'pl-t1-0624a':{ turma:'t1', faltaram:[5], faltJ:[] },   'pl-t1-0624b':{ turma:'t1', faltaram:[5], faltJ:[] },   'pl-t1-0623a':{ turma:'t1', faltaram:[5], faltJ:[] },   'pl-t1-0623b':{ turma:'t1', faltaram:[5], faltJ:[] },   'pl-t1-0622a':{ turma:'t1', faltaram:[5], faltJ:[] },   'pl-t1-0622b':{ turma:'t1', faltaram:[5], faltJ:[] },   'pl-t1-0609a-sec':{ turma:'t1', faltaram:[2,3,4,5], faltJ:[] },   'pl-t1-0609b-sec':{ turma:'t1', faltaram:[2,3,4,5], faltJ:[] },   'pl-t1-0608a-sec':{ turma:'t1', faltaram:[3,4,5], faltJ:[] },   'pl-t1-0608b-sec':{ turma:'t1', faltaram:[3,4,5], faltJ:[] },   'pl-t1-0609a':{ turma:'t1', faltaram:[2,3,4,5], faltJ:[] },   'pl-t1-0609b':{ turma:'t1', faltaram:[2,3,4,5], faltJ:[] },   'pl-t1-0608a':{ turma:'t1', faltaram:[3,4,5], faltJ:[] },   'pl-t1-0608b':{ turma:'t1', faltaram:[3,4,5], faltJ:[] },   'pl-t1-0527a':{ turma:'t1', faltaram:[], faltJ:[] },   'pl-t1-0527b':{ turma:'t1', faltaram:[], faltJ:[] },   'pl-t1-0620a':{ turma:'t1', faltaram:[5], faltJ:[] },   'pl-t1-0620b':{ turma:'t1', faltaram:[5], faltJ:[] },   'pl-t1-0619a':{ turma:'t1', faltaram:[3,4,5], faltJ:[] },   'pl-t1-0619b':{ turma:'t1', faltaram:[3,4,5], faltJ:[] },   'pl-t1-0618a':{ turma:'t1', faltaram:[3,4,5], faltJ:[] },   'pl-t1-0618b':{ turma:'t1', faltaram:[3,4,5], faltJ:[] },   'pl-t1-0617a':{ turma:'t1', faltaram:[5], faltJ:[] },   'pl-t1-0617b':{ turma:'t1', faltaram:[5], faltJ:[] },   'pl-t1-0617c':{ turma:'t1', faltaram:[3,4,5], faltJ:[] },   'pl-t1-0617d':{ turma:'t1', faltaram:[3,4,5], faltJ:[] },   'pl-t1-0616a':{ turma:'t1', faltaram:[3,5], faltJ:[] },   'pl-t1-0616b':{ turma:'t1', faltaram:[3,5], faltJ:[] },   'pl-t1-0615a':{ turma:'t1', faltaram:[3,4,5], faltJ:[] },   'pl-t1-0615b':{ turma:'t1', faltaram:[3,4,5], faltJ:[] },   'pl-t1-0612a':{ turma:'t1', faltaram:[1,3,4], faltJ:[] },   'pl-t1-0612b':{ turma:'t1', faltaram:[1,3,4], faltJ:[] },   'pl-t1-0611a':{ turma:'t1', faltaram:[5], faltJ:[] },   'pl-t1-0611b':{ turma:'t1', faltaram:[5], faltJ:[] },   'pl-t1-0610a':{ turma:'t1', faltaram:[1,2,3,4,5], faltJ:[] },   'pl-t1-0610b':{ turma:'t1', faltaram:[1,2,3,4,5], faltJ:[] },   'pl-t1-0603a':{ turma:'t1', faltaram:[], faltJ:[] },   'pl-t1-0603b':{ turma:'t1', faltaram:[], faltJ:[] },   'pl-t1-0602a':{ turma:'t1', faltaram:[5], faltJ:[] },   'pl-t1-0602b':{ turma:'t1', faltaram:[5], faltJ:[] },   'pl-t1-0601a':{ turma:'t1', faltaram:[5], faltJ:[] },   'pl-t1-0601b':{ turma:'t1', faltaram:[5], faltJ:[] },   'pl-t1-0529a':{ turma:'t1', faltaram:[5], faltJ:[] },   'pl-t1-0529b':{ turma:'t1', faltaram:[5], faltJ:[] },   'pl-t1-0528a':{ turma:'t1', faltaram:[], faltJ:[] },   'pl-t1-0528b':{ turma:'t1', faltaram:[], faltJ:[] },   'pl-t1-0526a':{ turma:'t1', faltaram:[], faltJ:[] },   'pl-t1-0526b':{ turma:'t1', faltaram:[], faltJ:[] },   'pl-t1-0525a':{ turma:'t1', faltaram:[], faltJ:[] },   'pl-t1-0525b':{ turma:'t1', faltaram:[], faltJ:[] } };
/* Atividades */ const ATIVIDADES_RH = { };
/* Contador de h/aulas por disciplina    feitas = soma automática a partir dos relatos diários por turma */ const DISC_RH = [   { grupo:'lp',  turmaId:'t89', turma:'8º/9º Ano',   disc:'Língua Portuguesa', semanais:0,    bimestreMeta:40, totalMeta:160 },   { grupo:'lp',  turmaId:'t1',  turma:'1ª Série',    disc:'Língua Portuguesa', semanais:2.25, bimestreMeta:30, totalMeta:120 },   { grupo:'lp',  turmaId:'t23', turma:'2ª/3ª Série', disc:'Língua Portuguesa', semanais:0,    bimestreMeta:30, totalMeta:120 },   { grupo:'ing', turmaId:'t89', turma:'8º/9º Ano',   disc:'Inglês',            semanais:0,    bimestreMeta:10, totalMeta:40 },   { grupo:'ing', turmaId:'t1',  turma:'1ª Série',    disc:'Inglês',            semanais:0,    bimestreMeta:10, totalMeta:40 },   { grupo:'ing', turmaId:'t23', turma:'2ª/3ª Série', disc:'Inglês',            semanais:0,    bimestreMeta:10, totalMeta:40 },   { grupo:'esp', turmaId:'t89', turma:'8º/9º Ano',   disc:'Espanhol',          semanais:0,    bimestreMeta:10, totalMeta:40 },   { grupo:'esp', turmaId:'t1',  turma:'1ª Série',    disc:'Espanhol',          semanais:2.25, bimestreMeta:10, totalMeta:40 },   { grupo:'esp', turmaId:'t23', turma:'2ª/3ª Série', disc:'Espanhol',          semanais:0,    bimestreMeta:10, totalMeta:40 },   { grupo:'art', turmaId:'t89', turma:'8º/9º Ano',   disc:'Arte',              semanais:0,    bimestreMeta:10, totalMeta:40 },   { grupo:'art', turmaId:'t1',  turma:'1ª Série',    disc:'Arte',              semanais:0,    bimestreMeta:10, totalMeta:40 },   { grupo:'art', turmaId:'t23', turma:'2ª/3ª Série', disc:'Arte',              semanais:0,    bimestreMeta:10, totalMeta:40 },   { grupo:'red', turmaId:'t1',  turma:'1ª Série',    disc:'Redação',           semanais:0,    bimestreMeta:10, totalMeta:40 },   { grupo:'red', turmaId:'t23', turma:'2ª/3ª Série', disc:'Redação',           semanais:0,    bimestreMeta:10, totalMeta:40 } ];
const RH_SECOES_TURMA = {   'sec-t89': 't89',   'sec-t1': 't1',   'sec-t23': 't23' };
const RH_TURMA_LABELS = {   t89: '8º/9º Ano',   t1: '1ª Série',   t23: '2ª/3ª Série' };
const RH_GRUPOS_CONT = {   lp: { container: 'rh-cont-lp', badge: 'LP', badgeStyle: 'background:var(--vs);color:var(--vm)', bar: 'linear-gradient(90deg,var(--vm),var(--vc))' },   ing:{ container: 'rh-cont-ing', badge: 'ING', badgeStyle: 'background:#e8f9ef;color:#1f7a52', bar: 'linear-gradient(90deg,#27ae60,#58d68d)' },   esp:{ container: 'rh-cont-esp', badge: 'ESP', badgeStyle: 'background:#f3e9fb;color:#7d3c98', bar: 'linear-gradient(90deg,#8e44ad,#c39bd3)' },   art:{ container: 'rh-cont-art', badge: 'ART', badgeStyle: 'background:var(--lav);color:var(--la)', bar: 'linear-gradient(90deg,var(--la),#e67e22)' },   red:{ container: 'rh-cont-red', badge: 'RED', badgeStyle: 'background:#e6f4ea;color:#1f6f43', bar: 'linear-gradient(90deg,#1f7a4d,#58b77c)' } };
const RH_LIVROS_DISCS = {   lp: { nm:'Língua Portuguesa', cor:'d-lp', turmas:['t89','t1','t23'] },   ing:{ nm:'Inglês',            cor:'d-lp', turmas:['t89','t1','t23'] },   esp:{ nm:'Espanhol',          cor:'d-lp', turmas:['t89','t1','t23'] },   art:{ nm:'Arte',              cor:'d-ar', turmas:['t89','t1','t23'] },   red:{ nm:'Redação',           cor:'d-lp', turmas:['t1','t23'] } };
const RH_LIV_ICS = {   '':          { ic:'📘', lbl:'Não iniciado' },   criando:     { ic:'📕', lbl:'Criando' },   concluido:   { ic:'📗', lbl:'Concluído' } };
var _rhLivStatus = JSON.parse(localStorage.getItem('rh_liv_status') || '{}'); var _rhLivUrls = JSON.parse(localStorage.getItem('rh_liv_urls') || '{}'); const RH_SEQ_DISCS = {   t89:[{id:'lp',nm:'Língua Portuguesa',cor:'d-lp'},{id:'ing',nm:'Inglês',cor:'d-lp'},{id:'esp',nm:'Espanhol',cor:'d-lp'}],   t1:[{id:'lp',nm:'Língua Portuguesa',cor:'d-lp'},{id:'ing',nm:'Inglês',cor:'d-lp'},{id:'esp',nm:'Espanhol',cor:'d-lp'},{id:'red',nm:'Redação',cor:'d-lp'}],   t23:[{id:'lp',nm:'Língua Portuguesa',cor:'d-lp'},{id:'ing',nm:'Inglês',cor:'d-lp'},{id:'esp',nm:'Espanhol',cor:'d-lp'},{id:'red',nm:'Redação',cor:'d-lp'}] }; const RH_SEQ_ICS = {'':{ic:'🗂',lbl:'Não iniciado'},criando:{ic:'📝',lbl:'Criando'},concluido:{ic:'✅',lbl:'Concluído'}}; var _rhSeqStatus = JSON.parse(localStorage.getItem('rh_seq_status') || '{}'); var _rhPresencaCliques = JSON.parse(localStorage.getItem('rh_presenca_cliques') || '{}'); var _rhAtividadeCliques = JSON.parse(localStorage.getItem('rh_atividade_cliques') || '{}'); const RH_ALUNOS_SYNC_KEY = 'rh_alunos_sync_v1'; const RH_SUPABASE_DAILY_SCOPE = 'herminio:daily:shared-v1'; const RH_DAILY_LOCAL_TS_KEY = 'rh_daily_sync_local_ts'; var _rhRemoteDailySync = null; var _rhAplicandoSyncRemoto = false;
const RH_MESES = {   Jan: 0, Fev: 1, Mar: 2, Abr: 3, Mai: 4, Jun: 5,   Jul: 6, Ago: 7, Set: 8, Out: 9, Nov: 10, Dez: 11 };
function fmtHoraAula(valor) { 
if (valor === 0) return '0'; 
if (!valor) return '—'; 
var inteiro = Math.trunc(valor); 
var fracao = Math.round((valor - inteiro) * 100) / 100; 
if (fracao === 0) return String(inteiro); 
if (fracao === 0.25) return inteiro ? inteiro + 'h15' : '0h15'; 
if (fracao === 0.5) return inteiro ? inteiro + 'h30' : '0h30'; 
if (fracao === 0.75) return inteiro ? inteiro + 'h45' : '0h45';   return String(valor).replace('.', ','); }
function fmtNumeroRH(valor) {   return String(Math.round(valor * 100) / 100).replace('.', ','); }
function fmtDataRH(data) {   return data.toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric' }); }
function parseHorasRH(txt) { 
if (!txt) return 0; 
var m = txt.match(/(\d+)h(?:(\d{2}))?/i); 
if (!m) return 0; 
var h = parseInt(m[1], 10); 
var min = m[2] ? parseInt(m[2], 10) : 0;   return h + (min / 60); }
function normalizarDiscRH(txt) { 
if (!txt) return null; 
if (/(Língua Portuguesa|LP)/i.test(txt)) return { grupo:'lp', disc:'Língua Portuguesa' }; 
if (/(Língua Inglesa|Inglês|Ingles)/i.test(txt)) return { grupo:'ing', disc:'Inglês' }; 
if (/(Língua Espanhola|Espanhol)/i.test(txt)) return { grupo:'esp', disc:'Espanhol' }; 
if (/\bArte(?:s)?\b/i.test(txt)) return { grupo:'art', disc:'Arte' }; 
if (/Redação|Redacao/i.test(txt)) return { grupo:'red', disc:'Redação' };   return null; }
function parseDataCardRH(card) { 
var dia = card.querySelector('.edb .d'); 
var mesAno = card.querySelector('.edb .my'); 
if (!dia || !mesAno) return null; 
var partes = mesAno.textContent.trim().split(/\s+/); 
if (partes.length < 2) return null; 
var mes = RH_MESES[partes[0]]; 
var ano = parseInt(partes[1], 10); 
if (mes === undefined || !ano) return null;   return new Date(ano, mes, parseInt(dia.textContent.trim(), 10)); }
function coletarAulasLancadasRH() { 
var mapa = {}; 
var ultimaData = null;    Object.keys(RH_SECOES_TURMA).forEach(function(secId) {   
var sec = document.getElementById(secId);   
if (!sec) return;   
var turmaId = RH_SECOES_TURMA[secId];     sec.querySelectorAll('.ea').forEach(function(card) {     
var titulo = card.querySelector('.em .ed');     
if (!titulo) return;     
var infoDisc = normalizarDiscRH(titulo.textContent);     
if (!infoDisc) return;     
var horas = parseHorasRH(titulo.textContent);     
var chave = turmaId + '_' + infoDisc.disc;       mapa[chave] = (mapa[chave] || 0) + horas;     
var data = parseDataCardRH(card);     
if (data && (!ultimaData || data > ultimaData)) ultimaData = data;     });   });    return { mapa: mapa, ultimaData: ultimaData }; }
function getBimAtualRH(feitas, bimestre) { 
if (!bimestre) return 1;   for (var b = 1; b <= 4; b++) {   
if (feitas < b * bimestre) return b;   }   return 4; }
function addDiasRH(data, dias) { 
var d = new Date(data);   d.setDate(d.getDate() + dias);   return d; }
function rhSalvarCliques(tipo) {   localStorage.setItem(RH_DAILY_LOCAL_TS_KEY, new Date().toISOString()); 
if (tipo === 'presenca') {     localStorage.setItem('rh_presenca_cliques', JSON.stringify(_rhPresencaCliques));     rhAgendarSyncRemoto('presenca');     return;   }   localStorage.setItem('rh_atividade_cliques', JSON.stringify(_rhAtividadeCliques));   rhAgendarSyncRemoto('atividade'); }
function rhExtrairTurmaDoTitulo(txt) { 
if (!txt) return null; 
if (txt.indexOf('1ª Série') >= 0) return 't1'; 
if (txt.indexOf('8º') >= 0 || txt.indexOf('9º') >= 0) return 't89'; 
if (txt.indexOf('2ª') >= 0 || txt.indexOf('3ª') >= 0) return 't23';   return null; }
function rhDescobrirTurmaPane(pane) { 
if (!pane) return null; 
var id = pane.id || ''; 
var match = id.match(/^[pa]-(t89|t1|t23)-/); 
if (match) return match[1]; 
var card = pane.closest('.ea'); 
if (!card) return null; 
var titulo = card.querySelector('.em .ed');   return rhExtrairTurmaDoTitulo(titulo ? titulo.textContent : ''); }
function rhDisciplinaPane(pane) { 
if (!pane) return null; 
var card = pane.closest('.ea'); 
if (!card) return null; 
var titulo = card.querySelector('.em .ed');   return normalizarDiscRH(titulo ? titulo.textContent : ''); }
function rhDiaBasePane(paneId) { 
var match = String(paneId || '').match(/(\d{4})/);   return match ? match[1] : ''; }
function rhMapaVazioTurma(turmaId) { 
var mapa = {};   (ALUNOS_RH[turmaId] || []).forEach(function(aluno) {     mapa[aluno.n] = null;   });   return mapa; }
function rhEstadoPresencaInicial(pane) { 
var turmaId = rhDescobrirTurmaPane(pane); 
if (!turmaId) return {}; 
var paneId = pane.id || ''; 
var mapa = rhMapaVazioTurma(turmaId); 
var direto = PRESENCA_RH['pl-' + paneId.slice(2)]; 
if (direto) {     (ALUNOS_RH[turmaId] || []).forEach(function(aluno) {     
var faltou = (direto.faltaram || []).indexOf(aluno.n) >= 0 || (direto.faltJ || []).indexOf(aluno.n) >= 0;       mapa[aluno.n] = !faltou;     });     return mapa;   } 
if (paneId.indexOf('p-all-') === 0) {   
var base = rhDiaBasePane(paneId);   
var chaves = Object.keys(PRESENCA_RH).filter(function(chave) {       return chave.indexOf('pl-' + turmaId + '-' + base) === 0;     });   
if (chaves.length) {       (ALUNOS_RH[turmaId] || []).forEach(function(aluno) {       
var faltouAlguma = chaves.some(function(chave) {         
var reg = PRESENCA_RH[chave];           return (reg.faltaram || []).indexOf(aluno.n) >= 0 || (reg.faltJ || []).indexOf(aluno.n) >= 0;         });         mapa[aluno.n] = !faltouAlguma;       });     }   }   return mapa; }
function rhEstadoAtividadeInicial(pane) { 
var turmaId = rhDescobrirTurmaPane(pane); 
if (!turmaId) return {}; 
var paneId = pane.id || ''; 
var mapa = rhMapaVazioTurma(turmaId); 
var direto = ATIVIDADES_RH[paneId]; 
if (direto) {     (ALUNOS_RH[turmaId] || []).forEach(function(aluno) {     
if ((direto.fez || []).indexOf(aluno.n) >= 0) mapa[aluno.n] = true;       else if ((direto.naoFez || []).indexOf(aluno.n) >= 0) mapa[aluno.n] = false;     });     return mapa;   } 
if (paneId.indexOf('a-all-') === 0) {   
var base = rhDiaBasePane(paneId);   
var chaves = Object.keys(ATIVIDADES_RH).filter(function(chave) {       return chave.indexOf('a-' + turmaId + '-' + base) === 0;     });   
if (chaves.length) {       (ALUNOS_RH[turmaId] || []).forEach(function(aluno) {       
var naoFezAlguma = chaves.some(function(chave) {           return (ATIVIDADES_RH[chave].naoFez || []).indexOf(aluno.n) >= 0;         });       
var fezAlguma = chaves.some(function(chave) {           return (ATIVIDADES_RH[chave].fez || []).indexOf(aluno.n) >= 0;         });         mapa[aluno.n] = naoFezAlguma ? false : (fezAlguma ? true : null);       });     }   } 
if (rhUsaAtividadeAutomaticaLP1(pane)) {     (ALUNOS_RH[turmaId] || []).forEach(function(aluno) {     
var presente = rhGetEstadoAtual('presenca', pane, aluno.n);     
if (presente === true) mapa[aluno.n] = true;       else if (presente === false) mapa[aluno.n] = false;     });   }   return mapa; }
function rhGetEstadoAtual(tipo, pane, numeroAluno) { 
var origem = tipo === 'presenca' ? rhEstadoPresencaInicial(pane) : rhEstadoAtividadeInicial(pane); 
var cliques = tipo === 'presenca' ? _rhPresencaCliques : _rhAtividadeCliques; 
var paneMap = cliques[pane.id] || {}; 
if (paneMap[numeroAluno] !== undefined) return paneMap[numeroAluno];   return origem[numeroAluno]; }
function rhFormatDateCodeSync(code) { 
if (!code || code.length < 4) return '';   return code.slice(2, 4) + '/' + code.slice(0, 2) + '/2026'; }
function rhBimestrePorCodigo(code) { 
var mes = parseInt(String(code || '').slice(0, 2), 10); 
if (!mes || mes <= 4) return '1'; 
if (mes <= 7) return '2'; 
if (mes <= 9) return '3';   return '4'; }
var RH_BIMESTRE_AULA_LIMITES = {   't1|lp': 20,   't1|esp': 10,   't1|ing': 10 };
function rhMetaBimestrePorDisciplina(turmaId, grupo, disciplina) { 
var overrideKey = turmaId + '|' + grupo; 
if (RH_BIMESTRE_AULA_LIMITES[overrideKey]) {     return RH_BIMESTRE_AULA_LIMITES[overrideKey];   } 
var base = DISC_RH.find(function(item) {     return item.turmaId === turmaId && item.grupo === grupo && item.disc === disciplina;   });   return base && Number(base.bimestreMeta) ? Number(base.bimestreMeta) : 0; }
function rhColetarMapaBimestresPanes() { 
var grupos = {}; 
var mapa = {};    document.querySelectorAll('[id^="a-"]').forEach(function(pane, idx) {   
if (pane.id.indexOf('a-all-') === 0) return;   
var turmaId = rhDescobrirTurmaPane(pane);   
var infoDisc = rhDisciplinaPane(pane);   
if (!turmaId || !infoDisc) return;   
var key = turmaId + '|' + infoDisc.grupo;   
if (!grupos[key]) grupos[key] = [];     grupos[key].push({       paneId: pane.id,       turmaId: turmaId,       grupo: infoDisc.grupo,       disciplina: infoDisc.disc,       carga: rhHorasPainel(pane),       baseCode: rhDiaBasePane(pane.id),       ordemDom: idx     });   });    Object.keys(grupos).forEach(function(key) {   
var lista = grupos[key];   
if (!lista || !lista.length) return;     lista.sort(function(a, b) {     
if (a.baseCode === b.baseCode) return a.ordemDom - b.ordemDom;       return a.baseCode.localeCompare(b.baseCode);     });    
var acumulado = 0;     lista.forEach(function(item) {     
var meta = rhMetaBimestrePorDisciplina(item.turmaId, item.grupo, item.disciplina);     
if (!meta) {         mapa[item.paneId] = rhBimestrePorCodigo(item.baseCode);       } else {         mapa[item.paneId] = String(Math.min(4, Math.floor(acumulado / meta) + 1));       }       acumulado += item.carga || 0;     });   });    return mapa; }
function rhHorasPainel(pane) { 
if (!pane) return 1; 
var card = pane.closest('.ea'); 
if (!card) return 1; 
var titulo = card.querySelector('.em .ed'); 
if (!titulo) return 1;   return Math.max(1, Math.floor(parseHorasRH(titulo.textContent) || 0)); }
function rhRelatoRelacionadoPane(pane) { 
if (!pane || !pane.id) return null; 
var relatoId = pane.id.replace(/^[pa]-/, 'r-');   return document.getElementById(relatoId); }
function rhPaneTemTemaRegistrado(pane) { 
var relato = rhRelatoRelacionadoPane(pane); 
if (!relato) return false; 
var textos = Array.from(relato.querySelectorAll('.ct')).map(function(item) {     return (item.textContent || '').trim();   }).filter(Boolean); 
if (!textos.length) return false;   return textos.some(function(texto) {     return texto.toLowerCase().indexOf('sem conteudo registrado') === -1;   }); }
function rhUsaAtividadeAutomaticaLP1(pane) { 
var turmaId = rhDescobrirTurmaPane(pane); 
var infoDisc = rhDisciplinaPane(pane);   return turmaId === 't1'     && !!infoDisc     && ['lp', 'esp', 'ing'].indexOf(infoDisc.grupo) >= 0     && rhPaneTemTemaRegistrado(pane); }
function rhResumoAlunoBase(aluno) {   return {     numero: aluno.n,     nome: aluno.nm,     faltas: 0,     presencas: 0,     totalAulas: 0,     porDia: {},     atividadesFeitas: 0,     atividadesPorBimestre: { '1': 0, '2': 0, '3': 0, '4': 0 },     disciplinas: {}   }; }
function rhResumoDisciplinaBase() {   return {     atividadesAplicadas: 0,     atividadesAplicadasPorBimestre: { '1': 0, '2': 0, '3': 0, '4': 0 }   }; }
function rhResumoAlunoDisciplinaBase() {   return {     atividadesFeitas: 0,     atividadesPorBimestre: { '1': 0, '2': 0, '3': 0, '4': 0 }   }; }
function rhGarantirResumoDisciplinaClasse(classe, disciplina) { 
if (!classe.disciplinas) classe.disciplinas = {}; 
if (!classe.disciplinas[disciplina]) {     classe.disciplinas[disciplina] = rhResumoDisciplinaBase();   }   return classe.disciplinas[disciplina]; }
function rhGarantirResumoDisciplinaAluno(aluno, disciplina) { 
if (!aluno.disciplinas) aluno.disciplinas = {}; 
if (!aluno.disciplinas[disciplina]) {     aluno.disciplinas[disciplina] = rhResumoAlunoDisciplinaBase();   }   return aluno.disciplinas[disciplina]; }
function rhMontarResumoAlunosSync() { 
var classes = {}; 
var mapaBimestres = rhColetarMapaBimestresPanes();    Object.keys(ALUNOS_RH).forEach(function(turmaId) {   
var students = (ALUNOS_RH[turmaId] || []).map(function(aluno) {       return rhResumoAlunoBase(aluno);     });     classes[turmaId] = {       turma: RH_TURMA_LABELS[turmaId] || turmaId,       atividadesAplicadas: 0,       atividadesAplicadasPorBimestre: { '1': 0, '2': 0, '3': 0, '4': 0 },       disciplinas: {},       students: students     };   });    document.querySelectorAll('[id^="p-"]').forEach(function(pane) {   
if (pane.id.indexOf('p-all-') === 0) return;   
var turmaId = rhDescobrirTurmaPane(pane);   
if (!turmaId || !classes[turmaId]) return;   
var carga = rhHorasPainel(pane);   
var data = rhFormatDateCodeSync(rhDiaBasePane(pane.id));      classes[turmaId].students.forEach(function(aluno) {     
var estado = rhGetEstadoAtual('presenca', pane, aluno.numero);     
if (estado === true) {         aluno.presencas += carga;         aluno.totalAulas += carga;         return;       }     
if (estado === false) {         aluno.faltas += carga;         aluno.totalAulas += carga;       
if (data) aluno.porDia[data] = (aluno.porDia[data] || 0) + carga;       }     });   });    document.querySelectorAll('[id^="a-"]').forEach(function(pane) {   
if (pane.id.indexOf('a-all-') === 0) return;   
var turmaId = rhDescobrirTurmaPane(pane);   
if (!turmaId || !classes[turmaId]) return;   
var bim = mapaBimestres[pane.id] || rhBimestrePorCodigo(rhDiaBasePane(pane.id));   
var infoDisc = rhDisciplinaPane(pane);   
var contaTema = rhPaneTemTemaRegistrado(pane);     classes[turmaId].atividadesAplicadas += 1;     classes[turmaId].atividadesAplicadasPorBimestre[bim] = (classes[turmaId].atividadesAplicadasPorBimestre[bim] || 0) + 1;   
if (infoDisc && contaTema) {     
var resumoDiscClasse = rhGarantirResumoDisciplinaClasse(classes[turmaId], infoDisc.disc);       resumoDiscClasse.atividadesAplicadas += 1;       resumoDiscClasse.atividadesAplicadasPorBimestre[bim] = (resumoDiscClasse.atividadesAplicadasPorBimestre[bim] || 0) + 1;     }      classes[turmaId].students.forEach(function(aluno) {     
var estado = rhGetEstadoAtual('atividade', pane, aluno.numero);     
if (estado === true) {         aluno.atividadesFeitas += 1;         aluno.atividadesPorBimestre[bim] = (aluno.atividadesPorBimestre[bim] || 0) + 1;       }     
if (!(infoDisc && contaTema) || estado !== true) return;     
var resumoDiscAluno = rhGarantirResumoDisciplinaAluno(aluno, infoDisc.disc);       resumoDiscAluno.atividadesFeitas += 1;       resumoDiscAluno.atividadesPorBimestre[bim] = (resumoDiscAluno.atividadesPorBimestre[bim] || 0) + 1;     });   });    return {     updatedAt: new Date().toISOString(),     classes: classes   }; }
function rhSincronizarResumoAlunos() {   localStorage.setItem(RH_ALUNOS_SYNC_KEY, JSON.stringify(rhMontarResumoAlunosSync())); }
function rhMontarPayloadSyncRemoto() {   return {     localUpdatedAt: localStorage.getItem(RH_DAILY_LOCAL_TS_KEY) || new Date().toISOString(),     presencaCliques: _rhPresencaCliques,     atividadeCliques: _rhAtividadeCliques,     alunosSync: rhMontarResumoAlunosSync()   }; }
function rhAplicarSyncRemoto(payload, meta) { 
if (!payload || typeof payload !== 'object') return; 
var localStamp = Date.parse(localStorage.getItem(RH_DAILY_LOCAL_TS_KEY) || '') || 0; 
var remoteStamp = Date.parse((payload && payload.localUpdatedAt) || (meta && meta.updatedAt) || '') || 0; 
if (localStamp && remoteStamp && localStamp > remoteStamp) {     rhAgendarSyncRemoto('keep-local');     return;   }   _rhAplicandoSyncRemoto = true;    _rhPresencaCliques = payload.presencaCliques && typeof payload.presencaCliques === 'object'     ? payload.presencaCliques     : {};   _rhAtividadeCliques = payload.atividadeCliques && typeof payload.atividadeCliques === 'object'     ? payload.atividadeCliques     : {};    localStorage.setItem('rh_presenca_cliques', JSON.stringify(_rhPresencaCliques));   localStorage.setItem('rh_atividade_cliques', JSON.stringify(_rhAtividadeCliques));   localStorage.setItem(RH_DAILY_LOCAL_TS_KEY, payload.localUpdatedAt || (meta && meta.updatedAt) || new Date().toISOString());   localStorage.setItem(RH_ALUNOS_SYNC_KEY, JSON.stringify(payload.alunosSync || rhMontarResumoAlunosSync()));    rhMarcarPanesInterativosDirty('presenca');   rhMarcarPanesInterativosDirty('atividade');   rhRenderInterativosVisiveis(false);   rhSincronizarResumoAlunos();    _rhAplicandoSyncRemoto = false; }
function rhAgendarSyncRemoto(reason) { 
if (_rhAplicandoSyncRemoto || !_rhRemoteDailySync) return;   _rhRemoteDailySync.schedulePush(reason || 'daily-change'); }
function rhIniciarSyncRemoto() { 
if (!window.RelatorioSupabaseSync || !window.RelatorioSupabaseSync.isAvailable()) return;    _rhRemoteDailySync = window.RelatorioSupabaseSync.createScopeSync({     scope: RH_SUPABASE_DAILY_SCOPE,     schoolSlug: 'raimundo-herminio-de-melo',     classSlug: 'relatos-gerais',     source: 'herminio-html',     debounceMs: 550,     getLocalPayload: function () {       return rhMontarPayloadSyncRemoto();     },     onRemotePayload: function (payload, meta) {       rhAplicarSyncRemoto(payload, meta);     },     onStatus: function (status) {     
if (status === 'erro') {         console.warn('[SupabaseSync] Raimundo Herminio permaneceu em modo local.');       }     }   });    _rhRemoteDailySync.start().then(function(ready) {   
if (!ready) return;     window.setTimeout(function() {       rhAgendarSyncRemoto('bootstrap');     }, 900);   }); }
function rhProximoEstado(valorAtual) { 
if (valorAtual === null || valorAtual === undefined) return true;   return !valorAtual; }
function rhClasseMarcacao(valor) { 
if (valor === true) return 'is-green'; 
if (valor === false) return 'is-red';   return 'is-neutral'; }
function rhResumoMarcacao(tipo, pane, turmaId) { 
var alunos = ALUNOS_RH[turmaId] || []; 
var verd = 0; 
var verm = 0; 
var neut = 0;   alunos.forEach(function(aluno) {   
var estado = rhGetEstadoAtual(tipo, pane, aluno.n);   
if (estado === true) verd += 1;     else if (estado === false) verm += 1;     else neut += 1;   }); 
if (tipo === 'presenca') {     return verd + ' presentes · ' + verm + ' faltas' + (neut ? ' · ' + neut + ' sem marcação' : '');   }   return verd + ' fizeram · ' + verm + ' não fizeram' + (neut ? ' · ' + neut + ' sem marcação' : ''); }
function rhHtmlMosaico(tipo, pane, turmaId) { 
var alunos = ALUNOS_RH[turmaId] || []; 
var gridClass = tipo === 'presenca' ? 'pres-grid' : 'atv-grid'; 
var help = tipo === 'presenca'     ? 'Clique para marcar <strong>verde</strong> quem esteve presente e <strong>vermelho</strong> quem faltou.'     : 'Clique para marcar <strong>verde</strong> quem fez a atividade e <strong>vermelho</strong> quem não fez.';   return '<div class="rh-mark-help"><span class="dot g"></span> Verde <span class="dot r"></span> Vermelho <span class="dot n"></span> Neutro · ' + help + '</div>'     + '<div class="' + gridClass + '">'     + alunos.map(function(aluno) {     
var estado = rhGetEstadoAtual(tipo, pane, aluno.n);     
var classe = rhClasseMarcacao(estado);     
var flag = estado === true ? '●' : (estado === false ? '●' : '○');       return '<button type="button" class="rh-mark-btn ' + classe + '" data-rh-toggle="' + tipo + '" data-pane="' + pane.id + '" data-aluno="' + aluno.n + '">'         + '<span class="mk-num">' + aluno.n + '</span>'         + '<span class="mk-name">' + aluno.nm + '</span>'         + '<span class="mk-flag">' + flag + '</span>'       + '</button>';     }).join('')     + '</div>'; }
function rhRenderPanePresenca(pane) { 
var turmaId = rhDescobrirTurmaPane(pane); 
if (!turmaId) return; 
var resumo = pane.querySelector('.pres-av'); 
if (!resumo) {     resumo = document.createElement('div');     resumo.className = 'pres-av';     pane.insertBefore(resumo, pane.firstChild);   }   resumo.textContent = rhResumoMarcacao('presenca', pane, turmaId); 
var host = pane.querySelector('[data-rh-mosaico="presenca"]'); 
if (!host) {     host = document.createElement('div');     host.setAttribute('data-rh-mosaico', 'presenca');     pane.appendChild(host);   }   host.innerHTML = rhHtmlMosaico('presenca', pane, turmaId); }
function rhRenderPaneAtividade(pane) { 
var turmaId = rhDescobrirTurmaPane(pane); 
if (!turmaId) return; 
var resumo = pane.querySelector('.atv-av'); 
if (!resumo) {     resumo = document.createElement('div');     resumo.className = 'atv-av';     pane.insertBefore(resumo, pane.firstChild);   }   resumo.textContent = rhResumoMarcacao('atividade', pane, turmaId); 
var host = pane.querySelector('[data-rh-mosaico="atividade"]'); 
if (!host) {     host = document.createElement('div');     host.setAttribute('data-rh-mosaico', 'atividade');     pane.appendChild(host);   }   host.innerHTML = rhHtmlMosaico('atividade', pane, turmaId); }
function rhPaneInterativoVisivel(pane) { 
if (!pane) return false; 
if (pane.classList && !pane.classList.contains('on')) return false; 
var accordion = pane.closest('.ec2');   return !accordion || accordion.classList.contains('on'); }
function rhMarcarPanesInterativosDirty(tipo) { 
var seletor = tipo === 'presenca' ? '.ipane[id^="p-"]' : '.ipane[id^="a-"]';   document.querySelectorAll(seletor).forEach(function(pane) {     pane.setAttribute('data-rh-dirty', '1');   }); }
function rhRenderPaneInterativo(tipo, pane, force) { 
if (!pane) return; 
var precisa = !!force || pane.getAttribute('data-rh-dirty') === '1'; 
if (!precisa) {     precisa = tipo === 'presenca'       ? !pane.querySelector('[data-rh-mosaico="presenca"]')       : !pane.querySelector('[data-rh-mosaico="atividade"]');   } 
if (!precisa) return; 
if (tipo === 'presenca') rhRenderPanePresenca(pane);   else rhRenderPaneAtividade(pane);   pane.removeAttribute('data-rh-dirty'); }
function rhRenderPresencaInterativa(options) { 
var opts = options || {};   document.querySelectorAll('.ipane[id^="p-"]').forEach(function(pane) {     if (opts.visibleOnly && !rhPaneInterativoVisivel(pane)) return;     rhRenderPaneInterativo('presenca', pane, opts.force);   }); }
function rhRenderAtividadeInterativa(options) { 
var opts = options || {};   document.querySelectorAll('.ipane[id^="a-"]').forEach(function(pane) {     if (opts.visibleOnly && !rhPaneInterativoVisivel(pane)) return;     rhRenderPaneInterativo('atividade', pane, opts.force);   }); }
function rhRenderInterativosVisiveis(force) {   rhRenderPresencaInterativa({ visibleOnly: true, force: !!force });   rhRenderAtividadeInterativa({ visibleOnly: true, force: !!force }); }
function rhRenderPaneAtivo(container, force) { 
if (!container) return; 
var pane = container.querySelector('.ipane.on'); 
if (!pane) return; 
if (pane.id.indexOf('p-') === 0) {     rhRenderPaneInterativo('presenca', pane, force);     return;   } 
if (pane.id.indexOf('a-') === 0) {     rhRenderPaneInterativo('atividade', pane, force);   } }
function getMetasContRH(base) { 
var semanais = base.semanais || 0; 
var bimestre = base.bimestreMeta != null     ? base.bimestreMeta     : (semanais ? Math.round((semanais * 10 + Number.EPSILON) * 100) / 100 : 0); 
var total = base.totalMeta != null     ? base.totalMeta     : (semanais ? Math.round((semanais * 40 + Number.EPSILON) * 100) / 100 : 0);   return { semanais: semanais, bimestre: bimestre, total: total }; }
function calcBimestresRH(disc, feitas, dataRef) { 
if (!disc.bimestre || !disc.semanais) return []; 
var atual = [];   for (var b = 1; b <= 4; b++) {   
var meta = b * disc.bimestre;   
if (feitas >= meta) {       atual.push({ b: b, ok: true });       continue;     }   
var faltam = meta - feitas;   
var semanas = Math.ceil(faltam / disc.semanais);     atual.push({ b: b, ok: false, data: addDiasRH(dataRef, semanas * 7) });   }   return atual; }
// ═══════════════════════════════════════════════════════ //  FUNÇÕES DE NAVEGAÇÃO // ═══════════════════════════════════════════════════════
function aba(id, btn) {   document.querySelectorAll('.sec').forEach(function(s){ s.classList.remove('on'); });   document.querySelectorAll('.nb').forEach(function(b){ b.classList.remove('on'); }); 
var sec = document.getElementById(id); 
if (sec) sec.classList.add('on'); 
if (btn) btn.classList.add('on'); 
if ((id === 'sec-all' || id === 'sec-t89' || id === 'sec-t1' || id === 'sec-t23') && !window._rhDailyReady) { window._rhDailyReady = true; setTimeout(function(){ rhRenderInterativosVisiveis(false); rhSincronizarResumoAlunos(); rhRefreshHeroStats(); }, 40); } 
if (id === 'sec-cont') renderContRH(); 
if (id === 'sec-plano' && !window._rhPlanReady) { window._rhPlanReady = true; setTimeout(function(){ rhBuildPlanReplica(); }, 40); } 
if (id === 'sec-livros' && !window._rhLivReady) { window._rhLivReady = true; setTimeout(function(){ rhLivRender(); }, 40); } 
if (id === 'sec-sequencias' && !window._rhSeqReady) { window._rhSeqReady = true; setTimeout(function(){ rhSeqRender(); }, 40); } 
if (id === 'sec-claude') rhClaudeRender();   rhUpdateHeroStats(id); }
function tog(h) { 
var p = h.parentElement; 
var ec2 = p.querySelector('.ec2'); 
var et = h.querySelector('.et'); 
if (ec2) ec2.classList.toggle('on'); 
if (et) et.classList.toggle('op'); 
if (ec2 && ec2.classList.contains('on')) rhRenderPaneAtivo(ec2, false); 
var sec = h.closest('.sec'); 
if (sec) rhUpdateHeroStats(sec.id); }
function itab(btn, pid) { 
var parent = btn.closest('.ec2'); 
if (!parent) return;   parent.querySelectorAll('.itab').forEach(function(b){ b.classList.remove('on'); });   parent.querySelectorAll('.ipane').forEach(function(p){ p.classList.remove('on'); });   btn.classList.add('on'); 
var pane = document.getElementById(pid); 
if (pane) {     pane.classList.add('on');     rhRenderPaneAtivo(parent, false);   } }
function rhHeroFormatLastDate(sectionId) { 
var sec = document.getElementById(sectionId); 
if (!sec) return '—'; 
var primeiro = sec.querySelector('.ea'); 
if (!primeiro) return 'Sem lançamentos'; 
var dia = primeiro.querySelector('.edb .d'); 
var mesAno = primeiro.querySelector('.edb .my'); 
if (!dia || !mesAno) return 'Sem data';   return dia.textContent.trim() + ' ' + mesAno.textContent.trim(); }
function rhUpdateHeroStats(sectionId) { 
var sec = document.getElementById(sectionId); 
if (!sec) return; 
var cards = sec.querySelectorAll('.ea'); 
var abertos = sec.querySelectorAll('.ea .ec2.on'); 
var countEl = document.getElementById('rh-stat-count-' + sectionId); 
var lastEl = document.getElementById('rh-stat-last-' + sectionId); 
var openEl = document.getElementById('rh-stat-open-' + sectionId); 
if (countEl) countEl.textContent = String(cards.length); 
if (lastEl) lastEl.textContent = rhHeroFormatLastDate(sectionId); 
if (openEl) openEl.textContent = String(abertos.length); }
function rhRefreshHeroStats() {   ['sec-all', 'sec-t89', 'sec-t1', 'sec-t23'].forEach(function(id) {     rhUpdateHeroStats(id);   }); }
function rhSetHeroStatus(sectionId, message) { 
var el = document.getElementById('rh-hero-status-' + sectionId); 
if (el) el.textContent = message; }
function rhHeroToggleSection(sectionId, expandir) { 
var sec = document.getElementById(sectionId); 
if (!sec) return;   sec.querySelectorAll('.ea').forEach(function(card) {   
var ec2 = card.querySelector('.ec2');   
var et = card.querySelector('.et');   
if (ec2) ec2.classList.toggle('on', expandir);   
if (et) et.classList.toggle('op', expandir);   });   rhUpdateHeroStats(sectionId);   rhSetHeroStatus(sectionId, expandir ? 'Todos os relatos desta aba foram abertos.' : 'Todos os relatos desta aba foram recolhidos.'); }
function rhHeroScrollLatest(sectionId) { 
var sec = document.getElementById(sectionId); 
if (!sec) return; 
var card = sec.querySelector('.ea'); 
if (!card) {     rhSetHeroStatus(sectionId, 'Ainda não há relatos nesta aba.');     return;   }   card.scrollIntoView({ behavior: 'smooth', block: 'start' });   rhSetHeroStatus(sectionId, 'Rolagem posicionada no lançamento mais recente.'); }
function rhHeroBuildSummary(sectionId) { 
var sec = document.getElementById(sectionId); 
if (!sec) return ''; 
var titulo = sec.querySelector('.rh-hero-title'); 
var cards = Array.from(sec.querySelectorAll('.ea')); 
var linhas = [     (titulo ? titulo.textContent.trim() : sectionId),     'Lançamentos: ' + cards.length,     'Último registro: ' + rhHeroFormatLastDate(sectionId),     'Relatos abertos: ' + sec.querySelectorAll('.ea .ec2.on').length,     ''   ];   cards.slice(0, 5).forEach(function(card, index) {   
var nome = card.querySelector('.em .ed');   
var info = card.querySelector('.em .ec');     linhas.push((index + 1) + '. ' + (nome ? nome.textContent.trim() : 'Registro sem título'));   
if (info) linhas.push('   ' + info.textContent.trim().replace(/\s+/g, ' '));   });   return linhas.join('\n'); }
function rhHeroCopyFallback(texto) { 
var area = document.createElement('textarea');   area.value = texto;   document.body.appendChild(area);   area.select();   document.execCommand('copy');   area.remove(); }
function rhHeroCopySectionSummary(sectionId) { 
var resumo = rhHeroBuildSummary(sectionId); 
if (!resumo) return; 
if (navigator.clipboard && navigator.clipboard.writeText) {     navigator.clipboard.writeText(resumo).then(function() {       rhSetHeroStatus(sectionId, 'Resumo da aba copiado com sucesso.');     }).catch(function() {       rhHeroCopyFallback(resumo);       rhSetHeroStatus(sectionId, 'Resumo da aba copiado com fallback local.');     });     return;   }   rhHeroCopyFallback(resumo);   rhSetHeroStatus(sectionId, 'Resumo da aba copiado com fallback local.'); }
function rhGoTab(sectionId) { 
var btn = Array.from(document.querySelectorAll('.nb')).find(function(item) {     return (item.getAttribute('onclick') || '').indexOf("'" + sectionId + "'") >= 0;   });   aba(sectionId, btn || null);   window.scrollTo({ top: 0, behavior: 'smooth' }); }
// ═══════════════════════════════════════════════════════ //  MODO CLARO/ESCURO // ═══════════════════════════════════════════════════════
function setModo(m) {   document.body.className = m === 'escuro' ? 'modo-escuro' : '';   localStorage.setItem('rh_modo', m);   document.getElementById('modo-claro-btn').classList.toggle('on', m === 'claro');   document.getElementById('modo-escuro-btn').classList.toggle('on', m === 'escuro'); }
(function(){ 
var m = localStorage.getItem('rh_modo') || 'claro';   setModo(m); })();
// ═══════════════════════════════════════════════════════ //  PRESENÇA — renderização por turma // ═══════════════════════════════════════════════════════
function renderPresencaRH() {   rhRenderPresencaInterativa(); }
// ═══════════════════════════════════════════════════════ //  ATIVIDADES — renderização por turma // ═══════════════════════════════════════════════════════
function renderAtividadesRH() {   rhRenderAtividadeInterativa(); }
// ═══════════════════════════════════════════════════════ //  CONTADOR DE H/AULAS // ═══════════════════════════════════════════════════════
function renderContRH() {   Object.keys(RH_GRUPOS_CONT).forEach(function(grupo) {   
var el = document.getElementById(RH_GRUPOS_CONT[grupo].container);   
if (el) el.innerHTML = '';   });  
var dados = coletarAulasLancadasRH(); 
var dataRef = dados.ultimaData || new Date(); 
var upd = document.getElementById('rh-cont-upd'); 
if (upd) {     upd.innerHTML = '&#128197; Última atualização: ' + (dados.ultimaData ? fmtDataRH(dados.ultimaData) : '—');   }    DISC_RH.forEach(function(base) {   
var confGrupo = RH_GRUPOS_CONT[base.grupo];   
var container = document.getElementById(confGrupo.container);   
if (!container) return;    
var metas = getMetasContRH(base);   
var feitas = Math.round(((dados.mapa[base.turmaId + '_' + base.disc] || 0) + Number.EPSILON) * 100) / 100;   
var semanais = metas.semanais;   
var bimestre = metas.bimestre;   
var total = metas.total;   
var bimAtual = getBimAtualRH(feitas, bimestre);   
var inicioBim = bimestre ? (bimAtual - 1) * bimestre : 0;   
var feitasBim = bimestre ? Math.max(0, Math.round(((feitas - inicioBim) + Number.EPSILON) * 100) / 100) : 0;   
var faltamBim = bimestre ? Math.max(0, Math.round(((bimestre - feitasBim) + Number.EPSILON) * 100) / 100) : 0;   
var faltamAno = total ? Math.max(0, Math.round(((total - feitas) + Number.EPSILON) * 100) / 100) : 0;   
var pctBim = bimestre ? Math.min((feitasBim / bimestre) * 100, 100) : 0;   
var pctAno = total ? Math.min((feitas / total) * 100, 100) : 0;   
var bimestres = calcBimestresRH({ semanais: semanais, bimestre: bimestre }, feitas, dataRef);    
var card = document.createElement('div');     card.className = 'cc';    
var badgeTxt = bimestre ? (bimAtual + 'º Bimestre') : confGrupo.badge;   
var metaTxt = base.disc       + (bimestre ? ' · ' + fmtHoraAula(bimestre) + ' h/aula bimestrais' : '')       + (total ? ' · ' + fmtHoraAula(total) + ' h/aula anuais' : '');    
var previsaoHtml = '';   
if (bimestres.length) {       previsaoHtml = '<div class="brow">' + bimestres.map(function(item) {       
var cls = item.ok ? 'co' : (item.b === bimAtual ? 'at' : '');       
var rotulo = item.ok ? '&#10004; Concluído' : fmtDataRH(item.data);         return '<div class="bi ' + cls + '"><div class="bn">' + item.b + 'º Bim</div><div class="bd2">' + rotulo + '</div></div>';       }).join('') + '</div>';     }    
var observacao = semanais       ? '<div class="ae">Estimativa calculada a partir dos relatos diários já lançados.</div>'       : '<div class="ae">Metas bimestrais e anuais definidas. Defina a carga semanal se quiser liberar a previsão automática de conclusão.</div>';      card.innerHTML =       '<div class="cch">'         + '<div><div class="cct">' + RH_TURMA_LABELS[base.turmaId] + '</div><div class="ccm">' + metaTxt + '</div></div>'         + '<div class="ccb" style="' + confGrupo.badgeStyle + '">' + badgeTxt + '</div>'       + '</div>'       + '<div class="ccbody">'         + '<div class="pg">'           + '<div class="pl"><span class="plt">' + (bimestre ? (bimAtual + 'º Bimestre') : 'Aulas lançadas') + '</span><span class="pln">' + fmtHoraAula(bimestre ? feitasBim : feitas) + (bimestre ? ' / ' + fmtHoraAula(bimestre) + ' · faltam ' + fmtHoraAula(faltamBim) : ' h/aula acumuladas') + '</span></div>'           + '<div class="pbg"><div class="pf" style="width:' + pctBim + '%;background:' + confGrupo.bar + '"></div></div>'         + '</div>'         + '<div class="pg">'           + '<div class="pl"><span class="plt">Total do ano</span><span class="pln">' + fmtHoraAula(feitas) + (total ? ' / ' + fmtHoraAula(total) + ' · faltam ' + fmtHoraAula(faltamAno) : ' h/aula registradas') + '</span></div>'           + '<div class="pbg"><div class="pf dm" style="width:' + pctAno + '%;background:' + confGrupo.bar + '"></div></div>'         + '</div>'         + previsaoHtml         + observacao       + '</div>';      container.appendChild(card);   }); }
// ═══════════════════════════════════════════════════════ //  INIT // ═══════════════════════════════════════════════════════ 
// ═══════════════════════════════════════════════════════ //  LIVROS — troca de aba // ═══════════════════════════════════════════════════════
var PROMPT_LIVROS_TEXTO='Prompt de livros temporariamente simplificado para manter a pagina interativa.';
function abrirPromptLivros(){ 
var modal=document.getElementById('prompt-livros-modal');   if(!modal){     modal=document.createElement('div');     modal.id='prompt-livros-modal';     modal.style='position:fixed;inset:0;background:rgba(0,0,0,.68);z-index:9999;display:flex;align-items:center;justify-content:center;padding:18px';     modal.innerHTML=''       +'<div style="background:var(--cr);border-radius:18px;width:min(920px,100%);max-height:92vh;overflow:hidden;box-shadow:0 24px 80px rgba(0,0,0,.45);display:flex;flex-direction:column">'       +'<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:18px 20px;border-bottom:1px solid var(--cl);background:linear-gradient(135deg,rgba(201,168,76,.18),rgba(232,200,106,.08))">'       +'<div><div style="font-family:\'Playfair Display\',serif;font-size:1.1rem;font-weight:700;color:var(--vd)">Prompt para livros HTML</div><div style="font-size:.77rem;color:var(--cm);margin-top:3px">Texto base para iniciar o desenvolvimento do livro digital.</div></div>'       +'<div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:flex-end">'       +'<button id="prompt-livros-copy-btn" type="button" onclick="copiarPromptLivros()" style="padding:10px 16px;border:none;border-radius:999px;background:linear-gradient(135deg,#c9a84c,#e8c86a);color:#43310e;font:700 .8rem \'DM Sans\',sans-serif;cursor:pointer">copiar</button>'       +'<button type="button" onclick="fecharPromptLivros()" style="padding:10px 16px;border:none;border-radius:999px;background:var(--cl);color:var(--ce);font:700 .8rem \'DM Sans\',sans-serif;cursor:pointer">fechar</button>'       +'</div></div>'       +'<div style="padding:20px;overflow:auto"><textarea id="prompt-livros-texto" readonly style="width:100%;min-height:68vh;padding:16px 18px;border:1px solid var(--cl);border-radius:14px;background:#fff;color:var(--ce);font:400 .84rem/1.7 \'DM Sans\',sans-serif;resize:none;white-space:pre-wrap"></textarea></div>'       +'</div>';     document.body.appendChild(modal);   
var area=document.getElementById('prompt-livros-texto');     if(area)area.value=PROMPT_LIVROS_TEXTO;     modal.addEventListener('click',function(e){if(e.target===modal)fecharPromptLivros();});   }   modal.style.display='flex'; }
function fecharPromptLivros(){ 
var modal=document.getElementById('prompt-livros-modal');   if(modal)modal.style.display='none'; }
function copiarPromptLivros(){ 
var area=document.getElementById('prompt-livros-texto'); 
var btn=document.getElementById('prompt-livros-copy-btn');   if(!area)return; 
var texto=area.value||''; 
function ok(){     if(!btn)return;     btn.textContent='copiado!';     clearTimeout(btn._copyTimer);     btn._copyTimer=setTimeout(function(){btn.textContent='copiar';},1600);   } 
function fallback(){     area.focus();     area.select();     try{ if(document.execCommand('copy')) ok(); }catch(e){}   }   if(navigator.clipboard&&navigator.clipboard.writeText){     navigator.clipboard.writeText(texto).then(ok).catch(fallback);     return;   }   fallback(); }
document.addEventListener('keydown',function(e){   if(e.key==='Escape')fecharPromptLivros(); });
function rhLivTab(disc, btn) {   document.querySelectorAll('#sec-livros .liv-tab').forEach(function(b){ b.classList.remove('on'); });   document.querySelectorAll('#sec-livros .liv-page').forEach(function(p){ p.classList.remove('on'); }); 
if (btn) btn.classList.add('on'); 
var pg = document.getElementById('rh-liv-page-' + disc); 
if (pg) pg.classList.add('on'); }
function rhSeqTab(turma, btn) {   document.querySelectorAll('#sec-sequencias .liv-tab').forEach(function(b){ b.classList.remove('on'); });   document.querySelectorAll('#sec-sequencias .liv-page').forEach(function(p){ p.classList.remove('on'); }); 
if (btn) btn.classList.add('on'); 
var pg = document.getElementById('rh-seq-page-' + turma); 
if (pg) pg.classList.add('on'); }
function rhLivSalvarStatus() {   localStorage.setItem('rh_liv_status', JSON.stringify(_rhLivStatus)); }
function rhSeqSalvarStatus() {   localStorage.setItem('rh_seq_status', JSON.stringify(_rhSeqStatus)); }
function rhLivRegistrarUrl(key, url) {   _rhLivUrls[key] = url;   localStorage.setItem('rh_liv_urls', JSON.stringify(_rhLivUrls)); }
function rhLivSetStatus(key, st, evt) { 
if (evt) evt.stopPropagation();   _rhLivStatus[key] = (_rhLivStatus[key] === st) ? '' : st;   rhLivSalvarStatus(); 
var card = document.querySelector('[data-rh-liv="' + key + '"]'); 
if (card) rhLivAtualizarCard(card, key); }
function rhLivAtualizarCard(card, key) { 
var st = _rhLivStatus[key] || ''; 
var livro = _rhGetLivro(key) || {};   card.classList.remove('criando', 'concluido'); 
if (st) card.classList.add(st); 
var ic = card.querySelector('.liv-card-ic'); 
if (ic) ic.textContent = RH_LIV_ICS[st] ? RH_LIV_ICS[st].ic : '📘'; 
var lbl = card.querySelector('.liv-card-nm'); 
if (lbl) lbl.textContent = livro.titulo ? livro.titulo : (RH_LIV_ICS[st] ? RH_LIV_ICS[st].lbl : 'Não iniciado'); }
function rhSeqSetStatus(key, st, evt) { 
if (evt) evt.stopPropagation();   _rhSeqStatus[key] = (_rhSeqStatus[key] === st) ? '' : st;   rhSeqSalvarStatus(); 
var card = document.querySelector('[data-rh-seq="' + key + '"]'); 
if (card) rhSeqAtualizarCard(card, key); }
function rhSeqAtualizarCard(card, key) { 
var st = _rhSeqStatus[key] || ''; 
var seq = _rhGetSequencia(key) || {};   card.classList.remove('criando', 'concluido'); 
if (st) card.classList.add(st); 
var ic = card.querySelector('.liv-card-ic'); 
if (ic) ic.textContent = RH_SEQ_ICS[st] ? RH_SEQ_ICS[st].ic : '🗂'; 
var lbl = card.querySelector('.liv-card-nm'); 
if (lbl) lbl.textContent = seq.titulo ? seq.titulo : (RH_SEQ_ICS[st] ? RH_SEQ_ICS[st].lbl : 'Não iniciado'); }
function rhLivRender() {   Object.keys(RH_LIVROS_DISCS).forEach(function(discId) {   
var page = document.getElementById('rh-liv-page-' + discId);   
if (!page) return;     page.innerHTML = '';   
var disc = RH_LIVROS_DISCS[discId];      disc.turmas.forEach(function(turmaId) {     
var sec = document.createElement('div');       sec.className = 'liv-disc';       sec.innerHTML =         '<div class="liv-disc-h"><span class="ld ' + disc.cor + '" style="width:12px;height:12px;border-radius:3px;flex-shrink:0;display:inline-block"></span>'         + RH_TURMA_LABELS[turmaId] + ' · ' + disc.nm + '</div>'         + '<div class="liv-grid" id="rh-liv-g-' + discId + '-' + turmaId + '"></div>';       page.appendChild(sec);      
var grid = document.getElementById('rh-liv-g-' + discId + '-' + turmaId);       for (var b = 1; b <= 4; b++) {       
(function(bim) {         
var key = turmaId + '-' + discId + '-b' + bim;         
var st = _rhLivStatus[key] || '';         
var livro = _rhGetLivro(key) || {};         
var card = document.createElement('div');           card.className = 'liv-card' + (st ? ' ' + st : '');           card.setAttribute('data-rh-liv', key);           card.innerHTML =             '<div class="liv-card-bim">' + bim + 'º Bimestre</div>'             + '<span class="liv-card-ic">' + (RH_LIV_ICS[st] ? RH_LIV_ICS[st].ic : '📘') + '</span>'             + '<div class="liv-card-nm">' + (livro.titulo || (RH_LIV_ICS[st] ? RH_LIV_ICS[st].lbl : 'Não iniciado')) + '</div>'             + '<div class="liv-btns">'               + '<button class="liv-btn b-cri" onclick="rhLivSetStatus(\'' + key + '\',\'criando\',event)">📝 Criando</button>'               + '<button class="liv-btn b-con" onclick="rhLivSetStatus(\'' + key + '\',\'concluido\',event)">✅ Concluído</button>'               + '<button class="liv-btn b-ace" onclick="rhLivroAbrirModal(\'' + key + '\',\'' + turmaId + '\',\'' + disc.nm.replace(/'/g, "\\'") + '\',\'' + bim + 'º Bimestre\',event)">✏️ Editar</button>'             + '<button class="liv-btn" type="button" onclick="abrirLivroPromptLivro(\'herminio\',\'' + key + '\',\'' + turmaId + '\',\'' + disc.nm.replace(/'/g, "\\'") + '\',\'' + bim + '\',event)" style="' + LIVRO_PROMPT_BUTTON_STYLE + '">Prompt</button>'             + '</div>';           card.addEventListener('click', function(e) {           
if (e.target.closest('.liv-btn')) return;           
var aberto = this.classList.contains('open');             document.querySelectorAll('.liv-card.open').forEach(function(c) { c.classList.remove('open'); });           
if (!aberto) this.classList.add('open');           });           grid.appendChild(card);         })(b);       }     });   }); }
function rhSeqRender() {   ['t89','t1','t23'].forEach(function(turmaId) {   
var page = document.getElementById('rh-seq-page-' + turmaId);   
if (!page) return;     page.innerHTML = '';     (RH_SEQ_DISCS[turmaId] || []).forEach(function(disc) {     
var sec = document.createElement('div');       sec.className = 'liv-disc';       sec.innerHTML =         '<div class="liv-disc-h"><span class="ld ' + disc.cor + '" style="width:12px;height:12px;border-radius:3px;flex-shrink:0;display:inline-block"></span>'         + disc.nm + '</div>'         + '<div class="liv-grid" id="rh-seq-g-' + turmaId + '-' + disc.id + '"></div>';       page.appendChild(sec);     
var grid = document.getElementById('rh-seq-g-' + turmaId + '-' + disc.id);       for (var b = 1; b <= 4; b++) {       
(function(bim) {         
var key = turmaId + '-' + disc.id + '-sqb' + bim;         
var st = _rhSeqStatus[key] || '';         
var seq = _rhGetSequencia(key) || {};         
var card = document.createElement('div');           card.className = 'liv-card' + (st ? ' ' + st : '');           card.setAttribute('data-rh-seq', key);           card.innerHTML =             '<div class="liv-card-bim">' + bim + 'º Bimestre</div>'             + '<span class="liv-card-ic">' + (RH_SEQ_ICS[st] ? RH_SEQ_ICS[st].ic : '🗂') + '</span>'             + '<div class="liv-card-nm">' + (seq.titulo || (RH_SEQ_ICS[st] ? RH_SEQ_ICS[st].lbl : 'Não iniciado')) + '</div>'             + '<div class="liv-btns">'               + '<button class="liv-btn b-cri" onclick="rhSeqSetStatus(\'' + key + '\',\'criando\',event)">📝 Criando</button>'               + '<button class="liv-btn b-con" onclick="rhSeqSetStatus(\'' + key + '\',\'concluido\',event)">✅ Concluído</button>'               + '<button class="liv-btn b-ace" onclick="rhSequenciaAbrirModal(\'' + key + '\',\'' + turmaId + '\',\'' + disc.nm.replace(/'/g, "\\'") + '\',\'' + bim + 'º Bimestre\',event)">✏️ Editar</button>'             + '</div>';           card.addEventListener('click', function(e) {           
if (e.target.closest('.liv-btn')) return;           
var aberto = this.classList.contains('open');             document.querySelectorAll('#sec-sequencias .liv-card.open').forEach(function(c) { c.classList.remove('open'); });           
if (!aberto) this.classList.add('open');           });           grid.appendChild(card);         })(b);       }     });   }); }
// ═══════════════════════════════════════════════════════ //  CLAUDE TIMER — versão localStorage (sem Firebase) // ═══════════════════════════════════════════════════════
var RH_CONTAS_CLAUDE = [   { id:'rh1', nome:'Conta 1', tipo:'Pro' },   { id:'rh2', nome:'Conta 2', tipo:'Pro' },   { id:'rh3', nome:'Conta 3', tipo:'Free' },   { id:'rh4', nome:'Conta 4', tipo:'Free' },   { id:'rh5', nome:'Conta 5', tipo:'Free' },   { id:'rh6', nome:'Conta 6', tipo:'Free' } ];
var _rhClTick = null; var _rhClPopupId = null;
function _rhFmtTempo(ms){   if(ms<=0)return '00:00:00'; 
var h=Math.floor(ms/3600000),m=Math.floor((ms%3600000)/60000),s=Math.floor((ms%60000)/1000);   return [h,m,s].map(function(v){return String(v).padStart(2,'0');}).join(':'); } function _rhEsc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');} function _rhGetLivro(id){try{return JSON.parse(localStorage.getItem('rh_livro_'+id)||'null');}catch(e){return null;}} function _rhGetHist(id){try{return JSON.parse(localStorage.getItem('rh_hist_'+id)||'[]');}catch(e){return [];}} function _rhSaveLivro(id,obj){localStorage.setItem('rh_livro_'+id,JSON.stringify(obj));} function _rhSaveHist(id,arr){localStorage.setItem('rh_hist_'+id,JSON.stringify(arr));} function _rhGetSequencia(id){try{return JSON.parse(localStorage.getItem('rh_seq_'+id)||'null');}catch(e){return null;}} function _rhGetSeqHist(id){try{return JSON.parse(localStorage.getItem('rh_seq_hist_'+id)||'[]');}catch(e){return [];}} function _rhSaveSequencia(id,obj){localStorage.setItem('rh_seq_'+id,JSON.stringify(obj));} function _rhSaveSeqHist(id,arr){localStorage.setItem('rh_seq_hist_'+id,JSON.stringify(arr));} var _rhHistId=null, _rhHistNome=''; var _rhLivroCtx=null; var _rhSeqId=null, _rhSeqNome='';
function _rhReabrirLivroModal(){   if(!_rhLivroCtx)return;   if(_rhLivroCtx.kind==='claude') rhClaudeHistorico(_rhLivroCtx.id,_rhLivroCtx.nome);   if(_rhLivroCtx.kind==='grade') rhLivroAbrirModal(_rhLivroCtx.id,_rhLivroCtx.turmaId,_rhLivroCtx.disciplina,_rhLivroCtx.bimestre);   if(_rhLivroCtx.kind==='sequencia') rhSequenciaAbrirModal(_rhLivroCtx.id,_rhLivroCtx.turmaId,_rhLivroCtx.disciplina,_rhLivroCtx.bimestre); }
function rhClaudeRender() { 
var el = document.getElementById('rh-claude-cards'); 
if (!el) return; 
var agora = Date.now();   el.innerHTML = RH_CONTAS_CLAUDE.map(function(c) {   
var fim = parseInt(localStorage.getItem('rh_cl_fim_' + c.id) || '0');   
var restante = fim > agora ? fim - agora : 0;   
var livre = restante <= 0;   
var cls = livre ? 'livre' : 'ocupado';   
var livro = _rhGetLivro(c.id);   
var livroHtml;   
if (livro && livro.titulo) {     
var temasConcl = (livro.temas||[]).filter(function(t){return t.ok;}).length;     
var temasTotal = (livro.temas||[]).length;       livroHtml = '<div class="cl-livro-content">'         + '<div class="cl-livro-lbl">Livro em criação</div>'         + '<div class="cl-livro-txt"><strong>' + _rhEsc(livro.titulo) + '</strong>'         + (livro.disciplina ? '<br><span style="opacity:.75">' + _rhEsc(livro.disciplina)           + (livro.bimestre ? ' · ' + _rhEsc(livro.bimestre) : '')           + (livro.turma ? ' · ' + _rhEsc(livro.turma) : '') + '</span>' : '')         + (temasTotal > 0 ? '<br><span style="font-size:.68rem;opacity:.6">' + temasConcl + '/' + temasTotal + ' temas concluídos</span>' : '')         + '</div></div>';     } else {       livroHtml = '<div class="cl-livro-content">'         + '<div class="cl-livro-lbl">Livro em criação</div>'         + '<div class="cl-livro-vazio">Nenhum livro em criação</div>'         + '</div>';     }   
var nomeEsc = c.nome.replace(/'/g, "\\'");   
var tipoClass = c.tipo === 'PRO' || c.tipo === 'Pro' ? ' cl-card-tipo-pro' : '';     return '<div class="cl-card ' + cls + '" id="rh-card-' + c.id + '">'       + '<div class="cl-card-top">'       + '<div class="cl-user-icon">👤</div>'       + '<div class="cl-card-nome">' + _rhEsc(c.nome) + '</div>'       + '<div class="cl-card-tipo' + tipoClass + '">Claude ' + c.tipo + '</div>'       + '<button class="cl-card-menu" onclick="rhClaudeHistorico(\'' + c.id + '\',\'' + nomeEsc + '\')">⋮</button>'       + '</div>'       + '<div class="cl-timer-wrap">'       + '<div class="cl-timer" id="rh-timer-' + c.id + '">' + _rhFmtTempo(restante) + '</div>'       + '<div class="cl-status" id="rh-status-' + c.id + '">' + (livre ? 'LIVRE ✓' : 'AGUARDANDO…') + '</div>'       + '</div>'       + '<div class="cl-btns">'       + '<button class="cl-btn cl-btn-hora" onclick="rhClaudeDefinir(\'' + c.id + '\',\'' + nomeEsc + '\')">⏱ Definir hora</button>'       + '<button class="cl-btn cl-btn-parar" onclick="rhClaudeLimpar(\'' + c.id + '\')"><span class="cl-parar-icon">■</span> Parar</button>'       + '</div>'       + '<div class="cl-livro-box" onclick="rhClaudeHistorico(\'' + c.id + '\',\'' + nomeEsc + '\')">'       + '<div class="cl-livro-icon-wrap">📖</div>'       + livroHtml       + '</div>'       + '<button class="cl-det-btn" onclick="rhClaudeHistorico(\'' + c.id + '\',\'' + nomeEsc + '\')">'       + 'Ver detalhes e histórico <span>→</span>'       + '</button>'       + '</div>';   }).join(''); } function rhClaudeTick() { 
var agora = Date.now();   RH_CONTAS_CLAUDE.forEach(function(c) {   
var timerEl = document.getElementById('rh-timer-' + c.id);   
var cardEl  = document.getElementById('rh-card-' + c.id);   
var statEl  = document.getElementById('rh-status-' + c.id);   
if (!timerEl || !cardEl || !statEl) return;   
var fim = parseInt(localStorage.getItem('rh_cl_fim_' + c.id) || '0');   
var restante = fim - agora;   
if (restante > 0) {       timerEl.textContent = _rhFmtTempo(restante);       cardEl.className = 'cl-card ocupado';       statEl.textContent = 'AGUARDANDO…';     } else {       timerEl.textContent = '00:00:00';       cardEl.className = 'cl-card livre';       statEl.textContent = 'LIVRE ✓';     }   }); }
function rhClaudeDefinir(id, nome) {   _rhClPopupId = id;   document.getElementById('rh-cl-popup-label').textContent = 'Definir expiração — ' + nome;   document.getElementById('rh-cl-popup').style.display = 'flex'; }
function rhClaudeConfirmarHora() { 
var val = document.getElementById('rh-cl-hora-input').value; 
if (!val) return; 
var parts = val.split(':'); 
var agora = new Date(); 
var fim = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), parseInt(parts[0]), parseInt(parts[1]), 0, 0).getTime(); 
if (fim <= Date.now()) fim += 86400000;   localStorage.setItem('rh_cl_fim_' + _rhClPopupId, fim.toString());   document.getElementById('rh-cl-popup').style.display = 'none';   rhClaudeRender(); }
function rhClaudeLimpar(id) {   localStorage.removeItem('rh_cl_fim_' + id);   rhClaudeRender(); }
function rhClaudePedirPermissao() { 
if (!('Notification' in window)) { alert('Navegador não suporta notificações.'); return; }   Notification.requestPermission().then(function(p) {   
if (p === 'granted') { document.getElementById('cl-notif-bar-rh').style.display = 'none'; }   }); }
function rhClaudeHistorico(id, nome) {   _rhHistId = id; _rhHistNome = nome;   _rhLivroCtx = { kind:'claude', id:id, nome:nome }; 
var livro = _rhGetLivro(id) || {titulo:'',disciplina:'',bimestre:'',turma:'',temas:[]}; 
var hist = _rhGetHist(id); 
var temasHtml = (livro.temas||[]).map(function(t,i){     return '<div class="cl-tema-item">'       +'<input type="checkbox" '+(t.ok?'checked':'')+' onchange="_rhTogTema(\''+id+'\','+i+',this.checked)">'       +'<input type="text" value="'+_rhEsc(t.t||'')+'" placeholder="Nome do tema" oninput="_rhEditTema(\''+id+'\','+i+',this.value)">'       +'<button class="cl-tema-del" onclick="_rhDelTema(\''+id+'\','+i+')">✕</button>'       +'</div>';   }).join(''); 
var histHtml = hist.length ? hist.slice().reverse().map(function(h){     return '<div class="cl-hist-item"><div class="ci">✅</div><div class="cd">'       +'<div class="ct">'+_rhEsc(h.titulo||'Sem título')+'</div>'       +'<div class="cs">Concluído · '+_rhEsc(h.data||'')+'</div>'       +'<div class="cm2">'+_rhEsc(h.disciplina||'')+(h.bimestre?' · '+_rhEsc(h.bimestre):'')+(h.turma?' · '+_rhEsc(h.turma):'')+'</div>'       +'</div></div>';   }).join('') : '<div class="cl-hist-vazio">Nenhum livro concluído ainda.</div>'; 
var old = document.getElementById('rh-hist-modal');   if(old) old.remove(); 
var div = document.createElement('div');   div.id = 'rh-hist-modal';   div.className = 'cl-hist-overlay';   div.addEventListener('click', function(e){if(e.target===div)rhClaudeFecharHist();});   div.innerHTML = '<div class="cl-hist-inner">'     +'<div class="cl-hist-hd"><h3>📚 '+_rhEsc(nome)+'</h3><p>Livro atual e histórico de criação</p>'     +'<button class="cl-hist-close" onclick="rhClaudeFecharHist()">✕</button></div>'     +'<div class="cl-hist-body">'     +'<div><div class="cl-hist-sec-lbl">✦ Livro em criação</div>'     +'<div class="cl-livro-atual">'     +'<div class="cl-livro-campo"><label>Título</label><input type="text" id="rh-liv-titulo" value="'+_rhEsc(livro.titulo||'')+'" placeholder="Ex: Caderno LP 1ª Série 1º Bim."></div>'     +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">'     +'<div class="cl-livro-campo"><label>Disciplina</label><input type="text" id="rh-liv-disc" value="'+_rhEsc(livro.disciplina||'')+'" placeholder="Língua Portuguesa"></div>'     +'<div class="cl-livro-campo"><label>Bimestre</label><input type="text" id="rh-liv-bim" value="'+_rhEsc(livro.bimestre||'')+'" placeholder="1º Bimestre"></div>'     +'</div>'     +'<div class="cl-livro-campo"><label>Turma</label><input type="text" id="rh-liv-turma" value="'+_rhEsc(livro.turma||'')+'" placeholder="Ex: 1ª Série"></div>'     +'<div class="cl-livro-campo"><label>Temas</label>'     +'<div class="cl-temas-lista" id="rh-temas-lista">'+temasHtml+'</div>'     +'<button onclick="_rhAddTema(\''+id+'\')" style="margin-top:6px;font-size:.7rem;background:transparent;border:1px dashed var(--cl);color:var(--cm);border-radius:6px;padding:5px 12px;cursor:pointer;font-family:\'DM Sans\',sans-serif;transition:all .2s">+ Adicionar tema</button>'     +'</div>'     +'<div style="display:flex;gap:8px;margin-top:2px">'     +'<button onclick="rhSalvarLivro(\''+id+'\')" style="flex:1;background:var(--vm);color:#fff;border:none;border-radius:8px;padding:9px;font-weight:700;cursor:pointer;font-family:\'DM Sans\',sans-serif;font-size:.8rem">💾 Salvar</button>'     +'<button onclick="rhMarcarConcluido(\''+id+'\')" style="flex:1;background:rgba(46,160,102,.1);color:#2a8a5a;border:1.5px solid rgba(46,160,102,.3);border-radius:8px;padding:9px;font-weight:700;cursor:pointer;font-family:\'DM Sans\',sans-serif;font-size:.8rem">✅ Marcar concluído</button>'     +'</div>'     +'</div></div>'     +'<div><div class="cl-hist-sec-lbl">✦ Histórico de livros concluídos</div>'+histHtml+'</div>'     +'</div></div>';   document.body.appendChild(div); }
function rhLivroAbrirModal(id, turmaId, disciplina, bimestre, evt) { 
if (evt) evt.stopPropagation();   _rhHistId = id;   _rhHistNome = RH_TURMA_LABELS[turmaId] + ' · ' + disciplina + ' · ' + bimestre;   _rhLivroCtx = { kind:'grade', id:id, turmaId:turmaId, disciplina:disciplina, bimestre:bimestre }; 
var livro = _rhGetLivro(id) || {titulo:'',disciplina:disciplina,bimestre:bimestre,turma:RH_TURMA_LABELS[turmaId],temas:[],url:_rhLivUrls[id]||''}; 
if (!livro.disciplina) livro.disciplina = disciplina; 
if (!livro.bimestre) livro.bimestre = bimestre; 
if (!livro.turma) livro.turma = RH_TURMA_LABELS[turmaId]; 
if (livro.url === undefined) livro.url = _rhLivUrls[id] || ''; 
var hist = _rhGetHist(id); 
var temasHtml = (livro.temas||[]).map(function(t,i){     return '<div class="cl-tema-item">'       +'<input type="checkbox" '+(t.ok?'checked':'')+' onchange="_rhTogTema(\''+id+'\','+i+',this.checked)">'       +'<input type="text" value="'+_rhEsc(t.t||'')+'" placeholder="Nome do tema" oninput="_rhEditTema(\''+id+'\','+i+',this.value)">'       +'<button class="cl-tema-del" onclick="_rhDelTema(\''+id+'\','+i+')">✕</button>'       +'</div>';   }).join(''); 
var histHtml = hist.length ? hist.slice().reverse().map(function(h){     return '<div class="cl-hist-item"><div class="ci">✅</div><div class="cd">'       +'<div class="ct">'+_rhEsc(h.titulo||'Sem título')+'</div>'       +'<div class="cs">Concluído · '+_rhEsc(h.data||'')+'</div>'       +'<div class="cm2">'+_rhEsc(h.disciplina||'')+(h.bimestre?' · '+_rhEsc(h.bimestre):'')+(h.turma?' · '+_rhEsc(h.turma):'')+'</div>'       +'</div></div>';   }).join('') : '<div class="cl-hist-vazio">Nenhum livro concluído ainda.</div>'; 
var old = document.getElementById('rh-hist-modal');   if(old) old.remove(); 
var div = document.createElement('div');   div.id = 'rh-hist-modal';   div.className = 'cl-hist-overlay';   div.addEventListener('click', function(e){if(e.target===div)rhClaudeFecharHist();});   div.innerHTML = '<div class="cl-hist-inner">'     +'<div class="cl-hist-hd"><h3>📚 '+_rhEsc(_rhHistNome)+'</h3><p>Livro atual e histórico de criação</p>'     +'<button class="cl-hist-close" onclick="rhClaudeFecharHist()">✕</button></div>'     +'<div class="cl-hist-body">'     +'<div><div class="cl-hist-sec-lbl">✦ Livro em criação</div>'     +'<div class="cl-livro-atual">'     +'<div class="cl-livro-campo"><label>Título</label><input type="text" id="rh-liv-titulo" value="'+_rhEsc(livro.titulo||'')+'" placeholder="Ex: Caderno '+_rhEsc(disciplina)+' '+_rhEsc(bimestre)+'"></div>'     +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">'     +'<div class="cl-livro-campo"><label>Disciplina</label><input type="text" id="rh-liv-disc" value="'+_rhEsc(livro.disciplina||'')+'" placeholder="Língua Portuguesa"></div>'     +'<div class="cl-livro-campo"><label>Bimestre</label><input type="text" id="rh-liv-bim" value="'+_rhEsc(livro.bimestre||'')+'" placeholder="1º Bimestre"></div>'     +'</div>'     +'<div class="cl-livro-campo"><label>Turma</label><input type="text" id="rh-liv-turma" value="'+_rhEsc(livro.turma||'')+'" placeholder="Ex: 1ª Série"></div>'     +'<div class="cl-livro-campo"><label>URL do livro</label><input type="text" id="rh-liv-url" value="'+_rhEsc(livro.url||'')+'" placeholder="https://..."></div>'     +'<div class="cl-livro-campo"><label>Temas</label>'     +'<div class="cl-temas-lista" id="rh-temas-lista">'+temasHtml+'</div>'     +'<button onclick="_rhAddTema(\''+id+'\')" style="margin-top:6px;font-size:.7rem;background:transparent;border:1px dashed var(--cl);color:var(--cm);border-radius:6px;padding:5px 12px;cursor:pointer;font-family:\'DM Sans\',sans-serif;transition:all .2s">+ Adicionar tema</button>'     +'</div>'     +'<div style="display:flex;gap:8px;margin-top:2px">'     +'<button onclick="rhSalvarLivro(\''+id+'\')" style="flex:1;background:var(--vm);color:#fff;border:none;border-radius:8px;padding:9px;font-weight:700;cursor:pointer;font-family:\'DM Sans\',sans-serif;font-size:.8rem">💾 Salvar</button>'     +'<button onclick="rhMarcarConcluido(\''+id+'\')" style="flex:1;background:rgba(46,160,102,.1);color:#2a8a5a;border:1.5px solid rgba(46,160,102,.3);border-radius:8px;padding:9px;font-weight:700;cursor:pointer;font-family:\'DM Sans\',sans-serif;font-size:.8rem">✅ Marcar concluído</button>'     +'</div>'     +'</div></div>'     +'<div><div class="cl-hist-sec-lbl">✦ Histórico de livros concluídos</div>'+histHtml+'</div>'     +'</div></div>';   document.body.appendChild(div); }
function rhSequenciaAbrirModal(id, turmaId, disciplina, bimestre, evt) { 
if (evt) evt.stopPropagation();   _rhSeqId = id;   _rhSeqNome = RH_TURMA_LABELS[turmaId] + ' · ' + disciplina + ' · ' + bimestre;   _rhLivroCtx = { kind:'sequencia', id:id, turmaId:turmaId, disciplina:disciplina, bimestre:bimestre }; 
var seq = _rhGetSequencia(id) || {titulo:'',disciplina:disciplina,bimestre:bimestre,turma:RH_TURMA_LABELS[turmaId],objetivo:'',ferramentas:'',etapas:'',observacoes:'',url:''}; 
var hist = _rhGetSeqHist(id); 
var histHtml = hist.length ? hist.slice().reverse().map(function(h){     return '<div class="cl-hist-item"><div class="ci">✅</div><div class="cd">'       +'<div class="ct">'+_rhEsc(h.titulo||'Sem título')+'</div>'       +'<div class="cs">Concluída · '+_rhEsc(h.data||'')+'</div>'       +'<div class="cm2">'+_rhEsc(h.disciplina||'')+(h.bimestre?' · '+_rhEsc(h.bimestre):'')+(h.turma?' · '+_rhEsc(h.turma):'')+'</div>'       +'</div></div>';   }).join('') : '<div class="cl-hist-vazio">Nenhuma sequência concluída ainda.</div>'; 
var old = document.getElementById('rh-hist-modal');   if(old) old.remove(); 
var div = document.createElement('div');   div.id = 'rh-hist-modal';   div.className = 'cl-hist-overlay';   div.addEventListener('click', function(e){if(e.target===div)rhClaudeFecharHist();});   div.innerHTML = '<div class="cl-hist-inner">'     +'<div class="cl-hist-hd"><h3>🗂 '+_rhEsc(_rhSeqNome)+'</h3><p>Sequência atual e histórico por bimestre</p>'     +'<button class="cl-hist-close" onclick="rhClaudeFecharHist()">✕</button></div>'     +'<div class="cl-hist-body">'     +'<div><div class="cl-hist-sec-lbl">✦ Sequência em produção</div>'     +'<div class="cl-livro-atual">'     +'<div class="cl-livro-campo"><label>Título</label><input type="text" id="rh-seq-titulo" value="'+_rhEsc(seq.titulo||'')+'" placeholder="Ex: Sequência didática de leitura crítica"></div>'     +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">'     +'<div class="cl-livro-campo"><label>Disciplina</label><input type="text" id="rh-seq-disc" value="'+_rhEsc(seq.disciplina||'')+'"></div>'     +'<div class="cl-livro-campo"><label>Bimestre</label><input type="text" id="rh-seq-bim" value="'+_rhEsc(seq.bimestre||'')+'"></div>'     +'</div>'     +'<div class="cl-livro-campo"><label>Turma</label><input type="text" id="rh-seq-turma" value="'+_rhEsc(seq.turma||'')+'"></div>'     +'<div class="cl-livro-campo"><label>Objetivo</label><input type="text" id="rh-seq-obj" value="'+_rhEsc(seq.objetivo||'')+'" placeholder="Objetivo central da sequência"></div>'     +'<div class="cl-livro-campo"><label>Ferramentas/recursos</label><input type="text" id="rh-seq-fer" value="'+_rhEsc(seq.ferramentas||'')+'" placeholder="Slides, formulário, IA, texto-base..."></div>'     +'<div class="cl-livro-campo"><label>Etapas</label><input type="text" id="rh-seq-etp" value="'+_rhEsc(seq.etapas||'')+'" placeholder="Diagnóstico, leitura, produção, revisão..."></div>'     +'<div class="cl-livro-campo"><label>Observações</label><input type="text" id="rh-seq-obs" value="'+_rhEsc(seq.observacoes||'')+'" placeholder="Anotações importantes"></div>'     +'<div class="cl-livro-campo"><label>URL/arquivo</label><input type="text" id="rh-seq-url" value="'+_rhEsc(seq.url||'')+'" placeholder="https://..."></div>'     +'<div style="display:flex;gap:8px;margin-top:2px">'     +'<button onclick="rhSequenciaSalvar(\''+id+'\')" style="flex:1;background:var(--vm);color:#fff;border:none;border-radius:8px;padding:9px;font-weight:700;cursor:pointer;font-family:\'DM Sans\',sans-serif;font-size:.8rem">💾 Salvar</button>'     +'<button onclick="rhSequenciaMarcarConcluida(\''+id+'\')" style="flex:1;background:rgba(46,160,102,.1);color:#2a8a5a;border:1.5px solid rgba(46,160,102,.3);border-radius:8px;padding:9px;font-weight:700;cursor:pointer;font-family:\'DM Sans\',sans-serif;font-size:.8rem">✅ Marcar concluída</button>'     +'</div></div></div>'     +'<div><div class="cl-hist-sec-lbl">✦ Histórico de sequências concluídas</div>'+histHtml+'</div>'     +'</div></div>';   document.body.appendChild(div); }
function rhClaudeFecharHist(){var m=document.getElementById('rh-hist-modal');if(m)m.remove();rhClaudeRender();rhLivRender();}
function rhSalvarLivro(id){ 
var livro=_rhGetLivro(id)||{temas:[]};   livro.titulo=((document.getElementById('rh-liv-titulo')||{}).value||'').trim();   livro.disciplina=((document.getElementById('rh-liv-disc')||{}).value||'').trim();   livro.bimestre=((document.getElementById('rh-liv-bim')||{}).value||'').trim();   livro.turma=((document.getElementById('rh-liv-turma')||{}).value||'').trim();   livro.url=((document.getElementById('rh-liv-url')||{}).value||'').trim();   _rhSaveLivro(id,livro);   rhLivRegistrarUrl(id, livro.url || '');   rhLivRender(); 
var btn=(typeof event!=='undefined'&&event&&event.currentTarget)?event.currentTarget:null;   if(btn){     btn.textContent='✔ Salvo!';     setTimeout(function(){btn.textContent='💾 Salvar';},1600);   } }
function rhMarcarConcluido(id){ 
var livro=_rhGetLivro(id);   if(!livro||!livro.titulo){alert('Defina o título do livro antes de marcar como concluído.');return;}   rhSalvarLivro(id); livro=_rhGetLivro(id); 
var hist=_rhGetHist(id); 
var hoje=new Date(); 
var data=('0'+hoje.getDate()).slice(-2)+'/'+('0'+(hoje.getMonth()+1)).slice(-2)+'/'+hoje.getFullYear();   hist.push({titulo:livro.titulo,disciplina:livro.disciplina,bimestre:livro.bimestre,turma:livro.turma,data:data});   _rhSaveHist(id,hist);   _rhLivStatus[id]='concluido';   rhLivSalvarStatus();   _rhSaveLivro(id,{titulo:'',disciplina:'',bimestre:'',turma:'',temas:[]});   rhClaudeFecharHist(); }
function rhSequenciaSalvar(id){ 
var seq=_rhGetSequencia(id)||{};   seq.titulo=((document.getElementById('rh-seq-titulo')||{}).value||'').trim();   seq.disciplina=((document.getElementById('rh-seq-disc')||{}).value||'').trim();   seq.bimestre=((document.getElementById('rh-seq-bim')||{}).value||'').trim();   seq.turma=((document.getElementById('rh-seq-turma')||{}).value||'').trim();   seq.objetivo=((document.getElementById('rh-seq-obj')||{}).value||'').trim();   seq.ferramentas=((document.getElementById('rh-seq-fer')||{}).value||'').trim();   seq.etapas=((document.getElementById('rh-seq-etp')||{}).value||'').trim();   seq.observacoes=((document.getElementById('rh-seq-obs')||{}).value||'').trim();   seq.url=((document.getElementById('rh-seq-url')||{}).value||'').trim();   _rhSaveSequencia(id,seq);   rhSeqRender(); 
var btn=(typeof event!=='undefined'&&event&&event.currentTarget)?event.currentTarget:null;   if(btn){     btn.textContent='✔ Salvo!';     setTimeout(function(){btn.textContent='💾 Salvar';},1600);   } }
function rhSequenciaMarcarConcluida(id){ 
var seq=_rhGetSequencia(id);   if(!seq||!seq.titulo){alert('Defina o título da sequência antes de marcar como concluída.');return;}   rhSequenciaSalvar(id); seq=_rhGetSequencia(id); 
var hist=_rhGetSeqHist(id); 
var hoje=new Date(); 
var data=('0'+hoje.getDate()).slice(-2)+'/'+('0'+(hoje.getMonth()+1)).slice(-2)+'/'+hoje.getFullYear();   hist.push({titulo:seq.titulo,disciplina:seq.disciplina,bimestre:seq.bimestre,turma:seq.turma,data:data});   _rhSaveSeqHist(id,hist);   _rhSeqStatus[id]='concluido';   rhSeqSalvarStatus();   _rhSaveSequencia(id,{titulo:'',disciplina:seq.disciplina,bimestre:seq.bimestre,turma:seq.turma,objetivo:'',ferramentas:'',etapas:'',observacoes:'',url:''});   rhClaudeFecharHist(); }
function _rhTogTema(id,idx,ok){var l=_rhGetLivro(id)||{temas:[]};if(l.temas[idx])l.temas[idx].ok=ok;_rhSaveLivro(id,l);} function _rhEditTema(id,idx,val){var l=_rhGetLivro(id)||{temas:[]};if(l.temas[idx]!==undefined)l.temas[idx].t=val;_rhSaveLivro(id,l);} function _rhDelTema(id,idx){ 
var l=_rhGetLivro(id)||{temas:[]};l.temas.splice(idx,1);_rhSaveLivro(id,l);   _rhReabrirLivroModal(); } function _rhAddTema(id){ 
var l=_rhGetLivro(id)||{temas:[]};l.temas.push({t:'',ok:false});_rhSaveLivro(id,l); 
var container=document.getElementById('rh-temas-lista');if(!container)return; 
var idx=l.temas.length-1; 
var div=document.createElement('div');div.className='cl-tema-item';   div.innerHTML='<input type="checkbox" onchange="_rhTogTema(\''+id+'\','+idx+',this.checked)">'     +'<input type="text" value="" placeholder="Nome do tema" oninput="_rhEditTema(\''+id+'\','+idx+',this.value)">'     +'<button class="cl-tema-del" onclick="_rhDelTema(\''+id+'\','+idx+')">✕</button>';   container.appendChild(div);   div.querySelector('input[type=text]').focus(); }
var _rhClaudeRenderBase = rhClaudeRender;
function rhClaudeTimerUrl() { return location.pathname + '#sec-claude'; }
function rhClaudeAbrirPelaHash() {
var hash = (location.hash || '').toLowerCase();
if (hash !== '#claude' && hash !== '#sec-claude') return;
var btn = document.querySelector(".nb[onclick=\"aba('sec-claude',this)\"]");
aba('sec-claude', btn);
}
function rhClaudeObterNome(id) {
var conta = RH_CONTAS_CLAUDE.find(function(item){ return item.id === id; });
return conta ? conta.nome : 'Claude';
}
function rhClaudeAtualizarNotifBar() {
var bar = document.getElementById('cl-notif-bar-rh');
if (!bar) return;
bar.style.display = ('Notification' in window && Notification.permission !== 'granted') ? 'flex' : 'none';
}
function rhClaudeForcarVerificacaoSW() {
if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) return;
navigator.serviceWorker.controller.postMessage({ type: 'CLAUDE_TIMER_CHECK' });
}
function _rhClaudeIDBSalvar(id, nome, fim, url) {
var req = indexedDB.open('claude-timers', 1);
req.onupgradeneeded = function(e) {
var db = e.target.result;
if (!db.objectStoreNames.contains('timers')) db.createObjectStore('timers', { keyPath: 'id' });
};
req.onsuccess = function(e) {
var db = e.target.result;
var tx = db.transaction('timers', 'readwrite');
tx.objectStore('timers').put({ id: id, nome: nome, fim: fim, notificado: false, url: url || rhClaudeTimerUrl() });
};
}
function _rhClaudeIDBRemover(id) {
var req = indexedDB.open('claude-timers', 1);
req.onsuccess = function(e) {
var db = e.target.result;
try {
var tx = db.transaction('timers', 'readwrite');
tx.objectStore('timers').delete(id);
} catch(err) {}
};
}
async function rhClaudeAgendarNotifSistema(id, nome, timestampFim, urlDestino) {
if (!('serviceWorker' in navigator) || Notification.permission !== 'granted') return;
try {
var reg = await navigator.serviceWorker.ready;
var existentes = await reg.getNotifications({ tag: 'cl-sched-' + id });
existentes.forEach(function(n) { n.close(); });
if (typeof TimestampTrigger !== 'undefined') {
await reg.showNotification('Conta claude disponivel', {
body: 'Conta claude disponivel, toque para verificar',
icon: 'icon-512.png',
badge: 'icon-192.png',
tag: 'cl-sched-' + id,
renotify: true,
requireInteraction: true,
vibrate: [300, 100, 300, 100, 300],
data: { id: id, nome: nome, url: urlDestino || rhClaudeTimerUrl() },
showTrigger: new TimestampTrigger(timestampFim)
});
return true;
}
} catch(e) {
console.warn('[Claude RH] Notification Trigger nao suportado:', e.message);
}
return false;
}
function rhClaudeNotificar(nome, id) {
var opts = {
body: 'Conta claude disponivel, toque para verificar',
icon: 'icon-512.png',
badge: 'icon-192.png',
tag: 'claude-ready-' + (id || nome),
renotify: true,
requireInteraction: true,
vibrate: [300, 100, 300, 100, 300],
data: { id: id, nome: nome, url: rhClaudeTimerUrl() }
};
if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
navigator.serviceWorker.ready.then(function(reg) {
reg.showNotification('Conta claude disponivel', opts);
}).catch(function() {
if (Notification.permission === 'granted') new Notification('Conta claude disponivel', opts);
});
} else if (Notification.permission === 'granted') {
new Notification('Conta claude disponivel', opts);
}
}
rhClaudeRender = function() {
_rhClaudeRenderBase();
rhClaudeAtualizarNotifBar();
};
rhClaudeTick = function() {
var agora = Date.now();
RH_CONTAS_CLAUDE.forEach(function(c) {
var timerEl = document.getElementById('rh-timer-' + c.id);
var cardEl = document.getElementById('rh-card-' + c.id);
var statEl = document.getElementById('rh-status-' + c.id);
if (!timerEl || !cardEl || !statEl) return;
var fim = parseInt(localStorage.getItem('rh_cl_fim_' + c.id) || '0');
var restante = fim - agora;
if (restante > 0) {
timerEl.textContent = _rhFmtTempo(restante);
cardEl.className = 'cl-card ocupado';
statEl.textContent = 'AGUARDANDO...';
return;
}
timerEl.textContent = '00:00:00';
cardEl.className = 'cl-card livre';
statEl.textContent = 'LIVRE ✓';
if (fim > 0 && !localStorage.getItem('rh_cl_notif_' + c.id)) {
localStorage.setItem('rh_cl_notif_' + c.id, '1');
rhClaudeNotificar(c.nome, c.id);
}
});
};
rhClaudeConfirmarHora = function() {
var input = document.getElementById('rh-cl-hora-input');
if (!input || !input.value) return;
var parts = input.value.split(':');
var agora = new Date();
var fim = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), parseInt(parts[0], 10), parseInt(parts[1], 10), 0, 0).getTime();
if (fim <= Date.now()) fim += 86400000;
var id = _rhClPopupId;
var nome = rhClaudeObterNome(id);
var urlDestino = rhClaudeTimerUrl();
localStorage.removeItem('rh_cl_notif_' + id);
localStorage.setItem('rh_cl_fim_' + id, fim.toString());
if ('Notification' in window && Notification.permission === 'default') {
Notification.requestPermission().then(function() {
rhClaudeAtualizarNotifBar();
rhClaudeAgendarNotifSistema(id, nome, fim, urlDestino);
});
} else {
rhClaudeAgendarNotifSistema(id, nome, fim, urlDestino);
}
_rhClaudeIDBSalvar(id, nome, fim, urlDestino);
rhClaudeForcarVerificacaoSW();
document.getElementById('rh-cl-popup').style.display = 'none';
rhClaudeRender();
};
rhClaudeLimpar = function(id) {
localStorage.removeItem('rh_cl_fim_' + id);
localStorage.removeItem('rh_cl_notif_' + id);
_rhClaudeIDBRemover(id);
if ('serviceWorker' in navigator) {
navigator.serviceWorker.ready.then(function(reg) {
Promise.all([
reg.getNotifications({ tag: 'cl-sched-' + id }),
reg.getNotifications({ tag: 'claude-ready-' + id })
]).then(function(listas) {
listas.forEach(function(ns) {
ns.forEach(function(n) { n.close(); });
});
});
});
}
rhClaudeRender();
};
rhClaudePedirPermissao = function() {
if (!('Notification' in window)) { alert('Navegador nao suporta notificacoes.'); return; }
Notification.requestPermission().then(function(p) {
rhClaudeAtualizarNotifBar();
if (p === 'granted') {
new Notification('Notificacoes ativadas', {
body: 'Quando o cronometro zerar, voce sera avisado no celular.',
icon: 'icon-512.png'
});
}
});
};
document.addEventListener('DOMContentLoaded', function() {
rhClaudeAbrirPelaHash();
rhClaudeAtualizarNotifBar();
setInterval(rhClaudeTick, 1000);
});
window.addEventListener('hashchange', rhClaudeAbrirPelaHash);
if ('serviceWorker' in navigator) {
window.addEventListener('load', function() {
navigator.serviceWorker.register('sw.js').then(function(reg) {
if ('periodicSync' in reg) {
reg.periodicSync.register('claude-timer-check', { minInterval: 5 * 60 * 1000 }).catch(function(){});
}
}).catch(function(){});
});
}
document.addEventListener('visibilitychange', function() {
if (!document.hidden) rhClaudeTick();
});
document.addEventListener('DOMContentLoaded', function() {   window._rhDailyReady = false;   window._rhPlanReady = false;   window._rhLivReady = false;   window._rhSeqReady = false; });
function rhPlanShowPage(pid, el) { 
var wrapper = el.closest('.plano-wrapper'); 
if (!wrapper) return;   wrapper.querySelectorAll('.page').forEach(function(p){ p.classList.remove('active'); });   wrapper.querySelectorAll('.main-tab').forEach(function(t){ t.classList.remove('active'); }); 
var target = document.getElementById(pid); 
if (target) target.classList.add('active');   el.classList.add('active'); }
function rhPlanShowDisc(did, el) { 
var page = el.closest('.page') || el.closest('.plano-wrapper'); 
if (!page) return;   page.querySelectorAll('.disc-panel').forEach(function(p){ p.classList.remove('active'); });   page.querySelectorAll('.disc-tab').forEach(function(t){ t.classList.remove('active'); }); 
var target = document.getElementById(did); 
if (target) target.classList.add('active');   el.classList.add('active'); }
function rhPlanShowBim(bid, el) { 
var panel = el.closest('.disc-panel'); 
if (!panel) return;   panel.querySelectorAll('.bim-panel').forEach(function(p){ p.classList.remove('active'); });   panel.querySelectorAll('.bim-tab').forEach(function(t){ t.classList.remove('active'); }); 
var target = document.getElementById(bid); 
if (target) target.classList.add('active');   el.classList.add('active'); }
function rhPlanExtractId(el) { 
var onclick = el.getAttribute('onclick') || ''; 
var m = onclick.match(/'([^']+)'/);   return m ? m[1] : ''; }
function rhPlanDiscLabel(cls) { 
if (cls === 'lp') return 'Língua Portuguesa'; 
if (cls === 'ing') return 'Língua Inglesa'; 
if (cls === 'art') return 'Arte';   return 'Língua Espanhola'; }
function rhPlanBadgeText(disc, count) {   return disc === 'lp' ? count + ' aulas' : count + ' temas'; }
function rhBuildPlanReplica() { 
var sec = document.getElementById('sec-plano'); 
var root = document.getElementById('rh-plan-clone-root'); 
if (!sec || !root || root.dataset.ready === '1') return;  
var legacyWrappers = Array.from(sec.children).filter(function(node) {     return node && node.classList && node.classList.contains('plano-wrapper');   }); 
if (!legacyWrappers.length) return;  
var series = legacyWrappers.map(function(wrapper, index) {   
var title = wrapper.querySelector('.header h3, .header h2, .header h1');   
var serie = title ? title.textContent.split('—')[0].trim() : (index === 0 ? '1ª Série' : '2ª Série');   
var discs = Array.from(wrapper.querySelectorAll('.disc-tabs .disc-tab')).map(function(tab) {     
var did = rhPlanExtractId(tab);     
var panel = did ? wrapper.querySelector('#' + did) : null;     
var cls = tab.classList.contains('lp') ? 'lp' : (tab.classList.contains('ing') ? 'ing' : 'esp');     
var bimestres = panel ? Array.from(panel.querySelectorAll('.bim-tabs .bim-tab')).map(function(btab, bidx) {       
var bid = rhPlanExtractId(btab);       
var bpanel = bid ? panel.querySelector('#' + bid) : null;       
var lessons = bpanel ? Array.from(bpanel.querySelectorAll('.lesson-item')).map(function(item) {         
var titleEl = item.querySelector('.lesson-title');         
var subEl = item.querySelector('.lesson-sub');           return {             title: titleEl ? titleEl.innerHTML : '',             sub: subEl ? subEl.innerHTML : ''           };         }) : [];         return {           id: bid,           index: bidx + 1,           lessons: lessons         };       }) : [];       return {         id: did,         cls: cls,         label: tab.textContent.trim() || rhPlanDiscLabel(cls),         bimestres: bimestres       };     }).filter(function(disc) {       return disc.id && disc.bimestres.length;     });     return { serie: serie, discs: discs };   }).filter(function(serie) {     return serie.discs.length;   });  
if (!series.length) {     root.innerHTML = '<div class="plano-wrapper"><div class="content"><div class="sem"><span class="ic">&#128218;</span><div>Nenhum plano anual disponível para exibição.</div></div></div></div>';     root.dataset.ready = '1';     return;   }  
var html = '<div class="plano-wrapper">'     + '<div class="header"><h1>&#128218; Plano de Aulas Anual 2026 — Escola Raimundo Hermínio de Melo</h1>'     + '<p>Estrutura, formatação e layout alinhados ao modelo da Escola Padre Carlos Casavequia, com os conteúdos próprios da Raimundo Hermínio.</p></div>'     + '<div class="plan-meta"><span class="plan-pill">Turmas: 8&ordm;/9&ordm; Ano, 1&ordf; S&eacute;rie e 2&ordf;/3&ordf; S&eacute;rie</span><span class="plan-pill">Visual sincronizado para claro e escuro</span><span class="plan-pill">Acompanhamento por aula e por bimestre</span></div>'     + '<div id="plano-ultima-mod"><span class="pum-ic">&#128336;</span><span class="pum-txt"></span></div>'     + '<div class="main-tabs">'     + series.map(function(s, idx) {       return '<div class="main-tab' + (idx === 0 ? ' active' : '') + '" onclick="rhPlanShowPage(\'rh-plan-page-' + idx + '\',this)">&#128214; ' + s.serie + '</div>';     }).join('')     + '</div><div class="content">'     + series.map(function(s, sidx) {       return '<div class="page' + (sidx === 0 ? ' active' : '') + '" id="rh-plan-page-' + sidx + '">'         + '<div class="disc-tabs">'         + s.discs.map(function(d, didx) {           return '<div class="disc-tab ' + d.cls + (didx === 0 ? ' active' : '') + '" onclick="rhPlanShowDisc(\'rh-rep-' + d.id + '\',this)">' + d.label + '</div>';         }).join('')         + '</div>'         + s.discs.map(function(d, didx) {           return '<div class="disc-panel' + (didx === 0 ? ' active' : '') + '" id="rh-rep-' + d.id + '">'             + '<div class="bim-tabs">'             + d.bimestres.map(function(b, bidx) {               return '<div class="bim-tab ' + d.cls + (bidx === 0 ? ' active' : '') + '" onclick="rhPlanShowBim(\'rh-rep-' + b.id + '\',this)">' + b.index + 'º Bimestre</div>';             }).join('')             + '</div>'             + d.bimestres.map(function(b, bidx) {               return '<div class="bim-panel' + (bidx === 0 ? ' active' : '') + '" id="rh-rep-' + b.id + '">'                 + '<div class="bim-header ' + d.cls + '"><h3>&#128197; ' + b.index + 'º Bimestre — ' + d.label + '</h3><span class="badge">' + rhPlanBadgeText(d.cls, b.lessons.length) + '</span></div>'                 + '<div class="lesson-list">'                 + b.lessons.map(function(lesson, lidx) {                   return '<div class="lesson-item ' + d.cls + '"><div class="lesson-num">' + (lidx + 1) + '</div><div class="lesson-text"><div class="lesson-title">' + lesson.title + '</div>' + (lesson.sub ? '<div class="lesson-sub">' + lesson.sub + '</div>' : '') + '</div></div>';                 }).join('')                 + '</div></div>';             }).join('')             + '</div>';         }).join('')         + '</div>';     }).join('')     + '</div></div>';    root.innerHTML = html;   root.dataset.ready = '1';   legacyWrappers.forEach(function(wrapper) { wrapper.classList.add('rh-plan-legacy-hidden'); });   rhPlanInitStatusButtons();   rhPlanLoadLastUpdate(); }
var RH_PLAN_STATUS_BUTTONS = [   { cls: 'pl', label: '&#128197; Planj.' },   { cls: 'ap', label: '&#10003; Aplic.' },   { cls: 'pu', label: '&#10539; Pulad.' },   { cls: 'sm', label: '&#128203; SIMAED' } ];
function rhPlanStorageKey(text) {   return 'rh_plan_' + btoa(unescape(encodeURIComponent(text))).replace(/[^a-zA-Z0-9]/g, '').slice(0, 48); }
function rhPlanApplyState(btn, item, cls, active) {   btn.classList.toggle('on', active);   item.classList.toggle('st-' + cls, active); }
function rhPlanSaveLastUpdate(item, cls) { 
var map = { pl: 'Planejada', ap: 'Aplicada', pu: 'Pulada', sm: 'SIMAED' }; 
var now = new Date(); 
var page = item.closest('.page'); 
var header = item.closest('.bim-panel').querySelector('.bim-header h3'); 
var mainTab = document.querySelector('#rh-plan-clone-root .main-tab.active'); 
var payload = {     serie: mainTab ? mainTab.textContent.trim() : (page ? page.id : ''),     bim: header ? header.textContent.replace(/[📅]/g, '').trim() : '',     aula: item.querySelector('.lesson-num').textContent.trim(),     acao: map[cls] || cls,     hora: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),     dia: now.toLocaleDateString('pt-BR')   };   localStorage.setItem('rh_plan_last_update', JSON.stringify(payload));   rhPlanLoadLastUpdate(); }
function rhPlanLoadLastUpdate() { 
var box = document.querySelector('#rh-plan-clone-root #plano-ultima-mod'); 
if (!box) return; 
var raw = localStorage.getItem('rh_plan_last_update'); 
if (!raw) return;   try {   
var data = JSON.parse(raw);     box.classList.add('on');     box.querySelector('.pum-txt').innerHTML = '<strong>Última atualização:</strong> ' + data.dia + ' — ' + data.hora + ' <span class="pum-det">(' + data.bim + ' · Aula ' + data.aula + ' marcada como <strong>' + data.acao + '</strong>)</span>';   } catch (e) {} }
function rhPlanInitStatusButtons() { 
var root = document.querySelector('#rh-plan-clone-root .plano-wrapper'); 
if (!root) return;   root.querySelectorAll('.lesson-item').forEach(function(item) {   
if (item.querySelector('.lesson-actions')) return;   
var title = item.querySelector('.lesson-title');   
if (!title) return;   
var key = rhPlanStorageKey(title.textContent.trim());   
var saved = {};     try { saved = JSON.parse(localStorage.getItem(key) || '{}'); } catch (e) {}   
var actions = document.createElement('div');     actions.className = 'lesson-actions';     RH_PLAN_STATUS_BUTTONS.forEach(function(def) {     
var btn = document.createElement('button');       btn.className = 'btn-st ' + def.cls;       btn.innerHTML = def.label;       btn.type = 'button';     
var active = !!saved[def.cls];       rhPlanApplyState(btn, item, def.cls, active);       btn.addEventListener('click', function() {       
var current = {};         try { current = JSON.parse(localStorage.getItem(key) || '{}'); } catch (e) {}         current[def.cls] = !btn.classList.contains('on');         localStorage.setItem(key, JSON.stringify(current));         rhPlanApplyState(btn, item, def.cls, current[def.cls]);       
if (current[def.cls]) rhPlanSaveLastUpdate(item, def.cls);       });       actions.appendChild(btn);     });     item.appendChild(actions);   }); }
// ═══════════════════════════════════════════════════════ //  MODAL EDITAR — Novo Relato (R. Hermínio) // ═══════════════════════════════════════════════════════
function rhGarantirToolbarEditor() {
if (document.getElementById('toolbar-texto')) return;
var toolbar = document.createElement('div');
toolbar.id = 'toolbar-texto';
toolbar.innerHTML = '<button class="tb-btn" data-cmd="bold" title="Negrito (Ctrl+B)"><strong>B</strong></button>'
  + '<button class="tb-btn" data-cmd="italic" title="Italico (Ctrl+I)"><em>I</em></button>'
  + '<button class="tb-btn" data-cmd="underline" title="Sublinhado (Ctrl+U)"><u>U</u></button>'
  + '<div class="tb-sep"></div>'
  + '<button class="tb-btn" data-cmd="insertUnorderedList" title="Lista">≡</button>'
  + '<button class="tb-btn" data-cmd="insertOrderedList" title="Lista numerada">№</button>'
  + '<div class="tb-sep"></div>'
  + '<select class="tb-select" id="tb-tamanho" title="Tamanho"><option value="3">Normal</option><option value="1">Pequeno</option><option value="4">Grande</option><option value="5">Maior</option></select>'
  + '<div class="tb-sep"></div>'
  + '<input type="color" id="tb-cor-texto" value="#2b2b2b" title="Cor do texto" style="width:24px;height:24px;border:none;border-radius:4px;cursor:pointer;padding:0;background:transparent">'
  + '<input type="color" id="tb-cor-fundo" value="#faf8f2" title="Destaque" style="width:24px;height:24px;border:none;border-radius:4px;cursor:pointer;padding:0;background:transparent">';
document.body.appendChild(toolbar);
}
function rhGarantirCssEditor() {
if (document.querySelector('link[data-rh-editor-css="1"]')) return;
var link = document.createElement('link');
link.rel = 'stylesheet';
link.href = 'assets/css/editor.css?v=20260718a';
link.setAttribute('data-rh-editor-css', '1');
document.head.appendChild(link);
}
function rhPrepararBotaoEditor() {
var btn = document.getElementById('btn-editar-rh') || document.getElementById('btn-editar');
if (!btn) return null;
btn.removeAttribute('onclick');
btn.id = 'btn-editar';
btn.type = 'button';
return btn;
}
function rhConfigurarEditorPersistente() {
window.__RELATORIOS_EDITOR_CONFIG__ = {
schoolSlug: 'raimundo-herminio-de-melo',
scope: 'report-layout-safe-v2:raimundo-herminio-de-melo',
classSlug: 'layout-raimundo-herminio-de-melo',
storageKey: 'ed_layout_safe_v2:raimundo-herminio-de-melo',
legacyStorageKeys: ['ed_layout_safe_v1:raimundo-herminio-de-melo', 'ed_layout_safe_v1'],
pagePath: 'herminio.html'
};
var main = document.querySelector('main.main');
if (main && !main.dataset.build) main.dataset.build = '20260718';
}
function rhGarantirEditorPersistente() {
if (window._rhEditorBootstrapDone) return;
var btn = rhPrepararBotaoEditor();
if (!btn) return;
window._rhEditorBootstrapDone = true;
rhConfigurarEditorPersistente();
rhGarantirCssEditor();
rhGarantirToolbarEditor();
if (typeof window.initEditor === 'function') {
window.initEditor();
return;
}
if (document.querySelector('script[data-rh-editor-loader="1"]')) return;
var script = document.createElement('script');
script.src = 'assets/js/editor.js?v=20260721a';
script.async = false;
script.setAttribute('data-rh-editor-loader', '1');
script.onload = function() {
if (typeof window.initEditor === 'function') window.initEditor();
};
document.body.appendChild(script);
}
function abrirModalRH() { 
var m = document.getElementById('rh-modal-relato'); 
if (m) { m.style.display = 'flex'; return; } 
// Cria modal simples na primeira vez
var el = document.createElement('div');   el.id = 'rh-modal-relato';   el.style = 'position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:9998;display:flex;align-items:center;justify-content:center;padding:20px';   el.innerHTML = '<div style="background:var(--cr);border-radius:16px;padding:28px;max-width:520px;width:100%;box-shadow:0 24px 80px rgba(0,0,0,.5);max-height:90vh;overflow-y:auto">'     + '<div style="font-family:\'Playfair Display\',serif;font-size:1.2rem;font-weight:700;color:var(--vd);margin-bottom:6px">✏️ Novo Relato — R. Hermínio de Melo</div>'     + '<div style="font-size:.8rem;color:var(--cm);margin-bottom:18px">Escreva o rascunho. Claude irá formatar o HTML.</div>'     + '<textarea id="rh-rascunho" rows="10" placeholder="Ex: Hoje, 20/05, 8º/9º Ano — LP, 2h. Conteúdo: figuras de linguagem..." style="width:100%;padding:12px;border:2px solid var(--cl);border-radius:10px;font-family:\'DM Sans\',sans-serif;font-size:.88rem;color:var(--ce);background:var(--cr);resize:vertical;margin-bottom:14px"></textarea>'     + '<div style="font-size:.78rem;color:var(--cm);background:rgba(201,168,76,.08);border:1px solid rgba(201,168,76,.2);border-radius:8px;padding:10px 14px;margin-bottom:16px">'     + '💡 Cole o rascunho no chat com Claude Code — ele irá gerar o HTML e injetar diretamente no arquivo.</div>'     + '<div style="display:flex;gap:10px">'     + '<button onclick="navigator.clipboard.writeText(document.getElementById(\'rh-rascunho\').value)" style="flex:1;background:var(--vm);color:#fff;border:none;border-radius:10px;padding:11px;font-weight:700;cursor:pointer;font-family:\'DM Sans\',sans-serif;font-size:.88rem">📋 Copiar rascunho</button>'     + '<button onclick="document.getElementById(\'rh-modal-relato\').style.display=\'none\'" style="flex:1;background:var(--cl);color:var(--ce);border:none;border-radius:10px;padding:11px;font-weight:700;cursor:pointer;font-family:\'DM Sans\',sans-serif;font-size:.88rem">✕ Fechar</button>'     + '</div></div>';   document.body.appendChild(el);   el.addEventListener('click', function(e) { if (e.target === el) el.style.display = 'none'; }); } document.addEventListener('DOMContentLoaded', function() {   setTimeout(function(){   
if (!window._rhDailyReady) {       window._rhDailyReady = true;       rhRenderInterativosVisiveis(false);       rhSincronizarResumoAlunos();       rhRefreshHeroStats();     }   }, 80);   setTimeout(function(){   
if (!window._rhSyncReady) {       window._rhSyncReady = true;       rhIniciarSyncRemoto();     }   }, 900); });
function rhFindActionable(target) {   return target && target.closest ? target.closest('button,a,[onclick],[data-rh-toggle],.nb,.eh,.itab,.rh-hero-pill,.rh-hero-btn,.rh-hero-link,.rh-mark-btn,.atv-r,.atv-mo,.main-tab,.disc-tab,.bim-tab,.btn-st,.liv-card,.liv-btn') : null; }
document.addEventListener('click', function(e) { 
var btn = e.target.closest('[data-rh-toggle]'); 
if (!btn) return; 
var tipo = btn.getAttribute('data-rh-toggle'); 
var paneId = btn.getAttribute('data-pane'); 
var aluno = btn.getAttribute('data-aluno'); 
var pane = document.getElementById(paneId); 
if (!pane || !aluno) return; 
var atual = rhGetEstadoAtual(tipo, pane, aluno); 
var proximo = rhProximoEstado(atual); 
if (tipo === 'presenca') {   
if (!_rhPresencaCliques[paneId]) _rhPresencaCliques[paneId] = {};     _rhPresencaCliques[paneId][aluno] = proximo;     rhSalvarCliques('presenca');     rhRenderPanePresenca(pane);     rhSincronizarResumoAlunos();     return;   } 
if (!_rhAtividadeCliques[paneId]) _rhAtividadeCliques[paneId] = {};   _rhAtividadeCliques[paneId][aluno] = proximo;   rhSalvarCliques('atividade');   rhRenderPaneAtividade(pane);   rhSincronizarResumoAlunos(); });
if ('serviceWorker' in navigator) { 
window.addEventListener('load', function() {     navigator.serviceWorker.register('sw.js').catch(function(){});   }); }
function rhRemoverAbaJogos() {
var secJogos = document.getElementById('sec-jogos');
if (secJogos) secJogos.remove();
var btnJogos = document.querySelector(".nb[onclick=\"aba('sec-jogos',this)\"]");
if (btnJogos) {
var sep = btnJogos.previousElementSibling;
if (sep && sep.classList && sep.classList.contains('sp')) sep.remove();
btnJogos.remove();
}
}
document.addEventListener('DOMContentLoaded', rhRemoverAbaJogos);
document.addEventListener('DOMContentLoaded', rhGarantirEditorPersistente);
(function() {
var RH_STORAGE_SYNC_SCOPE = 'herminio:storage:shared-v1';
var RH_STORAGE_LOCAL_TS_KEY = 'rh_storage_sync_local_ts';
var RH_STORAGE_SYNC_EXACT_KEYS = ['rh_liv_status', 'rh_liv_urls', 'rh_seq_status', 'rh_plan_last_update'];
var RH_STORAGE_SYNC_PREFIXES = ['rh_livro_', 'rh_hist_', 'rh_seq_', 'rh_seq_hist_', 'rh_cl_fim_', 'rh_plan_'];
var _rhRemoteStorageSync = null;
var _rhAplicandoStorageRemoto = false;

function rhStorageSyncStatus(status) {
var el = document.getElementById('rh-cl-status');
if (!el) return;
var texto = '● Sincronizacao local';
if (status === 'conectando') texto = '● Conectando online...';
if (status === 'online') texto = '● Online em tempo real';
if (status === 'salvando') texto = '● Salvando online...';
if (status === 'salvo') texto = '● Online sincronizado';
if (status === 'indisponivel') texto = '● Sync remoto indisponivel';
if (status === 'erro') texto = '● Falha no sync remoto';
el.textContent = texto;
}

function rhStorageSyncKey(key) {
if (!key) return false;
if (RH_STORAGE_SYNC_EXACT_KEYS.indexOf(key) >= 0) return true;
return RH_STORAGE_SYNC_PREFIXES.some(function(prefix) {
return key.indexOf(prefix) === 0;
});
}

function rhStorageTouch(ts) {
localStorage.setItem(RH_STORAGE_LOCAL_TS_KEY, ts || new Date().toISOString());
}

function rhStoragePayloadValues() {
var values = {};
for (var i = 0; i < localStorage.length; i += 1) {
var key = localStorage.key(i);
if (!rhStorageSyncKey(key)) continue;
values[key] = localStorage.getItem(key);
}
return values;
}

function rhStoragePayload() {
return {
localUpdatedAt: localStorage.getItem(RH_STORAGE_LOCAL_TS_KEY) || new Date().toISOString(),
values: rhStoragePayloadValues()
};
}

function rhStorageHydrateGlobals() {
try { _rhLivStatus = JSON.parse(localStorage.getItem('rh_liv_status') || '{}'); } catch (e) { _rhLivStatus = {}; }
try { _rhLivUrls = JSON.parse(localStorage.getItem('rh_liv_urls') || '{}'); } catch (e) { _rhLivUrls = {}; }
try { _rhSeqStatus = JSON.parse(localStorage.getItem('rh_seq_status') || '{}'); } catch (e) { _rhSeqStatus = {}; }
}

function rhStorageApplyRemote(payload, meta) {
if (!payload || typeof payload !== 'object') return;
var remoteStamp = Date.parse(payload.localUpdatedAt || (meta && meta.updatedAt) || '') || 0;
var localStamp = Date.parse(localStorage.getItem(RH_STORAGE_LOCAL_TS_KEY) || '') || 0;
if (localStamp && remoteStamp && localStamp > remoteStamp) {
rhAgendarStorageSync('keep-local');
return;
}
_rhAplicandoStorageRemoto = true;
try {
var values = payload.values && typeof payload.values === 'object' ? payload.values : {};
var keysToRemove = [];
for (var i = 0; i < localStorage.length; i += 1) {
var localKey = localStorage.key(i);
if (rhStorageSyncKey(localKey) && !Object.prototype.hasOwnProperty.call(values, localKey)) {
keysToRemove.push(localKey);
}
}
keysToRemove.forEach(function(key) {
localStorage.removeItem(key);
});
Object.keys(values).forEach(function(key) {
if (!rhStorageSyncKey(key)) return;
if (values[key] == null) localStorage.removeItem(key);
else localStorage.setItem(key, String(values[key]));
});
rhStorageTouch(payload.localUpdatedAt || (meta && meta.updatedAt) || new Date().toISOString());
rhStorageHydrateGlobals();
if (typeof rhLivRender === 'function') rhLivRender();
if (typeof rhSeqRender === 'function') rhSeqRender();
if (typeof rhClaudeRender === 'function') rhClaudeRender();
if (typeof rhRefreshHeroStats === 'function') rhRefreshHeroStats();
if (document.getElementById('rh-hist-modal') && typeof _rhReabrirLivroModal === 'function') _rhReabrirLivroModal();
} finally {
_rhAplicandoStorageRemoto = false;
}
}

function rhAgendarStorageSync(reason) {
if (_rhAplicandoStorageRemoto || !_rhRemoteStorageSync) return;
rhStorageTouch();
_rhRemoteStorageSync.schedulePush(reason || 'storage-change');
}

function rhSalvarStorageAgora(reason) {
if (_rhAplicandoStorageRemoto || !_rhRemoteStorageSync) return Promise.resolve(false);
rhStorageTouch();
return _rhRemoteStorageSync.pushNow(reason || 'force');
}

function rhIniciarStorageSync() {
if (_rhRemoteStorageSync) return true;
if (!window.RelatorioSupabaseSync || !window.RelatorioSupabaseSync.isAvailable()) return false;
_rhRemoteStorageSync = window.RelatorioSupabaseSync.createScopeSync({
scope: RH_STORAGE_SYNC_SCOPE,
schoolSlug: 'raimundo-herminio-de-melo',
classSlug: 'storage',
source: 'herminio-storage',
debounceMs: 450,
getLocalPayload: function() {
return rhStoragePayload();
},
onRemotePayload: function(payload, meta) {
rhStorageApplyRemote(payload, meta);
},
onStatus: function(status) {
rhStorageSyncStatus(status);
}
});
_rhRemoteStorageSync.start().then(function(ready) {
if (!ready) return;
window.setTimeout(function() {
rhAgendarStorageSync('bootstrap-storage');
}, 700);
});
return true;
}

function rhGarantirSyncsOnline(tentativa) {
if (window.RelatorioSupabaseSync && window.RelatorioSupabaseSync.isAvailable()) {
if (!_rhRemoteDailySync && typeof rhIniciarSyncRemoto === 'function') rhIniciarSyncRemoto();
rhIniciarStorageSync();
return;
}
if ((tentativa || 0) >= 15) {
rhStorageSyncStatus('indisponivel');
return;
}
window.setTimeout(function() {
rhGarantirSyncsOnline((tentativa || 0) + 1);
}, 1200);
}

function rhWrapSyncFunction(name, after) {
var original = window[name];
if (typeof original !== 'function' || original.__rhSyncWrapped) return;
function runAfter(context, args) {
try {
after.apply(context, args);
} catch (error) {
console.warn('[RH sync]', name, error && error.message ? error.message : error);
}
}
var wrapped = function() {
var args = arguments;
var result = original.apply(this, arguments);
if (result && typeof result.then === 'function') {
return result.finally(function() {
runAfter(this, args);
}.bind(this));
}
runAfter(this, args);
return result;
};
wrapped.__rhSyncWrapped = true;
window[name] = wrapped;
}

function rhBindStorageSyncHooks() {
rhWrapSyncFunction('_rhSaveLivro', function() { rhAgendarStorageSync('livro-local'); });
rhWrapSyncFunction('_rhSaveHist', function() { rhAgendarStorageSync('hist-local'); });
rhWrapSyncFunction('_rhSaveSequencia', function() { rhAgendarStorageSync('seq-local'); });
rhWrapSyncFunction('_rhSaveSeqHist', function() { rhAgendarStorageSync('seq-hist-local'); });
rhWrapSyncFunction('rhLivSalvarStatus', function() { rhAgendarStorageSync('liv-status'); });
rhWrapSyncFunction('rhSeqSalvarStatus', function() { rhAgendarStorageSync('seq-status'); });
rhWrapSyncFunction('rhLivRegistrarUrl', function() { rhAgendarStorageSync('liv-url'); });
rhWrapSyncFunction('rhSalvarLivro', function() { rhSalvarStorageAgora('force'); });
rhWrapSyncFunction('rhMarcarConcluido', function() { rhSalvarStorageAgora('force'); });
rhWrapSyncFunction('rhSequenciaSalvar', function() { rhSalvarStorageAgora('force'); });
rhWrapSyncFunction('rhSequenciaMarcarConcluida', function() { rhSalvarStorageAgora('force'); });
rhWrapSyncFunction('_rhTogTema', function() { rhAgendarStorageSync('tema-toggle'); });
rhWrapSyncFunction('_rhEditTema', function() { rhAgendarStorageSync('tema-edit'); });
rhWrapSyncFunction('_rhDelTema', function() { rhAgendarStorageSync('tema-del'); });
rhWrapSyncFunction('_rhAddTema', function() { rhAgendarStorageSync('tema-add'); });
rhWrapSyncFunction('rhClaudeConfirmarHora', function() { rhSalvarStorageAgora('force'); });
rhWrapSyncFunction('rhClaudeLimpar', function() { rhSalvarStorageAgora('force'); });
}

window.relatoriosForceOnlineRefresh = function() {
rhGarantirSyncsOnline(0);
var tarefas = [];
if (_rhRemoteDailySync && typeof _rhRemoteDailySync.refresh === 'function') tarefas.push(_rhRemoteDailySync.refresh());
if (_rhRemoteStorageSync && typeof _rhRemoteStorageSync.refresh === 'function') tarefas.push(_rhRemoteStorageSync.refresh());
return Promise.allSettled(tarefas).then(function() {
rhStorageHydrateGlobals();
if (typeof rhMarcarPanesInterativosDirty === 'function') {
rhMarcarPanesInterativosDirty('presenca');
rhMarcarPanesInterativosDirty('atividade');
}
if (typeof rhRenderInterativosVisiveis === 'function') rhRenderInterativosVisiveis(true);
if (typeof rhSincronizarResumoAlunos === 'function') rhSincronizarResumoAlunos();
if (typeof rhLivRender === 'function') rhLivRender();
if (typeof rhSeqRender === 'function') rhSeqRender();
if (typeof rhClaudeRender === 'function') rhClaudeRender();
if (typeof rhRefreshHeroStats === 'function') rhRefreshHeroStats();
return true;
});
};

function rhGarantirLivrosPromptScriptAtual() {
if (window.__LIVROS_PROMPTS_VERSION__ === '20260723b') return;
if (document.querySelector('script[data-rh-livros-prompts-latest="1"]')) return;
var script = document.createElement('script');
script.src = 'assets/js/livros-prompts.js?v=20260723b';
script.async = false;
script.setAttribute('data-rh-livros-prompts-latest', '1');
document.body.appendChild(script);
}

document.addEventListener('DOMContentLoaded', function() {
rhGarantirLivrosPromptScriptAtual();
rhBindStorageSyncHooks();
rhGarantirSyncsOnline(0);
});

window.addEventListener('online', function() {
rhGarantirSyncsOnline(0);
if (typeof window.relatoriosForceOnlineRefresh === 'function') {
window.relatoriosForceOnlineRefresh();
}
});
})();
