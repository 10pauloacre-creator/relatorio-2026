param(
  [string]$Source = "icon-512.png"
)

$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$sourcePath = Join-Path $root $Source

if (-not (Test-Path -LiteralPath $sourcePath)) {
  throw "Imagem de origem não encontrada: $sourcePath"
}

$targets = @(
  @{ Folder = "mipmap-mdpi"; Launcher = 48; Foreground = 108 },
  @{ Folder = "mipmap-hdpi"; Launcher = 72; Foreground = 162 },
  @{ Folder = "mipmap-xhdpi"; Launcher = 96; Foreground = 216 },
  @{ Folder = "mipmap-xxhdpi"; Launcher = 144; Foreground = 324 },
  @{ Folder = "mipmap-xxxhdpi"; Launcher = 192; Foreground = 432 }
)

function Save-ResizedPng {
  param(
    [System.Drawing.Image]$Image,
    [int]$Size,
    [string]$Destination
  )

  $bitmap = New-Object System.Drawing.Bitmap($Size, $Size)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)

  try {
    $graphics.Clear([System.Drawing.Color]::Transparent)
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.DrawImage($Image, 0, 0, $Size, $Size)
    $bitmap.Save($Destination, [System.Drawing.Imaging.ImageFormat]::Png)
  }
  finally {
    $graphics.Dispose()
    $bitmap.Dispose()
  }
}

$image = [System.Drawing.Image]::FromFile($sourcePath)

try {
  foreach ($target in $targets) {
    $folderPath = Join-Path $root "android\app\src\main\res\$($target.Folder)"
    if (-not (Test-Path -LiteralPath $folderPath)) {
      New-Item -ItemType Directory -Path $folderPath | Out-Null
    }

    Save-ResizedPng -Image $image -Size $target.Launcher -Destination (Join-Path $folderPath "ic_launcher.png")
    Save-ResizedPng -Image $image -Size $target.Launcher -Destination (Join-Path $folderPath "ic_launcher_round.png")
    Save-ResizedPng -Image $image -Size $target.Foreground -Destination (Join-Path $folderPath "ic_launcher_foreground.png")
  }
}
finally {
  $image.Dispose()
}

Write-Output "Ícones Android sincronizados a partir de $Source."
