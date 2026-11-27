/* SPDX-License-Identifier: Apache-2.0
 * Phase 117: load a static ELF64 image, enter EL0, handle SVC, and reclaim it.
 */
#include <stddef.h>
#include <stdint.h>
#include "process-bootstrap.h"
#include "mmu-control.h"

#define UART_BASE UINT64_C(0x09000000)
#define KERNEL_BASE UINT64_C(0x40000000)
#define KERNEL_BYTES UINT64_C(0x00200000)
#define USER_ENTRY UINT64_C(0x00400000)
#define USER_STACK_TOP UINT64_C(0x7fff0000)
#define USER_STACK_PAGES 2u
#define PAGE_COUNT 64u
#define ELF_BYTES 0x1008u
#define EXIT_MARKER UINT64_C(0x117)

extern void nusantara_arm64_exception_start_first_task(uintptr_t frame_pointer);

static _Alignas(4096) uint8_t page_pool[PAGE_COUNT][4096];
static uint8_t page_used[PAGE_COUNT];
static _Alignas(16) uint8_t kernel_stack[8192];
static nusantara_arm64_address_space_manager_t manager;
static nusantara_arm64_address_space_t kernel_space;
static nusantara_arm64_process_bootstrap_t process;
static uint8_t elf_image[ELF_BYTES];

static void uart_putc(char c)
{
    volatile uint32_t *fr=(volatile uint32_t *)(uintptr_t)(UART_BASE+0x18u);
    volatile uint32_t *dr=(volatile uint32_t *)(uintptr_t)(UART_BASE+0x00u);
    while((*fr&(1u<<5))!=0u) { }
    *dr=(uint32_t)(uint8_t)c;
}
static void uart_puts(const char *s) { while(*s) uart_putc(*s++); }
static void halt(void)
{
    __asm__ volatile("msr daifset, #0xf" ::: "memory");
    for(;;) __asm__ volatile("wfe");
}
static int page_allocate(void *ctx,uint64_t *pa,uint64_t **alias)
{
    size_t i,j; (void)ctx;
    if(pa==0 || alias==0) return 0;
    for(i=0;i<PAGE_COUNT;i++) if(!page_used[i]) {
        page_used[i]=1u;
        for(j=0;j<4096u;j++) page_pool[i][j]=0u;
        *pa=(uint64_t)(uintptr_t)page_pool[i];
        *alias=(uint64_t *)(void *)page_pool[i];
        return 1;
    }
    return 0;
}
static int page_resolve(void *ctx,uint64_t pa,uint64_t **alias)
{
    size_t i; (void)ctx;
    if(alias==0) return 0;
    for(i=0;i<PAGE_COUNT;i++)
        if(page_used[i] && (uint64_t)(uintptr_t)page_pool[i]==pa) {
            *alias=(uint64_t *)(void *)page_pool[i]; return 1;
        }
    return 0;
}
static void page_release(void *ctx,uint64_t pa)
{
    size_t i; (void)ctx;
    for(i=0;i<PAGE_COUNT;i++)
        if(page_used[i] && (uint64_t)(uintptr_t)page_pool[i]==pa) {
            page_used[i]=0u; return;
        }
}
static int install_root(void *ctx,uint64_t root)
{
    (void)ctx; return nusantara_arm64_mmu_install_ttbr0(root);
}
static size_t active_pages(void)
{
    size_t i,n=0u;
    for(i=0;i<PAGE_COUNT;i++) if(page_used[i]) ++n;
    return n;
}
static void put16(uint8_t *p,uint16_t v)
{ p[0]=(uint8_t)v; p[1]=(uint8_t)(v>>8); }
static void put32(uint8_t *p,uint32_t v)
{ p[0]=(uint8_t)v; p[1]=(uint8_t)(v>>8); p[2]=(uint8_t)(v>>16); p[3]=(uint8_t)(v>>24); }
static void put64(uint8_t *p,uint64_t v)
{ put32(p,(uint32_t)v); put32(p+4,(uint32_t)(v>>32)); }

static void make_elf(void)
{
    uint8_t *b=elf_image;
    size_t i;
    for(i=0;i<ELF_BYTES;i++) b[i]=0u;
    b[0]=0x7fu; b[1]='E'; b[2]='L'; b[3]='F';
    b[4]=2u; b[5]=1u; b[6]=1u;
    put16(b+16,2u); put16(b+18,183u); put32(b+20,1u);
    put64(b+24,USER_ENTRY); put64(b+32,64u);
    put16(b+52,64u); put16(b+54,56u); put16(b+56,1u);
    put32(b+64,1u); put32(b+68,5u);
    put64(b+72,0x1000u); put64(b+80,USER_ENTRY);
    put64(b+88,USER_ENTRY); put64(b+96,8u);
    put64(b+104,16u); put64(b+112,0x1000u);
    /* movz x0, #0x117 ; svc #0 */
    put32(b+0x1000,UINT32_C(0xd28022e0));
    put32(b+0x1004,UINT32_C(0xd4000001));
}

static int map_kernel(nusantara_arm64_address_space_t *space)
{
    uint64_t off;
    for(off=0u;off<KERNEL_BYTES;off+=4096u)
        if(!nusantara_arm64_mmu_map_page(&space->mmu,
             KERNEL_BASE+off,KERNEL_BASE+off,
             NUSANTARA_ARM64_PAGE_KERNEL_RW,1))
            return 0;
    if(!nusantara_arm64_mmu_map_page(&space->mmu,UART_BASE,UART_BASE,
          NUSANTARA_ARM64_PAGE_KERNEL_RW,0))
        return 0;
    {
        uint64_t *entry;
        /* QEMU virt PL011 uses MAIR AttrIdx 1 (Device-nGnRE). */
        entry=(uint64_t *)(uintptr_t)nusantara_arm64_mmu_lookup_page(&space->mmu,UART_BASE);
        (void)entry;
        /* Locate the L3 descriptor via the page-table walk helper. */
        {
            uint64_t *entries=space->mmu.root.entries;
            const unsigned shifts[3]={39u,30u,21u};
            unsigned level;
            for(level=0;level<3u;level++) {
                uint64_t d=entries[(UART_BASE>>shifts[level])&0x1ffu];
                nusantara_arm64_page_table_t child;
                child.entries=0;
                child.physical_address=d&NUSANTARA_ARM64_PA_MASK;
                if((d&3u)!=NUSANTARA_ARM64_DESC_TABLE_PAGE ||
                   !space->mmu.allocate_table(space->mmu.allocator_context,&child) ||
                   child.entries==0) return 0;
                entries=child.entries;
            }
            entries[(UART_BASE>>12)&0x1ffu]=
                (entries[(UART_BASE>>12)&0x1ffu]&~(UINT64_C(7)<<2))|
                (UINT64_C(1)<<2);
        }
    }
    return 1;
}

static nusantara_arm64_exception_frame_t *dispatch(
    void *ctx,nusantara_arm64_exception_frame_t *frame)
{
    (void)ctx;
    if(frame==0 || frame->vector!=8u ||
       ((frame->esr_el1>>26)&0x3fu)!=0x15u ||
       frame->x[0]!=EXIT_MARKER || frame->elr_el1!=USER_ENTRY+8u ||
       frame->sp_el0!=USER_STACK_TOP ||
       frame->spsr_el1!=NUSANTARA_ARM64_SPSR_EL0T) {
        uart_puts("NUSANTARA_PHASE117_FAIL_BAD_EL0_SVC\r\n");
        halt();
    }
    uart_puts("NUSANTARA_PHASE117_EL0_INSTRUCTION_EXECUTED\r\n");
    uart_puts("NUSANTARA_PHASE117_SVC_TRAPPED_AT_EL1\r\n");
    if(nusantara_arm64_address_space_switch(&manager,&kernel_space)!=
       NUSANTARA_ARM64_AS_OK) {
        uart_puts("NUSANTARA_PHASE117_FAIL_KERNEL_ADDRESS_SPACE\r\n");
        halt();
    }
    if(nusantara_arm64_process_bootstrap_destroy(&manager,&process)!=
       NUSANTARA_ARM64_AS_OK) {
        uart_puts("NUSANTARA_PHASE117_FAIL_PROCESS_RECLAIM\r\n");
        halt();
    }
    if(active_pages()!=kernel_space.table_page_count) {
        uart_puts("NUSANTARA_PHASE117_FAIL_FRAME_LEAK\r\n");
        halt();
    }
    uart_puts("NUSANTARA_PHASE117_PROCESS_FRAMES_RECLAIMED\r\n");
    uart_puts("NUSANTARA_PHASE117_PASS\r\n");
    halt();
    return 0;
}

void phase117_main(uintptr_t dtb)
{
    const nusantara_arm64_address_space_ops_t ops={
        page_allocate,page_resolve,page_release,install_root
    };
    (void)dtb;
    uart_puts("NUSANTARA_PHASE117_BOOT\r\n");
    make_elf();
    if(!nusantara_arm64_install_exception_vectors() ||
       !nusantara_arm64_address_space_manager_init(&manager,&ops,0)) {
        uart_puts("NUSANTARA_PHASE117_FAIL_INIT\r\n"); halt();
    }
    if(nusantara_arm64_address_space_create(&manager,&kernel_space,1u)!=
       NUSANTARA_ARM64_AS_OK || !map_kernel(&kernel_space)) {
        uart_puts("NUSANTARA_PHASE117_FAIL_KERNEL_MAP\r\n"); halt();
    }
    if(nusantara_arm64_process_bootstrap_create(
        &manager,&process,2u,elf_image,sizeof(elf_image),USER_STACK_TOP,
        USER_STACK_PAGES,0u,USER_ENTRY,kernel_stack,sizeof(kernel_stack))!=
        NUSANTARA_ARM64_PROCESS_BOOTSTRAP_OK) {
        uart_puts("NUSANTARA_PHASE117_FAIL_ELF_BOOTSTRAP\r\n"); halt();
    }
    if(!map_kernel(&process.address_space) ||
       !nusantara_arm64_exception_set_handler(dispatch,0) ||
       nusantara_arm64_address_space_switch(&manager,&process.address_space)!=
           NUSANTARA_ARM64_AS_OK ||
       !nusantara_arm64_mmu_enable_el1(process.address_space.root_physical)) {
        uart_puts("NUSANTARA_PHASE117_FAIL_MMU_OR_ROUTER\r\n"); halt();
    }
    uart_puts("NUSANTARA_PHASE117_ERET_TO_EL0\r\n");
    nusantara_arm64_exception_start_first_task((uintptr_t)process.initial_frame);
    uart_puts("NUSANTARA_PHASE117_FAIL_ERET_RETURNED\r\n");
    halt();
}
