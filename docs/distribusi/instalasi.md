# Panduan Instalasi, Upgrade & Pencopotan Desktop (Phase 23)

Setiap arsip distribusi yang dibuat oleh `DesktopDistributionPackager` menyertakan skrip pemasang (*installer*) dan pencopot (*uninstaller*) resmi dari `src/build/installers.ts`.

## 1. Linux & macOS (`install.sh` / `uninstall.sh`)

```bash
# Ekstrak arsip
tar -xzf <app>-<versi>-linux-x64.tar.gz
cd <app>-<versi>-linux-x64

# Verifikasi checksum SHA-256 manual (opsional; install.sh juga mengecek otomatis)
sha256sum -c SHA256SUMS   # atau 'shasum -a 256 -c SHA256SUMS' di macOS

# Pasang ke direktori default ($HOME/.nusantara) atau prefix kustom
./install.sh --prefix "$HOME/.nusantara"

# Simulasi tanpa perubahan sistem
./install.sh --dry-run
```

### Keamanan Upgrade & Rollback
- Jika `<prefix>/bin/<app>` sudah terpasang, `install.sh` otomatis mencadangkan versi lama ke direktori sementara sebelum mengganti berkas secara atomik. Bila penyalinan gagal, trap `ERR` memulihkan biner lama.
- Pada macOS, pemasang membersihkan atribut karantina (`com.apple.quarantine`) bila ada dan mendukung pemeriksaan `otool -L`.

### Pencopotan (`uninstall.sh`)
```bash
./uninstall.sh --prefix "$HOME/.nusantara"
```
Skrip hanya menghapus berkas milik aplikasi sesuai jejak `.install-manifest` serta menghapus blok `# >>> NUSANTARA <APP> PATH >>>` pada `.bashrc`/`.zshrc`/`.profile` tanpa menyentuh konfigurasi shell pribadi lain.

## 2. Windows (`install.ps1` / `uninstall.ps1`)

```powershell
Expand-Archive <app>-<versi>-windows-x64.zip -DestinationPath .\<app>
cd .\<app>
powershell -ExecutionPolicy Bypass -File .\install.ps1
```

Pencopotan bersih:
```powershell
powershell -ExecutionPolicy Bypass -File .\uninstall.ps1
```
Pemasang memverifikasi setiap entri `SHA256SUMS` memakai `Get-FileHash -Algorithm SHA256`, memperbarui `Path` level User secara terpisah per segmen `;`, dan mencadangkan executable sebelum menimpa pada saat upgrade.
