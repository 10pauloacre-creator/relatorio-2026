param(
  [string]$Source = "icon-512.png"
)

$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

$cropXRatio = 0.185
$cropYRatio = 0.045
$cropWidthRatio = 0.63
$cropHeightRatio = 0.67

$launcherArtScale = 0.68
$launcherArtTopRatio = 0.10
$foregroundArtScale = 0.62
$foregroundArtTopRatio = 0.12

$backgroundStart = [System.Drawing.ColorTranslator]::FromHtml("#103F92")
$backgroundEnd = [System.Drawing.ColorTranslator]::FromHtml("#0E9CB4")
$backgroundAccentA = [System.Drawing.Color]::FromArgb(56, 255, 255, 255)
$backgroundAccentB = [System.Drawing.Color]::FromArgb(46, 8, 26, 88)

$root = Split-Path -Parent $PSScriptRoot
$sourcePath = Join-Path $root $Source

if (-not (Test-Path -LiteralPath $sourcePath)) {
  throw "Imagem de origem nao encontrada: $sourcePath"
}

$targets = @(
  @{ Folder = "mipmap-mdpi"; Launcher = 48; Foreground = 108 },
  @{ Folder = "mipmap-hdpi"; Launcher = 72; Foreground = 162 },
  @{ Folder = "mipmap-xhdpi"; Launcher = 96; Foreground = 216 },
  @{ Folder = "mipmap-xxhdpi"; Launcher = 144; Foreground = 324 },
  @{ Folder = "mipmap-xxxhdpi"; Launcher = 192; Foreground = 432 }
)

function New-RoundedPath {
  param(
    [float]$Size,
    [float]$Radius
  )

  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $diameter = $Radius * 2

  $path.AddArc(0, 0, $diameter, $diameter, 180, 90)
  $path.AddArc($Size - $diameter, 0, $diameter, $diameter, 270, 90)
  $path.AddArc($Size - $diameter, $Size - $diameter, $diameter, $diameter, 0, 90)
  $path.AddArc(0, $Size - $diameter, $diameter, $diameter, 90, 90)
  $path.CloseFigure()

  return $path
}

function Set-HighQualityDrawing {
  param([System.Drawing.Graphics]$Graphics)

  $Graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  $Graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $Graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $Graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
}

function Draw-LauncherBackground {
  param(
    [System.Drawing.Graphics]$Graphics,
    [int]$Size
  )

  $path = New-RoundedPath -Size $Size -Radius ($Size * 0.22)
  $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    ([System.Drawing.PointF]::new(0, 0)),
    ([System.Drawing.PointF]::new($Size, $Size)),
    $backgroundStart,
    $backgroundEnd
  )
  $accentBrushA = New-Object System.Drawing.SolidBrush($backgroundAccentA)
  $accentBrushB = New-Object System.Drawing.SolidBrush($backgroundAccentB)

  try {
    $Graphics.FillPath($brush, $path)
    $Graphics.SetClip($path)
    $Graphics.FillEllipse($accentBrushA, $Size * 0.46, $Size * 0.30, $Size * 0.62, $Size * 0.62)
    $Graphics.FillEllipse($accentBrushB, -($Size * 0.28), $Size * 0.44, $Size * 0.78, $Size * 0.78)
    $Graphics.ResetClip()
  }
  finally {
    $accentBrushB.Dispose()
    $accentBrushA.Dispose()
    $brush.Dispose()
    $path.Dispose()
  }
}

function Draw-CroppedArtwork {
  param(
    [System.Drawing.Graphics]$Graphics,
    [System.Drawing.Image]$Image,
    [int]$CanvasSize,
    [double]$Scale,
    [double]$TopRatio
  )

  $srcX = [int][Math]::Round($Image.Width * $cropXRatio)
  $srcY = [int][Math]::Round($Image.Height * $cropYRatio)
  $srcWidth = [int][Math]::Round($Image.Width * $cropWidthRatio)
  $srcHeight = [int][Math]::Round($Image.Height * $cropHeightRatio)

  $destSize = [int][Math]::Round($CanvasSize * $Scale)
  $destX = [int][Math]::Round(($CanvasSize - $destSize) / 2)
  $destY = [int][Math]::Round($CanvasSize * $TopRatio)

  $Graphics.DrawImage(
    $Image,
    (New-Object System.Drawing.Rectangle($destX, $destY, $destSize, $destSize)),
    $srcX,
    $srcY,
    $srcWidth,
    $srcHeight,
    [System.Drawing.GraphicsUnit]::Pixel
  )
}

function Save-LauncherIcon {
  param(
    [System.Drawing.Image]$Image,
    [int]$Size,
    [string]$Destination
  )

  $bitmap = New-Object System.Drawing.Bitmap($Size, $Size)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)

  try {
    $graphics.Clear([System.Drawing.Color]::Transparent)
    Set-HighQualityDrawing -Graphics $graphics
    Draw-LauncherBackground -Graphics $graphics -Size $Size
    Draw-CroppedArtwork -Graphics $graphics -Image $Image -CanvasSize $Size -Scale $launcherArtScale -TopRatio $launcherArtTopRatio
    $bitmap.Save($Destination, [System.Drawing.Imaging.ImageFormat]::Png)
  }
  finally {
    $graphics.Dispose()
    $bitmap.Dispose()
  }
}

function Save-ForegroundIcon {
  param(
    [System.Drawing.Image]$Image,
    [int]$Size,
    [string]$Destination
  )

  $bitmap = New-Object System.Drawing.Bitmap($Size, $Size)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)

  try {
    $graphics.Clear([System.Drawing.Color]::Transparent)
    Set-HighQualityDrawing -Graphics $graphics
    Draw-CroppedArtwork -Graphics $graphics -Image $Image -CanvasSize $Size -Scale $foregroundArtScale -TopRatio $foregroundArtTopRatio
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

    Save-LauncherIcon -Image $image -Size $target.Launcher -Destination (Join-Path $folderPath "ic_launcher.png")
    Save-LauncherIcon -Image $image -Size $target.Launcher -Destination (Join-Path $folderPath "ic_launcher_round.png")
    Save-ForegroundIcon -Image $image -Size $target.Foreground -Destination (Join-Path $folderPath "ic_launcher_foreground.png")
  }
}
finally {
  $image.Dispose()
}

Write-Output "Icones Android sincronizados a partir de $Source."
