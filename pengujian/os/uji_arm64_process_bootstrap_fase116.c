/* SPDX-License-Identifier: Apache-2.0 */
#include "process-bootstrap.h"
#include <assert.h>
#include <stdalign.h>
#include <stdint.h>
#include <stdio.h>
#include <string.h>

#define POOL_COUNT 64u
#define IMAGE_SIZE 0x1004u
#define USER_STACK_TOP UINT64_C(0x7fff0000)
#define USER_STACK_PAGES 2u

static alignas(4096) uint8_t pool[POOL_COUNT][4096];
static uint64_t physical[POOL_COUNT];
static uint8_t used[POOL_COUNT];
static size_t allocations, releases, allocation_limit = POOL_COUNT;
static alignas(16) uint8_t kernel_stack[4096];

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
static void put16(uint8_t *p,uint16_t v)
{ p[0]=(uint8_t)v; p[1]=(uint8_t)(v>>8); }
static void put32(uint8_t *p,uint32_t v)
{ p[0]=(uint8_t)v; p[1]=(uint8_t)(v>>8); p[2]=(uint8_t)(v>>16); p[3]=(uint8_t)(v>>24); }
static void put64(uint8_t *p,uint64_t v)
{ put32(p,(uint32_t)v); put32(p+4,(uint32_t)(v>>32)); }
static void make_elf(uint8_t *b)
{
    memset(b,0,IMAGE_SIZE);
    b[0]=0x7f;b[1]='E';b[2]='L';b[3]='F';b[4]=2;b[5]=1;b[6]=1;
    put16(b+16,2);put16(b+18,183);put32(b+20,1);
    put64(b+24,0x400000);put64(b+32,64);
    put16(b+52,64);put16(b+54,56);put16(b+56,1);
    put32(b+64,1);put32(b+68,5);
    put64(b+72,0x1000);put64(b+80,0x400000);put64(b+88,0x400000);
    put64(b+96,4);put64(b+104,16);put64(b+112,0x1000);
    b[0x1000]=0x1f;b[0x1001]=0x20;b[0x1002]=0x03;b[0x1003]=0xd5;
}
static void reset_pool(size_t limit)
{
    memset(used,0,sizeof(used));
    allocations=0u; releases=0u; allocation_limit=limit;
}
static size_t active_pages(void)
{
    size_t i,n=0u;
    for(i=0;i<POOL_COUNT;i++) if(used[i]) ++n;
    return n;
}

int main(void)
{
    uint8_t elf[IMAGE_SIZE];
    const nusantara_arm64_address_space_ops_t ops = {
        allocate_page,resolve_page,release_page,install_root
    };
    nusantara_arm64_address_space_manager_t manager;
    nusantara_arm64_process_bootstrap_t process;
    const nusantara_arm64_user_mapping_t *code,*stack0,*stack1;
    uint64_t code_descriptor, stack_descriptor;
    size_t limit;
    int saw_stack_rollback=0, saw_success=0;

    make_elf(elf);
    reset_pool(POOL_COUNT);
    assert(nusantara_arm64_address_space_manager_init(&manager,&ops,0));
    memset(&process,0,sizeof(process));
    assert(nusantara_arm64_process_bootstrap_create(
        &manager,&process,116u,elf,sizeof(elf),USER_STACK_TOP,
        USER_STACK_PAGES,(uintptr_t)0x1234u,0x400000u,
        kernel_stack,sizeof(kernel_stack))==
        NUSANTARA_ARM64_PROCESS_BOOTSTRAP_OK);
    assert(process.initialized==1u && manager.count==1u);
    assert(process.entry_point==0x400000u);
    assert(process.user_stack_top==USER_STACK_TOP);
    assert(process.initial_frame!=0);
    assert(process.initial_frame->elr_el1==0x400000u);
    assert(process.initial_frame->sp_el0==USER_STACK_TOP);
    assert(process.initial_frame->spsr_el1==NUSANTARA_ARM64_SPSR_EL0T);
    assert(process.initial_frame->x[0]==0x1234u);
    assert(process.initial_frame->x[30]==0x400000u);
    assert(process.address_space.mapping_count==3u);

    code=nusantara_arm64_address_space_find_mapping(
        &process.address_space,0x400000u);
    stack0=nusantara_arm64_address_space_find_mapping(
        &process.address_space,USER_STACK_TOP-4096u);
    stack1=nusantara_arm64_address_space_find_mapping(
        &process.address_space,USER_STACK_TOP-8192u);
    assert(code!=0 && code->executable==1u && code->access==NUSANTARA_ARM64_PAGE_USER_RO);
    assert(stack0!=0 && stack0->executable==0u && stack0->access==NUSANTARA_ARM64_PAGE_USER_RW);
    assert(stack1!=0 && stack1->executable==0u && stack1->access==NUSANTARA_ARM64_PAGE_USER_RW);
    code_descriptor=nusantara_arm64_mmu_lookup_page(&process.address_space.mmu,0x400000u);
    stack_descriptor=nusantara_arm64_mmu_lookup_page(&process.address_space.mmu,USER_STACK_TOP-4096u);
    assert((code_descriptor & NUSANTARA_ARM64_DESC_AP_EL0_RO)==NUSANTARA_ARM64_DESC_AP_EL0_RO);
    assert((code_descriptor & NUSANTARA_ARM64_DESC_UXN)==0u);
    assert((stack_descriptor & NUSANTARA_ARM64_DESC_AP_EL0_RW)==NUSANTARA_ARM64_DESC_AP_EL0_RW);
    assert((stack_descriptor & NUSANTARA_ARM64_DESC_UXN)!=0u);
    assert(nusantara_arm64_process_bootstrap_destroy(&manager,&process)==NUSANTARA_ARM64_AS_OK);
    assert(manager.count==0u && active_pages()==0u && allocations==releases);
    puts("PASS: static ELF entry mapped RX and EL0 exception frame prepared");
    puts("PASS: user stack pages mapped RW/NX and reclaimed on destroy");

    reset_pool(POOL_COUNT);
    assert(nusantara_arm64_address_space_manager_init(&manager,&ops,0));
    memset(&process,0,sizeof(process));
    assert(nusantara_arm64_process_bootstrap_create(
        &manager,&process,117u,elf,sizeof(elf),USER_STACK_TOP,
        USER_STACK_PAGES,(uintptr_t)0x1234u,0x500000u,
        kernel_stack,sizeof(kernel_stack))==
        NUSANTARA_ARM64_PROCESS_BOOTSTRAP_INVALID_ARGUMENT);
    assert(manager.count==0u && active_pages()==0u && allocations==releases);
    puts("PASS: unmapped/non-executable exit trampoline is rejected with rollback");

    reset_pool(POOL_COUNT);
    assert(nusantara_arm64_address_space_manager_init(&manager,&ops,0));
    memset(&process,0,sizeof(process));
    assert(nusantara_arm64_process_bootstrap_create(
        &manager,&process,118u,elf,sizeof(elf),0x401000u,
        1u,(uintptr_t)0x1234u,0x400000u,
        kernel_stack,sizeof(kernel_stack))==
        NUSANTARA_ARM64_PROCESS_BOOTSTRAP_STACK_FAILURE);
    assert(manager.count==0u && active_pages()==0u && allocations==releases);
    puts("PASS: stack collision with ELF mapping triggers complete rollback");

    /* Sweep allocation cutoffs: every partial construction must roll back. */
    for(limit=1u;limit<POOL_COUNT;limit++) {
        nusantara_arm64_process_bootstrap_status_t status;
        reset_pool(limit);
        assert(nusantara_arm64_address_space_manager_init(&manager,&ops,0));
        memset(&process,0,sizeof(process));
        status=nusantara_arm64_process_bootstrap_create(
            &manager,&process,200u+limit,elf,sizeof(elf),USER_STACK_TOP,
            USER_STACK_PAGES,(uintptr_t)0x55u,0x400000u,
            kernel_stack,sizeof(kernel_stack));
        if(status==NUSANTARA_ARM64_PROCESS_BOOTSTRAP_STACK_FAILURE)
            saw_stack_rollback=1;
        if(status==NUSANTARA_ARM64_PROCESS_BOOTSTRAP_OK) {
            saw_success=1;
            assert(nusantara_arm64_process_bootstrap_destroy(
                &manager,&process)==NUSANTARA_ARM64_AS_OK);
        } else {
            assert(manager.count==0u);
            assert(process.initialized==0u);
        }
        assert(active_pages()==0u);
        assert(allocations==releases);
    }
    assert(saw_stack_rollback && saw_success);
    puts("PASS: allocation-failure sweep proves transactional cleanup");
    puts("NUSANTARA_PHASE116_PROCESS_BOOTSTRAP_PASS");
    return 0;
}
