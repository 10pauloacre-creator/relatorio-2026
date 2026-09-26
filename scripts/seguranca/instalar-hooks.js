"use strict";
// Liga os hooks de segurança do git (.githooks/) neste clone.
// Roda sozinho no `npm install` (script "prepare"). Nunca falha o install:
// fora de um repositório git (build da Vercel) apenas não faz nada.
const { execFileSync } = require("child_process");
const path = require("path");
try {
  const raiz = path.resolve(__dirname, "..", "..");
  execFileSync("git", ["rev-parse", "--is-inside-work-tree"], { cwd: raiz, stdio: "ignore" });
  const atual = (() => { try { return execFileSync("git", ["config", "core.hooksPath"], { cwd: raiz, encoding: "utf8" }).trim(); } catch (e) { return ""; } })();
  if (atual !== ".githooks") {
    execFileSync("git", ["config", "core.hooksPath", ".githooks"], { cwd: raiz, stdio: "ignore" });
    console.log("🔒 Hooks de segurança ligados (.githooks).");
  }
} catch (e) {
  // sem git ou sem permissão: segue sem hooks
}
