# Ringkasan Sintaksis Resmi Bahasa NUSANTARA

Dokumen ini adalah lembar sontekan (*cheat sheet*) referensi cepat aturan sintaksis resmi bahasa **NUSANTARA** yang telah disahkan pada Phase 4.

---

## 1. Unit Program Utama
```nusantara
program NamaProgram

mulai
    // instruksi-instruksi
selesai
```

## 2. Deklarasi & Konstanta
```nusantara
// Deklarasi Variabel (Mutable)
namaVariabel : namaTipe = ekspresi
variabel namaVariabel : namaTipe = ekspresi

// Deklarasi Konstanta (Immutable)
tetap NAMA_KONSTANTA : namaTipe = ekspresi

// Penugasan Ulang
namaVariabel = ekspresiBaru
```

## 3. Percabangan
```nusantara
jika kondisi maka
    pernyataan
selain
    pernyataan
akhir
```

## 4. Perulangan
```nusantara
// Perulangan Berpenghitung Rentang (Inklusif)
untuk variabel dari awal sampai akhir lakukan
    pernyataan
akhir

// Perulangan Kondisional
selama kondisi lakukan
    pernyataan
akhir
```

## 5. Fungsi
```nusantara
fungsi namaFungsi(parameter1 : tipe1, parameter2 : tipe2) : tipeHasil

mulai
    kembalikan ekspresi
selesai
```

*(Catatan: Rincian spesifikasi formal EBNF lengkap dapat dilihat pada [Tata Bahasa EBNF](tata-bahasa-ebnf.md)).*
