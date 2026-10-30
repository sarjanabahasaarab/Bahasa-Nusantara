# Referensi HTTP Client NUSANTARA (Phase 35)

Bahasa pemrograman NUSANTARA menyediakan subsistem **HTTP Client** modern, modular, dan tangguh untuk berkomunikasi dengan server web dan REST API.

## 1. Arsitektur Klien HTTP

Klien HTTP diimplementasikan melalui kelas `KlienHTTP` yang membungkus modul jaringan bawaan Node.js (`http` dan `https`) dengan fitur-fitur tingkat lanjut:

- **Connection Pooling**: Menggunakan HTTP/HTTPS Keep-Alive Agent untuk efisiensi koneksi berulang.
- **Header Map Aman**: Mencegah serangan *CRLF / HTTP Response Splitting* dengan validasi ketat karakter `\r` dan `\n`.
- **Manajemen Cookie Otomatis**: Dilengkapi in-memory `CookieJar` yang mematuhi RFC 6265 (Domain, Path, Max-Age, Expires, Secure, HttpOnly, SameSite).
- **Penanganan Pengalihan Cerdas**: Mengikuti status `301`, `302`, `303`, `307`, dan `308` dengan deteksi loop pengalihan serta pembersihan kredensial sensitif saat pengalihan lintas domain (*cross-origin*).
- **Kebijakan Coba Ulang (Retry Policy)**: Exponential backoff dengan jitter, kepatuhan header `Retry-After`, dan proteksi idempotensi metode HTTP.

## 2. Penggunaan Dasar

### Pemanggilan Cepat
```nusantara
gunakan std:http

// Permintaan GET
var respon = http.ambil("https://api.nusantara.dev/pengguna")
jika (respon.berhasil) {
    tulis("Status:", respon.status)
    tulis("Tubuh:", respon.tubuh)
}

// Permintaan POST JSON
var dataBaru = { "nama": "Nusantara", "versi": "0.35.0" }
var responPost = http.kirim("https://api.nusantara.dev/data", dataBaru)
tulis("Hasil POST:", responPost.status)
```

### Fluent Request Builder
```typescript
import { KlienHTTP } from './src/http';

const klien = new KlienHTTP({ batasWaktuMs: 8000 });
const respon = await klien.permintaan()
  .ke('https://api.contoh.id/v1/produk')
  .metode('GET')
  .header('Accept', 'application/json')
  .query('kategori', 'elektronik')
  .query('halaman', 1)
  .kirim();

console.log(respon.status, respon.json());
```

## 3. Penanganan Galat Terklasifikasi

Hierarki kesalahan pada `GalatHTTP`:
- `GalatJaringanHTTP`: Gangguan koneksi DNS atau socket.
- `GalatTimeoutHTTP`: Melebihi batas waktu respon server.
- `GalatTLSHTTP`: Kesalahan sertifikat SSL/TLS.
- `GalatStatusHTTP`: Status error 4xx atau 5xx dari server.
- `GalatPengalihanHTTP`: Terjadi perulangan (*redirect loop*) atau batas pengalihan terlampaui.

Semua galat secara otomatis menyamarkan token otorisasi, password, dan kunci API pada pesan galat untuk mencegah kebocoran informasi kredensial.
