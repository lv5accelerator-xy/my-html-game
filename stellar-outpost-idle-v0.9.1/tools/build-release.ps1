[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$sourceRoot = Join-Path $projectRoot "source"
$sourceHtmlPath = Join-Path $sourceRoot "index.html"
$sourceCssPath = Join-Path $sourceRoot "styles.css"
$sourceMathPath = Join-Path $sourceRoot "game-math.js"
$sourceGamePath = Join-Path $sourceRoot "game.js"
$sourceStarportPath = Join-Path $sourceRoot "assets\starport.png"
$releaseFile = Get-ChildItem -LiteralPath $projectRoot -File -Filter "*.html" |
  Select-Object -First 1
if (-not $releaseFile) {
  throw "Release HTML file was not found in the project root."
}
$releasePath = $releaseFile.FullName

$html = Get-Content -Raw -Encoding UTF8 -LiteralPath $sourceHtmlPath
$css = Get-Content -Raw -Encoding UTF8 -LiteralPath $sourceCssPath
$math = Get-Content -Raw -Encoding UTF8 -LiteralPath $sourceMathPath
$game = Get-Content -Raw -Encoding UTF8 -LiteralPath $sourceGamePath
$starportBase64 = [Convert]::ToBase64String(
  [IO.File]::ReadAllBytes($sourceStarportPath)
)

$styleTag = "    <style>`r`n$($css.Trim())`r`n    </style>"
$mathTag = "    <script>`r`n$($math.Trim())`r`n    </script>"
$gameTag = "    <script>`r`n$($game.Trim())`r`n    </script>"

$release = $html.Replace(
  '    <link rel="stylesheet" href="styles.css" />',
  $styleTag
)
$release = $release.Replace(
  '    <script src="game-math.js"></script>',
  $mathTag
)
$release = $release.Replace(
  '    <script src="game.js"></script>',
  $gameTag
)
$release = $release.Replace(
  'src="assets/starport.png"',
  "src=`"data:image/png;base64,$starportBase64`""
)

if (
  $release.Contains('href="styles.css"') -or
  $release.Contains('src="game-math.js"') -or
  $release.Contains('src="game.js"') -or
  $release.Contains('src="assets/starport.png"')
) {
  throw "Release build still contains source file references."
}

[IO.File]::WriteAllText(
  $releasePath,
  $release,
  [Text.UTF8Encoding]::new($false)
)

Write-Output "Built: $releasePath"
