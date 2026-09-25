<#
  gerar-video.ps1 — gera o vídeo de marketing do RELATORIO SKIN de ponta a ponta.
  1. Confere Node, Python e o Chrome/Edge.
  2. Instala o que faltar (npm: puppeteer-core + ffmpeg-static; pip: numpy + scipy).
  3. Roda render.js: cenas (HTML/CSS/JS + GLSL) → quadros → trilha (Python) → MP4.
  4. O vídeo do site (assets/video/) é a edição do professor: o render não mexe nele
     (node render.js --atualizar-site troca pela versão deste mestre).
  Uso:  .\gerar-video.ps1            (vídeo completo)
        .\gerar-video.ps1 -Previa    (versão rápida em 960×540)
#>
param([switch]$Previa)
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot

function Exige($nome, $teste) {
  if (-not (Get-Command $teste -ErrorAction SilentlyContinue)) { throw "$nome não encontrado. Instale e tente de novo." }
}
Exige 'Node.js' 'node'
Exige 'Python' 'python'

$navegadores = @("$env:ProgramFiles\Google\Chrome\Application\chrome.exe", "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe", "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe")
if (-not ($navegadores | Where-Object { Test-Path $_ })) { throw 'Chrome ou Edge não encontrado (defina a variável CHROME_PATH).' }

if (-not (Test-Path 'node_modules\puppeteer-core') -or -not (Test-Path 'node_modules\ffmpeg-static')) {
  Write-Host 'Instalando dependências do Node (puppeteer-core, ffmpeg-static)…'
  npm install --no-audit --no-fund
}
python -c "import numpy, scipy" 2>$null
if ($LASTEXITCODE -ne 0) {
  Write-Host 'Instalando numpy e scipy…'
  python -m pip install --user numpy scipy
}

$inicio = Get-Date
if ($Previa) { node render.js --previa } else { node render.js }
if ($LASTEXITCODE -ne 0) { throw 'O render falhou. Veja as mensagens acima.' }
$dur = [int]((Get-Date) - $inicio).TotalSeconds
Write-Host ("Concluído em {0} min {1:00} s." -f [int][Math]::Floor($dur / 60), ($dur % 60))
