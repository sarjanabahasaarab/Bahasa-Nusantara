# Kasus Uji Sintaksis Valid (Phase 4)

Dokumen ini memuat kumpulan kasus uji kode sumber `.nusantara` yang sepenuhnya mematuhi tata bahasa formal EBNF yang ditetapkan pada Phase 4.

---

## Kasus 1: Program Minimal Tanpa Instruksi
```nusantara
program ProgramKosong

mulai
selesai
```

## Kasus 2: Deklarasi Beragam Tipe Data Pokok
```nusantara
program RagamData

mulai
    kalimat : teks = "Halo Nusantara"
    hitung : bilangan = 100
    nilaiPi : desimal = 3.14
    bendera : logika = salah
    hampa : kosong = kosong
selesai
```

## Kasus 3: Ekspresi Gabungan Aritmetika dan Logika
```nusantara
program UjiEkspresi

mulai
    a : bilangan = 10
    b : bilangan = 20
    status : logika = (a + 5 < b) dan tidak (b == 0)
selesai
```

## Kasus 4: Percabangan Tunggal Tanpa Bagian `selain`
```nusantara
program UjiJikaTunggal

mulai
    jika benar maka
        tampilkan("Pasti dieksekusi")
    akhir
selesai
```

## Kasus 5: Percabangan Bersarang Lengkap
```nusantara
program NilaiBersarang

mulai
    skor : bilangan = 85
    jika skor >= 90 maka
        tampilkan("A")
    selain
        jika skor >= 75 maka
            tampilkan("B")
        selain
            tampilkan("C")
        akhir
    akhir
selesai
```

## Kasus 6: Perulangan `untuk` dan `selama` dengan Kontrol Aliran
```nusantara
program UjiPerulangan

mulai
    untuk i dari 1 sampai 10 lakukan
        jika i == 5 maka
            lanjutkan
        akhir
        jika i == 9 maka
            hentikan
        akhir
    akhir
selesai
```

## Kasus 7: Deklarasi Fungsi Terpisah
```nusantara
fungsi kuadrat(x : bilangan) : bilangan

mulai
    kembalikan x * x
selesai

program UjiFungsi

mulai
    hasil : bilangan = kuadrat(8)
selesai
```
