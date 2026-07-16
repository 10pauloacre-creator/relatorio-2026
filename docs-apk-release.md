# APK e pagina de download

## O que foi configurado

- Projeto Android com Capacitor em `android/`
- Build web publicado a partir de `dist/`
- Pagina de download em `downloads/index.html`
- Historico de releases em `downloads/latest.json` e `downloads/releases.json`
- APK versionado em `downloads/apk/`
- Deploy do GitHub Pages compilando `dist/` automaticamente

## Fluxo principal para novas atualizacoes estruturais

1. Faça as alteracoes no projeto.
2. Execute:

```powershell
npm.cmd run release:debug -- --notes "Resumo da atualizacao estrutural"
```

3. Isso vai:

- preparar a proxima versao
- sincronizar o web app
- gerar o APK Android
- copiar o APK para `downloads/apk/`
- atualizar a pagina publica de downloads
- recriar `dist/` com os arquivos atualizados

4. Depois, publique no GitHub:

```powershell
git add .
git commit -m "release: nova versao do app"
git push origin main
```

## Link publico esperado

- Pagina de download:
  `https://10pauloacre-creator.github.io/relatorio-2026/downloads/`

## Comandos uteis

```powershell
npm.cmd install
npm run android:add
npm run release:prepare -- --level patch --notes "Ajustes estruturais"
npm run apk:debug
npm run release:publish -- --apk android/app/build/outputs/apk/debug/app-debug.apk
npm run build:web
```

## Observacoes

- O fluxo atual gera um APK `debug`, adequado para instalacao manual e atualizacao por cima da versao anterior.
- O versionamento do Android e da pagina de downloads passa a ser controlado pelo release preparado em `release:prepare`.
- O deploy do GitHub Pages agora publica apenas o site compilado em `dist/`, incluindo a pagina e os APKs copiados para `downloads/apk/`.
