param(
  [Parameter(Mandatory=$true)][string]$Revision,
  [Parameter(Mandatory=$true)][ValidatePattern('^\d+\.\d+\.\d+$')][string]$Version,
  [Parameter(Mandatory=$true)][string]$Title
)
$ErrorActionPreference = 'Stop'
$repo = Split-Path $PSScriptRoot -Parent
$outputPath = Join-Path $repo "历史版本/星港拾荒者-v$Version.zip"
# Archives are generated from tracked files only, never from local session data.
git -C $repo archive --format=zip --output=$outputPath $Revision -- . ':(exclude)历史版本'
if ($LASTEXITCODE -ne 0) { throw 'git archive failed' }
Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive = [IO.Compression.ZipFile]::Open($outputPath, [IO.Compression.ZipArchiveMode]::Update)
try {
  # Intermediate source checkpoints retain the previous index metadata.
  # Normalize only entry-point metadata and cache keys in the generated package.
  $entry = $archive.GetEntry('index.html')
  $reader = [IO.StreamReader]::new($entry.Open())
  $content = $reader.ReadToEnd()
  $reader.Dispose()
  $content = [regex]::Replace($content, 'stellar-game-version" content="[^"]+"', "stellar-game-version`" content=`"$Version`"")
  $content = [regex]::Replace($content, 'stellar-release-title" content="[^"]+"', "stellar-release-title`" content=`"$Title`"")
  $content = [regex]::Replace($content, '<title>[^<]+</title>', "<title>星港拾荒者 v$Version · $Title</title>")
  $content = [regex]::Replace($content, '\?v=\d+\.\d+\.\d+', "?v=$Version")
  $content = [regex]::Replace($content, '航站协议 v\d+\.\d+\.\d+ · [^<]+', "航站协议 v$Version · $Title")
  $stream = $entry.Open()
  $stream.SetLength(0)
  $writer = [IO.StreamWriter]::new($stream, [Text.UTF8Encoding]::new($false))
  $writer.Write($content)
  $writer.Dispose()
} finally { $archive.Dispose() }
Write-Output "Archived v$Version from $Revision"
