# Konfigurasi & Pengaturan IDE NUSANTARA

IDE NUSANTARA menyediakan sistem konfigurasi persisten yang tersimpan di `localStorage` peramban dengan fallback memori yang aman.

---

## 1. Skema Pengaturan (`PengaturanIDE`)

```json
{
  "editor": {
    "ukuranFont": 14,
    "ukuranTab": 4,
    "bungkusBaris": true,
    "minimap": true,
    "simpanOtomatis": true,
    "formatSaatSimpan": true,
    "tampilkanNomorBaris": true
  },
  "bahasa": {
    "lspAktif": true,
    "diagnostikLangsung": true,
    "autocompleteAktif": true,
    "hoverAktif": true
  },
  "debug": {
    "berhentiPadaGalat": true,
    "bukaPanelDebugOtomatis": true
  },
  "tampilan": {
    "tema": "dark",
    "bahasa": "id"
  }
}
```

---

## 2. Kustomisasi Tema & Bahasa

- **Tema Tampilan**:
  - `dark`: Tema gelap elegan berbasis palet slate dan indigo untuk kenyamanan mata jangka panjang.
  - `light`: Tema terang dengan kontras tinggi.
  - `system`: Menyesuaikan preferensi sistem operasi pengguna.
- **Bahasa Antarmuka (i18n)**:
  - `id`: Bahasa Indonesia resmi sesuai terminologi baku NUSANTARA.
  - `en`: English untuk kolaborasi global.
