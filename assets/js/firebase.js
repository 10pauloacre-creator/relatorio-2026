// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDO-BTsc6pYMBd89WIKEUcz4_iaaD46tR4",
  authDomain: "relatorio-c693d.firebaseapp.com",
  projectId: "relatorio-c693d",
  storageBucket: "relatorio-c693d.firebasestorage.app",
  messagingSenderId: "457657450375",
  appId: "1:457657450375:web:15b1335aed2ba9939bdd22",
  measurementId: "G-3P3SK63P71"
};
window.FIREBASE_CONFIG = firebaseConfig;
// ═══════════════════════════════════════════════════════════
// FIREBASE.JS — Todas as operações com Firebase
// Autenticação Google + Firestore CRUD
// ═══════════════════════════════════════════════════════════

// Importa o Firebase via CDN (carregado no index.html)
// Variáveis globais: app, auth, db — inicializadas em initFirebase()

let _app = null;
let _auth = null;
let _db = null;
let _usuarioAtual = null;

// ── Inicialização ────────────────────────────────────────

function initFirebase() {
  if (_app) return; // já inicializado
  try {
    const { initializeApp } = window.firebase_app;
    const { getAuth, GoogleAuthProvider, signInWithPopup,
            onAuthStateChanged, signOut, browserLocalPersistence,
            setPersistence } = window.firebase_auth;
    const { getFirestore } = window.firebase_firestore;

    _app  = initializeApp(window.FIREBASE_CONFIG);
    _auth = getAuth(_app);
    _db   = getFirestore(_app);

    // Persistência local (mantém login após fechar o navegador)
    setPersistence(_auth, browserLocalPersistence).catch(console.error);

    window._fbAuth = _auth;
    window._fbDb   = _db;
    window._fbGoogleProvider = new GoogleAuthProvider();

    console.log('[Firebase] Inicializado com sucesso');
  } catch (e) {
    console.error('[Firebase] Erro ao inicializar:', e);
    mostrarErroFirebase(e);
  }
}

// ── Autenticação ─────────────────────────────────────────

function loginComGoogle() {
  const { signInWithPopup } = window.firebase_auth;
  return signInWithPopup(_auth, window._fbGoogleProvider)
    .then(result => {
      _usuarioAtual = result.user;
      return result.user;
    });
}

function logout() {
  const { signOut } = window.firebase_auth;
  return signOut(_auth);
}

function onAuthChange(callback) {
  const { onAuthStateChanged } = window.firebase_auth;
  return onAuthStateChanged(_auth, user => {
    _usuarioAtual = user;
    callback(user);
  });
}

function getUsuarioAtual() {
  return _usuarioAtual;
}

// ── Helpers Firestore ────────────────────────────────────

function getDb() { return _db; }

function fbDoc(caminho) {
  const { doc } = window.firebase_firestore;
  return doc(_db, caminho);
}

function fbCollection(caminho) {
  const { collection } = window.firebase_firestore;
  return collection(_db, caminho);
}

// ── Operações de Diário ──────────────────────────────────

async function salvarDiario(turmaId, data, dados) {
  const { setDoc, serverTimestamp } = window.firebase_firestore;
  const ref = fbDoc(`relatorio2026/paginas/${turmaId}/diarios/${data}`);
  await setDoc(ref, { ...dados, updatedAt: serverTimestamp() }, { merge: true });
}

async function carregarDiarios(turmaId) {
  const { getDocs, orderBy, query } = window.firebase_firestore;
  const col = fbCollection(`relatorio2026/paginas/${turmaId}/diarios`);
  const snap = await getDocs(query(col, orderBy('__name__', 'desc')));
  const result = {};
  snap.forEach(d => { result[d.id] = d.data(); });
  return result;
}

async function carregarDiario(turmaId, data) {
  const { getDoc } = window.firebase_firestore;
  const ref = fbDoc(`relatorio2026/paginas/${turmaId}/diarios/${data}`);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
}

// ── Operações de Presença ────────────────────────────────

async function salvarPresenca(turmaId, data, presenca) {
  await salvarDiario(turmaId, data, { presenca });
}

// ── Operações de Atividade ───────────────────────────────

async function salvarAtividade(turmaId, data, atividade) {
  await salvarDiario(turmaId, data, { atividade });
}

// ── Operações de Status do Plano ─────────────────────────

async function salvarStatusAula(turmaId, disciplina, bimestre, indice, status) {
  const { setDoc } = window.firebase_firestore;
  const id = `${turmaId}_${disciplina}_${bimestre}_${indice}`.replace(/\s+/g, '_');
  const ref = fbDoc(`relatorio2026/plano/status_aulas/${id}`);
  await setDoc(ref, {
    turmaId, disciplina, bimestre, indice,
    ...status,
    updatedAt: Date.now()
  }, { merge: true });
}

async function carregarStatusPlano() {
  const { getDocs } = window.firebase_firestore;
  const col = fbCollection('relatorio2026/plano/status_aulas');
  const snap = await getDocs(col);
  const result = {};
  snap.forEach(d => { result[d.id] = d.data(); });
  return result;
}

// ── Operações de Blocos (páginas livres) ─────────────────

async function salvarBlocos(paginaId, blocos) {
  const { setDoc, serverTimestamp } = window.firebase_firestore;
  const ref = fbDoc(`relatorio2026/paginas/${paginaId}`);
  await setDoc(ref, { blocos, updatedAt: serverTimestamp() }, { merge: true });
}

async function carregarBlocos(paginaId) {
  const { getDoc } = window.firebase_firestore;
  const ref = fbDoc(`relatorio2026/paginas/${paginaId}`);
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data().blocos || []) : [];
}

// ── Histórico de versões ─────────────────────────────────

async function salvarHistorico(snapshot) {
  const { setDoc, getDocs, deleteDoc, orderBy, query, limit } = window.firebase_firestore;
  const usuario = _usuarioAtual;
  const ts = Date.now();
  const ref = fbDoc(`relatorio2026/historico/${ts}`);
  await setDoc(ref, {
    snapshot,
    timestamp: ts,
    autor: usuario ? usuario.displayName : 'Desconhecido',
    data: new Date(ts).toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })
  });

  // Manter apenas os 10 mais recentes
  const col = fbCollection('relatorio2026/historico');
  const snap = await getDocs(query(col, orderBy('timestamp', 'asc')));
  if (snap.size > 10) {
    const excesso = snap.size - 10;
    let cont = 0;
    for (const doc of snap.docs) {
      if (cont < excesso) {
        await deleteDoc(doc.ref);
        cont++;
      } else break;
    }
  }
}

async function carregarHistorico() {
  const { getDocs, orderBy, query } = window.firebase_firestore;
  const col = fbCollection('relatorio2026/historico');
  const snap = await getDocs(query(col, orderBy('timestamp', 'desc')));
  const result = [];
  snap.forEach(d => result.push({ id: d.id, ...d.data() }));
  return result;
}

// ── Cronograma ───────────────────────────────────────────

async function salvarCronograma(grade) {
  const { setDoc } = window.firebase_firestore;
  const ref = fbDoc('relatorio2026/cronograma');
  await setDoc(ref, { grade, updatedAt: Date.now() }, { merge: true });
}

async function carregarCronograma() {
  const { getDoc } = window.firebase_firestore;
  const ref = fbDoc('relatorio2026/cronograma');
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data().grade : null;
}

// ── Indicador de Sincronização ───────────────────────────

function atualizarIndicadorSync(estado) {
  const el = document.getElementById('sync-indicator');
  if (!el) return;
  el.className = 'sync-indicator';
  const estados = {
    salvo:     { cls: 'sync-salvo',     icone: '🟢', texto: 'Salvo' },
    salvando:  { cls: 'sync-salvando',  icone: '🔄', texto: 'Salvando...' },
    erro:      { cls: 'sync-erro',      icone: '🔴', texto: 'Erro ao salvar' },
    offline:   { cls: 'sync-offline',   icone: '☁️', texto: 'Sem conexão' }
  };
  const info = estados[estado] || estados.salvo;
  el.classList.add(info.cls);
  el.innerHTML = `<span>${info.icone}</span><span>${info.texto}</span>`;
}

async function execComSync(fn) {
  atualizarIndicadorSync('salvando');
  try {
    await fn();
    atualizarIndicadorSync('salvo');
  } catch (e) {
    console.error('[Firebase] Erro ao salvar:', e);
    atualizarIndicadorSync('erro');
    setTimeout(() => atualizarIndicadorSync('salvo'), 4000);
  }
}

// ── Monitor de conectividade ─────────────────────────────

window.addEventListener('online',  () => atualizarIndicadorSync('salvo'));
window.addEventListener('offline', () => atualizarIndicadorSync('offline'));

// ── Tratamento de erros ──────────────────────────────────

function mostrarErroFirebase(e) {
  const msg = document.getElementById('login-erro');
  if (msg) {
    msg.textContent = 'Erro de conexão com o Firebase: ' + (e.message || e);
    msg.style.display = 'block';
  }
}
