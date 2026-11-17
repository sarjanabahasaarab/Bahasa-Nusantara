# Referensi API & CLI Phase 23

## 1. CLI NUSANTARA (`src/paket/cli.ts`)
- **Build Launcher Matrix**:
  `nusantara bangun --mode <debug|release> --target <daftar-target> --out <dir> [--json]`
- **Build Native AOT & Distribusi**:
  `nusantara bangun --native --source <file.nusantara> --target <target> --mode <debug|release> [--static|--dynamic] [--verifikasi] --out <dir>`
- **Informasi Target & Toolchain**:
  `nusantara info [--json]`
- **Inspeksi Biner & Linker CLI**:
  `nusantara inspect <path-biner>`
  `nusantara link <objek...> -o <output>`
  `nusantara package <source.nusantara> --output <dir>`

## 2. Skrip Sertifikasi CI (`scripts/phase23-certify.ts`)
- `npx tsx scripts/phase23-certify.ts generate --target <canonical-target> --bundle-dir <dir> [--fail-on-missing-clang] [--skip-dist]`
- `npx tsx scripts/phase23-certify.ts verify-dist --target <target> [--out-dir <dir>] [--fail-on-missing-clang]`
- `npx tsx scripts/phase23-certify.ts aggregate --evidence-dir <dir> --report-out <md> [--json-out <json>] [--step-summary] [--allow-incomplete]`
- `npx tsx scripts/phase23-certify.ts local-snapshot --bundle-dir <dir>`

## 3. API TypeScript Inti (`src/build/index.ts`)
- `TargetMatrixManager.getAllCanonicalTargets(): CanonicalDesktopTarget[]`
- `TargetMatrixManager.inspectTargetCapability(target?, preDetectedToolchain?): TargetCapability`
- `NativeBuildPipeline.build(options: NativeBuildOptions, deps?): NativeBuildResult`
- `DesktopDistributionPackager.packageTarget(options: DesktopDistributionOptions): DesktopDistributionResult`
- `ArchiveBuilder.createZip(entries, options)` / `extractZip(bytes, destDir, limits)`
- `ArchiveBuilder.createTarGz(entries, options)` / `extractTarGz(bytes, destDir, limits)`
- `ArchiveBuilder.verifySha256SumsFromDirectory(dir, content)`
- `DesktopInstallerGenerator.generate(options)` / `runPosixScriptInSandbox(...)` / `runWindowsScriptInSandbox(...)`
- `DistributionE2EVerifier.verify(options): DistributionE2EReport`
- `Phase23CertificationEngine.generateTargetEvidence(...)` / `aggregateEvidence(...)`
