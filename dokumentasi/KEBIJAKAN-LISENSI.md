# Kebijakan Lisensi Komponen & Dependensi Eksternal NUSANTARA

Dokumen ini mengatur kepatuhan hukum atas lisensi kode utama, dependensi pustaka pihak ketiga, serta aset multimedia di dalam ekosistem **NUSANTARA**.

---

## 1. Lisensi Kode Utama Proyek

Seluruh kode sumber asli, spesifikasi, tata bahasa formal, pustaka standar, serta perkakas internal yang ditulis khusus untuk repositori NUSANTARA dilindungi di bawah **Apache License 2.0**. Setiap kontribusi baru yang digabungkan ke cabang utama secara otomatis terikat oleh ketentuan lisensi ini.

---

## 2. Ketergantungan Eksternal (*Third-Party Dependencies*)

1. **Mempertahankan Lisensi Asli:**
   Ketergantungan pihak ketiga (seperti toolchain C/C++, pustaka sistem, modul Node.js, atau pustaka LLVM) tetap tunduk pada ketentuan lisensi masing-masing dari pemilik aslinya.
2. **Kewajiban Audit Lisensi:**
   Setiap penambahan dependensi pihak ketiga baru wajib diaudit terlebih dahulu oleh tim maintainer.
3. **Lisensi yang Diizinkan (*Permissive Licenses*):**
   Proyek NUSANTARA menerima dependensi dengan lisensi terbuka permisif yang kompatibel dengan Apache License 2.0, antara lain:
   - Apache License 2.0
   - MIT License
   - BSD 2-Clause / 3-Clause
   - ISC License
   - Unlicense / Public Domain (CC0)
4. **Pembatasan Lisensi Copyleft Ketat:**
   Dependensi dengan lisensi copyleft kuat (seperti GPLv2, GPLv3, atau AGPL) tidak boleh digabungkan langsung ke dalam pustaka inti atau runtime NUSANTARA tanpa isolasi arsitektur atau izin khusus, agar tidak membebani pengguna akhir dengan kewajiban lisensi turunan.

---

## 3. Kebijakan Aset Media (Font, Gambar, Audio, Contoh)

1. **Kejelasan Hak Cipta & Sumber:**
   Setiap berkas aset non-kode (font tipografi, gambar ilustrasi, ikon, rekaman audio, berkas data pengujian) wajib memiliki sumber asal (*provenance*) dan hak izin penggunaan bebas yang terdokumentasi secara tertulis.
2. **Lisensi Terbuka untuk Media:**
   Aset media disarankan berlisensi **Creative Commons Attribution (CC BY 4.0)**, **SIL Open Font License (OFL)** untuk font, atau domain publik.
3. **Larangan Materi Berhak Cipta Tanpa Izin:**
   Dilarang keras memasukkan materi hak cipta milik pihak ketiga tanpa bukti izin tertulis atau lisensi terbuka yang sah.

---

## 4. Prosedur Penanganan Kontribusi yang Diragukan

Apabila suatu usulan perubahan (*Pull Request*) memuat:
- Kode hasil salinan langsung (*copy-paste*) dari basis kode tertutup atau proprietary.
- Dependensi yang tidak memiliki berkas lisensi yang jelas.
- Aset visual yang tidak diketahui pemilik hak ciptanya.

Maka maintainer **wajib menangguhkan penggabungan (*merge*)** hingga status hukum dan kejelasan lisensi kontribusi tersebut dapat dibuktikan secara sah.
