# Arsitektur Internal: Web Application Framework NUSANTARA

Dokumentasi rancangan arsitektur, siklus hidup permintaan, dan model keamanan Web Framework NUSANTARA (`v0.30.0`).

---

## 1. Diagram Alur Siklus Hidup Permintaan (Request Lifecycle)

```
[ Klien HTTP ]
      │
      ▼ (Koneksi TCP)
[ ServerWebAdapter (node:http) ]
      │ (Timeout Guard, Body Streaming, Batas Ukuran Payload Anti-DoS)
      ▼
[ PermintaanWebImpl & ResponsWebImpl ]
      │
      ▼
[ AplikasiWeb.tanganiPermintaan() ]
      │
      ├──> [ 0. Deteksi Global Serangan Path Traversal pada URL ]
      │
      ├──> [ 1. Rantai Middleware Global (Keamanan, CORS, Logging, Rate Limiter) ]
      │
      ├──> [ 2. Pemeriksaan Penangan Berkas Statis (MIME Mapping & Sandbox Check) ]
      │
      ├──> [ 3. Router Matching (Statis & Parameter :id) ]
      │         │
      │         ├── Jika Cocok: Rute Middleware -> Penangan Rute
      │         ├── Jika Metode Salah: Respons 405 (Method Not Allowed) + Header Allow
      │         └── Jika Tidak Cocok: Respons 404 (Not Found)
      │
      ▼ (Respons HTTP Terkirim)
[ Klien Menerima Respons ]
```

---

## 2. Struktur Modul & Pemisahan Tanggung Jawab

| Modul | Lokasi Berkas | Peran Utama |
|---|---|---|
| `jenis.ts` | `src/web/jenis.ts` | Definisi antarmuka `PermintaanWeb`, `ResponsWeb`, `MiddlewareWeb`, dan `GalatWeb`. |
| `router.ts` | `src/web/router.ts` | Pohon penjaluran, pencocokan regex segmen statis dan parameter `:param`, serta grouping. |
| `server.ts` | `src/web/server.ts` | Adapter `http.createServer`, streaming request body dengan batas ukuran, dan runner uji in-memory. |
| `aplikasi.ts` | `src/web/aplikasi.ts` | Kelas `AplikasiWeb` yang mengorkestrasi pipeline middleware, router, statis, dan server adapter. |
| `statis.ts` | `src/web/statis.ts` | Penangan berkas statis dengan isolasi `path.resolve` sandbox dan verifikasi berkas tersembunyi. |
| `template.ts` | `src/web/template.ts` | Mesin template HTML dengan escaping kontekstual otomatis (Anti-XSS), percabangan, dan layout. |
| `middleware/*` | `src/web/middleware/` | Middleware bawaan: CORS, Header Keamanan, Pencatat Akses Aman, dan Pembatas Laju (Rate Limiter). |
| `web.ts` | `src/stdlib/web.ts` | Pembungkus standard library yang menghubungkan runtime interpreter NUSANTARA dengan instans framework. |

---

## 3. Model Keamanan & Model Ancaman (Threat Model)

1. **Denial of Service (DoS) via Large Payload**:
   - Dimitigasi dengan `batasUkuranBadanBytes` (default 1 MB). Aliran data masukan dipotong dan dihentikan dengan status `413 Payload Too Large` sebelum membanjiri alokasi heap memori server.
2. **Path Traversal / Arbitrary File Read**:
   - Dimitigasi dengan resolusi jalur kanonikal (`path.resolve` & `path.relative`). Setiap permintaan berkas statis di luar direktori root publik langsung ditolak dengan status `403 Forbidden`. Karakter null-byte (`\0`) dan URL-encoded `..` (`%2e%2e`) diblokir sebelum mencapai sistem berkas.
3. **Cross-Site Scripting (XSS)**:
   - Dimitigasi oleh fungsi `lepasHTML` bawaan yang aktif secara default pada setiap interpolasi variabel `{{ variabel }}`.
4. **Kebocoran Data Kredensial pada Log**:
   - Middleware `pencatatAkses` menyaring parameter sensitif (`password`, `token`, `secret`, `api_key`) menjadi `[TERLINDUNGI]` secara otomatis.
