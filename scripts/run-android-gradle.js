"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const rootDir = path.resolve(__dirname, "..");
const androidDir = path.join(rootDir, "android");
const task = process.argv[2];

if (!task) {
  console.error("Informe a tarefa Gradle, por exemplo: assembleDebug");
  process.exit(1);
}

const javaHome = findJavaHome();
const sdkHome = findAndroidSdk();

if (!javaHome) {
  console.error("Nenhuma instalacao Java valida foi encontrada para o build Android.");
  process.exit(1);
}

if (!sdkHome) {
  console.error("Android SDK nao encontrado. Verifique a instalacao do Android Studio/SDK.");
  process.exit(1);
}

writeLocalProperties(path.join(androidDir, "local.properties"), sdkHome);

console.log(`Usando JAVA_HOME=${javaHome}`);
console.log(`Usando ANDROID_SDK_ROOT=${sdkHome}`);

const result = spawnSync("cmd.exe", ["/c", ".\\gradlew.bat", "--no-daemon", "--max-workers=1", task], {
  cwd: androidDir,
  stdio: "inherit",
  env: {
    ...process.env,
    JAVA_HOME: javaHome,
    ANDROID_HOME: sdkHome,
    ANDROID_SDK_ROOT: sdkHome
  }
});

if (typeof result.status === "number") {
  process.exit(result.status);
}

process.exit(1);

function findJavaHome() {
  const envCandidates = [process.env.JAVA_HOME, process.env.JDK_HOME].filter(Boolean);
  for (const candidate of envCandidates) {
    if (isValidJavaHome(candidate)) return stripQuotes(candidate);
  }

  const javaBaseDir = "C:\\Program Files\\Java";
  if (!fs.existsSync(javaBaseDir)) return null;

  const folders = fs
    .readdirSync(javaBaseDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

  const preferred = [
    ...folders.filter((name) => /^jdk-21(\.|$)/i.test(name)),
    ...folders.filter((name) => /^latest$/i.test(name)),
    ...folders.filter((name) => /^jdk-/i.test(name))
  ];

  for (const folder of preferred) {
    const candidate = path.join(javaBaseDir, folder);
    if (isValidJavaHome(candidate)) return candidate;
  }

  return null;
}

function findAndroidSdk() {
  const envCandidates = [process.env.ANDROID_HOME, process.env.ANDROID_SDK_ROOT].filter(Boolean);
  for (const candidate of envCandidates) {
    if (isValidSdkHome(candidate)) return stripQuotes(candidate);
  }

  const defaultCandidate = "C:\\Users\\PAULO ROBERTO\\AppData\\Local\\Android\\Sdk";
  if (isValidSdkHome(defaultCandidate)) return defaultCandidate;

  return null;
}

function writeLocalProperties(filePath, sdkHome) {
  const normalized = sdkHome.replace(/\\/g, "\\\\");
  const content = `sdk.dir=${normalized}\n`;
  fs.writeFileSync(filePath, content, "utf8");
}

function isValidJavaHome(candidate) {
  const normalized = stripQuotes(candidate);
  return fs.existsSync(path.join(normalized, "bin", "java.exe"));
}

function isValidSdkHome(candidate) {
  const normalized = stripQuotes(candidate);
  return fs.existsSync(path.join(normalized, "platform-tools"));
}

function stripQuotes(value) {
  return String(value || "").replace(/^"(.*)"$/, "$1");
}
