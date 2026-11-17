# Keterbatasan Diketahui (Known Limitations) Phase 23

1. **Ketergantungan Toolchain Eksternal untuk Linking Native**:
   - Lowering NIR ke LLVM IR dan pengemasan arsip/manifest berjalan 100% di Node.js tanpa dependensi eksternal, namun kompilasi `.ll` -> `.o/.obj` -> executable native memerlukan `clang`/`llc`/`lld` atau cross-GCC target serta C runtime (`glibc`/`MSVC CRT`/`MacOSX.sdk`).
2. **Lingkungan Eksekusi Container Lokal Saat Ini (`linux-x86_64`)**:
   - Container saat ini tidak memiliki `clang`, `lld`, `llvm-as`, `llc`, `aarch64-linux-gnu-gcc`, `x86_64-w64-mingw32-gcc`, maupun `pwsh`. Akibatnya uji native host (`3.2`) dan PowerShell sandbox (`5.3`, `5.4`) berstatus `BELUM DIVERIFIKASI` secara lokal dan hanya dapat lulus penuh pada runner CI dengan toolchain terpasang.
3. **Cross-Linking Lintas OS Tanpa Cross-SDK**:
   - Host Linux tanpa `lld-link` + MSVC/WinSDK atau `osxcross` + Apple SDK tidak dapat me-link biner PE32+ Windows maupun Mach-O macOS secara lokal dan akan gagal jujur dengan kode status `CROSS_SDK_TIDAK_TERSEDIA`.
4. **Code Signing Desktop OS**:
   - Integritas distribusi Phase 23 dijamin dengan `SHA256SUMS` serta validasi format biner dan checksum, belum mencakup penandatanganan Authenticode Windows atau Apple Developer `codesign`/notarization.
5. **Biner Cross-Arch Tanpa Emulator User-Mode**:
   - Apabila cross-SDK tersedia tanpa `qemu-aarch64`/`qemu-aarch64-static` (Linux) atau Rosetta 2 (Apple Silicon), pipeline berhenti jujur pada mode `cross-compiled-not-executed` dan gerbang sertifikasi melapor `NOT_VERIFIED` (bukan `PASS`).
