/* SPDX-License-Identifier: Apache-2.0 */
#include "virtual-memory-manager.h"
#include <stddef.h>
#define V  (UINT64_C(1)<<0)
#define T  (UINT64_C(1)<<1)
#define A_NORMAL (UINT64_C(0)<<2)
#define A_DEVICE (UINT64_C(1)<<2)
#define AP_USER (UINT64_C(1)<<6)
#define AP_RO (UINT64_C(1)<<7)
#define SH_INNER (UINT64_C(3)<<8)
#define AF (UINT64_C(1)<<10)
#define NG (UINT64_C(1)<<11)
#define PXN (UINT64_C(1)<<53)
#define UXN (UINT64_C(1)<<54)
static int valid(const nusantara_os_vmm_t *m) {
 return m && m->initialized && m->ops.alloc_table && m->ops.map_table && m->ops.free_table;
}
static int va_valid(uint64_t va) { return va < NUSANTARA_OS_VMM_ADDRESS_LIMIT; }
static unsigned ix(uint64_t va,unsigned level) { return (unsigned)((va>>(39u-level*9u))&UINT64_C(0x1ff)); }
static uint64_t *table_for(const nusantara_os_vmm_t *m,uint64_t pa) {
 if ((pa&4095u)!=0u || (pa&~NUSANTARA_OS_VMM_DESCRIPTOR_ADDR)!=0u) return NULL;
 return (uint64_t *)m->ops.map_table(m->ops.context,pa);
}
static int flags_valid(uint32_t f) {
 const uint32_t mask=NUSANTARA_OS_VMM_READ|NUSANTARA_OS_VMM_WRITE|NUSANTARA_OS_VMM_USER|NUSANTARA_OS_VMM_EXECUTE|NUSANTARA_OS_VMM_DEVICE|NUSANTARA_OS_VMM_NON_GLOBAL;
 return (f&~mask)==0u && (f&NUSANTARA_OS_VMM_READ)!=0u;
}
static uint64_t make_leaf(uint64_t pa,uint32_t f) {
 uint64_t d=(pa&NUSANTARA_OS_VMM_DESCRIPTOR_ADDR)|V|T|AF|SH_INNER;
 d|=(f&NUSANTARA_OS_VMM_DEVICE)?A_DEVICE:A_NORMAL;
 if(f&NUSANTARA_OS_VMM_USER)d|=AP_USER;
 if(!(f&NUSANTARA_OS_VMM_WRITE))d|=AP_RO;
 if(f&NUSANTARA_OS_VMM_NON_GLOBAL)d|=NG;
 if(!(f&NUSANTARA_OS_VMM_EXECUTE))d|=PXN|UXN;
 else if(f&NUSANTARA_OS_VMM_USER)d|=PXN;
 else d|=UXN;
 return d;
}
nusantara_os_vmm_status_t nusantara_os_vmm_init(nusantara_os_vmm_t *m,uint64_t root,const nusantara_os_vmm_ops_t *ops) {
 if(!m||!ops||!ops->alloc_table||!ops->map_table||!ops->free_table||(root&4095u)||(root&~NUSANTARA_OS_VMM_DESCRIPTOR_ADDR))return NUSANTARA_OS_VMM_INVALID_ARGUMENT;
 if(!ops->map_table(ops->context,root))return NUSANTARA_OS_VMM_INVALID_ARGUMENT;
 m->root_physical=root;m->ops=*ops;m->initialized=1u;return NUSANTARA_OS_VMM_OK;
}
nusantara_os_vmm_status_t nusantara_os_vmm_map(nusantara_os_vmm_t *m,uint64_t va,uint64_t pa,uint32_t f) {
 uint64_t table_pa,*table;unsigned level;
 if(!valid(m))return NUSANTARA_OS_VMM_INVALID_ARGUMENT;
 if(!va_valid(va)||(va&4095u)||(pa&4095u)||(pa&~NUSANTARA_OS_VMM_DESCRIPTOR_ADDR))return NUSANTARA_OS_VMM_INVALID_ADDRESS;
 if(!flags_valid(f))return NUSANTARA_OS_VMM_INVALID_FLAGS;
 table_pa=m->root_physical;table=table_for(m,table_pa);if(!table)return NUSANTARA_OS_VMM_CORRUPT_TABLE;
 for(level=0;level<3u;++level) {
  unsigned index=ix(va,level);uint64_t e=table[index];
  if(!(e&V)) {
   uint64_t new_pa=0u,*new_table;unsigned i;
   if(!m->ops.alloc_table(m->ops.context,&new_pa))return NUSANTARA_OS_VMM_OUT_OF_TABLE_MEMORY;
   if((new_pa&4095u)||(new_pa&~NUSANTARA_OS_VMM_DESCRIPTOR_ADDR)){m->ops.free_table(m->ops.context,new_pa);return NUSANTARA_OS_VMM_CORRUPT_TABLE;}
   new_table=table_for(m,new_pa);if(!new_table){m->ops.free_table(m->ops.context,new_pa);return NUSANTARA_OS_VMM_CORRUPT_TABLE;}
   for(i=0;i<512u;++i)new_table[i]=0u;
   table[index]=(new_pa&NUSANTARA_OS_VMM_DESCRIPTOR_ADDR)|V|T;e=table[index];
  } else if(!(e&T)) return NUSANTARA_OS_VMM_CORRUPT_TABLE;
  table_pa=e&NUSANTARA_OS_VMM_DESCRIPTOR_ADDR;table=table_for(m,table_pa);
  if(!table)return NUSANTARA_OS_VMM_CORRUPT_TABLE;
 }
 if(table[ix(va,3u)]&V)return NUSANTARA_OS_VMM_ALREADY_MAPPED;
 table[ix(va,3u)]=make_leaf(pa,f);
 if(m->ops.invalidate_page)m->ops.invalidate_page(m->ops.context,va);
 return NUSANTARA_OS_VMM_OK;
}
nusantara_os_vmm_status_t nusantara_os_vmm_unmap(nusantara_os_vmm_t *m,uint64_t va) {
 uint64_t *table,pa;unsigned level;
 if(!valid(m))return NUSANTARA_OS_VMM_INVALID_ARGUMENT;
 if(!va_valid(va)||(va&4095u))return NUSANTARA_OS_VMM_INVALID_ADDRESS;
 pa=m->root_physical;table=table_for(m,pa);if(!table)return NUSANTARA_OS_VMM_CORRUPT_TABLE;
 for(level=0;level<3u;++level){uint64_t e=table[ix(va,level)];if(!(e&V))return NUSANTARA_OS_VMM_NOT_MAPPED;if(!(e&T))return NUSANTARA_OS_VMM_CORRUPT_TABLE;pa=e&NUSANTARA_OS_VMM_DESCRIPTOR_ADDR;table=table_for(m,pa);if(!table)return NUSANTARA_OS_VMM_CORRUPT_TABLE;}
 if(!(table[ix(va,3u)]&V))return NUSANTARA_OS_VMM_NOT_MAPPED;
 table[ix(va,3u)]=0u;if(m->ops.invalidate_page)m->ops.invalidate_page(m->ops.context,va);return NUSANTARA_OS_VMM_OK;
}
nusantara_os_vmm_status_t nusantara_os_vmm_lookup(const nusantara_os_vmm_t *m,uint64_t va,uint64_t *out,uint32_t *flags) {
 uint64_t *table,pa,e;unsigned level;uint32_t f=0u;
 if(!valid(m)||!out||!flags)return NUSANTARA_OS_VMM_INVALID_ARGUMENT;
 if(!va_valid(va))return NUSANTARA_OS_VMM_INVALID_ADDRESS;
 pa=m->root_physical;table=table_for(m,pa);if(!table)return NUSANTARA_OS_VMM_CORRUPT_TABLE;
 for(level=0;level<3u;++level){e=table[ix(va,level)];if(!(e&V))return NUSANTARA_OS_VMM_NOT_MAPPED;if(!(e&T))return NUSANTARA_OS_VMM_CORRUPT_TABLE;pa=e&NUSANTARA_OS_VMM_DESCRIPTOR_ADDR;table=table_for(m,pa);if(!table)return NUSANTARA_OS_VMM_CORRUPT_TABLE;}
 e=table[ix(va,3u)];if(!(e&V))return NUSANTARA_OS_VMM_NOT_MAPPED;
 f|=NUSANTARA_OS_VMM_READ;if(!(e&AP_RO))f|=NUSANTARA_OS_VMM_WRITE;
 if(e&AP_USER)f|=NUSANTARA_OS_VMM_USER;
 if((e&(PXN|UXN))!=(PXN|UXN))f|=NUSANTARA_OS_VMM_EXECUTE;
 if((e&(UINT64_C(3)<<2))==A_DEVICE)f|=NUSANTARA_OS_VMM_DEVICE;
 if(e&NG)f|=NUSANTARA_OS_VMM_NON_GLOBAL;
 *out=(e&NUSANTARA_OS_VMM_DESCRIPTOR_ADDR)|(va&4095u);*flags=f;return NUSANTARA_OS_VMM_OK;
}
