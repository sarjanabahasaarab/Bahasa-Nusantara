/* SPDX-License-Identifier: Apache-2.0 */
#include <assert.h>
#include <stdalign.h>
#include <stdint.h>
#include <stdio.h>
#include <string.h>
#include "elf64-load.h"

#define POOL_COUNT 32u
#define IMAGE_SIZE 0x2004u
static alignas(4096) uint8_t pool[POOL_COUNT][4096];
static uint64_t physical[POOL_COUNT];
static uint8_t used[POOL_COUNT];
static size_t allocations, releases, allocation_limit = POOL_COUNT;

static int allocate_page(void *context, uint64_t *pa, uint64_t **alias)
{
    size_t i;
    (void)context;
    if (allocations >= allocation_limit) return 0;
    for (i=0;i<POOL_COUNT;i++) if (!used[i]) {
        used[i]=1u; ++allocations;
        physical[i]=UINT64_C(0x100000)+(uint64_t)i*4096u;
        memset(pool[i],0,sizeof(pool[i]));
        *pa=physical[i]; *alias=(uint64_t *)(void *)pool[i];
        return 1;
    }
    return 0;
}
static int resolve_page(void *context, uint64_t pa, uint64_t **alias)
{
    size_t i; (void)context;
    for(i=0;i<POOL_COUNT;i++) if(used[i] && physical[i]==pa) {
        *alias=(uint64_t *)(void *)pool[i]; return 1;
    }
    return 0;
}
static void release_page(void *context, uint64_t pa)
{
    size_t i; (void)context;
    for(i=0;i<POOL_COUNT;i++) if(used[i] && physical[i]==pa) {
        used[i]=0u; ++releases; return;
    }
}
static int install_root(void *context, uint64_t root)
{ (void)context; (void)root; return 1; }
static void put16(uint8_t *p,uint16_t v){p[0]=(uint8_t)v;p[1]=(uint8_t)(v>>8);}
static void put32(uint8_t *p,uint32_t v){p[0]=(uint8_t)v;p[1]=(uint8_t)(v>>8);p[2]=(uint8_t)(v>>16);p[3]=(uint8_t)(v>>24);}
static void put64(uint8_t *p,uint64_t v){put32(p,(uint32_t)v);put32(p+4,(uint32_t)(v>>32));}
static void put_load(uint8_t *b,size_t p,uint32_t flags,uint64_t off,
                     uint64_t va,uint64_t filesz,uint64_t memsz)
{
    put32(b+p,1);put32(b+p+4,flags);put64(b+p+8,off);
    put64(b+p+16,va);put64(b+p+24,va);put64(b+p+32,filesz);
    put64(b+p+40,memsz);put64(b+p+48,0x1000);
}
static void fixture(uint8_t *b)
{
    memset(b,0,IMAGE_SIZE);
    b[0]=0x7f;b[1]='E';b[2]='L';b[3]='F';b[4]=2;b[5]=1;b[6]=1;
    put16(b+16,2);put16(b+18,183);put32(b+20,1);
    put64(b+24,0x400000);put64(b+32,64);
    put16(b+52,64);put16(b+54,56);put16(b+56,2);
    put_load(b,64,5,0x1000,0x400000,4,16);
    put_load(b,120,6,0x2000,0x402000,4,16);
    b[0x1000]=0xaa;b[0x1001]=0xbb;b[0x1002]=0xcc;b[0x1003]=0xdd;
    b[0x2000]=0x11;b[0x2001]=0x22;b[0x2002]=0x33;b[0x2003]=0x44;
}
static void reset_pool(void)
{
    memset(used,0,sizeof(used));allocations=0u;releases=0u;
    allocation_limit=POOL_COUNT;
}
static size_t pool_slot(uint64_t pa)
{
    size_t i;
    for(i=0;i<POOL_COUNT;i++) if(used[i] && physical[i]==pa) return i;
    return POOL_COUNT;
}
int main(void)
{
    uint8_t bytes[IMAGE_SIZE];
    nusantara_arm64_address_space_ops_t ops={
        allocate_page,resolve_page,release_page,install_root
    };
    nusantara_arm64_address_space_manager_t manager;
    nusantara_arm64_address_space_t space;
    uint64_t entry=0u, descriptor;
    const nusantara_arm64_user_mapping_t *rx,*rw;
    size_t i, rx_slot, rw_slot;

    fixture(bytes);reset_pool();
    assert(nusantara_arm64_address_space_manager_init(&manager,&ops,0));
    memset(&space,0,sizeof(space));
    assert(nusantara_arm64_elf64_load(&manager,&space,1,bytes,sizeof(bytes),&entry)==
           NUSANTARA_ARM64_ELF64_LOAD_OK);
    assert(entry==UINT64_C(0x400000));
    assert(space.mapping_count==2u);
    rx=nusantara_arm64_address_space_find_mapping(&space,0x400000);
    rw=nusantara_arm64_address_space_find_mapping(&space,0x402000);
    assert(rx!=0 && rx->executable==1u && rx->owns_frame==1u);
    assert(rw!=0 && rw->executable==0u && rw->owns_frame==1u);
    rx_slot=pool_slot(rx->physical_address); rw_slot=pool_slot(rw->physical_address);
    assert(rx_slot<POOL_COUNT && rw_slot<POOL_COUNT && rx_slot!=rw_slot);
    assert(pool[rx_slot][0]==0xaa && pool[rx_slot][1]==0xbb &&
           pool[rx_slot][2]==0xcc && pool[rx_slot][3]==0xdd);
    assert(pool[rw_slot][0]==0x11 && pool[rw_slot][1]==0x22 &&
           pool[rw_slot][2]==0x33 && pool[rw_slot][3]==0x44);
    for(i=4;i<4096;i++) {
        assert(pool[rx_slot][i]==0u);
        assert(pool[rw_slot][i]==0u);
    }

    descriptor=nusantara_arm64_mmu_lookup_page(&space.mmu,0x400000);
    assert((descriptor & NUSANTARA_ARM64_DESC_AP_EL0_RO)==
           NUSANTARA_ARM64_DESC_AP_EL0_RO);
    assert((descriptor & NUSANTARA_ARM64_DESC_UXN)==0u);
    descriptor=nusantara_arm64_mmu_lookup_page(&space.mmu,0x402000);
    assert((descriptor & NUSANTARA_ARM64_DESC_AP_EL0_RW)==
           NUSANTARA_ARM64_DESC_AP_EL0_RW);
    assert((descriptor & NUSANTARA_ARM64_DESC_UXN)!=0u);
    puts("PASS: RX is EL0 read-only/executable; RW is EL0 writable/NX");
    puts("PASS: file bytes copied and both BSS/page tails zeroed");
    assert(nusantara_arm64_address_space_destroy(&manager,&space)==NUSANTARA_ARM64_AS_OK);
    assert(manager.count==0u && releases==allocations);

    fixture(bytes);reset_pool();allocation_limit=1u;
    assert(nusantara_arm64_address_space_manager_init(&manager,&ops,0));
    memset(&space,0,sizeof(space));entry=99u;
    assert(nusantara_arm64_elf64_load(&manager,&space,2,bytes,sizeof(bytes),&entry)==
           NUSANTARA_ARM64_ELF64_LOAD_FRAME_FAILURE);
    assert(entry==0u && manager.count==0u && !space.initialized);
    assert(releases==allocations);
    puts("PASS: user-frame allocation failure rolls back the new address space");

    fixture(bytes);reset_pool();allocation_limit=5u;
    assert(nusantara_arm64_address_space_manager_init(&manager,&ops,0));
    memset(&space,0,sizeof(space));entry=99u;
    assert(nusantara_arm64_elf64_load(&manager,&space,5,bytes,sizeof(bytes),&entry)==
           NUSANTARA_ARM64_ELF64_LOAD_FRAME_FAILURE);
    assert(entry==0u && manager.count==0u && !space.initialized);
    assert(releases==allocations);
    puts("PASS: failure on the second segment releases the first segment and all page tables");

    fixture(bytes);reset_pool();allocation_limit=4u;
    assert(nusantara_arm64_address_space_manager_init(&manager,&ops,0));
    memset(&space,0,sizeof(space));entry=99u;
    assert(nusantara_arm64_elf64_load(&manager,&space,3,bytes,sizeof(bytes),&entry)==
           NUSANTARA_ARM64_ELF64_LOAD_MAPPING_FAILURE);
    assert(entry==0u && manager.count==0u && !space.initialized);
    assert(releases==allocations);
    puts("PASS: page-table allocation failure rolls back mapped frames and tables");

    fixture(bytes);reset_pool();
    assert(nusantara_arm64_address_space_manager_init(&manager,&ops,0));
    memset(&space,0,sizeof(space));entry=99u;
    put64(bytes+120+16,0x400800);
    put64(bytes+120+48,1);
    assert(nusantara_arm64_elf64_load(&manager,&space,4,bytes,sizeof(bytes),&entry)==
           NUSANTARA_ARM64_ELF64_LOAD_INVALID_IMAGE);
    assert(entry==0u && manager.count==0u && allocations==0u);
    puts("PASS: overlapping segment ranges are rejected before allocation");
    puts("NUSANTARA_PHASE114_ELF64_MAPPING_PASS");
    return 0;
}
