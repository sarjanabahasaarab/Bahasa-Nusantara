/* SPDX-License-Identifier: Apache-2.0 */
#include <assert.h>
#include <stdint.h>
#include <stdio.h>
#include "sync.h"
int main(void){
 nusantara_os_scheduler_t s;nusantara_os_mutex_t m;nusantara_os_semaphore_t sem;
 uint64_t a,b,c;
 nusantara_os_scheduler_init(&s);
 assert(nusantara_os_scheduler_add(&s,0x1000,0,2,&a)==NUSANTARA_OS_SCHEDULER_OK);
 assert(nusantara_os_scheduler_add(&s,0x2000,0,2,&b)==NUSANTARA_OS_SCHEDULER_OK);
 assert(nusantara_os_scheduler_add(&s,0x3000,0,2,&c)==NUSANTARA_OS_SCHEDULER_OK);
 nusantara_os_mutex_init(&m,0xabc);
 assert(nusantara_os_mutex_try_lock(&m,a)==NUSANTARA_OS_SYNC_OK);
 assert(nusantara_os_mutex_try_lock(&m,b)==NUSANTARA_OS_SYNC_WOULD_BLOCK);
 assert(nusantara_os_mutex_lock(&m,&s,b)==NUSANTARA_OS_SYNC_WOULD_BLOCK);
 assert(nusantara_os_scheduler_find(&s,b)->state==NUSANTARA_OS_TASK_BLOCKED);
 assert(nusantara_os_mutex_unlock(&m,&s,c)==NUSANTARA_OS_SYNC_NOT_OWNER);
 assert(nusantara_os_mutex_unlock(&m,&s,a)==NUSANTARA_OS_SYNC_OK);
 assert(m.owner==b&&nusantara_os_scheduler_find(&s,b)->state==NUSANTARA_OS_TASK_READY);
 assert(nusantara_os_mutex_unlock(&m,&s,b)==NUSANTARA_OS_SYNC_OK&&m.owner==0u);
 nusantara_os_semaphore_init(&sem,0xdef,1,2);
 assert(nusantara_os_semaphore_wait(&sem,&s,a)==NUSANTARA_OS_SYNC_OK&&sem.value==0u);
 assert(nusantara_os_semaphore_wait(&sem,&s,b)==NUSANTARA_OS_SYNC_WOULD_BLOCK);
 assert(nusantara_os_scheduler_find(&s,b)->state==NUSANTARA_OS_TASK_BLOCKED);
 assert(nusantara_os_semaphore_post(&sem,&s)==NUSANTARA_OS_SYNC_OK);
 assert(nusantara_os_scheduler_find(&s,b)->state==NUSANTARA_OS_TASK_READY&&sem.value==0u);
 assert(nusantara_os_semaphore_post(&sem,&s)==NUSANTARA_OS_SYNC_OK&&sem.value==1u);
 assert(nusantara_os_semaphore_post(&sem,&s)==NUSANTARA_OS_SYNC_OK&&sem.value==2u);
 assert(nusantara_os_semaphore_post(&sem,&s)==NUSANTARA_OS_SYNC_OVERFLOW&&sem.value==2u);
 puts("Phase 127 mutex/semaphore contract: PASS");return 0;
}
