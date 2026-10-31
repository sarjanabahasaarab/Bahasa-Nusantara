# Distribusi & Pengemasan Aplikasi Desktop NUSANTARA

Dokumen ini memuat panduan pengemasan dan distribusi aplikasi desktop NUSANTARA ke sistem operasi Windows, Linux, dan macOS.

---

## 1. Arsitektur Distribusi Cross-Platform

Aplikasi desktop NUSANTARA didistribusikan bersama runtime NUSANTARA dan host webview platform target:

| Platform | Format Distribusi | Komponen Webview Native |
| :--- | :--- | :--- |
| **Windows** | `.msi`, `.exe` (Installer / Portable) | Microsoft Edge WebView2 (Bawaan Windows 10/11) |
| **Linux** | `.deb`, `.AppImage`, `.flatpak` | WebKitGTK (`libwebkit2gtk-4.0` / `4.1`) |
| **macOS** | `.dmg`, `.app` bundle | Apple WebKit (WKWebView native) |

---

## 2. Struktur Proyek Desktop Siap Rilis

```text
proyek-kasir/
├── nusantara-project.json
├── README.md
├── src/
│   ├── utama.nusantara
│   ├── ui/
│   └── data/
├── assets/
│   ├── icons/
│   │   ├── icon.ico   # Windows
│   │   ├── icon.png   # Linux
│   │   └── icon.icns  # macOS
│   └── splash.png
└── build/
```

---

## 3. Perintah Build & Eksekusi

### Menguji Aplikasi di Lingkungan Pengembangan
```bash
nusantara jalankan src/utama.nusantara
```

### Memeriksa Sintaks dan Validasi Tipe
```bash
nusantara check
```

### Mengompilasi Proyek untuk Distribusi
```bash
nusantara build --target=desktop --platform=windows
nusantara build --target=desktop --platform=linux
nusantara build --target=desktop --platform=macos
```

---

## 4. Keamanan & Sandbox

Aplikasi desktop yang dibangun dengan GUI Framework NUSANTARA berjalan di bawah lapisan pengamanan:
1. **Isolasi Konteks (Context Isolation)**: UI visual tidak memiliki akses mentah langsung ke kernel sistem operasi tanpa melalui API resmi bahasa NUSANTARA.
2. **IPC Aman**: Pesan komunikasi antar-proses divalidasi dan dienkode secara ketat melalui `JembatanDesktopWebview`.
3. **Penyimpanan Data Lokal**: Data disimpan di direktori data aplikasi standar sistem operasi (`%APPDATA%` di Windows, `~/.config` di Linux, `~/Library/Application Support` di macOS).
