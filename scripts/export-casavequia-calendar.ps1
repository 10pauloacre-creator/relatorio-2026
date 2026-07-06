param(
  [string]$WorkbookPath,
  [string]$OutputPath = 'assets/js/casavequia-calendar-data.js'
)

$ErrorActionPreference = 'Stop'

if (-not $WorkbookPath) {
  $match = Get-ChildItem 'C:\Downloads' -Filter '*.xlsx' |
    Where-Object { $_.Name -like 'Calenda*Escolar*2026*' } |
    Select-Object -First 1
  if (-not $match) {
    throw 'Planilha do calendário escolar não encontrada em C:\Downloads.'
  }
  $WorkbookPath = $match.FullName
}

Add-Type -AssemblyName System.IO.Compression.FileSystem

$monthMap = @{
  'janeiro' = 1
  'fevereiro' = 2
  'marco' = 3
  'abril' = 4
  'maio' = 5
  'junho' = 6
  'julho' = 7
  'agosto' = 8
  'setembro' = 9
  'outubro' = 10
  'novembro' = 11
  'dezembro' = 12
}

$groupConfigs = @(
  @{ index = 0; start = 2; finish = 8; rangeCol = 2; descCol = 3; totalCol = 8 },
  @{ index = 1; start = 10; finish = 16; rangeCol = 10; descCol = 11; totalCol = 16 },
  @{ index = 2; start = 18; finish = 24; rangeCol = 18; descCol = 19; totalCol = 24 }
)

function Remove-Diacritics([string]$text) {
  if ([string]::IsNullOrWhiteSpace($text)) { return '' }
  $normalized = $text.Normalize([Text.NormalizationForm]::FormD)
  $builder = New-Object System.Text.StringBuilder
  foreach ($char in $normalized.ToCharArray()) {
    if ([Globalization.CharUnicodeInfo]::GetUnicodeCategory($char) -ne [Globalization.UnicodeCategory]::NonSpacingMark) {
      [void]$builder.Append($char)
    }
  }
  return $builder.ToString().Normalize([Text.NormalizationForm]::FormC)
}

function Normalize-Text([string]$text) {
  return ((Remove-Diacritics $text) -replace '\s+', ' ').Trim()
}

function Get-XmlDocument([System.IO.Compression.ZipArchive]$zip, [string]$entryName) {
  $entry = $zip.GetEntry($entryName)
  if (-not $entry) {
    throw "Entrada '$entryName' não encontrada na planilha."
  }
  $reader = New-Object System.IO.StreamReader($entry.Open())
  try {
    $content = $reader.ReadToEnd()
  } finally {
    $reader.Close()
  }
  $doc = New-Object System.Xml.XmlDocument
  $doc.LoadXml($content)
  return $doc
}

function Get-SharedStrings([System.IO.Compression.ZipArchive]$zip) {
  $doc = Get-XmlDocument $zip 'xl/sharedStrings.xml'
  $ns = New-Object System.Xml.XmlNamespaceManager($doc.NameTable)
  $ns.AddNamespace('x', 'http://schemas.openxmlformats.org/spreadsheetml/2006/main')
  $shared = @()
  foreach ($si in $doc.SelectNodes('//x:si', $ns)) {
    $parts = $si.SelectNodes('.//x:t', $ns) | ForEach-Object { $_.InnerText }
    $shared += ($parts -join '')
  }
  return $shared
}

function Get-ColumnNumber([string]$letters) {
  $total = 0
  foreach ($char in $letters.ToCharArray()) {
    $total = ($total * 26) + ([int][char]$char - [int][char]'A' + 1)
  }
  return $total
}

function Convert-ExcelSerialToDate([double]$serial) {
  return ([datetime]'1899-12-30').AddDays($serial).Date
}

function Convert-ToIsoDate([datetime]$date) {
  return $date.ToString('yyyy-MM-dd')
}

function Get-Category([string]$title) {
  $normalized = Normalize-Text $title
  $lower = $normalized.ToLowerInvariant()
  if ($lower -match 'ferias') { return 'ferias' }
  if ($lower -match 'feriado|natal|corpus christi|consciencia negra|ano novo|finados|tiradentes|independencia|amazonia|tratado de petropolis|servidor publico|nossa senhora|proclamacao da republica|revolucao acreana') { return 'feriado' }
  if ($lower -match 'planejamento|jornada pedagogica') { return 'planejamento' }
  if ($lower -match 'avaliacao|revisao|recuperacao|avalia acre') { return 'avaliacao' }
  if ($lower -match 'reuniao de pais') { return 'reuniao' }
  if ($lower -match 'contra-turno|contra turno|sabado letivo') { return 'reposicao' }
  if ($lower -match 'recesso|inicio do ano letivo|termino do 1o semestre|termino do ano letivo|inicio do 2o semestre') { return 'marco' }
  if ($lower -match 'projeto|mostra|seminario|viver ciencia|violencia contra a mulher') { return 'evento' }
  if ($lower -match 'educacao fisica|pre-enem') { return 'atividade' }
  return 'agenda'
}

function Expand-TokenToDates([string]$token, [int]$year, [int]$month) {
  $clean = Normalize-Text $token
  if (-not $clean) { return @() }

  if ($clean -match '^(?<start>\d{1,2})\s*a\s*(?<end>\d{1,2})$') {
    $dates = @()
    $startDay = [int]$matches.start
    $endDay = [int]$matches.end
    for ($day = $startDay; $day -le $endDay; $day++) {
      $dates += [datetime]::new($year, $month, $day)
    }
    return $dates
  }

  if ($clean -match '^\d+(\.\d+)?$') {
    $number = [double]$clean
    if ($number -gt 1000) {
      $serialDate = Convert-ExcelSerialToDate $number
      if ($serialDate.Year -eq $year -and $serialDate.Month -eq $month) {
        return @($serialDate)
      }
      return @([datetime]::new($year, $month, $serialDate.Day))
    }
    return @([datetime]::new($year, $month, [int]$number))
  }

  $matches = [regex]::Matches($clean, '\d{1,2}')
  if ($matches.Count -gt 0) {
    $dates = @()
    foreach ($match in $matches) {
      $day = [int]$match.Value
      $dates += [datetime]::new($year, $month, $day)
    }
    return $dates
  }

  return @()
}

function New-EventRecord(
  [string]$scope,
  [string]$scopeLabel,
  [string]$title,
  [datetime[]]$dates,
  [string]$rangeText,
  [string]$sourceType,
  [string]$sourceSheet
) {
  if (-not $dates -or $dates.Count -eq 0) { return $null }
  $sorted = $dates | Sort-Object
  $start = $sorted[0]
  $end = $sorted[-1]
  return [ordered]@{
    scope = $scope
    scopeLabel = $scopeLabel
    title = $title.Trim()
    category = Get-Category $title
    start = Convert-ToIsoDate $start
    end = Convert-ToIsoDate $end
    rangeText = $rangeText
    allDay = $true
    sourceType = $sourceType
    sourceSheet = $sourceSheet
  }
}

function Parse-Sheet(
  [System.IO.Compression.ZipArchive]$zip,
  [object[]]$sharedStrings,
  [string]$sheetPath,
  [string]$commentsPath,
  [string]$sheetLabel,
  [string]$scope,
  [string]$scopeLabel
) {
  $doc = Get-XmlDocument $zip $sheetPath
  $ns = New-Object System.Xml.XmlNamespaceManager($doc.NameTable)
  $ns.AddNamespace('x', 'http://schemas.openxmlformats.org/spreadsheetml/2006/main')

  $cells = @{}
  $rows = @{}
  foreach ($cell in $doc.SelectNodes('//x:sheetData/x:row/x:c', $ns)) {
    $ref = [string]$cell.r
    if ($ref -notmatch '^([A-Z]+)(\d+)$') { continue }
    $colLetters = $matches[1]
    $rowNumber = [int]$matches[2]
    $colNumber = Get-ColumnNumber $colLetters
    $type = [string]$cell.t
    $value = ''
    if ($type -eq 's') {
      $value = [string]$sharedStrings[[int]$cell.v]
    } elseif ($type -eq 'str') {
      $value = [string]$cell.v
    } elseif ($type -eq 'inlineStr') {
      $value = [string]$cell.is.t
    } else {
      $value = [string]$cell.v
    }
    $record = [ordered]@{
      ref = $ref
      row = $rowNumber
      col = $colNumber
      value = $value
    }
    $cells[$ref] = $record
    if (-not $rows.ContainsKey($rowNumber)) {
      $rows[$rowNumber] = @{}
    }
    $rows[$rowNumber][$colNumber] = $record
  }

  $commentMap = @{}
  if ($commentsPath) {
    $commentDoc = Get-XmlDocument $zip $commentsPath
    $commentNs = New-Object System.Xml.XmlNamespaceManager($commentDoc.NameTable)
    $commentNs.AddNamespace('x', 'http://schemas.openxmlformats.org/spreadsheetml/2006/main')
    foreach ($comment in $commentDoc.SelectNodes('//x:comment', $commentNs)) {
      $parts = $comment.SelectNodes('.//x:t', $commentNs) | ForEach-Object { $_.InnerText }
      $commentMap[[string]$comment.ref] = (($parts -join '') -replace '\s+', ' ').Trim()
    }
  }

  $summaryTotals = @{}
  foreach ($rowNumber in ($rows.Keys | Sort-Object)) {
    if (-not $rows[$rowNumber].ContainsKey(25) -or -not $rows[$rowNumber].ContainsKey(26)) { continue }
    $summaryLabel = [string]$rows[$rowNumber][25].value
    $summaryNormalized = Normalize-Text $summaryLabel
    if ($summaryNormalized -match '^(Janeiro|Fevereiro|Marco|Abril|Maio|Junho|Julho|Agosto|Setembro|Outubro|Novembro|Dezembro)\s+(\d{4})$') {
      $summaryMonth = $monthMap[$matches[1].ToLowerInvariant()]
      $summaryKey = '{0:D4}-{1:D2}' -f ([int]$matches[2]), $summaryMonth
      $summaryTotals[$summaryKey] = [string]$rows[$rowNumber][26].value
    }
  }

  $headerRows = @()
  foreach ($rowNumber in ($rows.Keys | Sort-Object)) {
    $groupMeta = @{}
    foreach ($group in $groupConfigs) {
      foreach ($col in $group.start..$group.finish) {
        if (-not $rows[$rowNumber].ContainsKey($col)) { continue }
        $value = [string]$rows[$rowNumber][$col].value
        $normalizedValue = Normalize-Text $value
        if ($normalizedValue -match '^(Janeiro|Fevereiro|Marco|Abril|Maio|Junho|Julho|Agosto|Setembro|Outubro|Novembro|Dezembro)\s+(\d{4})$') {
          $monthName = $matches[1]
          $year = [int]$matches[2]
          $month = $monthMap[$monthName.ToLowerInvariant()]
          $groupMeta[$group.index] = [ordered]@{
            year = $year
            month = $month
            monthLabel = $value
            totalDays = if ($rows[$rowNumber].ContainsKey($group.totalCol)) { [string]$rows[$rowNumber][$group.totalCol].value } else { '' }
          }
          break
        }
      }
    }
    if ($groupMeta.Count -gt 0) {
      $headerRows += [ordered]@{
        row = $rowNumber
        groups = $groupMeta
      }
    }
  }

  $events = New-Object System.Collections.Generic.List[object]
  $eventKeys = New-Object System.Collections.Generic.HashSet[string]
  $monthlyTotals = [ordered]@{}

  for ($headerIndex = 0; $headerIndex -lt $headerRows.Count; $headerIndex++) {
    $header = $headerRows[$headerIndex]
    $nextHeaderRow = if ($headerIndex -lt $headerRows.Count - 1) { [int]$headerRows[$headerIndex + 1].row } else { (($rows.Keys | Measure-Object -Maximum).Maximum + 1) }
    $dateRowStart = [int]$header.row + 2
    $dateRowEnd = [int]$header.row + 6
    $eventRowStart = [int]$header.row + 7
    $eventRowEnd = $nextHeaderRow - 1

    foreach ($group in $groupConfigs) {
      if (-not $header.groups.Contains($group.index)) { continue }
      $monthInfo = $header.groups[$group.index]
      $monthKey = '{0:D4}-{1:D2}' -f $monthInfo.year, $monthInfo.month
      $monthlyTotals[$monthKey] = [ordered]@{
        label = $monthInfo.monthLabel
        letivos = if ($monthInfo.totalDays -ne '') { $monthInfo.totalDays } elseif ($summaryTotals.ContainsKey($monthKey)) { $summaryTotals[$monthKey] } else { '' }
      }

      for ($rowNumber = $dateRowStart; $rowNumber -le $dateRowEnd; $rowNumber++) {
        if (-not $rows.ContainsKey($rowNumber)) { continue }
        foreach ($col in $group.start..$group.finish) {
          if (-not $rows[$rowNumber].ContainsKey($col)) { continue }
          $record = $rows[$rowNumber][$col]
          $comment = if ($commentMap.ContainsKey($record.ref)) { $commentMap[$record.ref] } else { '' }
          if (-not $comment) { continue }
          $dates = Expand-TokenToDates $record.value $monthInfo.year $monthInfo.month
          if (-not $dates.Count) { continue }
          $event = New-EventRecord $scope $scopeLabel $comment $dates $record.value 'comment' $sheetLabel
          if (-not $event) { continue }
          $key = '{0}|{1}|{2}' -f $scope, $event.start, (Normalize-Text $event.title).ToLowerInvariant()
          if ($eventKeys.Add($key)) {
            $events.Add($event)
          }
        }
      }

      for ($rowNumber = $eventRowStart; $rowNumber -le $eventRowEnd; $rowNumber++) {
        if (-not $rows.ContainsKey($rowNumber)) { continue }
        if (-not $rows[$rowNumber].ContainsKey($group.descCol)) { continue }
        $description = ([string]$rows[$rowNumber][$group.descCol].value).Trim()
        if (-not $description) { continue }
        $rangeText = if ($rows[$rowNumber].ContainsKey($group.rangeCol)) { [string]$rows[$rowNumber][$group.rangeCol].value } else { '' }
        $dates = Expand-TokenToDates $rangeText $monthInfo.year $monthInfo.month
        if (-not $dates.Count) { continue }
        $event = New-EventRecord $scope $scopeLabel $description $dates $rangeText 'range' $sheetLabel
        if (-not $event) { continue }
        $normalizedTitle = (Normalize-Text $event.title).ToLowerInvariant()
        $key = '{0}|{1}|{2}|{3}' -f $scope, $event.start, $event.end, $normalizedTitle
        if ($eventKeys.Add($key)) {
          $events.Add($event)
        }
      }
    }
  }

  return [ordered]@{
    scope = $scope
    scopeLabel = $scopeLabel
    sheet = $sheetLabel
    monthlyTotals = $monthlyTotals
    events = ($events | Sort-Object start, end, title)
  }
}

$zip = [System.IO.Compression.ZipFile]::OpenRead($WorkbookPath)
try {
  $sharedStrings = Get-SharedStrings $zip

  $regular = Parse-Sheet `
    -zip $zip `
    -sharedStrings $sharedStrings `
    -sheetPath 'xl/worksheets/sheet1.xml' `
    -commentsPath 'xl/comments1.xml' `
    -sheetLabel 'Calendário 2026 - Ensino Fundamental e Médio (1ª e 2ª Série)' `
    -scope 'regular' `
    -scopeLabel 'Fundamental + 1ª e 2ª Série'

  $third = Parse-Sheet `
    -zip $zip `
    -sharedStrings $sharedStrings `
    -sheetPath 'xl/worksheets/sheet2.xml' `
    -commentsPath 'xl/comments2.xml' `
    -sheetLabel 'Calendário 2026 - 3ª Série' `
    -scope 'third' `
    -scopeLabel '3ª Série'
} finally {
  $zip.Dispose()
}

$payload = [ordered]@{
  generatedAt = (Get-Date).ToString('yyyy-MM-ddTHH:mm:ssK')
  workbook = [ordered]@{
    fileName = [System.IO.Path]::GetFileName($WorkbookPath)
    sourcePath = $WorkbookPath
  }
  scopes = [ordered]@{
    regular = $regular
    third = $third
  }
}

$outputDir = Split-Path -Parent $OutputPath
if ($outputDir) {
  New-Item -ItemType Directory -Force -Path $outputDir | Out-Null
}

$json = $payload | ConvertTo-Json -Depth 8
$content = @(
  'window.CASAVEQUIA_CALENDAR_DATA = ' + $json + ';',
  ''
) -join [Environment]::NewLine

Set-Content -LiteralPath $OutputPath -Value $content -Encoding UTF8
Write-Output "Arquivo gerado: $OutputPath"
