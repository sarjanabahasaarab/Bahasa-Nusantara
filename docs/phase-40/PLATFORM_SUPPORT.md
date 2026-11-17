# Dukungan Platform Phase 40 — Mobile Application Distribution

| Target / Subsistem | Status Verifikasi Lokal | Catatan Pembuktian |
|---|---|---|
| **Bundler APK & AAB PKZIP + CRC-32 (Standalone Engine)** | `TERVERIFIKASI (LULUS)` | Dihasilkan sebagai PKZIP sah (`ZipBuilder`) dan lulus `python3 zipfile.testzip()` serta verifikasi SHA-256 + `SHA256SUMS` |
| **Persiapan Bundle & Plist iOS (`.xcarchive`, `ExportOptions.plist`)** | `TERVERIFIKASI (LULUS)` | Struktur direktori archive, `Info.plist`, & checklist App Store dihasilkan di host Linux |
| **CLI `nusantara mobile distribusi` & `std:mobile`** | `TERVERIFIKASI (LULUS)` | Seluruh sub-perintah & demo `.nusantara` (`distribution_demo`), 100/100 uji lulus |
| **Kompilasi Native Android (`ANDROID_HOME`, `javac`, `gradle`, `aapt2`, `d8`, `apksigner`)** | `BELUM DIVERIFIKASI` | Toolchain Android SDK & JDK tidak terpasang di lingkungan uji kontainer Linux |
| **Kompilasi Native iOS (`.ipa` & `xcodebuild` / Provisioning MacOS)** | `BELUM DIVERIFIKASI` | Host berjalan di `linux`, bukan macOS dengan Xcode terpasang |
