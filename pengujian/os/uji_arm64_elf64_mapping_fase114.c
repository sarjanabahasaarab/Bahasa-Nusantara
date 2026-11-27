/* SPDX-License-Identifier: Apache-2.0 */
#include <assert.h>
#include <stdalign.h>
#include <stdint.h>
#include <stdio.h>
#include <string.h>
#include "elf64-load.h"

#define POOL_COUNT 32u
#define IMAGE_SIZE 0x1004u
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
static void fixture(uint8_t *b)
{
    memset(b,0,IMAGE_SIZE);
    b[0]=0x7f;b[1]='E';b[2]='L';b[3]='F';b[4]=2;b[5]=1;b[6]=1;
    put16(b+16,2);put16(b+18,183);put32(b+20,1);
    put64(b+24,0x400000);put64(b+32,64);
    put16(b+52,64);put16(b+54,56);put16(b+56,1);
    put32(b+64,1);put32(b+68,5);put64(b+72,0x1000);
    put64(b+80,0x400000);put64(b+96,4);put64(b+104,16);
    put64(b+112,0x1000);
    b[0x1000]=0xaa;b[0x1001]=0xbb;b[0x1002]=0xcc;b[0x1003]=0xdd;
}
static void reset_pool(void)
{
    memset(used,0,sizeof(used));allocations=0u;releases=0u;
    allocation_limit=POOL_COUNT;
}
int main(void)
{
    uint8_t bytes[IMAGE_SIZE];
    nusantara_arm64_address_space_ops_t ops={
        allocate_page,resolve_page,release_page,install_root
    };
    nusantara_arm64_address_space_manager_t manager;
    nusantara_arm64_address_space_t space;
    uint64_t entry=0u;
    const nusantara_arm64_user_mapping_t *mapping;
    size_t i, slot=POOL_COUNT;

    fixture(bytes);reset_pool();
    assert(nusantara_arm64_address_space_manager_init(&manager,&ops,0));
    memset(&space,0,sizeof(space));
    assert(nusantara_arm64_elf64_load(&manager,&space,1,bytes,sizeof(bytes),&entry)==
           NUSANTARA_ARM64_ELF64_LOAD_OK);
    assert(entry==UINT64_C(0x400000));
    assert(space.mapping_count==1u);
    mapping=nusantara_arm64_address_space_find_mapping(&space,0x400000);
    assert(mapping!=0 && mapping->executable==1u && mapping->owns_frame==1u);
    for(i=0;i<POOL_COUNT;i++) if(used[i] && physical[i]==mapping->physical_address) slot=i;
    assert(slot<POOL_COUNT);
    assert(pool[slot][0]==0xaa && pool[slot][1]==0xbb &&
           pool[slot][2]==0xcc && pool[slot][3]==0xdd);
    for(i=4;i<4096;i++) assert(pool[slot][i]==0u);
    assert(nusantara_arm64_address_space_destroy(&manager,&space)==NUSANTARA_ARM64_AS_OK);
    assert(manager.count==0u && releases==allocations);
    puts("PASS: ELF64 RX segment mapped, file bytes copied, BSS/page tail zeroed");

    fixture(bytes);reset_pool();allocation_limit=4u;
    assert(nusantara_arm64_address_space_manager_init(&manager,&ops,0));
    memset(&space,0,sizeof(space));entry=99u;
    assert(nusantara_arm64_elf64_load(&manager,&space,2,bytes,sizeof(bytes),&entry)==
           NUSANTARA_ARM64_ELF64_LOAD_FRAME_FAILURE);
    assert(entry==0u && manager.count==0u && !space.initialized);
    assert(releases==allocations);
    puts("PASS: allocation failure rolls back address space and page-table frames");
    puts("NUSANTARA_PHASE114_ELF64_MAPPING_PASS");
    return 0;
}
