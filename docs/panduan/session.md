# Panduan: Manajemen Sesi & Cookie Aman di NUSANTARA

Panduan lengkap mengenai pengelolaan sesi pengguna, konfigurasi waktu kedaluwarsa, mitigasi serangan pembajakan sesi (*session hijacking*), dan pencegahan *session fixation* pada bahasa pemrograman **NUSANTARA**.

---

## 1. Konsep Dasar Sesi di NUSANTARA

Sesi (*session*) adalah mekanisme status (*stateful*) yang menghubungkan serangkaian permintaan HTTP stateless dari peramban atau klien yang sama ke entitas pengguna tertentu di server.

### Arsitektur Token Sesi NUSANTARA:
- **Klien**: Menerima token sesi publik 256-bit (32 byte heksadesimal) yang dihasilkan melalui CSPRNG (*Cryptographically Secure Pseudo-Random Number Generator*).
- **Transportasi**: Dikirimkan melalui tajuk HTTP `Cookie: nusantara_sesi=<token>` atau tajuk `Authorization: Bearer <token>`.
- **Basis Data Server**: Server **tidak menyimpan token asli**, melainkan menyimpan hash SHA-256 dari token tersebut. Apabila berkas basis data tercuri atau bocor, token aktif pengguna tetap terlindungi.

---

## 2. Parameter Waktu Kedaluwarsa Sesi

Sistem sesi NUSANTARA mendukung dua lapis kontrol waktu kedaluwarsa:

1. **Kedaluwarsa Absolut (*Absolute Expiry*)**:
   - Batas waktu maksimal hidup sebuah sesi sejak pertama kali diterbitkan (default: 7 hari = `604800` detik).
   - Setelah waktu ini tercapai, pengguna diwajibkan untuk login ulang terlepas dari apakah mereka masih aktif berinteraksi.
2. **Kedaluwarsa Tidak Aktif (*Idle Timeout*)**:
   - Batas toleransi ketidakaktifan pengguna (default: 2 jam = `7200` detik).
   - Setiap kali pengguna membuat permintaan HTTP yang sah, kolom `last_activity` diperbarui. Jika interval antara permintaan melebihi batas ini, sesi akan dinyatakan kedaluwarsa.

---

## 3. Pencegahan Session Fixation (Rotasi Sesi)

Serangan *Session Fixation* terjadi ketika penyerang memaksa korban menggunakan identifier sesi yang telah diketahui oleh penyerang sebelum korban login.

### Solusi NUSANTARA:
Segera setelah pengguna berhasil diautentikasi atau ketika terjadi eskalasi hak akses istimewa, panggil fungsi `layanan.rotasiSesi(tokenLama)`:

```nusantara
// Merotasi sesi lama dan mendapatkan token baru
sesiBaru : peta = layanan.rotasiSesi(tokenLama)

// Setel token baru ke dalam cookie respons
res.aturKuki("nusantara_sesi", sesiBaru["token"], {
    "httpOnly": benar,
    "sameSite": "Lax",
    "path": "/"
})
```

Fungsi ini menghapus rekor token lama dari tabel `sesi` dan menerbitkan token baru yang mengikat pengguna yang sama secara aman.

---

## 4. Konfigurasi Atribut Cookie Aman

Saat menyetel cookie sesi ke peramban, selalu gunakan konfigurasi pertahanan berlapis:

| Atribut | Nilai Rekomendasi | Manfaat Keamanan |
|---|---|---|
| `httpOnly` | `benar` | Mencegah pembacaan nilai cookie oleh skrip JavaScript di klien (menangkal XSS). |
| `sameSite` | `"Lax"` atau `"Strict"` | Mencegah cookie dikirimkan secara otomatis pada permintaan lintas-situs (menangkal CSRF). |
| `secure` | `benar` (pada produksi HTTPS) | Menjamin cookie hanya ditransmisikan melalui kanal terenkripsi TLS/HTTPS. |
| `path` | `"/"` | Membatasi ruang lingkup cookie pada seluruh rute aplikasi. |

---

## 5. Pembersihan Sesi Kedaluwarsa

Untuk menjaga performa basis data tetap optimal, jalankan pembersihan berkala terhadap rekaman sesi yang telah kedaluwarsa:

```typescript
// Menghapus semua sesi yang masa aktifnya telah habis
const jumlahDihapus = pengelolaSesi.bersihkanSesiKedaluwarsa();
console.log(`Berhasil membersihkan ${jumlahDihapus} sesi kedaluwarsa.`);
```
