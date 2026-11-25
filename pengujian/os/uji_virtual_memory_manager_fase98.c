/* SPDX-License-Identifier: Apache-2.0 */
#include "virtual-memory-manager.h"
#include <assert.h>
#include <stdint.h>
#include <stdio.h>
#include <string.h>
#define N 32u
#define BASE UINT64_C(0x100000)
typedef struct mem { uint64_t p[N][512]; uint8_t used[N]; unsigned tlbi; } mem_t;
static int alloc(void *c,uint64_t *pa){mem_t*m=c;unsigned i;for(i=0;i<N;i++)if(!m->used[i]){m->used[i]=1;memset(m->p[i],0,sizeof(m->p[i]));*pa=BASE+(uint64_t)i*4096u;return 1;}return 0;}
static void *map(void*c,uint64_t pa){mem_t*m=c;uint64_t d;if(pa<BASE)return NULL;d=pa-BASE;if(d%4096u)return NULL;d/=4096u;return d<N&&m->used[d]?m->p[d]:NULL;}
static void release(void*c,uint64_t pa){mem_t*m=c;uint64_t i=(pa-BASE)/4096u;if(i<N)m->used[i]=0;}
static void inv(void*c,uint64_t va){mem_t*m=c;(void)va;++m->tlbi;}
int main(void){
 mem_t mem;nusantara_os_vmm_ops_t ops;nusantara_os_vmm_t v;uint64_t pa=0;uint32_t f=0;
 memset(&mem,0,sizeof(mem));mem.used[0]=1;ops.context=&mem;ops.alloc_table=alloc;ops.map_table=map;ops.free_table=release;ops.invalidate_page=inv;
 assert(nusantara_os_vmm_init(&v,BASE,&ops)==NUSANTARA_OS_VMM_OK);
 assert(nusantara_os_vmm_map(&v,0x40000000u,0x80000000u,NUSANTARA_OS_VMM_READ|NUSANTARA_OS_VMM_WRITE)==NUSANTARA_OS_VMM_OK);
 assert(mem.tlbi==1u);
 assert(nusantara_os_vmm_lookup(&v,0x40000123u,&pa,&f)==NUSANTARA_OS_VMM_OK&&pa==0x80000123u);
 assert((f&(NUSANTARA_OS_VMM_READ|NUSANTARA_OS_VMM_WRITE))==(NUSANTARA_OS_VMM_READ|NUSANTARA_OS_VMM_WRITE));
 assert(nusantara_os_vmm_map(&v,0x40000000u,0x90000000u,NUSANTARA_OS_VMM_READ)==NUSANTARA_OS_VMM_ALREADY_MAPPED);
 assert(nusantara_os_vmm_map(&v,0x40001000u,0x90000000u,NUSANTARA_OS_VMM_READ|NUSANTARA_OS_VMM_USER|NUSANTARA_OS_VMM_EXECUTE)==NUSANTARA_OS_VMM_OK);
 assert(nusantara_os_vmm_lookup(&v,0x40001000u,&pa,&f)==NUSANTARA_OS_VMM_OK&&(f&NUSANTARA_OS_VMM_USER)&&(f&NUSANTARA_OS_VMM_EXECUTE)&&!(f&NUSANTARA_OS_VMM_WRITE));
 assert(nusantara_os_vmm_map(&v,0x40002000u,0x90002000u,NUSANTARA_OS_VMM_READ|NUSANTARA_OS_VMM_DEVICE)==NUSANTARA_OS_VMM_OK);
 assert(nusantara_os_vmm_lookup(&v,0x40002000u,&pa,&f)==NUSANTARA_OS_VMM_OK&&(f&NUSANTARA_OS_VMM_DEVICE));
 assert(nusantara_os_vmm_unmap(&v,0x40000000u)==NUSANTARA_OS_VMM_OK);
 assert(nusantara_os_vmm_lookup(&v,0x40000000u,&pa,&f)==NUSANTARA_OS_VMM_NOT_MAPPED);
 assert(nusantara_os_vmm_unmap(&v,0x40000000u)==NUSANTARA_OS_VMM_NOT_MAPPED);
 assert(nusantara_os_vmm_map(&v,0x40000001u,0x90000000u,NUSANTARA_OS_VMM_READ)==NUSANTARA_OS_VMM_INVALID_ADDRESS);
 assert(nusantara_os_vmm_map(&v,0x50000000u,0x90000000u,NUSANTARA_OS_VMM_WRITE)==NUSANTARA_OS_VMM_INVALID_FLAGS);
 assert(nusantara_os_vmm_map(&v,UINT64_C(0x0001000000000000),0x90000000u,NUSANTARA_OS_VMM_READ)==NUSANTARA_OS_VMM_INVALID_ADDRESS);
 puts("Phase 98: virtual memory manager contract tests passed");return 0;
}
