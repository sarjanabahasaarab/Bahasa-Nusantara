# Fungsi & Subrutin Modular

Fungsi adalah blok kode terpisah yang dirancang untuk melakukan tugas tertentu dan dapat dipanggil berulang kali dari bagian lain program.

---

## 1. Mendefinisikan Fungsi dengan Nilai Kembali

Fungsi yang mengembalikan nilai wajib mencantumkan anotasi tipe hasil setelah daftar parameter:

```nusantara
// Mendefinisikan fungsi bernama 'tambah'
fungsi tambah(a : bilangan, b : bilangan) : bilangan

mulai
    kembalikan a + b
selesai

program ProgramUtama

mulai
    // Memanggil fungsi dan menyimpan hasilnya
    total : bilangan = tambah(15, 30)
    tampilkan(total) // 45
selesai
```

---

## 2. Prosedur (Fungsi Tanpa Nilai Kembali)

Jika fungsi hanya menjalankan tindakan tanpa mengembalikan nilai (prosedur), abaikan anotasi `: tipe`:

```nusantara
fungsi sapa(nama : teks)

mulai
    tampilkan("Selamat pagi, " + nama + "!")
selesai

program PanggilSapa

mulai
    sapa("Dewi")
selesai
```

---

## 3. Fungsi Tanpa Parameter

Jika fungsi tidak membutuhkan parameter masukan, cukup tulis tanda kurung kosong `()`:

```nusantara
fungsi dapatkanTahun() : bilangan

mulai
    kembalikan 2026
selesai
```

*(Catatan: Contoh ini menunjukkan rancangan sintaks resmi dan belum dapat dijalankan sebelum alat eksekusi NUSANTARA tersedia).*
