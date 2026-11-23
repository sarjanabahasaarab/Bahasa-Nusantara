# Implementasi Phase 51

## Berkas

- src/runtime/os/abi/userland-abi.ts — kontrak ABI versi 1.
- src/runtime/os/abi/index.ts — ekspor modul baru.
- pengujian/os/uji_abi_ruang_pengguna_fase51.ts — suite pengujian.
- package.json — perintah pengujian Phase 51.
- docs/phase-51/ — dokumentasi fase.

## API publik

- UserlandABI.VERSION
- UserlandABI.FEATURES
- UserlandABI.createManifest(table?)
- UserlandABI.negotiate(request)
- UserlandABI.decodeSyscallFrame(registers)
- UserlandABI.writeSyscallResult(registers, result)
- UserlandABI.isValidSyscallNumber(number, table?)

## Integrasi

Modul diekspor melalui src/runtime/os/abi/index.ts yang sudah diekspor oleh src/runtime/os/index.ts. Tidak ada perubahan nomor syscall lama.
