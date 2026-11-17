# Keterbatasan yang Diketahui Phase 40 — Mobile Application Distribution

1. **Artefak APK/AAB Standalone vs Biner Native Gradle/AAPT2**:
   - Karena `ANDROID_HOME`, `javac`, `gradle`, `aapt2`, dan `d8` tidak terpasang pada host Linux uji, `APKBuilder` dan `AABBuilder` menghasilkan arsip PKZIP standar berisi `AndroidManifest.xml`, metadata NUSANTARA, dan deskriptor penandatanganan. Paket tersebut valid secara struktur PKZIP/CRC-32 namun belum memuat `classes.dex` terkompilasi atau sumber daya AAPT2 biner native Android.
2. **Ekspor `.ipa` Apple iOS Membutuhkan macOS + Xcode**:
   - Di host non-macOS (`linux`), `ArchiveManager` mempersiapkan struktur direktori `.xcarchive` (`Info.plist`) dan `ExportOptions.plist`, sementara kompilasi Mach-O ARM64 dan penandatanganan CMS Apple resmi hanya dapat dilakukan di macOS melalui `xcodebuild`.
3. **Aset PNG Nyata**:
   - Proyek default menunjuk ke `aset/ikon/app-icon.png` dan `aset/splash/splash.png`; jika berkas PNG aktual belum ada di disk, `AssetValidator` melaporkan peringatan secara jujur alih-alih mengarang dimensi piksel.
