# motion-promo-reels installer (Windows PowerShell 5.1+ / PowerShell 7)
#
#   irm https://raw.githubusercontent.com/david-d2c2/motion-promo-reels/main/install.ps1 | iex
#
# With options (chosen folder, project folder, replace):
#   & ([scriptblock]::Create((irm https://raw.githubusercontent.com/david-d2c2/motion-promo-reels/main/install.ps1))) -Dir "D:\skills"
#   & ([scriptblock]::Create((irm https://raw.githubusercontent.com/david-d2c2/motion-promo-reels/main/install.ps1))) -Project
#   & ([scriptblock]::Create((irm https://raw.githubusercontent.com/david-d2c2/motion-promo-reels/main/install.ps1))) -Force
#
#   -Dir PATH   skills folder to install into (the skill goes in PATH\motion-promo-reels)
#   -Project    install into .\.claude\skills of the current folder
#   -Force      replace an existing installation
#   -Version    tag to install (default: latest)
param(
  [string]$Dir,
  [switch]$Project,
  [switch]$Force,
  [string]$Version = 'latest'
)

$ErrorActionPreference = 'Stop'
$Name = 'motion-promo-reels'
$Repo = 'david-d2c2/motion-promo-reels'

if ($Project) { $Parent = Join-Path (Join-Path (Get-Location).Path '.claude') 'skills' }
elseif ($Dir) { $Parent = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($Dir) }
else {
  $UserHome = if ($env:USERPROFILE) { $env:USERPROFILE } else { $HOME }
  $Parent = Join-Path (Join-Path $UserHome '.claude') 'skills'
}
$Dest = Join-Path $Parent $Name

if ($Version -eq 'latest') { $Url = "https://github.com/$Repo/releases/latest/download/$Name.zip" }
else { $Url = "https://github.com/$Repo/releases/download/$Version/$Name.zip" }

if ((Test-Path -LiteralPath $Dest) -and -not $Force) {
  Write-Host "Already installed at $Dest"
  Write-Host 'Run again with -Force to replace it.'
  return
}

$Tmp = Join-Path ([System.IO.Path]::GetTempPath()) ("$Name-" + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $Tmp | Out-Null
try {
  [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12
  $Zip = Join-Path $Tmp 'skill.zip'
  Write-Host "Downloading $Url"
  $ProgressPreference = 'SilentlyContinue'
  Invoke-WebRequest -Uri $Url -OutFile $Zip -UseBasicParsing
  Expand-Archive -LiteralPath $Zip -DestinationPath (Join-Path $Tmp 'x') -Force
  $Src = Join-Path (Join-Path $Tmp 'x') $Name
  if (-not (Test-Path -LiteralPath (Join-Path $Src 'SKILL.md'))) { throw "Unexpected package layout: $Name\SKILL.md not found" }

  New-Item -ItemType Directory -Path $Parent -Force | Out-Null
  if (Test-Path -LiteralPath $Dest) { Remove-Item -LiteralPath $Dest -Recurse -Force }
  Move-Item -LiteralPath $Src -Destination $Dest

  Write-Host "Installed: $Dest"
  Write-Host 'Restart Claude Code (or open a new session) and ask: "make a promo reel for this product".'
  Write-Host 'Rendering needs Node 18+, ffmpeg, Python 3 (numpy, scipy) and Chrome or Edge. See README.md.'
}
finally {
  Remove-Item -LiteralPath $Tmp -Recurse -Force -ErrorAction SilentlyContinue
}
