# Autentikasi API & Keamanan Permintaan (Phase 35)

Subsistem HTTP NUSANTARA menyediakan autentikasi terstruktur yang terintegrasi secara modular ke dalam setiap panggilan jaringan.

## 1. Skema Autentikasi Terintegrasi

### A. Basic Authentication
Mengenkode pasangan nama pengguna dan kata sandi menggunakan standar Base64:
```typescript
import { PengelolaAutentikasiHTTP } from './src/http';

const auth = PengelolaAutentikasiHTTP.buatBasic('admin', 'rahasia123');
// Menghasilkan header: Authorization: Basic YWRtaW46cmFoYXNpYTEyMw==
```

### B. Bearer Token
Digunakan untuk token JWT, token akses OAuth, atau Personal Access Token:
```typescript
const auth = PengelolaAutentikasiHTTP.buatBearer('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...');
// Menghasilkan header: Authorization: Bearer eyJhbGci...
```

### C. API Key (Header atau Query Parameter)
Mendukung penyematan kunci API pada kustom header maupun parameter query URL:
```typescript
// Melalui Header
const authHeader = PengelolaAutentikasiHTTP.buatApiKey('X-API-Key', 'rahasia-api-9988');

// Melalui Query Parameter
const authQuery = PengelolaAutentikasiHTTP.buatApiKey('api_key', 'rahasia-api-9988', 'query');
```

### D. OAuth2 Token Manager
Menangani auto-refresh token akses sebelum kedaluwarsa:
```typescript
const authOAuth = PengelolaAutentikasiHTTP.buatOAuth2({
  tokenAkses: 'token-lama',
  tokenPenyegar: 'refresh-token-xyz',
  kedaluwarsaPada: Date.now() + 3600000,
  endpointPenyegar: 'https://auth.contoh.id/oauth/token',
  klienId: 'client-123',
  klienRahasia: 'secret-abc',
});
```

## 2. Keamanan Kredensial Saat Pengalihan (Redirect Security)

Ketika permintaan HTTP mengalami pengalihan URL (`301`, `302`, `307`, `308`):
1. **Domain Sama**: Header otentikasi dan cookie dipertahankan.
2. **Lintas Domain (Cross-Origin)**: Klien HTTP secara ketat **menghapus** header `Authorization`, `Proxy-Authorization`, dan Cookie guna mencegah kebocoran kredensial ke server pihak ketiga yang tidak tepercaya.
