# Konstitusi Bahasa Pemrograman NUSANTARA

Dokumen ini merupakan piagam konstitusional resmi bagi bahasa pemrograman **NUSANTARA**. Seluruh perancangan tata bahasa formal, implementasi kompilator, rancangan pustaka standar, serta perkakas pendukung wajib tunduk dan selaras dengan prinsip-prinsip yang termaktub dalam konstitusi ini.

Status dokumen: **[DITETAPKAN] — Acuan Konstitusional Resmi (Phase 2)**

---

## 1. Mukadimah

Bahasa pemrograman NUSANTARA dilahirkan sebagai ikhtiar rekayasa perangkat lunak mandiri, terbuka, dan berdaulat. NUSANTARA meletakkan Bahasa Indonesia sebagai bahasa ekspresi logika komputasi utama untuk menghilangkan sekat linguistik bagi generasi pengembang Indonesia, sekaligus memberikan fondasi rekayasa piranti lunak berstandar industri internasional yang mampu berkembang hingga ke tingkat sistem operasi (**NusantaraOS**).

---

## 2. 10 Prinsip Konstitusi Bahasa

1. **Bahasa Indonesia sebagai Bahasa Utama Sintaks:**
   Seluruh kata kunci (*keywords*), nama konstruksi bahasa, leksikon inti, pesan diagnostik, antarmuka perkakas (CLI), dan dokumentasi resmi wajib mengutamakan kaidah Bahasa Indonesia yang tertib dan konsisten.
2. **Keterbacaan dan Konsistensi Sintaks:**
   Sintaksis NUSANTARA harus mudah dibaca manusia (*human-readable*) dengan batas leksikal yang eksplisit (`mulai` ... `selesai`, `jika` ... `maka` ... `akhir`), meminimalkan ambiguitas tanda baca, dan mempertahankan pola yang dapat diprediksi.
3. **Skalabilitas Multi-Domain:**
   Bahasa dirancang fleksibel untuk menjangkau aplikasi umum tingkat tinggi (web, antarmuka grafis desktop, seluler, multimedia) hingga pemrograman sistem tingkat rendah (pengelolaan memori, interaksi perangkat keras, dan sistem operasi).
4. **Spesifikasi yang Dapat Diuji (*Testable Specification*):**
   Setiap aturan tata bahasa, batasan tipe, dan perilaku runtime wajib memiliki spesifikasi yang dapat divalidasi melalui pengujian formal dan rangkaian uji coba (*test suite*).
5. **Transparansi Perubahan Sintaks:**
   Tidak boleh ada penambahan, penghapusan, atau perubahan makna kata kunci tanpa pencatatan publik dalam riwayat perubahan (*CHANGELOG*) dan persetujuan komunitas.
6. **Tata Kelola Perubahan Merusak Melalui NIP:**
   Setiap perubahan yang memutus kompatibilitas ke belakang (*breaking changes*) wajib melalui mekanisme formal **Nusantara Improvement Proposal (NIP)**.
7. **Kepatuhan Implementasi Kompilator:**
   Implementasi kompilator, interpreter, maupun perkakas pendukung pada fase-fase berikutnya wajib tunduk penuh pada spesifikasi resmi, bukan menentukan perilaku secara sepihak.
8. **Integritas Rekayasa (Tanpa Klaim Palsu):**
   Fitur yang masih berada dalam tahap rancangan tidak boleh diklaim telah berfungsi. Tolok ukur kinerja dan keandalan hanya boleh diklaim setelah teruji secara empiris.
9. **Kemandirian Sistem Operasi (*Cross-Platform by Design*):**
   Spesifikasi bahasa tidak boleh bergantung pada satu sistem operasi tertentu (misalnya Windows, Linux, atau macOS saja). Bahasa harus dirancang mandiri secara arsitektur.
10. **Keterbukaan & Kolaborasi Terbuka:**
    Pengembangan bahasa dikelola secara terbuka di GitHub di bawah lisensi perangkat lunak bebas (MIT License) untuk kemaslahatan masyarakat luas.

---

## 3. Struktur Program Resmi Awal [DITETAPKAN]

Program awal dalam bahasa NUSANTARA memiliki struktur deklaratif:

```nusantara
program NamaProgram

mulai
    tampilkan("Halo Dunia!")
selesai
```

### Ketentuan Konstruksi:
1. `program` adalah kata kunci penanda nama unit eksekusi.
2. `NamaProgram` adalah pengidentifikasi unik program yang mematuhi aturan penamaan resmi.
3. `mulai` membuka blok utama eksekusi instruksi.
4. `selesai` menutup blok utama program.
5. Seluruh instruksi komputasi ditulis di dalam batas `mulai` dan `selesai`.

> **Catatan Fase 2:** Struktur ini merupakan **spesifikasi tata bahasa resmi**, belum merupakan implementasi biner kompilator yang dapat dieksekusi.

---

## 4. Hirarki Dokumen Spesifikasi Bahasa

Konstitusi ini menaungi dokumen-dokumen spesifikasi pelengkap berikut:

1. **[KEYWORD.md](KEYWORD.md):** Daftar kata kunci resmi, fungsi, dan status adopsi.
2. **[TIPE-DATA.md](TIPE-DATA.md):** Taksonomi tipe data primitif dan terstruktur awal.
3. **[OPERATOR.md](OPERATOR.md):** Klasifikasi operator aritmetika, perbandingan, logika, dan penugasan beserta rancangan presedensi.
4. **[ATURAN-PENAMAAN.md](ATURAN-PENAMAAN.md):** Konvensi pengidentifikasi variabel, fungsi, konstanta, dan program.
5. **[PESAN-KESALAHAN.md](PESAN-KESALAHAN.md):** Standar formulasi pesan galat sintaks, nama, dan tipe dalam Bahasa Indonesia.
6. **[KOMPATIBILITAS.md](KOMPATIBILITAS.md):** Kebijakan pemeliharaan versi dan mitigasi perubahan merusak.
7. **[NIP-0002.md](nip/NIP-0002.md):** Dokumen proposal perumusan Konstitusi Bahasa NUSANTARA.
