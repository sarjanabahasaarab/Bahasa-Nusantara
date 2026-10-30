# Server WebSocket & Pengelola Ruang (Channels/Rooms) NUSANTARA

Dokumentasi resmi WebSocket Server, Pengelolaan Koneksi, dan Sistem Ruang Komunikasi Real-Time pada bahasa pemrograman NUSANTARA (**v0.34.0** - Phase 34).

---

## 1. Ikhtisar

`ServerWebSocketNUSANTARA` menyediakan antarmuka komunikasi dua arah (full-duplex) berkecepatan tinggi yang dapat beroperasi secara mandiri maupun terintegrasi dengan `AplikasiWeb` (Phase 30).

### Kemampuan Inti:
1. **Dukungan Mode Mandiri & Terpasang**: Dapat membuka port listener tersendiri atau menumpang pada server HTTP Node.js yang sudah ada (`pasangKeServerHTTP`).
2. **Kebijakan Keamanan Asal (CORS/Origin Whitelist)**: Memvalidasi tajuk `Origin` untuk mencegah serangan Cross-Site WebSocket Hijacking (CSWSH).
3. **Pembatasan Laju Pesan (Rate Limiting)**: Membatasi frekuensi pesan masuk per detik per koneksi untuk mitigasi serangan DoS (Denial of Service).
4. **Batas Ukuran Muatan (Max Payload Size)**: Mencegah alokasi memori berlebih dengan membatasi byte maksimum pesan masuk (default: 1 MB).
5. **Detak Jantung & Pemutusan Otomatis (Heartbeat/Ping-Pong)**: Secara berkala mengirimkan ping untuk mendeteksi soket gantung dan membersihkan koneksi mati.
6. **Sistem Ruang (Channels/Rooms)**: Mengelompokkan koneksi klien ke dalam saluran komunikasi tertentu dengan mekanisme otorisasi peran/hook.

---

## 2. Arsitektur Komponen

```
                  ┌───────────────────────────────┐
                  │   ServerWebSocketNUSANTARA    │
                  └───────────────┬───────────────┘
                                  │
          ┌───────────────────────┴───────────────────────┐
          ▼                                               ▼
┌──────────────────────────────┐        ┌──────────────────────────────┐
│  PengelolaKoneksiWebSocket   │        │        PengelolaRuang        │
│  - Handshake & Autentikasi   │        │  - Ruang / Channel           │
│  - Heartbeat & Ping/Pong     │        │  - Penyiaran Kelompok        │
│  - Rate Limiting             │        │  - Otorisasi Berbasis Peran  │
└──────────────────────────────┘        └──────────────────────────────┘
```

---

## 3. Konfigurasi Server WebSocket

```typescript
import { ServerWebSocketNUSANTARA } from './realtime';

const serverWs = new ServerWebSocketNUSANTARA({
  jalur: '/ws',
  asalDiizinkan: ['http://localhost:3000', 'https://nusantara.lang'],
  batasUkuranPesanBytes: 1048576, // 1 MB
  batasKoneksiMaksimal: 2000,
  intervalDetakJantungMs: 30000,
  batasWaktuDetakJantungMs: 10000,
  otorisasiRuang: async (profil, namaRuang) => {
    if (namaRuang.startsWith('admin-')) {
      return profil?.peran === 'admin';
    }
    return true;
  },
});
```

---

## 4. Integrasi dengan Web Framework NUSANTARA

Pada aplikasi web Phase 30, WebSocket server dapat dihubungkan langsung ke server HTTP Node.js:

```typescript
import { AplikasiWeb } from './web';
import { ServerWebSocketNUSANTARA } from './realtime';

const app = new AplikasiWeb();
const serverNode = app.dapatkanServerNode();

if (serverNode) {
  const wsServer = new ServerWebSocketNUSANTARA();
  wsServer.pasangKeServerHTTP(serverNode);
}
```

---

## 5. Penggunaan Ruang & Penyiaran (Broadcast)

```typescript
// Menyiarkan pesan ke seluruh anggota ruang 'lounge' kecuali pengirim
wsServer.pengelolaRuang.siarkanKeRuang(
  'lounge',
  { pengirim: 'Budi', teks: 'Halo semua!' },
  koneksiIdPengirim
);

// Menyiarkan pesan sistem ke seluruh koneksi aktif
wsServer.siarkan({ tipe: 'sistem', pengumuman: 'Pemeliharaan server dalam 10 menit' });
```
