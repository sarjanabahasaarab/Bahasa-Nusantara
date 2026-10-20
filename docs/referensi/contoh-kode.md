# Referensi Contoh Kode Acuan Bahasa NUSANTARA

Dokumen ini memuat rangkuman contoh kode acuan dengan status keabsahannya menurut tata bahasa EBNF.

---

### 1. Program Halo Dunia [SESUAI SPESIFIKASI]
```nusantara
program Halo

mulai
    tampilkan("Halo Dunia!")
selesai
```

### 2. Variabel & Tipe Data [SESUAI SPESIFIKASI]
```nusantara
program ContohVariabel

mulai
    nama : teks = "Budi"
    umur : bilangan = 20
    aktif : logika = benar

    tampilkan(nama)
selesai
```

### 3. Percabangan Bersarang [SESUAI SPESIFIKASI]
```nusantara
program Evaluasi

mulai
    skor : bilangan = 85

    jika skor >= 75 maka
        tampilkan("Lulus")
    selain
        tampilkan("Remedial")
    akhir
selesai
```

### 4. Perulangan Rentang [SESUAI SPESIFIKASI]
```nusantara
program Rentang

mulai
    untuk i dari 1 sampai 5 lakukan
        tampilkan(i)
    akhir
selesai
```

### 5. Definisi & Pemanggilan Fungsi [SESUAI SPESIFIKASI]
```nusantara
fungsi kali(a : bilangan, b : bilangan) : bilangan

mulai
    kembalikan a * b
selesai

program UjiKali

mulai
    hasil : bilangan = kali(4, 5)
    tampilkan(hasil)
selesai
```

*(Catatan: Seluruh contoh di atas menunjukkan rancangan sintaks resmi dan belum dapat dijalankan sebelum alat eksekusi NUSANTARA tersedia).*
