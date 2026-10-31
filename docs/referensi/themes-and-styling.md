# Tema & Penataan Gaya GUI NUSANTARA

GUI Framework NUSANTARA menyertakan sistem tema deklaratif yang mendukung standar aksesibilitas kontras tinggi dan mode gelap (*dark mode*).

---

## 1. Skema Tema Resmi

Terdapat 4 tema bawaan:
- **`terang`** (Bawaan): Palet netral putih dan abu-abu terang dengan kontras tinggi untuk siang hari.
- **`gelap`**: Palet bernuansa slate gelap (`#0f172a`) yang ramah mata untuk pencahayaan rendah.
- **`kontras_tinggi`**: Dirancang untuk standar aksesibilitas WCAG AAA dengan latar hitam pekat dan warna batas yang sangat kontras.
- **`sistem`**: Mengikuti preferensi tema dari sistem operasi pengguna.

---

## 2. Mengubah Tema Aplikasi

Mengubah tema secara global:
```nusantara
ui.aturTema("gelap")

definisi temaAktif = ui.dapatkanTema()
tampilkan("Tema saat ini: " + temaAktif)
```

Melalui instance aplikasi:
```nusantara
aplikasi.setTema("kontras_tinggi")
```

---

## 3. Penataan Gaya Komponen (`GayaWidget`)

Setiap widget mendukung objek gaya melalui `.setGaya()`:

```nusantara
definisi kartu = ui.buatWadah({
    gaya: {
        lebar: 320,
        padding: 16,
        warnaLatar: "#ffffff",
        warnaBorder: "#e2e8f0",
        ketebalanBorder: 1,
        radiusSudut: 8
    }
})
```

### Properti Gaya yang Didukung:
- `lebar`, `tinggi`: Dimensi ukuran piksel atau persentase.
- `lebarMin`, `tinggiMin`, `lebarMaks`, `tinggiMaks`: Batas ukuran fleksibel.
- `padding`, `margin`: Jarak ruang dalam dan luar.
- `warnaLatar`: Kode warna heksadesimal atau RGBA.
- `warnaTeks`: Warna teks konten widget.
- `warnaBorder`, `ketebalanBorder`, `radiusSudut`: Garis tepi dan lengkungan sudut.
- `ukuranFont`, `beratFont`: Tipografi (`normal`, `tebal`, `tipis`).
- `perataanTeks`: `"kiri"`, `"tengah"`, `"kanan"`, `"rata_kanan_kiri"`.
