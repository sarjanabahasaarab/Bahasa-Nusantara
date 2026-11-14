/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA NATIVE RUNTIME - Definisi ABI & Stub C Standar
 * Target Milestone: Phase 44 (v0.44.0)
 */

export class NativeRuntimeManager {
  /**
   * Menghasilkan kode C runtime pendukung yang mencakup entrypoint 'main'
   * yang menginisialisasi ekosistem Nusantara lalu memanggil '@utama' NIR.
   */
  public static generateRuntimeCSource(): string {
    return `
#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>
#include <inttypes.h>

// Deklarasi fungsi utama Nusantara (dihasilkan oleh NIR) dengan weak fallback
#if defined(__GNUC__) || defined(__clang__)
__attribute__((weak)) int32_t utama(void) { return 0; }
#else
extern int32_t utama(void);
#endif

// Fungsi bantuan runtime bawaan
int64_t nusantara_cetak_bilangan(int64_t val) {
    printf("%" PRId64 "\\n", val);
    return val;
}

int64_t nusantara_cetak_bilangan_inline(int64_t val) {
    printf("%" PRId64, val);
    return val;
}

void nusantara_cetak_desimal(double val) {
    printf("%g\\n", val);
}

void nusantara_cetak_desimal_inline(double val) {
    printf("%g", val);
}

void nusantara_cetak_logika(uint8_t val) {
    printf("%s\\n", val ? "benar" : "salah");
}

void nusantara_cetak_teks(const char* str) {
    if (str != NULL) {
        printf("%s\\n", str);
    } else {
        printf("(kosong)\\n");
    }
}

void nusantara_cetak_teks_inline(const char* str) {
    if (str != NULL) {
        printf("%s", str);
    } else {
        printf("(kosong)");
    }
}

void nusantara_cetak_baris(void) {
    printf("\\n");
}

// Runtime Concurrency & Actor Model (Fase 46)
void* nusantara_actor_create(const char* name) {
    (void)name;
    // Mengembalikan handle dummy opaque untuk environment tanpa libpthread
    return malloc(sizeof(void*));
}

int32_t nusantara_actor_send(void* actor, int64_t msg_id, void* payload) {
    (void)actor;
    (void)msg_id;
    (void)payload;
    return 0; // Berhasil terkirim
}

void nusantara_actor_stop(void* actor) {
    if (actor != NULL) {
        free(actor);
    }
}

void* nusantara_task_spawn(void* (*func)(void*), void* arg) {
    if (func != NULL) {
        return func(arg);
    }
    return NULL;
}

void* nusantara_task_wait(void* task_handle) {
    return task_handle;
}

// C Entry Point standar sistem operasi
int main(int argc, char** argv) {
    (void)argc;
    (void)argv;
    // Inisialisasi runtime Nusantara
    int32_t hasil = utama();
    return (int)hasil;
}
`;
  }
}
