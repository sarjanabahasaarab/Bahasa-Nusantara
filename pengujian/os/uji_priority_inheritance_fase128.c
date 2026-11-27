/* SPDX-License-Identifier: Apache-2.0 */
#include "priority-inheritance.h"
#include <assert.h>
#include <stdint.h>
#include <stdio.h>
static uint32_t effective(nusantara_os_scheduler_t *s,uint64_t id) {
 const nusantara_os_task_t *t=nusantara_os_scheduler_find(s,id);assert(t);return t->effective_priority;
}
int main(void) {
 nusantara_os_scheduler_t s;nusantara_os_priority_manager_t pm;
 nusantara_os_mutex_t first,second,chain;
 uint64_t low=0u,medium=0u,high=0u; nusantara_os_task_t *next=NULL;
 nusantara_os_scheduler_init(&s);
 assert(nusantara_os_scheduler_add(&s,0x1000u,NULL,2u,&low)==NUSANTARA_OS_SCHEDULER_OK);
 assert(nusantara_os_scheduler_add(&s,0x2000u,NULL,2u,&medium)==NUSANTARA_OS_SCHEDULER_OK);
 assert(nusantara_os_scheduler_add(&s,0x3000u,NULL,2u,&high)==NUSANTARA_OS_SCHEDULER_OK);
 nusantara_os_priority_manager_init(&pm,&s);
 assert(nusantara_os_priority_manager_set_base_priority(&pm,low,1u)==NUSANTARA_OS_PI_OK);
 assert(nusantara_os_priority_manager_set_base_priority(&pm,medium,5u)==NUSANTARA_OS_PI_OK);
 assert(nusantara_os_priority_manager_set_base_priority(&pm,high,10u)==NUSANTARA_OS_PI_OK);
 nusantara_os_mutex_init(&first,101u);nusantara_os_mutex_init(&second,102u);nusantara_os_mutex_init(&chain,103u);
 assert(nusantara_os_priority_manager_register(&pm,&first)==NUSANTARA_OS_PI_OK);
 assert(nusantara_os_priority_manager_register(&pm,&second)==NUSANTARA_OS_PI_OK);
 assert(nusantara_os_priority_manager_register(&pm,&chain)==NUSANTARA_OS_PI_OK);
 /* Low owns two mutexes; independent waiters must both contribute. */
 assert(nusantara_os_priority_mutex_lock(&pm,&first,low)==NUSANTARA_OS_PI_OK);
 assert(nusantara_os_priority_mutex_lock(&pm,&second,low)==NUSANTARA_OS_PI_OK);
 assert(nusantara_os_priority_mutex_lock(&pm,&first,high)==NUSANTARA_OS_PI_SYNC_ERROR);
 assert(effective(&s,low)==10u);
 assert(nusantara_os_priority_mutex_lock(&pm,&second,medium)==NUSANTARA_OS_PI_SYNC_ERROR);
 assert(effective(&s,low)==10u);
 /* Releasing the high waiter mutex must retain the medium boost from the other mutex. */
 assert(nusantara_os_priority_mutex_unlock(&pm,&first,low)==NUSANTARA_OS_PI_OK);
 assert(effective(&s,low)==5u);
 assert(nusantara_os_priority_mutex_unlock(&pm,&second,low)==NUSANTARA_OS_PI_OK);
 assert(effective(&s,low)==1u);
 /* Chained inheritance: high waits on medium; medium waits on low. */
 assert(nusantara_os_priority_mutex_lock(&pm,&chain,low)==NUSANTARA_OS_PI_OK);
 assert(nusantara_os_priority_mutex_lock(&pm,&first,medium)==NUSANTARA_OS_PI_OK);
 assert(nusantara_os_priority_mutex_lock(&pm,&chain,medium)==NUSANTARA_OS_PI_SYNC_ERROR);
 assert(effective(&s,medium)==5u);
 assert(nusantara_os_priority_mutex_lock(&pm,&first,high)==NUSANTARA_OS_PI_SYNC_ERROR);
 assert(effective(&s,medium)==10u);
 assert(effective(&s,low)==10u);
 assert(nusantara_os_priority_mutex_unlock(&pm,&first,medium)==NUSANTARA_OS_PI_OK);
 assert(effective(&s,medium)==5u);
 assert(effective(&s,low)==5u);
 assert(nusantara_os_priority_mutex_unlock(&pm,&chain,low)==NUSANTARA_OS_PI_OK);
 assert(effective(&s,low)==1u);
 assert(nusantara_os_priority_mutex_unlock(&pm,&first,high)==NUSANTARA_OS_PI_OK);
 assert(nusantara_os_scheduler_schedule(&s,&next)==NUSANTARA_OS_SCHEDULER_OK);
 assert(next->effective_priority==10u);
 puts("Phase 128: priority inheritance contract tests passed");return 0;
}
