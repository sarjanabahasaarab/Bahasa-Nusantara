# Spesifikasi API & CLI Desktop GUI (Phase 36)

## 1. Pustaka Standar NUSANTARA (`gunakan "gui" sebagai ui`)
- **Aplikasi & Jendela:**
  - `ui.buatAplikasi(opsi?)` -> `{ id, nama, buatJendela(opsi), setTema(nama), jalankan(), berhenti(), hancurkan() }`
  - `ui.buatJendela(opsi)` -> `{ id, judul, lebar, tinggi, setKonten(w), setJudul(t), setBilahMenu(bm), setBilahAlat(ba), ubahUkuran(l, t), maksimalkan(), minimalkan(), pulihkan(), layarPenuh(), sembunyikan(), tampilkan(), setIkon(path), tutup(), serialisasi(), pasang(evt, fn) }`
- **Widget & Tata Letak:**
  - `buatLabel`, `buatTombol`, `buatInputTeks`, `buatAreaTeks`, `buatKotakCentang`, `buatTombolRadio`, `buatPilihan`, `buatDaftar`, `buatTabel`, `buatGambar`, `buatProgres`, `buatSlider`, `buatTab`
  - `buatWadah`, `buatBaris`, `buatKolom`, `buatGrid`, `buatStack`, `buatGulir`
- **Menu, Dialog, Tema & Validasi:**
  - `buatBilahMenu`, `buatBilahAlat`, `buatMenu`, `buatItemMenu`, `buatPemisahMenu`
  - `tampilkanPesan`, `tampilkanKonfirmasi`, `bukaBerkas`, `simpanBerkas`
  - `aturTema(nama)`, `dapatkanTema()`, `buatFormValidator()`

## 2. API TypeScript (`src/gui/index.ts`)
- `MesinTataLetak`: `hitungTataLetakJendela(jendela)`, `ukurIntrinsik(widget, lebar)`, `cariNodePadaTitik(node, x, y)`.
- `KanvasFramebuffer`: `isiPersegi`, `gambarGarisPersegi`, `isiLingkaran`, `gambarTeks`, `eksporBMP()`, `eksporPPM()`, `hitungHashFNV1a()`.
- `PerenderDesktop`: `renderKeFramebuffer(jendela, opsi)`, `renderKeSVG(jendela, opsi)`, `renderKeHTML(jendela, wsUrl?, opsi)`.
- `PengelolaInputGUI`: `klikMouse(x, y)`, `gerakMouse(x, y)`, `tekanTombol(kunci, mod)`.
- `AdaptorDesktopWebviewServer`: `inisialisasi(konfig)`, `bukaJendela(jendela)`, `perbaruiTampilan(jendela)`, `hancurkan()`, `getUrlAktif()`.
- `PengemasAplikasiDesktop`: `kemas(opsi)` dan `verifikasiBundel(dirBundel)`.

## 3. Antarmuka CLI (`nusantara desktop`)
- `nusantara desktop check [--json]`
- `nusantara desktop render [<file>] [--format=bmp|ppm|svg|html] [--out=<path>]`
- `nusantara desktop package [<file>] [--target=linux|windows|macos] [--out=<dir>] [--json]`
- `nusantara desktop run [<file>]`
