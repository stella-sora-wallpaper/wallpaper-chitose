param(
  [string]$GameRoot = "D:\App\YostarGames\StellaSora_EN",
  [string]$Vgmstream = "vgmstream-cli",
  [string]$Ffmpeg = "ffmpeg",
  [ValidateSet("cn", "jp")]
  [string]$Locale = "cn"
)

$ErrorActionPreference = "Stop"

$sourceDirectory = Join-Path $GameRoot "Persistent_Store\SoundBanks"
$destinationDirectory = Join-Path $PSScriptRoot "..\public\assets\chitose-live2d\audio"
$voiceIds = "a", "b", "c", "d", "e", "f", "g"

if (!(Test-Path -LiteralPath $sourceDirectory -PathType Container)) {
  throw "Stella Sora SoundBanks directory was not found: $sourceDirectory"
}

if (!(Get-Command $Ffmpeg -ErrorAction SilentlyContinue)) {
  throw "ffmpeg was not found. Install it or pass -Ffmpeg with its executable path."
}

if (!(Get-Command $Vgmstream -ErrorAction SilentlyContinue)) {
  throw "vgmstream-cli was not found. Install vgmstream or pass -Vgmstream with its executable path."
}

New-Item -ItemType Directory -Force -Path $destinationDirectory | Out-Null

foreach ($voiceId in $voiceIds) {
  $source = Join-Path $sourceDirectory "vo_cgstory_144_${voiceId}_${Locale}.wem"
  $destination = Join-Path $destinationDirectory "vo_cgstory_144_${voiceId}_${Locale}.ogg"
  $decodedWave = Join-Path $env:TEMP "stella-sora-vo_cgstory_144_${voiceId}_${Locale}.wav"
  if (!(Test-Path -LiteralPath $source -PathType Leaf)) {
    throw "The installed client has not downloaded this $Locale voice line: $source"
  }

  Remove-Item -LiteralPath $decodedWave -Force -ErrorAction Ignore
  & $Vgmstream -o $decodedWave $source
  if ($LASTEXITCODE -ne 0 -or !(Test-Path -LiteralPath $decodedWave -PathType Leaf)) {
    throw "vgmstream-cli failed while decoding $source"
  }

  & $Ffmpeg -y -v error -i $decodedWave -c:a libvorbis -q:a 5 $destination
  Remove-Item -LiteralPath $decodedWave -Force -ErrorAction Ignore
  if ($LASTEXITCODE -ne 0 -or !(Test-Path -LiteralPath $destination -PathType Leaf)) {
    throw "ffmpeg failed while converting $source"
  }
}

Get-ChildItem -LiteralPath $destinationDirectory -Filter "vo_cgstory_144_*_${Locale}.ogg" |
  Sort-Object Name |
  Select-Object Name, Length
