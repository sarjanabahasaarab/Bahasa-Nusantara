# Panduan Pengembangan Aplikasi Desktop NUSANTARA

Dokumen ini menjelaskan cara membuat, mengonfigurasi, dan menjalankan aplikasi desktop mandiri dengan antarmuka grafis menggunakan bahasa NUSANTARA.

---

## 1. Siklus Hidup Aplikasi Desktop

Aplikasi desktop NUSANTARA mengikuti siklus hidup terstruktur:
1. **Inisialisasi**: `ui.buatAplikasi(opsi)` membuat instance aplikasi dan konteks global.
2. **Pembuatan Jendela**: `aplikasi.buatJendela(konfigurasi)` mengalokasikan jendela utama atau jendela dialog modal.
3. **Penyusunan Pohon Widget**: Menghubungkan widget dan komponen layout ke jendela melalui `jendela.setKonten(akarLayout)`.
4. **Pendaftaran Menu & Event**: Memasang bilah menu dan penangan klik/input pengguna.
5. **Eksekusi Event Loop**: `aplikasi.jalankan()` mengaktifkan event loop dan menunggu interaksi pengguna.
6. **Penutupan & Pembersihan Resource**: Menutup jendela, membersihkan pendengar event, dan membebaskan memori.

---

## 2. Contoh Aplikasi Desktop Minimal

```nusantara
program AplikasiDesktopMinimal

gunakan "gui" sebagai ui

mulai
    // 1. Buat Aplikasi
    definisi aplikasi = ui.buatAplikasi({
        id: "id.nusantara.aplikasiku",
        nama: "Aplikasi Ku",
        temaAwal: "terang"
    })

    // 2. Buat Jendela Utama
    definisi jendela = aplikasi.buatJendela({
        judul: "Aplikasi Desktop Pertamaku",
        lebar: 800,
        tinggi: 600
    })

    // 3. Buat Widget dan Konten
    definisi label = ui.buatLabel("Halo dari NUSANTARA Desktop!", { ukuranFont: 18 })
    definisi tombol = ui.buatTombol("Tutup Aplikasi", fungsi(evt)
        jendela.tutup()
    selesai)

    definisi wadah = ui.buatKolom([label, tombol], { jarak: 16 })
    jendela.setKonten(wadah)

    // 4. Jalankan Aplikasi
    aplikasi.jalankan()
selesai
```

---

## 3. Konfigurasi Jendela (`KonfigurasiJendelaGUI`)

Properti yang didukung saat membuat jendela:
- `judul` (teks): Judul yang ditampilkan pada bilah judul jendela.
- `lebar` (bilangan): Lebar awal jendela dalam piksel (default: 800).
- `tinggi` (bilangan): Tinggi awal jendela dalam piksel (default: 600).
- `lebarMin`, `tinggiMin`: Batasan ukuran minimum.
- `lebarMaks`, `tinggiMaks`: Batasan ukuran maksimum.
- `dapatDiubahUkuran` (logika): Mengizinkan user mengubah ukuran jendela.
- `modal` (logika): Menjadikan jendela sebagai dialog modal yang memblokir jendela induk.
- `selaluDiAtas` (logika): Mempertahankan jendela selalu berada di atas jendela lain.
- `ikon` (teks): Jalur file gambar ikon jendela (.ico, .png).

---

## 4. Manipulasi State Jendela

Objek jendela menyediakan metode programatik:
- `jendela.maksimalkan()`: Memaksimalkan jendela ke layar penuh (dengan border sistem).
- `jendela.minimalkan()`: Meminimalkan jendela ke taskbar/dock.
- `jendela.layarPenuh()`: Masuk ke mode fullscreen eksklusif.
- `jendela.pulihkan()`: Mengembalikan ukuran normal jendela.
- `jendela.tutup()`: Menutup jendela dan memicu event `jendela_ditutup`.
