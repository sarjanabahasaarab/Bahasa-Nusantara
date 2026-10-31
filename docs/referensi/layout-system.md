# Sistem Layout GUI NUSANTARA

Sistem layout NUSANTARA didesain untuk menyusun antarmuka secara adaptif dan responsif tanpa menggunakan koordinat piksel statis (*absolute positioning*) yang rentan patah saat resolusi atau ukuran layar berubah.

---

## 1. Komponen Layout Utama

### A. Kolom (`ui.buatKolom`)
Menyusun widget anak secara vertikal dari atas ke bawah.
```nusantara
definisi kolom = ui.buatKolom([widget1, widget2, widget3], {
    jarak: 12,
    perataan: "awal" // "awal" | "tengah" | "akhir" | "renggang"
})
```

### B. Baris (`ui.buatBaris`)
Menyusun widget anak secara horizontal dari kiri ke kanan.
```nusantara
definisi barisTombol = ui.buatBaris([tombolBatal, tombolSimpan], {
    jarak: 8,
    perataan: "akhir"
})
```

### C. Wadah Umum (`ui.buatWadah`)
Komponen kontainer fleksibel pembungkus widget dengan padding, margin, latar belakang, dan border kustom.
```nusantara
definisi wadah = ui.buatWadah({
    gaya: {
        padding: 16,
        warnaLatar: "#f8fafc",
        radiusSudut: 8
    }
})
wadah.tambahAnak(kontenForm)
```

### D. Grid (`ui.buatGrid`)
Menyusun elemen dalam format kisi tabel berkolom banyak yang seimbang.
```nusantara
definisi gridForm = ui.buatGrid(2) // 2 kolom sejajar
gridForm.tambahAnak(labelNama)
gridForm.tambahAnak(inputNama)
```

### E. Stack (`ui.buatStack`)
Menumpuk widget secara berlapis di sumbu Z (berguna untuk overlay, kartu dengan badge, atau banner latar).
```nusantara
definisi tumpukan = ui.buatStack()
tumpukan.tambahAnak(gambarLatar)
tumpukan.tambahAnak(labelTeksDiAtasGambar)
```

### F. Wadah Gulir (`ui.buatGulir`)
Menyediakan scrollbar otomatis vertikal atau horizontal ketika konten melebihi batas dimensi wadah.
```nusantara
definisi gulir = ui.buatGulir()
gulir.tambahAnak(tabelDataBesar)
```

---

## 2. Properti Spacing, Padding, dan Margin

Setiap layout mendukung pengaturan jarak:
- `jarak` (*gap*): Jarak antaranak elemen dalam piksel.
- `padding`: Ruang kosong di dalam batas wadah.
- `margin`: Ruang kosong di luar batas wadah.
- `perataan`: Menentukan penyebaran elemen sepanjang sumbu utama (`"awal"`, `"tengah"`, `"akhir"`, `"renggang"`, `"sama_rata"`).
