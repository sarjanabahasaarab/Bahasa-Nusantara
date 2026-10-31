# Referensi Komponen Widget GUI NUSANTARA

GUI Framework NUSANTARA menyediakan beragam komponen widget interaktif dan dapat dikustomisasi untuk menyusun antarmuka aplikasi desktop profesional.

---

## 1. Daftar Widget Utama

### A. Label (`ui.buatLabel`)
Menampilkan teks statis atau dinamis dengan dukungan ukuran font, warna, dan perataan teks.
```nusantara
definisi judul = ui.buatLabel("Judul Formulir", {
    ukuranFont: 20,
    warna: "#1e3a8a",
    perataan: "tengah"
})
judul.setTeks("Judul Baru")
```

### B. Tombol (`ui.buatTombol`)
Elemen interaksi klik pengguna dengan dukungan ikon, varian gaya, dan tooltip.
```nusantara
definisi tombolSimpan = ui.buatTombol("Simpan Data", fungsi(evt)
    tampilkan("Data berhasil disimpan!")
selesai, { varian: "primer" })
```

### C. Input Teks (`ui.buatInputTeks`)
Kotak isian teks satu baris dengan dukungan mode sandi, batasan karakter, dan placeholder.
```nusantara
definisi inputNama = ui.buatInputTeks("Nama Lengkap...", { wajib: benar })
definisi nilai = inputNama.getNilai()
inputNama.bersihkan()
```

### D. Area Teks (`ui.buatAreaTeks`)
Kotak masukan teks multibaris untuk catatan atau deskripsi panjang.
```nusantara
definisi areaCatatan = ui.buatAreaTeks("Tuliskan catatan...", { baris: 5 })
areaCatatan.tambahBaris("Baris tambahan.")
```

### E. Kotak Centang (`ui.buatKotakCentang`)
Pilihan biner ya/tidak untuk opsi konfigurasi atau persetujuan syarat ketentuan.
```nusantara
definisi centangSetuju = ui.buatKotakCentang("Saya menyetujui ketentuan", salah)
definisi aktif = centangSetuju.isCentang()
```

### F. Tombol Radio (`ui.buatTombolRadio`)
Pilihan tunggal dari sekumpulan opsi yang tergabung dalam satu grup nama yang sama.
```nusantara
definisi radioPria = ui.buatTombolRadio("Laki-laki", "L", "gender")
definisi radioWanita = ui.buatTombolRadio("Perempuan", "P", "gender")
```

### G. Dropdown Pilihan (`ui.buatPilihan`)
Menu pemilihan tunggal dari daftar opsi (select / combo box).
```nusantara
definisi dropdownKota = ui.buatPilihan(["Jakarta", "Surabaya", "Bandung", "Medan"], "Jakarta")
dropdownKota.setTerpilih("Bandung")
```

### H. Tabel Data (`ui.buatTabel`)
Penyajian data tabular terstruktur dengan kolom header, penataan lebar, dan penambahan baris dinamis.
```nusantara
definisi kolom = [
    { id: "id", judul: "No", lebar: 60 },
    { id: "produk", judul: "Nama Barang", lebar: 250 },
    { id: "harga", judul: "Harga (Rp)", lebar: 120 }
]
definisi tabel = ui.buatTabel(kolom, [
    { id: 1, produk: "Laptop Nusantara", harga: 12500000 }
])
tabel.tambahBaris({ id: 2, produk: "Mouse Ergonomis", harga: 250000 })
```

### I. Daftar (`ui.buatDaftar`)
Tampilan daftar vertikal untuk item linear dengan seleksi baris.
```nusantara
definisi daftarKaryawan = ui.buatDaftar(["Ahmad", "Siti", "Budi"])
daftarKaryawan.tambahItem("Dewi")
```

### J. Gambar (`ui.buatGambar`)
Menampilkan gambar bitmap lokal atau aset visual aplikasi.
```nusantara
definisi logo = ui.buatGambar("assets/icons/logo.png", { lebar: 120, tinggi: 120 })
```

### K. Indikator Progres (`ui.buatProgres`)
Menampilkan status kemajuan proses operasi berdurasi panjang.
```nusantara
definisi progresUnduh = ui.buatProgres(45, 100)
progresUnduh.setNilai(75)
```

### L. Slider (`ui.buatSlider`)
Penggeser nilai numerik dengan batasan minimum, maksimum, dan langkah perpindahan.
```nusantara
definisi sliderVolume = ui.buatSlider(0, 100, 50)
sliderVolume.setNilai(80)
```

### M. Tab Navigasi (`ui.buatTab`)
Panel tab bertingkat untuk mengorganisasi beberapa tampilan dalam satu area jendela.
```nusantara
definisi tab = ui.buatTab()
tab.tambahTab("Umum", wadahUmum)
tab.tambahTab("Keamanan", wadahKeamanan)
```
