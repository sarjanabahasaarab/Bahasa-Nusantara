# Layanan Eksternal, Adaptor & Webhook (Phase 35)

Bahasa pemrograman NUSANTARA menyediakan infrastruktur siap pakai untuk berinteraksi dengan layanan cloud pihak ketiga, pemrosesan event asinkron berbasis Webhook, serta integrasi Background Tasks (Phase 34).

## 1. Verifikasi Webhook HMAC yang Aman (`PengelolaWebhook`)

Pemrosesan webhook eksternal (seperti GitHub, Stripe, Midtrans, Slack) mewajibkan verifikasi integritas dan otentisitas data pengirim:

- **Perbandingan Waktu Konstan (Timing-Safe Comparison)**: Menggunakan algoritma kriptografis `crypto.timingSafeEqual` guna memitigasi serangan *Timing Attack*.
- **Mitigasi Replay Attack**: Memvalidasi jendela toleransi waktu kedatangan payload (`toleransiWaktuDetik`, bawaan 300 detik).
- **Deduplikasi Peristiwa**: Mencegah pemrosesan ganda terhadap event ID yang sama.

### Contoh Verifikasi
```typescript
import { PengelolaWebhook } from './src/http';

const webhook = new PengelolaWebhook({
  kunciRahasia: 'whsec_9876543210abcdef',
  algoritma: 'sha256',
  toleransiWaktuDetik: 300,
});

// Menangani permintaan POST /webhook
const sah = webhook.verifikasiTandaTangan(payloadMentah, headerSignature, timestampHeader);
if (!sah) {
  throw new Error('Tanda tangan webhook tidak valid!');
}

console.log('Webhook sah dan aman diproses.');
```

## 2. Adaptor Layanan Eksternal

NUSANTARA menyediakan pola adapter `AdaptorLayananEksternal` untuk membungkus komunikasi ke API spesifik, seperti notifikasi email, gerbang SMS, maupun data cuaca:

```typescript
import { AdaptorLayananEmail, AdaptorLayananCuaca } from './src/http';

// Layanan Pengiriman Surel
const layananEmail = new AdaptorLayananEmail({
  apiKey: 'email_api_secret_key',
  pengirimBawaan: 'noreply@nusantara.dev',
});

await layananEmail.kirimEmail({
  ke: 'tujuan@contoh.id',
  subjek: 'Selamat Datang di NUSANTARA',
  kontenTeks: 'Akun Anda berhasil diaktivasi pada platform NUSANTARA.',
});

// Layanan Prakiraan Cuaca
const layananCuaca = new AdaptorLayananCuaca({
  apiKey: 'cuaca_api_key',
  unit: 'metric'
});

const infoCuaca = await layananCuaca.dapatkanCuacaSaatIni('Jakarta');
console.log(`Suhu di Jakarta: ${infoCuaca.suhu}°C`);
```

## 3. Integrasi dengan Background Processing (Phase 34)

Panggilan HTTP ke layanan eksternal dapat dijadwalkan ke dalam antrean latar belakang (`AntreanTugasMemori`) menggunakan helper `buatTugasHTTP`:

```typescript
import { buatTugasHTTP } from './src/http';
import { AntreanTugasMemori } from './src/realtime';

const antrean = new AntreanTugasMemori();
const tugasSync = buatTugasHTTP('sinkronisasi-data', {
  url: 'https://api.contoh.id/v1/sync',
  metode: 'POST',
  tubuh: { batchId: 'batch-001' }
});

antrean.tambah(tugasSync);
```
