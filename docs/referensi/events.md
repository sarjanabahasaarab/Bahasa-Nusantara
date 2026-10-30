# Sistem Peristiwa Real-Time (Event Bus) Bahasa NUSANTARA

Dokumentasi resmi arsitektur dan penggunaan sistem event real-time pada bahasa pemrograman NUSANTARA (**v0.34.0** - Phase 34).

---

## 1. Ikhtisar & Arsitektur

Modul peristiwa (`realtime` / `event`) menyediakan mekanisme publish-subscribe (pub/sub) in-memory yang tangguh dan terisolasi untuk komunikasi asinkron maupun sinkron antar modul, pengendali web, dan komponen sistem.

### Fitur Utama:
- **Penerbitan Sinkron & Asinkron**: Mendukung eksekusi sekuensial maupun paralel tanpa memblokir runtime utama.
- **Pencocokan Pola Wildcard**: Mendukung pola berbasis titik (`pesanan.*`) dan titik dua (`chat:*`) maupun penangkap global (`*`).
- **Isolasi Galat (Fault Isolation)**: Kesalahan atau exception pada satu pendengar (listener) tidak akan memutus atau membatalkan penanganan pada pendengar lainnya.
- **Deduplikasi Peristiwa**: Cache histori ID peristiwa untuk mencegah eksekusi ganda jika peristiwa yang sama diterbitkan berulang.
- **Pendengar Sekali Panggil (`sekali` / `once`)**: Otomatis mencabut pendaftaran setelah pertama kali peristiwa terpicu.

---

## 2. Struktur Data Peristiwa (`Peristiwa`)

```typescript
interface Peristiwa<T = Record<string, any>> {
  id: string;               // ID unik UUID
  jenis: string;            // Nama peristiwa (contoh: 'pengguna.daftar', 'pesanan.bayar')
  payload: T;               // Data muatan peristiwa
  waktu: Date;              // Stempel waktu pembentukan
  metadata: Record<string, any>; // Konteks tambahan (sumber, trace ID)
  sumber?: string;          // Asal modul/komponen penerbit
}
```

---

## 3. Penggunaan pada Bahasa NUSANTARA

Program `.nusantara` dapat mengimpor modul `realtime` menggunakan perintah `gunakan "realtime" sebagai rt`:

```nusantara
program ContohEvent
gunakan "realtime" sebagai rt

mulai
    // 1. Inisialisasi Bus Peristiwa
    bus : peta = rt.buatBusPeristiwa()

    // 2. Menerbitkan Peristiwa
    idEvent : teks = bus.terbitkan("pesanan.dibuat", "DataPesanan#12345")
    tampilkan("Peristiwa berhasil diterbitkan dengan ID:", idEvent)
selesai
```

---

## 4. Penggunaan pada Kode TypeScript / Runtime Host

```typescript
import { BusPeristiwa } from './realtime';

const bus = new BusPeristiwa({ batasCacheDeduplikasi: 1000 });

// Daftarkan listener
const lepas = bus.dengarkan('notifikasi.*', async (peristiwa) => {
  console.log(`Diterima event: ${peristiwa.jenis}`, peristiwa.payload);
});

// Terbitkan event asinkron
await bus.terbitkan('notifikasi.email', {
  tujuan: 'pengguna@nusantara.lang',
  pesan: 'Selamat datang di NUSANTARA!',
});

// Cabut listener jika tidak diperlukan lagi
lepas();
```

---

## 5. Pertimbangan Keamanan
- Penanganan payload divalidasi dan sanitasi sebelum dipancarkan ke pendengar eksternal.
- Batas cache deduplikasi mencegah eksploitasi serangan memori (memory exhaustion).
- Informasi rahasia (seperti kata sandi mentah) dilarang dikirim melalui payload peristiwa global.
