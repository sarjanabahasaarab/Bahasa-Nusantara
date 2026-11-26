/* SPDX-License-Identifier: Apache-2.0 */
#include <stddef.h>
#include <stdint.h>
#include "address-space.h"
#include "exception.h"
#include "mmu-control.h"

#define UART_BASE UINT64_C(0x09000000)
#define UART_FR UINT64_C(0x18)
#define UART_DR UINT64_C(0x00)
#define KERNEL_BASE UINT64_C(0x40000000)
#define KERNEL_BYTES UINT64_C(0x00200000)
#define CODE_VA UINT64_C(0x10000000)
#define DATA_VA UINT64_C(0x10001000)
#define PRIVATE_VA UINT64_C(0x10003000)
#define STACK_VA UINT64_C(0x1000f000)
#define STACK_TOP (STACK_VA + UINT64_C(0x1000))
#define PAGE_COUNT 48u

extern void phase113_user_entry(void);
static _Alignas(4096) uint8_t page_pool[PAGE_COUNT][4096];
static uint8_t page_used[PAGE_COUNT];
static _Alignas(16) uint8_t kernel_stack_a[8192], kernel_stack_b[8192];
static nusantara_arm64_address_space_manager_t manager;
static nusantara_arm64_address_space_t process_a, process_b;
static nusantara_arm64_exception_frame_t *frame_a, *frame_b;
static uint64_t *data_a_alias, *data_b_alias, *private_a_alias;
static uint64_t *stack_a_alias, *stack_b_alias;
static unsigned handoff_seen;

static void uart_putc(char c) {
    volatile uint32_t *fr=(volatile uint32_t *)(uintptr_t)(UART_BASE+UART_FR);
    volatile uint32_t *dr=(volatile uint32_t *)(uintptr_t)(UART_BASE+UART_DR);
    while ((*fr & (1u<<5)) != 0u) { }
    *dr=(uint32_t)(uint8_t)c;
}
static void uart_puts(const char *s) { while (*s) uart_putc(*s++); }
static void uart_hex64(uint64_t value) {
    static const char digits[] = "0123456789abcdef";
    int shift;
    for (shift = 60; shift >= 0; shift -= 4)
        uart_putc(digits[(value >> (unsigned)shift) & 0x0fu]);
}
static void halt(void) {
    __asm__ volatile("msr daifset, #0xf" ::: "memory");
    for (;;) __asm__ volatile("wfe");
}
static int page_allocate(void *ctx,uint64_t *pa,uint64_t **alias) {
    size_t i,j; (void)ctx;
    if (!pa || !alias) return 0;
    for(i=0;i<PAGE_COUNT;i++) if(!page_used[i]) {
        page_used[i]=1;
        for(j=0;j<4096;j++) page_pool[i][j]=0;
        *pa=(uint64_t)(uintptr_t)page_pool[i];
        *alias=(uint64_t *)(void *)page_pool[i];
        return 1;
    }
    return 0;
}
static int page_resolve(void *ctx,uint64_t pa,uint64_t **alias) {
    size_t i; (void)ctx;
    if(!alias) return 0;
    for(i=0;i<PAGE_COUNT;i++)
        if((uint64_t)(uintptr_t)page_pool[i]==pa && page_used[i]) {
            *alias=(uint64_t *)(void *)page_pool[i]; return 1;
        }
    return 0;
}
static void page_release(void *ctx,uint64_t pa) {
    size_t i; (void)ctx;
    for(i=0;i<PAGE_COUNT;i++)
        if((uint64_t)(uintptr_t)page_pool[i]==pa) { page_used[i]=0; return; }
}
static int install_root(void *ctx,uint64_t root) {
    (void)ctx; return nusantara_arm64_mmu_install_ttbr0(root);
}
static int alloc_user(uint64_t *pa,uint64_t **alias) {
    return page_allocate(0,pa,alias);
}
static uint64_t *l3_entry(nusantara_arm64_address_space_t *space,uint64_t va) {
    static const unsigned shifts[3]={39u,30u,21u};
    uint64_t *entries=space->mmu.root.entries;
    unsigned level;
    for(level=0;level<3;level++) {
        unsigned idx=(unsigned)((va>>shifts[level])&0x1ffu);
        uint64_t d=entries[idx];
        nusantara_arm64_page_table_t child;
        if((d&3u)!=NUSANTARA_ARM64_DESC_TABLE_PAGE) return 0;
        child.entries=0; child.physical_address=d&NUSANTARA_ARM64_PA_MASK;
        if(!space->mmu.allocate_table(space->mmu.allocator_context,&child) || !child.entries)
            return 0;
        entries=child.entries;
    }
    return &entries[(va>>12)&0x1ffu];
}
static int map_kernel(nusantara_arm64_address_space_t *space) {
    uint64_t off;
    /* Identity-map kernel text, data, stacks, and allocator pages as EL1-only. */
    for(off=0;off<KERNEL_BYTES;off+=4096u)
        if(!nusantara_arm64_mmu_map_page(&space->mmu,KERNEL_BASE+off,KERNEL_BASE+off,
              NUSANTARA_ARM64_PAGE_KERNEL_RW,1)) return 0;
    if(!nusantara_arm64_mmu_map_page(&space->mmu,UART_BASE,UART_BASE,
          NUSANTARA_ARM64_PAGE_KERNEL_RW,0)) return 0;
    {
        uint64_t *entry=l3_entry(space,UART_BASE);
        if(!entry) return 0;
        *entry=(*entry&~(UINT64_C(7)<<2))|(UINT64_C(1)<<2);
    }
    return 1;
}
static int map_process(nusantara_arm64_address_space_t *space,
                       uint64_t data,uint64_t stack,int private_map,uint64_t private_page) {
    uint64_t code=(uint64_t)(uintptr_t)phase113_user_entry&NUSANTARA_ARM64_PA_MASK;
    if(!map_kernel(space)) return 0;
    if(nusantara_arm64_address_space_map_user(&manager,space,CODE_VA,code,
         NUSANTARA_ARM64_PAGE_USER_RO,1,0)!=NUSANTARA_ARM64_AS_OK) return 0;
    if(nusantara_arm64_address_space_map_user(&manager,space,DATA_VA,data,
         NUSANTARA_ARM64_PAGE_USER_RW,0,1)!=NUSANTARA_ARM64_AS_OK) return 0;
    if(nusantara_arm64_address_space_map_user(&manager,space,STACK_VA,stack,
         NUSANTARA_ARM64_PAGE_USER_RW,0,1)!=NUSANTARA_ARM64_AS_OK) return 0;
    if(private_map && nusantara_arm64_address_space_map_user(&manager,space,PRIVATE_VA,
         private_page,NUSANTARA_ARM64_PAGE_USER_RW,0,1)!=NUSANTARA_ARM64_AS_OK) return 0;
    return 1;
}
static nusantara_arm64_exception_frame_t *dispatch(void *ctx,nusantara_arm64_exception_frame_t *f) {
    nusantara_arm64_mmu_fault_t fault; (void)ctx;
    if(!f) return 0;
    if(f->vector==8u && ((f->esr_el1>>26)&0x3fu)==0x15u && handoff_seen==1u) {
        /* Process B completed its own SVC; resume after SVC to test A-only VA. */
        f->elr_el1 += 4u;
        return f;
    }
    if(f->vector==8u && ((f->esr_el1>>26)&0x3fu)==0x15u && handoff_seen==0u) {
        handoff_seen=1u; frame_a=f;
        uart_puts("NUSANTARA_PHASE113_PROCESS_A_SVC\r\n");
        if(nusantara_arm64_address_space_switch(&manager,&process_b)!=NUSANTARA_ARM64_AS_OK) {
            uart_puts("NUSANTARA_PHASE113_FAIL_SWITCH_B\r\n"); return 0;
        }
        uart_puts("NUSANTARA_PHASE113_ADDRESS_SPACE_SWITCH_OK\r\n");
        uart_puts("NUSANTARA_PHASE113_PROCESS_B_ENTER\r\n");
        return frame_b;
    }
    if(f->vector==8u && nusantara_arm64_mmu_decode_fault(f->esr_el1,&fault) &&
       fault.exception_class==0x24u && fault.fault_status==0x07u &&
       fault.write==0u && f->far_el1==PRIVATE_VA) {
        if(handoff_seen!=1u || !data_a_alias || !data_b_alias || !private_a_alias ||
           *data_a_alias!=UINT64_C(0xa1) || *data_b_alias!=UINT64_C(0xb2) ||
           *private_a_alias!=UINT64_C(0xfeed113)) {
            uart_puts("NUSANTARA_PHASE113_FAIL_DATA_ISOLATION\r\n"); halt();
        }
        uart_puts("NUSANTARA_PHASE113_CROSS_PROCESS_ACCESS_BLOCKED\r\n");
        uart_puts("NUSANTARA_PHASE113_SAME_VA_PRIVATE_FRAMES_OK\r\n");
        uart_puts("NUSANTARA_PHASE113_PASS\r\n"); halt();
    }
    uart_puts("NUSANTARA_PHASE113_UNEXPECTED_EXCEPTION ESR=");
    uart_hex64(f->esr_el1);
    uart_puts(" FAR=");
    uart_hex64(f->far_el1);
    uart_puts(" VECTOR=");
    uart_hex64(f->vector);
    uart_puts(" X9=");
    uart_hex64(f->x[9]);
    uart_puts(" ELR=");
    uart_hex64(f->elr_el1);
    uart_puts("\r\n"); halt(); return 0;
}
void phase113_main(uintptr_t dtb) {
    const nusantara_arm64_address_space_ops_t ops={page_allocate,page_resolve,page_release,install_root};
    uint64_t da=0u,db=0u,priv=0u,sa=0u,sb=0u; (void)dtb;
    uart_puts("NUSANTARA_PHASE113_BOOT\r\n");
    if(!nusantara_arm64_install_exception_vectors() ||
       !nusantara_arm64_address_space_manager_init(&manager,&ops,0)) {
        uart_puts("NUSANTARA_PHASE113_FAIL_INIT\r\n"); halt();
    }
    if(nusantara_arm64_address_space_create(&manager,&process_a,1u)!=NUSANTARA_ARM64_AS_OK ||
       nusantara_arm64_address_space_create(&manager,&process_b,2u)!=NUSANTARA_ARM64_AS_OK) {
        uart_puts("NUSANTARA_PHASE113_FAIL_CREATE\r\n"); halt();
    }
    if(!alloc_user(&da,&data_a_alias) || !alloc_user(&db,&data_b_alias) ||
       !alloc_user(&priv,&private_a_alias) || !alloc_user(&sa,&stack_a_alias) || !alloc_user(&sb,&stack_b_alias)) {
        uart_puts("NUSANTARA_PHASE113_FAIL_FRAME_ALLOC\r\n"); halt();
    }
    *private_a_alias=UINT64_C(0xfeed113);
    if(!map_process(&process_a,da,sa,1,priv) || !map_process(&process_b,db,sb,0,0)) {
        uart_puts("NUSANTARA_PHASE113_FAIL_MAP\r\n"); halt();
    }
    if(!nusantara_arm64_exception_user_context_prepare(&frame_a,kernel_stack_a,sizeof(kernel_stack_a),
         CODE_VA,STACK_TOP,(uintptr_t)UINT64_C(0xa1),CODE_VA) ||
       !nusantara_arm64_exception_user_context_prepare(&frame_b,kernel_stack_b,sizeof(kernel_stack_b),
         CODE_VA,STACK_TOP,(uintptr_t)UINT64_C(0xb2),CODE_VA)) {
        uart_puts("NUSANTARA_PHASE113_FAIL_CONTEXT\r\n"); halt();
    }
    if(!nusantara_arm64_exception_set_handler(dispatch,0) ||
       nusantara_arm64_address_space_switch(&manager,&process_a)!=NUSANTARA_ARM64_AS_OK ||
       !nusantara_arm64_mmu_enable_el1(process_a.root_physical)) {
        uart_puts("NUSANTARA_PHASE113_FAIL_MMU\r\n"); halt();
    }
    manager.active=&process_a;
    uart_puts("NUSANTARA_PHASE113_PROCESS_A_ENTER\r\n");
    nusantara_arm64_exception_start_first_task((uintptr_t)frame_a);
    uart_puts("NUSANTARA_PHASE113_FAIL_ERET_RETURNED\r\n"); halt();
}
