"use strict";
// Carrega o catálogo de escolas do INEP (microdados do Censo Escolar) nas
// tabelas public.inep_escolas e public.inep_municipios (Etapa 14).
//
// Uso:
//   1. Baixe https://download.inep.gov.br/dados_abertos/microdados_censo_escolar_AAAA.zip
//      e extraia dados/microdados_ed_basica_AAAA.csv
//   2. node scripts/importar-escolas-inep.js <caminho do csv> [--aplicar]
//
// Gera arquivos SQL em lotes numa pasta temporária. Com --aplicar, roda cada
// lote com "supabase db query --linked -f" na pasta da Biblioteca (onde o CLI
// está ligado ao projeto). Entram só escolas em atividade ou paralisadas.
// Rodar de novo substitui o catálogo inteiro (ano novo do Censo).

const fs = require("fs");
const os = require("os");
const path = require("path");
const readline = require("readline");
const { spawnSync } = require("child_process");

const csv = process.argv[2];
const aplicar = process.argv.includes("--aplicar");
if (!csv || !fs.existsSync(csv)) {
  console.error("Informe o caminho do microdados_ed_basica_AAAA.csv");
  process.exit(1);
}
const pastaBiblioteca = path.resolve(__dirname, "..", "..", "BIBLIOTECA-DIGITAL");
const saida = fs.mkdtempSync(path.join(os.tmpdir(), "inep-"));
const LOTE = parseInt(process.env.INEP_LOTE || "2000", 10);

const REDE = { 1: "Federal", 2: "Estadual", 3: "Municipal", 4: "Privada" };
const LOCAL = { 1: "Urbana", 2: "Rural" };
const SITUACAO = { 1: "Em atividade", 2: "Paralisada" };

function semAcento(s) {
  return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}
function q(v) {
  if (v === null || v === undefined || v === "") return "null";
  return "'" + String(v).replace(/'/g, "''") + "'";
}
function n(v) { const x = parseInt(v, 10); return Number.isFinite(x) ? x : "null"; }

async function main() {
  const entrada = fs.createReadStream(csv, { encoding: "latin1" });
  const linhas = readline.createInterface({ input: entrada, crlfDelay: Infinity });
  let col = null, lote = [], arquivos = [], total = 0, ano = 2024;

  function gravarLote() {
    if (!lote.length) return;
    const nome = path.join(saida, "lote-" + String(arquivos.length + 1).padStart(3, "0") + ".sql");
    const cab = arquivos.length ? "" : "truncate public.inep_escolas;\n";
    fs.writeFileSync(nome, cab + "insert into public.inep_escolas (codigo,nome,nome_busca,uf,municipio_codigo,municipio,rede,localizacao,situacao,endereco,bairro,cep,telefone,matriculas,etapas,ano_censo) values\n"
      + lote.join(",\n") + "\non conflict (codigo) do nothing;\n", "utf8");
    arquivos.push(nome);
    lote = [];
  }

  for await (const linha of linhas) {
    const c = linha.split(";");
    if (!col) { col = {}; c.forEach((nome, i) => { col[nome.trim()] = i; }); continue; }
    const sit = parseInt(c[col.TP_SITUACAO_FUNCIONAMENTO], 10);
    if (sit !== 1 && sit !== 2) continue;
    ano = parseInt(c[col.NU_ANO_CENSO], 10) || ano;
    const etapas = [];
    if (parseInt(c[col.QT_MAT_INF], 10) > 0) etapas.push("Infantil");
    if (parseInt(c[col.QT_MAT_FUND], 10) > 0) etapas.push("Fundamental");
    if (parseInt(c[col.QT_MAT_MED], 10) > 0) etapas.push("Médio");
    if (parseInt(c[col.QT_MAT_EJA], 10) > 0) etapas.push("EJA");
    const end = [c[col.DS_ENDERECO], c[col.NU_ENDERECO], c[col.DS_COMPLEMENTO]].map((x) => (x || "").trim()).filter(Boolean).join(", ");
    const tel = c[col.NU_TELEFONE] ? "(" + (c[col.NU_DDD] || "") + ") " + c[col.NU_TELEFONE] : "";
    const nome = (c[col.NO_ENTIDADE] || "").trim();
    lote.push("(" + [
      n(c[col.CO_ENTIDADE]), q(nome), q(semAcento(nome)), q(c[col.SG_UF]), n(c[col.CO_MUNICIPIO]), q(c[col.NO_MUNICIPIO]),
      q(REDE[c[col.TP_DEPENDENCIA]]), q(LOCAL[c[col.TP_LOCALIZACAO]]), q(SITUACAO[sit]), q(end), q((c[col.NO_BAIRRO] || "").trim()),
      q(c[col.CO_CEP]), q(tel), n(c[col.QT_MAT_BAS]), q(etapas.join(", ")), ano
    ].join(",") + ")");
    total++;
    if (lote.length >= LOTE) gravarLote();
  }
  gravarLote();

  const fim = path.join(saida, "lote-999-municipios.sql");
  fs.writeFileSync(fim, "truncate public.inep_municipios;\n"
    + "insert into public.inep_municipios (codigo, uf, nome, escolas)\n"
    + "select municipio_codigo, min(uf), min(municipio), count(*) from public.inep_escolas group by municipio_codigo;\n"
    + "analyze public.inep_escolas; analyze public.inep_municipios;\n", "utf8");
  arquivos.push(fim);
  console.log(total + " escolas em " + arquivos.length + " arquivos: " + saida);

  if (!aplicar) return;
  for (const arq of arquivos) {
    let ok = false;
    for (let tentativa = 1; tentativa <= 4 && !ok; tentativa++) {
      const r = spawnSync("supabase", ["db", "query", "--linked", "-f", arq], { cwd: pastaBiblioteca, encoding: "utf8", shell: true, timeout: 240000 });
      ok = r.status === 0 && !/"_tag":"Error"|error/i.test(r.stdout || "");
      if (!ok) console.warn("  falhou (" + tentativa + "): " + path.basename(arq) + " " + String(r.stdout || r.stderr || "").slice(0, 200));
    }
    if (!ok) { console.error("Parou em " + arq); process.exit(1); }
    console.log("  ok " + path.basename(arq));
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
