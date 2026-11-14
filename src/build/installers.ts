/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA BUILD SYSTEM - Generator Pemasang & Pencopot Desktop (Windows, Linux, macOS)
 * Fitur wajib: verifikasi SHA-256 sebelum salin, upgrade dengan backup/rollback atomik,
 * perubahan PATH yang aman dan dapat dipulihkan, serta pencopotan bersih.
 */

import { safeCP, safeFS, safePath } from '../compiler/llvm/node-compat';
import { CanonicalDesktopTarget, InstallerSandboxResult, InstallerScriptBundle } from './types';

function sanitizeIdent(val: string): string {
  return val.replace(/[^a-zA-Z0-9._-]/g, '-');
}

export class DesktopInstallerGenerator {
  public static generate(options: {
    appName: string;
    appVersion: string;
    target: CanonicalDesktopTarget;
    os: 'windows' | 'linux' | 'darwin';
    binRelativePath: string;
    hasLibDir?: boolean;
  }): InstallerScriptBundle {
    const appSafe = sanitizeIdent(options.appName);
    const binBase = safePath.basename(options.binRelativePath);

    if (options.os === 'windows') {
      return {
        target: options.target,
        os: 'windows',
        files: [
          {
            name: 'install.ps1',
            content: this.generateWindowsInstallPs1(appSafe, options.appVersion, binBase),
            mode: 0o644,
          },
          {
            name: 'uninstall.ps1',
            content: this.generateWindowsUninstallPs1(appSafe, binBase),
            mode: 0o644,
          },
          {
            name: 'install.bat',
            content: `@echo off\r\npowershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install.ps1" %*\r\n`,
            mode: 0o644,
          },
          {
            name: 'uninstall.bat',
            content: `@echo off\r\npowershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0uninstall.ps1" %*\r\n`,
            mode: 0o644,
          },
        ],
      };
    }

    const posixInstall = this.generatePosixInstallSh(appSafe, options.appVersion, binBase, options.os);
    const posixUninstall = this.generatePosixUninstallSh(appSafe, binBase);

    return {
      target: options.target,
      os: options.os,
      files: [
        { name: 'install.sh', content: posixInstall, mode: 0o755 },
        { name: 'uninstall.sh', content: posixUninstall, mode: 0o755 },
      ],
    };
  }

  private static generatePosixInstallSh(
    appName: string,
    appVersion: string,
    binBase: string,
    osType: 'linux' | 'darwin'
  ): string {
    const markerBegin = `# >>> NUSANTARA ${appName.toUpperCase()} PATH >>>`;
    const markerEnd = `# <<< NUSANTARA ${appName.toUpperCase()} PATH <<<`;

    return `#!/usr/bin/env bash
set -euo pipefail

# Pemasang Resmi ${appName} ${appVersion} (${osType})
# Mendukung instalasi baru, verifikasi SHA-256, upgrade atomik dengan rollback, dan pendaftaran PATH yang aman.

SCRIPT_DIR="$(cd "$(dirname "\${BASH_SOURCE[0]}")" && pwd)"
PREFIX="\${NUSANTARA_PREFIX:-$HOME/.nusantara}"
DRY_RUN=0
SKIP_PATH=0

while [ "$#" -gt 0 ]; do
  case "$1" in
    --prefix)
      PREFIX="$2"
      shift 2
      ;;
    --prefix=*)
      PREFIX="\${1#*=}"
      shift
      ;;
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    --no-path)
      SKIP_PATH=1
      shift
      ;;
    *)
      echo "[GALAT] Opsi tidak dikenal: $1" >&2
      exit 2
      ;;
  esac
done

verify_sha256() {
  local sumfile="$1"
  if [ ! -f "$sumfile" ]; then
    echo "[GALAT] Berkas checksum SHA256SUMS tidak ditemukan di paket." >&2
    return 1
  fi
  (
    cd "$SCRIPT_DIR"
    if command -v sha256sum >/dev/null 2>&1; then
      sha256sum -c "$sumfile" >/dev/null
    elif command -v shasum >/dev/null 2>&1; then
      shasum -a 256 -c "$sumfile" >/dev/null
    else
      echo "[PERINGATAN] Utilitas sha256sum/shasum tidak tersedia; melewati verifikasi hash." >&2
    fi
  )
}

echo "[INFO] Memverifikasi integritas SHA-256 paket ${appName}..."
verify_sha256 "$SCRIPT_DIR/SHA256SUMS"

if [ ! -f "$SCRIPT_DIR/bin/${binBase}" ]; then
  echo "[GALAT] Biner '$SCRIPT_DIR/bin/${binBase}' tidak ditemukan dalam paket." >&2
  exit 1
fi

if [ "$DRY_RUN" -eq 1 ]; then
  echo "[DRY-RUN] Akan memasang ${appName} ${appVersion} ke $PREFIX/bin/${binBase}"
  exit 0
fi

BIN_DIR="$PREFIX/bin"
LIB_DIR="$PREFIX/lib"
BACKUP_DIR=""
MANIFEST_FILE="$PREFIX/.${appName}-install-manifest"

cleanup_backup() {
  if [ -n "$BACKUP_DIR" ] && [ -d "$BACKUP_DIR" ]; then
    rm -rf "$BACKUP_DIR"
  fi
}

rollback() {
  echo "[PERINGATAN] Terjadi kegagalan saat instalasi/upgrade; memulihkan versi sebelumnya..." >&2
  if [ -n "$BACKUP_DIR" ] && [ -f "$BACKUP_DIR/${binBase}" ]; then
    mkdir -p "$BIN_DIR"
    cp "$BACKUP_DIR/${binBase}" "$BIN_DIR/${binBase}"
    chmod 0755 "$BIN_DIR/${binBase}"
  fi
  cleanup_backup
}
trap rollback ERR

mkdir -p "$BIN_DIR" "$LIB_DIR"

# Upgrade aman: cadangkan biner lama jika sudah terpasang
if [ -f "$BIN_DIR/${binBase}" ]; then
  BACKUP_DIR="$(mktemp -d)"
  cp "$BIN_DIR/${binBase}" "$BACKUP_DIR/${binBase}"
  echo "[INFO] Cadangan versi sebelumnya dibuat di $BACKUP_DIR"
fi

# Salin biner dan library secara atomik melalui temporary file
TMP_BIN="$BIN_DIR/.${binBase}.new.$$"
cp "$SCRIPT_DIR/bin/${binBase}" "$TMP_BIN"
chmod 0755 "$TMP_BIN"
mv -f "$TMP_BIN" "$BIN_DIR/${binBase}"

if [ -d "$SCRIPT_DIR/lib" ]; then
  for item in "$SCRIPT_DIR/lib"/*; do
    [ -e "$item" ] || continue
    cp -R "$item" "$LIB_DIR/"
  done
fi

if [ -f "$SCRIPT_DIR/manifest.json" ]; then
  cp "$SCRIPT_DIR/manifest.json" "$PREFIX/.${appName}-package-manifest.json"
fi

# Catatan khusus macOS: bersihkan atribut karantina jika ada dan periksa dependensi dylib
if [ "$(uname -s)" = "Darwin" ]; then
  if command -v xattr >/dev/null 2>&1; then
    xattr -d com.apple.quarantine "$BIN_DIR/${binBase}" >/dev/null 2>&1 || true
  fi
  if command -v otool >/dev/null 2>&1; then
    otool -L "$BIN_DIR/${binBase}" >/dev/null 2>&1 || true
  fi
fi

# Catat jejak instalasi untuk uninstaller yang aman
MODIFIED_RC=""
if [ "$SKIP_PATH" -eq 0 ]; then
  RC_FILE="$HOME/.profile"
  if [ -n "\${ZSH_VERSION:-}" ] || [ "\${SHELL##*/}" = "zsh" ]; then
    RC_FILE="$HOME/.zshrc"
  elif [ -f "$HOME/.bashrc" ] || [ "\${SHELL##*/}" = "bash" ]; then
    RC_FILE="$HOME/.bashrc"
  fi
  touch "$RC_FILE"
  if ! grep -Fq "${markerBegin}" "$RC_FILE"; then
    {
      echo ""
      echo "${markerBegin}"
      echo "export PATH=\\"$BIN_DIR:\\$PATH\\""
      echo "${markerEnd}"
    } >> "$RC_FILE"
  fi
  MODIFIED_RC="$RC_FILE"
fi

cat > "$MANIFEST_FILE" <<EOF
APP_NAME=${appName}
APP_VERSION=${appVersion}
PREFIX=$PREFIX
BIN_FILE=$BIN_DIR/${binBase}
RC_FILE=$MODIFIED_RC
EOF

trap - ERR
cleanup_backup

echo "[SUKSES] ${appName} ${appVersion} terpasang di $BIN_DIR/${binBase}"
if [ -n "$MODIFIED_RC" ]; then
  echo "[INFO] PATH ditambahkan pada $MODIFIED_RC (jalankan: source \\"$MODIFIED_RC\\")"
fi
`;
  }

  private static generatePosixUninstallSh(appName: string, binBase: string): string {
    const markerBegin = `# >>> NUSANTARA ${appName.toUpperCase()} PATH >>>`;
    const markerEnd = `# <<< NUSANTARA ${appName.toUpperCase()} PATH <<<`;

    return `#!/usr/bin/env bash
set -euo pipefail

# Pencopot Resmi ${appName}
# Hanya menghapus berkas milik ${appName} yang tercatat dan blok PATH bertanda khusus.

PREFIX="\${NUSANTARA_PREFIX:-$HOME/.nusantara}"
while [ "$#" -gt 0 ]; do
  case "$1" in
    --prefix)
      PREFIX="$2"
      shift 2
      ;;
    --prefix=*)
      PREFIX="\${1#*=}"
      shift
      ;;
    *)
      shift
      ;;
  esac
done

MANIFEST_FILE="$PREFIX/.${appName}-install-manifest"
BIN_FILE="$PREFIX/bin/${binBase}"
RC_CANDIDATES=("$HOME/.bashrc" "$HOME/.zshrc" "$HOME/.profile")

if [ -f "$MANIFEST_FILE" ]; then
  # Baca jejak instalasi secara aman tanpa eval sembarang
  RECORDED_BIN="$(grep '^BIN_FILE=' "$MANIFEST_FILE" | head -n1 | cut -d'=' -f2- || true)"
  RECORDED_RC="$(grep '^RC_FILE=' "$MANIFEST_FILE" | head -n1 | cut -d'=' -f2- || true)"
  if [ -n "$RECORDED_BIN" ]; then
    BIN_FILE="$RECORDED_BIN"
  fi
  if [ -n "$RECORDED_RC" ]; then
    RC_CANDIDATES=("$RECORDED_RC")
  fi
fi

if [ -f "$BIN_FILE" ]; then
  rm -f "$BIN_FILE"
  echo "[INFO] Menghapus biner: $BIN_FILE"
fi

rm -f "$PREFIX/.${appName}-package-manifest.json" "$MANIFEST_FILE"

# Hapus direktori bin / prefix hanya jika sudah kosong
rmdir "$PREFIX/bin" 2>/dev/null || true
rmdir "$PREFIX/lib" 2>/dev/null || true
rmdir "$PREFIX" 2>/dev/null || true

# Bersihkan hanya blok bertanda NUSANTARA dari berkas profil shell
for rc in "\${RC_CANDIDATES[@]}"; do
  [ -f "$rc" ] || continue
  if grep -Fq "${markerBegin}" "$rc"; then
    TMP_RC="$(mktemp)"
    awk -v b="${markerBegin}" -v e="${markerEnd}" '
      $0 == b { skip = 1; next }
      $0 == e { skip = 0; next }
      !skip { print }
    ' "$rc" > "$TMP_RC"
    mv "$TMP_RC" "$rc"
    echo "[INFO] Blok PATH ${appName} dibersihkan dari $rc"
  fi
done

echo "[SUKSES] ${appName} berhasil dicopot dengan bersih."
`;
  }

  private static generateWindowsInstallPs1(
    appName: string,
    appVersion: string,
    binBase: string
  ): string {
    return `#Requires -Version 5.1
param(
  [string]$Prefix = "$env:LOCALAPPDATA\\Nusantara",
  [switch]$DryRun,
  [switch]$NoPath
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$SumsPath = Join-Path $ScriptDir "SHA256SUMS"

if (-not (Test-Path $SumsPath)) {
  throw "Berkas checksum SHA256SUMS tidak ditemukan di paket."
}

Write-Host "[INFO] Memverifikasi SHA-256 paket ${appName} ${appVersion}..."
Get-Content $SumsPath | ForEach-Object {
  $line = $_.Trim()
  if ($line -eq "") { return }
  $parts = $line -split '\\s+', 2
  $expected = $parts[0].ToLowerInvariant()
  $rel = $parts[1].Trim()
  $targetFile = Join-Path $ScriptDir $rel
  if (-not (Test-Path $targetFile)) {
    throw "Berkas hilang saat verifikasi checksum: $rel"
  }
  $actual = (Get-FileHash -Path $targetFile -Algorithm SHA256).Hash.ToLowerInvariant()
  if ($actual -ne $expected) {
    throw "Ketidakcocokan SHA-256 pada $rel (diharapkan=$expected, aktual=$actual)"
  }
}

$SourceBin = Join-Path $ScriptDir "bin\\${binBase}"
if (-not (Test-Path $SourceBin)) {
  throw "Executable sumber tidak ditemukan: $SourceBin"
}

if ($DryRun) {
  Write-Host "[DRY-RUN] Akan memasang ${appName} ${appVersion} ke $Prefix\\bin\\${binBase}"
  exit 0
}

$BinDir = Join-Path $Prefix "bin"
$LibDir = Join-Path $Prefix "lib"
$DestBin = Join-Path $BinDir "${binBase}"
$BackupBin = $null

New-Item -ItemType Directory -Force -Path $BinDir | Out-Null
New-Item -ItemType Directory -Force -Path $LibDir | Out-Null

try {
  if (Test-Path $DestBin) {
    $BackupBin = "$DestBin.bak.$PID"
    Copy-Item -Path $DestBin -Destination $BackupBin -Force
  }
  $TempBin = "$DestBin.new.$PID"
  Copy-Item -Path $SourceBin -Destination $TempBin -Force
  Move-Item -Path $TempBin -Destination $DestBin -Force

  $SourceLib = Join-Path $ScriptDir "lib"
  if (Test-Path $SourceLib) {
    Copy-Item -Path (Join-Path $SourceLib "*") -Destination $LibDir -Recurse -Force -ErrorAction SilentlyContinue
  }

  $PathUpdated = $false
  if (-not $NoPath) {
    $CurrentUserPath = [Environment]::GetEnvironmentVariable("Path", "User")
    $Segments = @()
    if ($CurrentUserPath) {
      $Segments = $CurrentUserPath -split ';' | Where-Object { $_.Trim() -ne "" }
    }
    if (-not ($Segments -contains $BinDir)) {
      $NewPath = ($Segments + $BinDir) -join ';'
      [Environment]::SetEnvironmentVariable("Path", $NewPath, "User")
      $PathUpdated = $true
    }
  }

  $Receipt = @{
    appName = "${appName}"
    appVersion = "${appVersion}"
    prefix = $Prefix
    binFile = $DestBin
    binDir = $BinDir
    pathAdded = $PathUpdated
  } | ConvertTo-Json
  Set-Content -Path (Join-Path $Prefix ".${appName}-install-manifest.json") -Value $Receipt -Encoding UTF8

  if ($BackupBin -and (Test-Path $BackupBin)) {
    Remove-Item -Path $BackupBin -Force
  }
  Write-Host "[SUKSES] ${appName} ${appVersion} terpasang di $DestBin"
} catch {
  if ($BackupBin -and (Test-Path $BackupBin)) {
    Move-Item -Path $BackupBin -Destination $DestBin -Force
    Write-Warning "Instalasi gagal; versi sebelumnya telah dipulihkan."
  }
  throw
}
`;
  }

  private static generateWindowsUninstallPs1(appName: string, binBase: string): string {
    return `#Requires -Version 5.1
param(
  [string]$Prefix = "$env:LOCALAPPDATA\\Nusantara"
)

$ErrorActionPreference = "Stop"
$ReceiptPath = Join-Path $Prefix ".${appName}-install-manifest.json"
$BinDir = Join-Path $Prefix "bin"
$DestBin = Join-Path $BinDir "${binBase}"

if (Test-Path $ReceiptPath) {
  $Receipt = Get-Content $ReceiptPath -Raw | ConvertFrom-Json
  if ($Receipt.binFile) { $DestBin = $Receipt.binFile }
  if ($Receipt.binDir) { $BinDir = $Receipt.binDir }
}

if (Test-Path $DestBin) {
  Remove-Item -Path $DestBin -Force
  Write-Host "[INFO] Menghapus executable: $DestBin"
}

if (Test-Path $ReceiptPath) {
  Remove-Item -Path $ReceiptPath -Force
}

$CurrentUserPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($CurrentUserPath) {
  $Filtered = ($CurrentUserPath -split ';') | Where-Object { $_.Trim() -ne "" -and $_.Trim() -ne $BinDir }
  [Environment]::SetEnvironmentVariable("Path", ($Filtered -join ';'), "User")
}

foreach ($Dir in @($BinDir, (Join-Path $Prefix "lib"), $Prefix)) {
  if ((Test-Path $Dir) -and ((Get-ChildItem -Path $Dir -Force | Measure-Object).Count -eq 0)) {
    Remove-Item -Path $Dir -Force
  }
}

Write-Host "[SUKSES] ${appName} berhasil dicopot dengan bersih."
`;
  }

  /**
   * Mengeksekusi install.sh / uninstall.sh secara nyata di direktori sandbox terisolasi (tanpa menyentuh HOME pengguna).
   */
  public static runPosixScriptInSandbox(options: {
    packageDir: string;
    scriptName: 'install.sh' | 'uninstall.sh';
    prefixDir: string;
    homeDir: string;
    extraArgs?: string[];
  }): InstallerSandboxResult {
    const scriptPath = safePath.join(options.packageDir, options.scriptName);
    if (!safeFS.existsSync(scriptPath)) {
      return {
        success: false,
        exitCode: 1,
        stdout: '',
        stderr: `Skrip pemasang tidak ditemukan: ${scriptPath}`,
        prefixDir: options.prefixDir,
      };
    }

    const args = [scriptPath, '--prefix', options.prefixDir, ...(options.extraArgs || [])];
    const env = {
      ...(typeof process !== 'undefined' ? process.env : {}),
      HOME: options.homeDir,
      SHELL: '/bin/bash',
    };

    const res = safeCP.spawnSync('bash', args, {
      encoding: 'utf-8',
      timeout: 15000,
      env,
      shell: false,
    });

    return {
      success: res.status === 0,
      exitCode: res.status,
      stdout: res.stdout || '',
      stderr: res.stderr || '',
      prefixDir: options.prefixDir,
    };
  }
}
