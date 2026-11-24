# Pengujian Phase 51

Perintah utama:

    npm run test:abi-v51
    npm run lint

Suite mandiri mencakup 23 pemeriksaan: identitas dan manifest ABI, pemetaan register, negosiasi versi, fitur wajib, validasi rentang syscall, nilai balik signed 64-bit, dan regresi helper ABI lama.

Pengujian TypeScript pada host bukan pengganti pengujian QEMU, assembly syscall entry point, atau pengujian perangkat fisik.
