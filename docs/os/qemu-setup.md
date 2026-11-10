# Panduan Instalasi & Konfigurasi Emulator QEMU

## 1. Instalasi Emulator QEMU x86_64

### Debian / Ubuntu / Linux Mint:
```bash
sudo apt-get update
sudo apt-get install -y qemu-system-x86 clang lld xorriso grub-pc-bin gdb
```

### Arch Linux / Manjaro:
```bash
sudo pacman -S qemu-system-x86 clang lld xorriso grub gdb
```

### Fedora / RHEL:
```bash
sudo dnf install -y qemu-system-x86 clang lld xorriso grub2-tools-extra gdb
```

### macOS (via Homebrew):
```bash
brew install qemu llvm xorriso x86_64-elf-gdb
```

### Windows (via Winget / Chocolatey):
```powershell
winget install SoftwareFreedomConservancy.QEMU
winget install LLVM.LLVM
```

## 2. Verifikasi Instalasi
Jalankan perintah deteksi toolchain bawaan NUSANTARA CLI:
```bash
nusantara os toolchain
```
Perintah ini akan memeriksa ketersediaan emulator QEMU, kompiler Clang, linker LLD, xorriso, dan GDB.
