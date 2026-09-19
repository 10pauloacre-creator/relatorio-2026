"use strict";

// Congela as páginas das escolas de um ano letivo encerrado (Etapa 10).
//
//   node scripts/arquivar-ano-letivo.js 2026 [--ate 2027-01-31]
//
// Cria arquivo/<ano>/casavequia.html e arquivo/<ano>/herminio.html, cópias
// da página como está agora, que abrem só para leitura:
//  - <html data-arquivo-ate="AAAA-MM-DD">: supabase-report-sync.js lê o estado
//    de cada escopo como estava nessa data (relatorio_estado_ate, no histórico
//    permanente), nunca grava e não escuta o tempo real; a publicação dos
//    lançamentos e a IA das observações ficam desligadas;
//  - <base href="../../">: imagens, estilos e scripts vêm da raiz do site;
//  - localStorage isolado em memória (só a sessão de login passa), para a
//    página do ano antigo não ler nem sobrescrever as cópias locais do ano novo.
// E registra o ano em arquivo/anos-letivos.json, que o botão "📅 Ano letivo"
// lê para oferecer "Abrir <ano>".
//
// Rode ANTES de trocar os relatos da página pelo ano novo. O data-ano-letivo
// da página atual só muda quando ela já tiver os relatos do ano novo: a
// publicação usa esse ano para datar as aulas.

const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const registroPath = path.join(rootDir, "arquivo", "anos-letivos.json");

const PAGINAS = [
  { arquivo: "casavequia.html", escola: "padre-carlos-casavequia" },
  { arquivo: "herminio.html", escola: "raimundo-herminio-de-melo-2" }
];

const ISOLAR_ARMAZENAMENTO = "<script>/* Arquivo do ano letivo: armazenamento local isolado (só a sessão de login passa). */"
  + "(function(){try{var real=window.localStorage;var m={};"
  + "function passa(k){k=String(k);return k.indexOf('sb-')===0||k==='relatorio-ultimo-email';}"
  + "var s={getItem:function(k){return passa(k)?real.getItem(k):(Object.prototype.hasOwnProperty.call(m,k)?m[k]:null);},"
  + "setItem:function(k,v){if(passa(k))real.setItem(k,v);else m[k]=String(v);},"
  + "removeItem:function(k){if(passa(k))real.removeItem(k);else delete m[k];},"
  + "clear:function(){m={};},key:function(i){return Object.keys(m)[i]||null;},"
  + "get length(){return Object.keys(m).length;}};"
  + "Object.defineProperty(window,'localStorage',{value:s,configurable:true});}catch(e){}})();</script>";

function hojeNoAcre() {
  const partes = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Rio_Branco" }).format(new Date());
  return partes; // AAAA-MM-DD
}

function main() {
  const args = process.argv.slice(2);
  const ano = parseInt(args[0], 10);
  if (!(ano >= 2000 && ano < 3000)) {
    console.error("Uso: node scripts/arquivar-ano-letivo.js <ano> [--ate AAAA-MM-DD]");
    process.exit(1);
  }
  const iAte = args.indexOf("--ate");
  const ate = iAte >= 0 ? args[iAte + 1] : hojeNoAcre();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ate || "")) {
    console.error("--ate precisa estar no formato AAAA-MM-DD.");
    process.exit(1);
  }

  const registro = fs.existsSync(registroPath) ? JSON.parse(fs.readFileSync(registroPath, "utf8")) : {};
  const destinoDir = path.join(rootDir, "arquivo", String(ano));
  fs.mkdirSync(destinoDir, { recursive: true });

  for (const pagina of PAGINAS) {
    const origem = path.join(rootDir, pagina.arquivo);
    let html = fs.readFileSync(origem, "utf8");

    const tag = html.match(/<html\b[^>]*>/i);
    if (!tag) throw new Error(pagina.arquivo + ": tag <html> não encontrada.");
    const anoPagina = parseInt((tag[0].match(/data-ano-letivo="(\d{4})"/) || [])[1], 10);
    if (anoPagina !== ano) {
      throw new Error(pagina.arquivo + " está com data-ano-letivo=" + anoPagina + ", não " + ano
        + ". Arquive antes de trocar a página pelo ano novo.");
    }
    if (/data-arquivo-ate=/.test(tag[0])) throw new Error(pagina.arquivo + " já é uma página de arquivo.");

    const novaTag = tag[0].replace(/>$/, ' data-arquivo-ate="' + ate + '">');
    html = html.replace(tag[0], novaTag);
    // Logo depois do <meta charset> (que precisa vir primeiro) e antes de qualquer outro script.
    const cabeca = '\n<base href="../../">\n' + ISOLAR_ARMAZENAMENTO;
    if (/<meta charset="UTF-8">/i.test(html)) html = html.replace(/<meta charset="UTF-8">/i, function (m) { return m + cabeca; });
    else html = html.replace(/<head>/i, function (m) { return m + cabeca; });
    html = html.replace(/<title>([^<]*)<\/title>/i, function (_, t) { return "<title>Arquivo " + ano + " · " + t + "</title>"; });

    const destino = path.join(destinoDir, pagina.arquivo);
    fs.writeFileSync(destino, html, "utf8");

    const escola = registro[pagina.escola] || (registro[pagina.escola] = { atual: pagina.arquivo, anoAtual: ano, anos: {} });
    escola.anos = escola.anos || {};
    escola.anos[ano] = "arquivo/" + ano + "/" + pagina.arquivo;
    console.log("Arquivado:", path.relative(rootDir, destino), "(estado até " + ate + ")");
  }

  fs.writeFileSync(registroPath, JSON.stringify(registro, null, 2) + "\n", "utf8");
  console.log("Registro atualizado: arquivo/anos-letivos.json");
  console.log("Próximo passo, quando a página tiver os relatos do ano novo: trocar data-ano-letivo nas páginas"
    + " e anoAtual em arquivo/anos-letivos.json para " + (ano + 1) + ".");
}

main();
