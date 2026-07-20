"use strict";

const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const sourcePath = "C:/Users/PAULO ROBERTO/biblioteca-digital-medieval-1/docs/alunos-ids.md";

const targets = [
  { file: "casavequia-alunos-1serie.html", type: "config", schoolCode: "PCC", seriesCodes: ["1"] },
  { file: "casavequia-alunos-2serie.html", type: "config", schoolCode: "PCC", seriesCodes: ["2"] },
  { file: "casavequia-alunos-3serie.html", type: "config", schoolCode: "PCC", seriesCodes: ["3"] },
  { file: "casavequia-alunos-6ano.html", type: "config", schoolCode: "PCC", seriesCodes: ["6"] },
  { file: "herminio-alunos-1serie.html", type: "const", schoolCode: "RHM2", seriesCodes: ["1"] },
  { file: "herminio-alunos-2serie.html", type: "const", schoolCode: "RHM2", seriesCodes: ["2"] },
  { file: "herminio-alunos-3serie.html", type: "const", schoolCode: "RHM2", seriesCodes: ["3"] },
  { file: "herminio-alunos-8-9ano.html", type: "const", schoolCode: "RHM2", seriesCodes: ["8", "9"] }
];

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function parseStudentEntries(markdown) {
  return markdown
    .split(/\r?\n/)
    .filter((line) => /^\|\s*ID-/.test(line))
    .map((line) => {
      const cells = line
        .split("|")
        .map((cell) => cell.trim())
        .filter(Boolean);

      const externalId = cells[0] || "";
      const name = cells[1] || "";
      const idParts = externalId.split("-");

      return {
        externalId,
        name,
        normalizedName: normalizeText(name),
        seriesCode: idParts[3] || "",
        schoolCode: idParts[4] || ""
      };
    });
}

function readStudentArray(source, type) {
  const regex = type === "config"
    ? /students:\s*\[(.*?)\]\s*\n?\s*};/s
    : /const STUDENTS = \[(.*?)\];/s;
  const match = source.match(regex);
  if (!match) {
    throw new Error("Lista de alunos nao encontrada.");
  }
  const list = Function('"use strict"; return [' + match[1] + "];")();
  return { match, list };
}

function stringifyValue(value) {
  if (typeof value === "string") {
    return JSON.stringify(value);
  }
  if (typeof value === "boolean" || typeof value === "number") {
    return String(value);
  }
  if (value == null) {
    return "null";
  }
  throw new Error("Tipo nao suportado na serializacao.");
}

function formatStudentObject(student) {
  const keys = ["id", "numero", "nome", "transferido", "externalId"];
  const parts = [];

  keys.forEach((key) => {
    if (!Object.prototype.hasOwnProperty.call(student, key)) return;
    const value = student[key];
    if (value === undefined) return;
    if (key === "externalId" && !value) return;
    if (key === "transferido" && value !== true) return;
    parts.push(key + ": " + stringifyValue(value));
  });

  return "    { " + parts.join(", ") + " }";
}

function updateFile(target, entries) {
  const filePath = path.join(rootDir, target.file);
  const source = fs.readFileSync(filePath, "utf8");
  const { match, list } = readStudentArray(source, target.type);

  const scopedEntries = entries.filter((entry) => {
    return entry.schoolCode === target.schoolCode && target.seriesCodes.includes(entry.seriesCode);
  });

  const updatedStudents = list.map((student) => {
    const normalizedName = normalizeText(student.nome);
    const entry = scopedEntries.find((item) => item.normalizedName === normalizedName);
    const next = { ...student };
    if (entry) {
      next.externalId = entry.externalId;
    } else if (Object.prototype.hasOwnProperty.call(next, "externalId")) {
      delete next.externalId;
    }
    return next;
  });

  const formatted = "\n" + updatedStudents.map(formatStudentObject).join(",\n") + "\n  ";
  const nextSource = source.replace(match[1], formatted);

  fs.writeFileSync(filePath, nextSource, "utf8");

  const matched = updatedStudents.filter((student) => student.externalId).length;
  const missing = updatedStudents
    .filter((student) => !student.externalId)
    .map((student) => student.nome);

  return {
    file: target.file,
    matched,
    total: updatedStudents.length,
    missing
  };
}

function main() {
  const markdown = fs.readFileSync(sourcePath, "utf8");
  const entries = parseStudentEntries(markdown);
  const results = targets.map((target) => updateFile(target, entries));

  results.forEach((result) => {
    const missingLabel = result.missing.length
      ? " | sem ID: " + result.missing.join(", ")
      : "";
    console.log(result.file + ": " + result.matched + "/" + result.total + " com ID" + missingLabel);
  });
}

main();
