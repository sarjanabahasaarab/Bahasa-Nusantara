/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA BUILD SYSTEM - Generator Pemasang & Pencopot Lintas Platform (.sh / .ps1 / .bat)
 * Target Milestone: Phase 23.4 & 23.5 (UTF-8 No-BOM Atomic PowerShell Manifest & .NET SHA-256)
 */

import * as os from 'os';
import { safeCP, safeFS, safePath } from '../compiler/llvm/node-compat';
import { CanonicalDesktopTarget, InstallerSandboxResult, InstallerScriptBundle } from './types';

export interface InstallerGenerationOptions {
  appName: string;
  appVersion: string;
  target: CanonicalDesktopTarget;
  os: 'windows' | 'linux' | 'darwin';
  binRelativePath: string; // misal: bin/program atau bin/program.exe
}

export interface PowerShellDetectionResult {
  found: boolean;
  command?: string;
  kind?: 'powershell.exe' | 'pwsh';
  version?: string;
  platform: NodeJS.Platform;
}

export class DesktopInstallerGenerator {
  public static generate(options: InstallerGenerationOptions): InstallerScriptBundle {
    const appNameAman = options.appName.replace(/[^A-Za-z0-9._-]/g, '_');
    const versiAman = /^[vV]?\\d+\\.\\d+\\.\\d+(?:-[0-9A-Za-z.-]+)?(?:\\+[0-9A-Za-z.-]+)?$/.test(options.appVersion);
    const binPath = options.binRelativePath.replace(/\\\\/g, '/');
    if (
      !appNameAman ||
      !versiAman ||
      !binPath ||
      binPath.startsWith('/') ||
      /^[A-Za-z]:/.test(binPath) ||
      binPath.split('/').some(segmen => !segmen || segmen === '.' || segmen === '..') ||
      !/^[A-Za-z0-9._/-]+$/.test(binPath)
    ) {
      throw new Error('Parameter pemasang tidak aman: nama aplikasi, versi SemVer, atau jalur biner tidak valid.');
    }
    options = { ...options, appName: appNameAman, binRelativePath: binPath };

    if (options.os === 'windows') {
      return {
        target: options.target,
        os: 'windows',
        files: [
          {
            name: 'install.ps1',
            content: this.generateWindowsPowerShellInstall(options),
            mode: 0o755,
          },
          {
            name: 'uninstall.ps1',
            content: this.generateWindowsPowerShellUninstall(options),
            mode: 0o755,
          },
          {
            name: 'install.bat',
            content: this.generateWindowsBatchInstall(options),
            mode: 0o755,
          },
          {
            name: 'uninstall.bat',
            content: this.generateWindowsBatchUninstall(options),
            mode: 0o755,
          },
        ],
      };
    }

    return {
      target: options.target,
      os: options.os,
      files: [
        {
          name: 'install.sh',
          content: this.generatePosixInstallSh(options),
          mode: 0o755,
        },
        {
          name: 'uninstall.sh',
          content: this.generatePosixUninstallSh(options),
          mode: 0o755,
        },
      ],
    };
  }

  private static generatePosixInstallSh(options: InstallerGenerationOptions): string {
    const binName = safePath.basename(options.binRelativePath);
    const appSafe = options.appName.replace(/[^A-Za-z0-9._-]/g, '_');

    return `#!/bin/sh
# Pemasang Resmi Aplikasi NUSANTARA (${options.appName} ${options.appVersion} - ${options.target})
set -eu

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
APP_NAME="${appSafe}"
APP_VERSION="${options.appVersion}"
BIN_REL="${options.binRelativePath}"
BIN_NAME="${binName}"
PREFIX="\${HOME}/.nusantara"
ADD_PATH=1
QUIET=0

while [ "$#" -gt 0 ]; do
  case "$1" in
    --prefix)
      shift
      [ "$#" -gt 0 ] || { echo "[GALAT] --prefix memerlukan nilai direktori" >&2; exit 2; }
      PREFIX="$1"
      ;;
    --prefix=*)
      PREFIX="\${1#*=}"
      ;;
    --no-path)
      ADD_PATH=0
      ;;
    -y|--yes|--quiet)
      QUIET=1
      ;;
    -h|--help)
      echo "Pemakaian: sh install.sh [--prefix <dir>] [--no-path] [-y]"
      exit 0
      ;;
    *)
      echo "[GALAT] Opsi tidak dikenal: $1" >&2
      exit 2
      ;;
  esac
  shift
done

[ -n "$PREFIX" ] || { echo "[GALAT] Prefix tidak boleh kosong" >&2; exit 2; }
[ -f "$SCRIPT_DIR/$BIN_REL" ] || { echo "[GALAT] Biner tidak ditemukan: $SCRIPT_DIR/$BIN_REL" >&2; exit 1; }
[ -f "$SCRIPT_DIR/SHA256SUMS" ] || { echo "[GALAT] Berkas integritas SHA256SUMS tidak ditemukan" >&2; exit 1; }

compute_sha256() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$1" | awk '{print tolower($1)}'
  elif command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$1" | awk '{print tolower($1)}'
  elif command -v openssl >/dev/null 2>&1; then
    openssl dgst -sha256 "$1" | awk '{print tolower($NF)}'
  else
    echo "[GALAT] Tidak ada utilitas sha256sum/shasum/openssl di sistem." >&2
    return 1
  fi
}

# Verifikasi SHA256SUMS sebelum memodifikasi target prefix
VERIFIED_COUNT=0
while IFS= read -r line || [ -n "$line" ]; do
  [ -n "$line" ] || continue
  EXPECTED_HASH="$(printf '%s' "$line" | awk '{print tolower($1)}')"
  REL_FILE="$(printf '%s' "$line" | sed -e 's/^[0-9a-fA-F]*[[:space:]]*//' -e 's/^\\*//')"
  [ -n "$EXPECTED_HASH" ] && [ -n "$REL_FILE" ] || continue
  TARGET_PATH="$SCRIPT_DIR/$REL_FILE"
  if [ ! -f "$TARGET_PATH" ]; then
    echo "[GALAT] Berkas paket hilang saat verifikasi checksum: $REL_FILE" >&2
    exit 1
  fi
  ACTUAL_HASH="$(compute_sha256 "$TARGET_PATH")"
  if [ "$ACTUAL_HASH" != "$EXPECTED_HASH" ]; then
    echo "[GALAT] Checksum SHA-256 tidak cocok untuk $REL_FILE (diharapkan=$EXPECTED_HASH, aktual=$ACTUAL_HASH)" >&2
    exit 1
  fi
  VERIFIED_COUNT=$((VERIFIED_COUNT + 1))
done < "$SCRIPT_DIR/SHA256SUMS"

if [ "$VERIFIED_COUNT" -le 0 ]; then
  echo "[GALAT] SHA256SUMS kosong atau tidak memverifikasi berkas apa pun." >&2
  exit 1
fi

BACKUP_DIR="$(mktemp -d "\${TMPDIR:-/tmp}/nusa-install-backup-XXXXXX")"
INSTALLED_BIN="$PREFIX/bin/$BIN_NAME"
INSTALLED_MANIFEST="$PREFIX/share/$APP_NAME/manifest.json"
RECEIPT_FILE="$PREFIX/.nusantara-install-$APP_NAME.manifest"

TMP_BIN=""
cleanup_on_fail() {
  rc="$?"
  if [ "$rc" -ne 0 ]; then
    echo "[PERINGATAN] Instalasi gagal, melakukan rollback atomik..." >&2
    if [ -n "$TMP_BIN" ]; then
      rm -f "$TMP_BIN" 2>/dev/null || true
    fi
    if [ -f "$BACKUP_DIR/prev_bin" ]; then
      cp -f "$BACKUP_DIR/prev_bin" "$INSTALLED_BIN" 2>/dev/null || true
    else
      rm -f "$INSTALLED_BIN" 2>/dev/null || true
    fi
    if [ -f "$BACKUP_DIR/prev_manifest" ]; then
      cp -f "$BACKUP_DIR/prev_manifest" "$INSTALLED_MANIFEST" 2>/dev/null || true
    else
      rm -f "$INSTALLED_MANIFEST" 2>/dev/null || true
    fi
  fi
  rm -rf "$BACKUP_DIR"
  exit "$rc"
}
trap cleanup_on_fail EXIT HUP INT TERM

mkdir -p "$PREFIX/bin" "$PREFIX/lib" "$PREFIX/share/$APP_NAME"
if [ -f "$INSTALLED_BIN" ]; then
  cp -f "$INSTALLED_BIN" "$BACKUP_DIR/prev_bin"
fi
if [ -f "$INSTALLED_MANIFEST" ]; then
  cp -f "$INSTALLED_MANIFEST" "$BACKUP_DIR/prev_manifest"
fi

TMP_BIN="$PREFIX/bin/.$BIN_NAME.tmp.$$"
cp -f "$SCRIPT_DIR/$BIN_REL" "$TMP_BIN"
chmod 755 "$TMP_BIN"
mv -f "$TMP_BIN" "$INSTALLED_BIN"
TMP_BIN=""

if [ -d "$SCRIPT_DIR/lib" ]; then
  for f in "$SCRIPT_DIR/lib/"*; do
    [ -e "$f" ] || continue
    cp -f "$f" "$PREFIX/lib/"
  done
fi

if [ -f "$SCRIPT_DIR/manifest.json" ]; then
  if [ -d "$INSTALLED_MANIFEST" ]; then
    echo "[GALAT] Jalur tujuan manifest.json adalah direktori: $INSTALLED_MANIFEST" >&2
    exit 1
  fi
  cp -f "$SCRIPT_DIR/manifest.json" "$INSTALLED_MANIFEST"
fi

if [ -f "$SCRIPT_DIR/uninstall.sh" ]; then
  DEST_UNINSTALL="$PREFIX/share/$APP_NAME/uninstall.sh"
  if [ -d "$DEST_UNINSTALL" ]; then
    echo "[GALAT] Jalur tujuan uninstall.sh adalah direktori: $DEST_UNINSTALL" >&2
    exit 1
  fi
  cp -f "$SCRIPT_DIR/uninstall.sh" "$DEST_UNINSTALL"
  chmod 755 "$DEST_UNINSTALL"
fi

RC_UPDATED=""
if [ "$ADD_PATH" -eq 1 ]; then
  PATH_LINE="export PATH=\\"$PREFIX/bin:\\$PATH\\""
  for rc_cand in "\${HOME}/.profile" "\${HOME}/.bashrc" "\${HOME}/.zshrc"; do
    if [ -f "$rc_cand" ] || [ "$rc_cand" = "\${HOME}/.profile" ]; then
      MARKER_BEGIN="# >>> NUSANTARA $APP_NAME PATH >>>"
      MARKER_END="# <<< NUSANTARA $APP_NAME PATH <<<"
      if ! grep -Fq "$MARKER_BEGIN" "$rc_cand" 2>/dev/null; then
        printf '\\n%s\\n%s\\n%s\\n' "$MARKER_BEGIN" "$PATH_LINE" "$MARKER_END" >> "$rc_cand"
        RC_UPDATED="$RC_UPDATED $rc_cand"
      fi
    fi
  done
fi

cat > "$RECEIPT_FILE" <<EOF
{
  "appName": "$APP_NAME",
  "appVersion": "$APP_VERSION",
  "target": "${options.target}",
  "prefix": "$PREFIX",
  "installedBin": "$INSTALLED_BIN",
  "installedManifest": "$INSTALLED_MANIFEST",
  "rcFiles": "$RC_UPDATED"
}
EOF

trap - EXIT HUP INT TERM
rm -rf "$BACKUP_DIR"

if [ "$QUIET" -eq 0 ]; then
  echo "[SUKSES] $APP_NAME ($APP_VERSION) berhasil dipasang di: $INSTALLED_BIN"
fi
exit 0
`;
  }

  private static generatePosixUninstallSh(options: InstallerGenerationOptions): string {
    const binName = safePath.basename(options.binRelativePath);
    const appSafe = options.appName.replace(/[^A-Za-z0-9._-]/g, '_');

    return `#!/bin/sh
# Pencopot Resmi Aplikasi NUSANTARA (${options.appName} - ${options.target})
set -eu

APP_NAME="${appSafe}"
BIN_NAME="${binName}"
PREFIX="\${HOME}/.nusantara"

while [ "$#" -gt 0 ]; do
  case "$1" in
    --prefix)
      shift
      [ "$#" -gt 0 ] || { echo "[GALAT] --prefix memerlukan nilai direktori" >&2; exit 2; }
      PREFIX="$1"
      ;;
    --prefix=*)
      PREFIX="\${1#*=}"
      ;;
    -y|--yes|--quiet)
      ;;
    *)
      echo "[GALAT] Opsi tidak dikenal: $1" >&2
      exit 2
      ;;
  esac
  shift
done

rm -f "$PREFIX/bin/$BIN_NAME"
rm -rf "$PREFIX/share/$APP_NAME"
rm -f "$PREFIX/.nusantara-install-$APP_NAME.manifest"

MARKER_BEGIN="# >>> NUSANTARA $APP_NAME PATH >>>"
MARKER_END="# <<< NUSANTARA $APP_NAME PATH <<<"

for rc_cand in "\${HOME}/.profile" "\${HOME}/.bashrc" "\${HOME}/.zshrc"; do
  if [ -f "$rc_cand" ] && grep -Fq "$MARKER_BEGIN" "$rc_cand" 2>/dev/null; then
    TMP_RC="$(mktemp "\${TMPDIR:-/tmp}/nusa-rc-XXXXXX")"
    awk -v b="$MARKER_BEGIN" -v e="$MARKER_END" '
      $0 == b { skip=1; next }
      $0 == e { skip=0; next }
      !skip { print }
    ' "$rc_cand" > "$TMP_RC"
    mv -f "$TMP_RC" "$rc_cand"
  fi
done

echo "[SUKSES] $APP_NAME berhasil dicopot dari $PREFIX"
exit 0
`;
  }

  private static generateWindowsPowerShellInstall(options: InstallerGenerationOptions): string {
    const binName = safePath.basename(options.binRelativePath);
    const binWinRel = options.binRelativePath.replace(/\//g, '\\');
    const appSafe = options.appName.replace(/[^A-Za-z0-9._-]/g, '_');

    return `# Pemasang Resmi Aplikasi NUSANTARA (${options.appName} ${options.appVersion} - ${options.target})
param(
  [string]$Prefix = "$env:LOCALAPPDATA\\Nusantara",
  [switch]$NoPath,
  [switch]$Quiet
)

$ErrorActionPreference = 'Stop'
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$AppName = '${appSafe}'
$AppVersion = '${options.appVersion}'
$TargetId = '${options.target}'
$BinRel = '${binWinRel}'
$BinName = '${binName}'

if ([string]::IsNullOrWhiteSpace($Prefix)) {
  Write-Error "[GALAT] Parameter -Prefix tidak boleh kosong."
  exit 2
}

$SourceBin = Join-Path $ScriptDir $BinRel
$SumsPath = Join-Path $ScriptDir 'SHA256SUMS'
$PkgManifestSource = Join-Path $ScriptDir 'manifest.json'

if (-not (Test-Path -LiteralPath $SourceBin)) {
  Write-Error "[GALAT] Berkas executable paket tidak ditemukan: $SourceBin"
  exit 1
}
if (-not (Test-Path -LiteralPath $SumsPath)) {
  Write-Error "[GALAT] Berkas checksum SHA256SUMS tidak ditemukan: $SumsPath"
  exit 1
}

function Get-NusantaraFileSha256Hex {
  param([Parameter(Mandatory = $true)][string]$FilePath)
  $Sha256 = [System.Security.Cryptography.SHA256]::Create()
  $Stream = $null
  try {
    $Stream = [System.IO.File]::OpenRead($FilePath)
    $HashBytes = $Sha256.ComputeHash($Stream)
    return ([System.BitConverter]::ToString($HashBytes) -replace '-', '').ToLowerInvariant()
  } finally {
    if ($null -ne $Stream) {
      $Stream.Dispose()
    }
    $Sha256.Dispose()
  }
}

function Write-NusantaraUtf8NoBomAtomic {
  param(
    [Parameter(Mandatory = $true)][string]$DestinationPath,
    [Parameter(Mandatory = $true)][string]$Content
  )
  $ParentDir = Split-Path -Parent $DestinationPath
  if (-not [string]::IsNullOrWhiteSpace($ParentDir)) {
    New-Item -ItemType Directory -Force -Path $ParentDir | Out-Null
  }
  $TempPath = "$DestinationPath.tmp.$PID"
  $Utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($TempPath, $Content, $Utf8NoBom)
  Move-Item -LiteralPath $TempPath -Destination $DestinationPath -Force
}

# Verifikasi SHA256SUMS menggunakan .NET SHA256 sebelum menyentuh $Prefix
$VerifiedCount = 0
$SumLines = Get-Content -LiteralPath $SumsPath -Encoding UTF8
foreach ($Line in $SumLines) {
  $Trimmed = $Line.Trim()
  if ([string]::IsNullOrWhiteSpace($Trimmed) -or $Trimmed.StartsWith('#')) {
    continue
  }
  if ($Trimmed -notmatch '^([0-9a-fA-F]{64})\\s+\\*?(.+)$') {
    Write-Error "[GALAT] Format baris SHA256SUMS tidak valid: $Trimmed"
    exit 1
  }
  $ExpectedHash = $Matches[1].ToLowerInvariant()
  $RelFile = ($Matches[2].Trim() -replace '/', '\\')
  $TargetFile = Join-Path $ScriptDir $RelFile
  if (-not (Test-Path -LiteralPath $TargetFile)) {
    Write-Error "[GALAT] Berkas paket hilang saat verifikasi integritas: $RelFile"
    exit 1
  }
  $ActualHash = Get-NusantaraFileSha256Hex -FilePath $TargetFile
  if ($ActualHash -ne $ExpectedHash) {
    Write-Error "[GALAT] Checksum SHA-256 tidak cocok untuk $RelFile (diharapkan=$ExpectedHash, aktual=$ActualHash)"
    exit 1
  }
  $VerifiedCount++
}

if ($VerifiedCount -le 0) {
  Write-Error "[GALAT] Berkas SHA256SUMS kosong atau tidak memiliki entri valid."
  exit 1
}

$BinDir = Join-Path $Prefix 'bin'
$LibDir = Join-Path $Prefix 'lib'
$ShareDir = Join-Path (Join-Path $Prefix 'share') $AppName
$DestBin = Join-Path $BinDir $BinName
$DestPkgManifest = Join-Path $ShareDir 'manifest.json'
$ReceiptPath = Join-Path $Prefix ".$AppName-install-manifest.json"

$BackupBin = "$DestBin.bak.$PID"
$BackupManifest = "$DestPkgManifest.bak.$PID"
$HadPrevBin = Test-Path -LiteralPath $DestBin
$HadPrevManifest = Test-Path -LiteralPath $DestPkgManifest

try {
  New-Item -ItemType Directory -Force -Path $BinDir | Out-Null
  New-Item -ItemType Directory -Force -Path $LibDir | Out-Null
  New-Item -ItemType Directory -Force -Path $ShareDir | Out-Null

  if ($HadPrevBin) {
    Copy-Item -LiteralPath $DestBin -Destination $BackupBin -Force
  }
  if ($HadPrevManifest) {
    Copy-Item -LiteralPath $DestPkgManifest -Destination $BackupManifest -Force
  }

  $TempBin = "$DestBin.tmp.$PID"
  Copy-Item -LiteralPath $SourceBin -Destination $TempBin -Force
  Move-Item -LiteralPath $TempBin -Destination $DestBin -Force

  $SourceLibDir = Join-Path $ScriptDir 'lib'
  if (Test-Path -LiteralPath $SourceLibDir) {
    $LibItems = Get-ChildItem -LiteralPath $SourceLibDir -File -ErrorAction SilentlyContinue
    if ($null -ne $LibItems) {
      foreach ($Item in $LibItems) {
        Copy-Item -LiteralPath $Item.FullName -Destination (Join-Path $LibDir $Item.Name) -Force
      }
    }
  }

  if (Test-Path -LiteralPath $PkgManifestSource) {
    Copy-Item -LiteralPath $PkgManifestSource -Destination $DestPkgManifest -Force
  }

  $UninstallSrc = Join-Path $ScriptDir 'uninstall.ps1'
  if (Test-Path -LiteralPath $UninstallSrc) {
    Copy-Item -LiteralPath $UninstallSrc -Destination (Join-Path $ShareDir 'uninstall.ps1') -Force
  }

  $PathUpdated = $false
  if (-not $NoPath) {
    $UserPath = [Environment]::GetEnvironmentVariable('Path', 'User')
    if ($null -eq $UserPath) { $UserPath = '' }
    $Segments = @($UserPath -split ';' | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
    $HasBin = $false
    foreach ($Seg in $Segments) {
      if ($Seg.TrimEnd('\\').Equals($BinDir.TrimEnd('\\'), [System.StringComparison]::OrdinalIgnoreCase)) {
        $HasBin = $true
        break
      }
    }
    if (-not $HasBin) {
      $NewPath = ($Segments + @($BinDir)) -join ';'
      [Environment]::SetEnvironmentVariable('Path', $NewPath, 'User')
      $PathUpdated = $true
    }
  }

  $ReceiptObj = [ordered]@{
    appName = $AppName
    appVersion = $AppVersion
    target = $TargetId
    prefix = $Prefix
    binPath = $DestBin
    packageManifestPath = $DestPkgManifest
    pathUpdated = $PathUpdated
    verifiedFilesCount = $VerifiedCount
    installedAt = [DateTime]::UtcNow.ToString('o')
  }
  $ReceiptJson = $ReceiptObj | ConvertTo-Json -Depth 4
  Write-NusantaraUtf8NoBomAtomic -DestinationPath $ReceiptPath -Content ($ReceiptJson + "\`n")

  if (Test-Path -LiteralPath $BackupBin) { Remove-Item -LiteralPath $BackupBin -Force -ErrorAction SilentlyContinue }
  if (Test-Path -LiteralPath $BackupManifest) { Remove-Item -LiteralPath $BackupManifest -Force -ErrorAction SilentlyContinue }
} catch {
  if ($HadPrevBin -and (Test-Path -LiteralPath $BackupBin)) {
    Move-Item -LiteralPath $BackupBin -Destination $DestBin -Force -ErrorAction SilentlyContinue
  } elseif (-not $HadPrevBin -and (Test-Path -LiteralPath $DestBin)) {
    Remove-Item -LiteralPath $DestBin -Force -ErrorAction SilentlyContinue
  }
  if ($HadPrevManifest -and (Test-Path -LiteralPath $BackupManifest)) {
    Move-Item -LiteralPath $BackupManifest -Destination $DestPkgManifest -Force -ErrorAction SilentlyContinue
  }
  Write-Error "[GALAT] Instalasi gagal dan rollback selesai: $($_.Exception.Message)"
  exit 1
}

if (-not $Quiet) {
  Write-Output "[SUKSES] $AppName ($AppVersion) berhasil dipasang di: $DestBin"
}
exit 0
`;
  }

  private static generateWindowsPowerShellUninstall(options: InstallerGenerationOptions): string {
    const binName = safePath.basename(options.binRelativePath);
    const appSafe = options.appName.replace(/[^A-Za-z0-9._-]/g, '_');

    return `# Pencopot Resmi Aplikasi NUSANTARA (${options.appName} - ${options.target})
param(
  [string]$Prefix = "$env:LOCALAPPDATA\\Nusantara",
  [switch]$NoPath,
  [switch]$Quiet
)

$ErrorActionPreference = 'Stop'
$AppName = '${appSafe}'
$BinName = '${binName}'

if ([string]::IsNullOrWhiteSpace($Prefix)) {
  Write-Error "[GALAT] Parameter -Prefix tidak boleh kosong."
  exit 2
}

$BinDir = Join-Path $Prefix 'bin'
$DestBin = Join-Path $BinDir $BinName
$ShareDir = Join-Path (Join-Path $Prefix 'share') $AppName
$ReceiptPath = Join-Path $Prefix ".$AppName-install-manifest.json"

if (Test-Path -LiteralPath $DestBin) {
  Remove-Item -LiteralPath $DestBin -Force
}
if (Test-Path -LiteralPath $ShareDir) {
  Remove-Item -LiteralPath $ShareDir -Recurse -Force
}
if (Test-Path -LiteralPath $ReceiptPath) {
  Remove-Item -LiteralPath $ReceiptPath -Force
}

if (-not $NoPath) {
  $UserPath = [Environment]::GetEnvironmentVariable('Path', 'User')
  if (-not [string]::IsNullOrWhiteSpace($UserPath)) {
    $Filtered = @($UserPath -split ';' | Where-Object {
      (-not [string]::IsNullOrWhiteSpace($_)) -and
      (-not $_.TrimEnd('\\').Equals($BinDir.TrimEnd('\\'), [System.StringComparison]::OrdinalIgnoreCase))
    })
    [Environment]::SetEnvironmentVariable('Path', ($Filtered -join ';'), 'User')
  }
}

if (-not $Quiet) {
  Write-Output "[SUKSES] $AppName berhasil dicopot dari: $Prefix"
}
exit 0
`;
  }

  private static generateWindowsBatchInstall(options: InstallerGenerationOptions): string {
    return `@echo off\r\nsetlocal\r\nwhere pwsh >nul 2>&1\r\nif %errorlevel%==0 (\r\n  pwsh -NoProfile -ExecutionPolicy Bypass -File "%~dp0install.ps1" %*\r\n  exit /b %errorlevel%\r\n)\r\npowershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install.ps1" %*\r\nexit /b %errorlevel%\r\n`;
  }

  private static generateWindowsBatchUninstall(options: InstallerGenerationOptions): string {
    return `@echo off\r\nsetlocal\r\nwhere pwsh >nul 2>&1\r\nif %errorlevel%==0 (\r\n  pwsh -NoProfile -ExecutionPolicy Bypass -File "%~dp0uninstall.ps1" %*\r\n  exit /b %errorlevel%\r\n)\r\npowershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0uninstall.ps1" %*\r\nexit /b %errorlevel%\r\n`;
  }

  public static detectWindowsPowerShell(): PowerShellDetectionResult {
    const candidates: Array<{ cmd: string; kind: 'powershell.exe' | 'pwsh' }> = [];

    if (process.platform === 'win32') {
      const sysRoot = process.env.SystemRoot || 'C:\\Windows';
      const winPsFull = safePath.join(sysRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
      if (safeFS.existsSync(winPsFull)) {
        candidates.push({ cmd: winPsFull, kind: 'powershell.exe' });
      }
      candidates.push({ cmd: 'powershell.exe', kind: 'powershell.exe' });
      candidates.push({ cmd: 'pwsh.exe', kind: 'pwsh' });
    } else {
      candidates.push({ cmd: 'pwsh', kind: 'pwsh' });
    }

    for (const cand of candidates) {
      try {
        const res = safeCP.spawnSync(
          cand.cmd,
          ['-NoProfile', '-NonInteractive', '-Command', '$PSVersionTable.PSVersion.ToString()'],
          { encoding: 'utf-8', timeout: 8000, shell: false }
        );
        if (res.status === 0 && res.stdout && res.stdout.trim()) {
          return {
            found: true,
            command: cand.cmd,
            kind: cand.kind,
            version: res.stdout.trim().split(/\r?\n/)[0].trim(),
            platform: process.platform,
          };
        }
      } catch {
        // lanjut kandidat berikutnya
      }
    }

    return {
      found: false,
      platform: process.platform,
    };
  }

  public static runPosixScriptInSandbox(
    packageDir: string,
    scriptName: 'install.sh' | 'uninstall.sh',
    prefixDir: string,
    fakeHomeDir: string
  ): InstallerSandboxResult {
    const scriptPath = safePath.join(packageDir, scriptName);
    if (!safeFS.existsSync(scriptPath)) {
      return {
        success: false,
        exitCode: 1,
        stdout: '',
        stderr: `Skrip tidak ditemukan: ${scriptPath}`,
      };
    }

    const res = safeCP.spawnSync(
      'sh',
      [scriptPath, '--prefix', prefixDir, '-y'],
      {
        encoding: 'utf-8',
        timeout: 20000,
        shell: false,
        env: {
          ...process.env,
          HOME: fakeHomeDir,
          TMPDIR: os.tmpdir(),
        },
      }
    );

    return {
      success: res.status === 0,
      exitCode: res.status,
      stdout: res.stdout || '',
      stderr: res.stderr || '',
      shellUsed: 'sh',
    };
  }

  public static runWindowsScriptInSandbox(
    packageDir: string,
    scriptName: 'install.ps1' | 'uninstall.ps1',
    prefixDir: string,
    options: { noPath?: boolean; quiet?: boolean } = {}
  ): InstallerSandboxResult {
    const ps = this.detectWindowsPowerShell();
    if (!ps.found || !ps.command) {
      return {
        success: false,
        skipped: true,
        exitCode: null,
        stdout: '',
        stderr: '',
        reason: 'PowerShell (powershell.exe / pwsh) tidak tersedia pada host saat ini.',
      };
    }

    const scriptPath = safePath.join(packageDir, scriptName);
    if (!safeFS.existsSync(scriptPath)) {
      return {
        success: false,
        exitCode: 1,
        stdout: '',
        stderr: `Skrip PowerShell tidak ditemukan: ${scriptPath}`,
        shellUsed: ps.command,
        shellVersion: ps.version,
      };
    }

    const psArgs: string[] = ['-NoProfile', '-NonInteractive'];
    if (process.platform === 'win32') {
      psArgs.push('-ExecutionPolicy', 'Bypass');
    }
    psArgs.push('-File', scriptPath, '-Prefix', prefixDir);
    if (options.noPath !== false) {
      psArgs.push('-NoPath');
    }
    if (options.quiet) {
      psArgs.push('-Quiet');
    }

    const res = safeCP.spawnSync(ps.command, psArgs, {
      encoding: 'utf-8',
      // PowerShell cold-start dan .NET crypto provider pada runner ARM64 dapat
      // memerlukan waktu lebih lama; timeout terlalu pendek memberi exit tanpa
      // diagnostik dan membuat sandbox installer gagal secara nondeterministik.
      timeout: 120000,
      shell: false,
    });

    const diagnostic = res.error
      ? (res.error.message || String(res.error))
      : '';
    return {
      success: res.status === 0,
      exitCode: res.status,
      stdout: res.stdout || '',
      stderr: [res.stderr || '', diagnostic].filter(Boolean).join('\\n'),
      shellUsed: ps.command,
      shellVersion: ps.version,
    };
  }
}
