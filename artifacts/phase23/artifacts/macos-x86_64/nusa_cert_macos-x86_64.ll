; ModuleID = 'UjiSertifikasiPhase23'
source_filename = "UjiSertifikasiPhase23.nusantara"
target datalayout = "e-m:o-p270:32:32-p271:32:32-p272:64:64-i64:64-f80:128-n8:16:32:64-S128"
target triple = "x86_64-apple-darwin"

@.str.0 = private unnamed_addr constant [23 x i8] c"NUSANTARA_NATIVE_CI_OK\00", align 1

; Deklarasi Runtime Nusantara & Libc Eksternal
declare i32 @printf(ptr, ...)
declare ptr @malloc(i64)
declare void @free(ptr)
declare void @exit(i32)
declare i64 @nusantara_cetak_bilangan(i64)
declare i64 @nusantara_cetak_bilangan_inline(i64)
declare void @nusantara_cetak_desimal(double)
declare void @nusantara_cetak_desimal_inline(double)
declare void @nusantara_cetak_logika(i1)
declare void @nusantara_cetak_teks(ptr)
declare void @nusantara_cetak_teks_inline(ptr)
declare void @nusantara_cetak_baris()

define i32 @utama() {
entry:
  %hasil.addr = alloca i64, align 8
  store i64 42, ptr %hasil.addr, align 8
  call void @nusantara_cetak_teks(ptr @.str.0)
  %v51 = load i64, ptr %hasil.addr, align 8
  %cetak.bil = call i64 @nusantara_cetak_bilangan(i64 %v51)
  ret i32 0
}
