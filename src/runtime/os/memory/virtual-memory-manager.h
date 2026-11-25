/* SPDX-License-Identifier: Apache-2.0 */
#ifndef NUSANTARA_OS_VIRTUAL_MEMORY_MANAGER_H
#define NUSANTARA_OS_VIRTUAL_MEMORY_MANAGER_H
#include <stdint.h>
#define NUSANTARA_OS_VMM_PAGE_SIZE 4096u
#define NUSANTARA_OS_VMM_ADDRESS_LIMIT UINT64_C(0x0001000000000000)
#define NUSANTARA_OS_VMM_DESCRIPTOR_ADDR UINT64_C(0x0000FFFFFFFFF000)
typedef enum nusantara_os_vmm_status {
 NUSANTARA_OS_VMM_OK=0, NUSANTARA_OS_VMM_INVALID_ARGUMENT,
 NUSANTARA_OS_VMM_INVALID_ADDRESS, NUSANTARA_OS_VMM_INVALID_FLAGS,
 NUSANTARA_OS_VMM_ALREADY_MAPPED, NUSANTARA_OS_VMM_NOT_MAPPED,
 NUSANTARA_OS_VMM_OUT_OF_TABLE_MEMORY, NUSANTARA_OS_VMM_CORRUPT_TABLE
} nusantara_os_vmm_status_t;
enum { NUSANTARA_OS_VMM_READ=1u<<0, NUSANTARA_OS_VMM_WRITE=1u<<1,
 NUSANTARA_OS_VMM_USER=1u<<2, NUSANTARA_OS_VMM_EXECUTE=1u<<3,
 NUSANTARA_OS_VMM_DEVICE=1u<<4, NUSANTARA_OS_VMM_NON_GLOBAL=1u<<5 };
typedef struct nusantara_os_vmm_ops {
 void *context;
 int (*alloc_table)(void *, uint64_t *);
 void *(*map_table)(void *, uint64_t);
 void (*free_table)(void *, uint64_t);
 void (*invalidate_page)(void *, uint64_t);
} nusantara_os_vmm_ops_t;
typedef struct nusantara_os_vmm {
 uint64_t root_physical;
 nusantara_os_vmm_ops_t ops;
 uint8_t initialized;
} nusantara_os_vmm_t;
nusantara_os_vmm_status_t nusantara_os_vmm_init(nusantara_os_vmm_t *, uint64_t, const nusantara_os_vmm_ops_t *);
nusantara_os_vmm_status_t nusantara_os_vmm_map(nusantara_os_vmm_t *, uint64_t, uint64_t, uint32_t);
nusantara_os_vmm_status_t nusantara_os_vmm_unmap(nusantara_os_vmm_t *, uint64_t);
nusantara_os_vmm_status_t nusantara_os_vmm_lookup(const nusantara_os_vmm_t *, uint64_t, uint64_t *, uint32_t *);
#endif
