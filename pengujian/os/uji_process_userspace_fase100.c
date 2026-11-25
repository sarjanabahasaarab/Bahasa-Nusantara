/* SPDX-License-Identifier: Apache-2.0 */
#include "process.h"
#include <assert.h>
#include <stdint.h>
#include <stdio.h>
int main(void) {
 nusantara_os_process_manager_t m;uint64_t p1=0,p2=0;
 const nusantara_os_process_t *p;
 nusantara_os_process_manager_init(&m);
 assert(nusantara_os_process_create(&m,0u,11u,0x1000u,NUSANTARA_OS_PROCESS_USER,&p1)==NUSANTARA_OS_PROCESS_OK);
 assert(p1!=0u&&m.count==1u);
 assert(nusantara_os_process_create(&m,p1,12u,0x2000u,NUSANTARA_OS_PROCESS_USER,&p2)==NUSANTARA_OS_PROCESS_OK);
 assert(p2!=p1&&m.count==2u);
 assert(nusantara_os_process_create(&m,999u,13u,0x3000u,NUSANTARA_OS_PROCESS_USER,&p2)==NUSANTARA_OS_PROCESS_INVALID_PARENT);
 assert(nusantara_os_process_create(&m,0u,14u,0x2001u,NUSANTARA_OS_PROCESS_USER,&p2)==NUSANTARA_OS_PROCESS_INVALID_ADDRESS_SPACE);
 assert(nusantara_os_process_create(&m,0u,0u,0x3000u,NUSANTARA_OS_PROCESS_USER,&p2)==NUSANTARA_OS_PROCESS_INVALID_ARGUMENT);
 assert(nusantara_os_process_mark_ready(&m,p1)==NUSANTARA_OS_PROCESS_OK);
 assert(nusantara_os_process_mark_running(&m,p1)==NUSANTARA_OS_PROCESS_OK);
 assert(nusantara_os_process_block(&m,p1)==NUSANTARA_OS_PROCESS_OK);
 assert(nusantara_os_process_resume(&m,p1)==NUSANTARA_OS_PROCESS_OK);
 assert(nusantara_os_process_mark_running(&m,p1)==NUSANTARA_OS_PROCESS_OK);
 assert(nusantara_os_process_exit(&m,p1,23)==NUSANTARA_OS_PROCESS_OK&&m.count==1u);
 p=nusantara_os_process_find(&m,p1);
 assert(p&&p->state==NUSANTARA_OS_PROCESS_EXITED&&p->exit_code==23);
 assert(nusantara_os_process_create(&m,p1,15u,0x4000u,NUSANTARA_OS_PROCESS_USER,&p2)==NUSANTARA_OS_PROCESS_INVALID_PARENT);
 assert(nusantara_os_process_exit(&m,p1,0)==NUSANTARA_OS_PROCESS_INVALID_STATE);
 assert(nusantara_os_process_mark_ready(&m,999u)==NUSANTARA_OS_PROCESS_NOT_FOUND);
 puts("Phase 100: process/userspace contract tests passed");
 return 0;
}
