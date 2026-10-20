# Tujuan & Filosofi Desain Bahasa NUSANTARA

Bahasa pemrograman NUSANTARA dibangun berlandaskan empat pilar filosofis utama yang menjadi pedoman bagi seluruh keputusan rekayasa:

---

## 1. Empat Pilar Filosofis

### A. Keterbacaan Alami (*Cognitive Fluency*)
Kode sumber harus dapat dibaca selayaknya teks instruksi formal Bahasa Indonesia yang tertib.
- Penggunaan batas blok eksplisit (`mulai` ... `selesai`, `jika` ... `maka` ... `akhir`) menghilangkan kebingungan tanda kurung kurawal bersarang bagi pemula.
- Operator logika menggunakan kata leksikal utuh (`dan`, `atau`, `tidak`), bukan simbol abstrak (`&&`, `||`, `!`).

### B. Konsistensi & Ketegasan Tata Bahasa
Setiap konstruksi sintaksis memiliki aturan yang tunggal dan tidak ambigu.
- Mematuhi tata bahasa formal EBNF (ISO/IEC 14977).
- Menghindari perilaku tak terduga (*undefined behavior*) dan penafsiran ganda leksikal.

### C. Keterbukaan & Tata Kelola Meritokrasi
NUSANTARA adalah proyek sumber terbuka murni di bawah lisensi resmi **Apache License 2.0**.
- Seluruh perubahan bahasa wajib melalui pembahasan publik dalam mekanisme **NIP (Nusantara Improvement Proposal)**.
- Tidak ada hak istimewa sepihak untuk mengubah spesifikasi secara rahasia.

### D. Pengembangan Bertahap Tanpa Klaim Palsu (*Integrity First*)
Kami memegang teguh kejujuran rekayasa piranti lunak:
- Fitur yang masih berupa rancangan ditandai sebagai rancangan.
- Kinerja dan kecepatan kompilasi hanya akan diumumkan setelah pengujian tolok ukur (*benchmark*) nyata dieksekusi pada fase kompilator biner.

---

## 2. Visi Jangka Panjang: Dari Skrip ke NusantaraOS

Roadmap pengembangan 36 fase memetakan evolusi NUSANTARA:
1. **Fase 1–5 (Fondasi & Spesifikasi):** Identitas, konstitusi, lisensi, tata bahasa EBNF, dan buku panduan.
2. **Fase 6–13 (Mesin Inti Kompilator):** Lexer, parser AST, interpreter pengujian logika, variabel, perulangan, dan fungsi.
3. **Fase 14–20 (Fitur Lanjut):** Koleksi data, modul, paradigma OOP, eksepsi, dan asinkron.
4. **Fase 21–25 (Kompilasi Native):** Representasi perantara (IR), optimasi kompilator, dan emisi kode mesin mandiri.
5. **Fase 26–32 (Ekosistem):** CLI, pengelola paket, repositori terpusat, dan IDE terintegrasi.
6. **Fase 33–36 (Sistem & OS):** Framework web, GUI, toolkit multimedia, hingga sistem operasi mandiri **NusantaraOS**.
