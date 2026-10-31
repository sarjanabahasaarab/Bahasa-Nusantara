# Referensi GUI Framework NUSANTARA (Fase 36)

GUI Framework NUSANTARA adalah kerangka kerja grafis lintas platform yang dirancang untuk membangun aplikasi desktop berperforma tinggi, aman, dan mudah dipelihara menggunakan bahasa pemrograman NUSANTARA (`.nusantara`).

---

## 1. Arsitektur & Filosofi Desain

Framework ini dibangun di atas arsitektur modular yang memisahkan tanggung jawab:
- **Core Application**: Siklus hidup aplikasi (`DIBUAT`, `MEMULAI`, `BERJALAN`, `BERHENTI`, `DIHANCURKAN`), manajemen jendela (`JendelaGUI`), dan konteks aplikasi (`KonteksAplikasiGUI`).
- **Event Loop & Asynchronous Dispatch**: Penjadwalan tick non-blocking yang aman dari kebocoran memori (memory leak).
- **Pohon Widget Reaktif**: Representasi hierarki komponen visual pohon objek (`Widget`) dengan kemampuan serialisasi untuk backend host.
- **Sistem Layout Responsif**: Komposisi wadah dinamis (`Kolom`, `Baris`, `Grid`, `Stack`, `Gulir`) yang menyesuaikan ukuran jendela secara otomatis.
- **Tema & Aksesibilitas Terintegrasi**: Skema warna terang/gelap/kontras tinggi dengan peran ARIA dan navigasi keyboard.

---

## 2. Pemilihan Backend Host (Desktop Webview & Native Host Adapter)

Setelah mengevaluasi alternatif Qt, GTK, wxWidgets, dan Tauri:
- **Backend Terpilih**: **Desktop Webview / Host Adapter Architecture** (sejalan dengan filosofi Tauri dan native system webview: WebView2 di Windows, WebKitGTK di Linux, WKWebView di macOS).
- **Keunggulan**:
  1. Ukuran biner ringan karena memanfaatkan runtime webview bawaan OS.
  2. Bebas dari kendala lisensi ketat (kompatibel penuh dengan lisensi open-source Apache-2.0).
  3. Mendukung eksekusi tanpa layar (*headless mode*) untuk pengujian otomatis di server CI/CD.
  4. Batasan keamanan yang kuat (*sandboxing*) antara logika bahasa NUSANTARA dan antarmuka visual.

---

## 3. Modul Standar & Alias Resmi

Modul GUI didaftarkan secara resmi di pustaka standar NUSANTARA (`std:gui`) dan dapat diimpor dengan alias berikut:

```nusantara
gunakan "gui" sebagai ui
// atau
gunakan "antarmuka" sebagai ui
// atau
gunakan "desktop" sebagai ui
// atau
gunakan "ui" sebagai ui
```

---

## 4. Struktur Modul di Repositori

```text
src/gui/
├── core/
│   ├── application.ts
│   ├── application_context.ts
│   ├── event_loop.ts
│   ├── lifecycle.ts
│   └── window.ts
├── widgets/
│   ├── base.ts
│   ├── button.ts
│   ├── checkbox.ts
│   ├── image.ts
│   ├── label.ts
│   ├── list.ts
│   ├── progress.ts
│   ├── radio_button.ts
│   ├── select.ts
│   ├── slider.ts
│   ├── tab.ts
│   ├── table.ts
│   ├── text_area.ts
│   └── text_input.ts
├── layout/
│   ├── column.ts
│   ├── container.ts
│   ├── grid.ts
│   ├── row.ts
│   ├── scroll.ts
│   └── stack.ts
├── events/
│   ├── callback.ts
│   ├── event.ts
│   └── event_handler.ts
├── styling/
│   ├── colors.ts
│   ├── theme.ts
│   └── typography.ts
├── dialogs/
│   └── dialog.ts
├── menus/
│   └── menu.ts
├── forms/
│   └── form_validator.ts
├── platform/
│   ├── adapter.ts
│   ├── bridge.ts
│   └── headless.ts
└── accessibility/
    └── a11y.ts
```
