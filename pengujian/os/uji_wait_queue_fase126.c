/* SPDX-License-Identifier: Apache-2.0 */
#include <assert.h>
#include <stdint.h>
#include <stdio.h>
#include "wait-queue.h"
int main(void){
 nusantara_os_scheduler_t s;nusantara_os_wait_queue_t q;
 uint64_t a,b,c,woken_id=0,all[4]={0};size_t count=0;
 nusantara_os_scheduler_init(&s);
 assert(nusantara_os_scheduler_add(&s,0x1000,0,2,&a)==NUSANTARA_OS_SCHEDULER_OK);
 assert(nusantara_os_scheduler_add(&s,0x2000,0,2,&b)==NUSANTARA_OS_SCHEDULER_OK);
 assert(nusantara_os_scheduler_add(&s,0x3000,0,2,&c)==NUSANTARA_OS_SCHEDULER_OK);
 nusantara_os_wait_queue_init(&q,0xfeed);
 assert(nusantara_os_wait_queue_sleep(&q,&s,a)==NUSANTARA_OS_WAIT_QUEUE_OK);
 assert(nusantara_os_wait_queue_sleep(&q,&s,b)==NUSANTARA_OS_WAIT_QUEUE_OK);
 assert(nusantara_os_scheduler_find(&s,a)->state==NUSANTARA_OS_TASK_BLOCKED);
 assert(nusantara_os_wait_queue_sleep(&q,&s,a)==NUSANTARA_OS_WAIT_QUEUE_INVALID_STATE);
 assert(nusantara_os_wait_queue_wake_one(&q,&s,&woken_id)==NUSANTARA_OS_WAIT_QUEUE_OK);
 assert(woken_id==a&&nusantara_os_scheduler_find(&s,a)->state==NUSANTARA_OS_TASK_READY);
 assert(nusantara_os_wait_queue_sleep(&q,&s,c)==NUSANTARA_OS_WAIT_QUEUE_OK);
 assert(nusantara_os_wait_queue_wake_all(&q,&s,all,4,&count)==NUSANTARA_OS_WAIT_QUEUE_OK);
 assert(count==2&&all[0]==b&&all[1]==c&&q.count==0);
 assert(nusantara_os_scheduler_find(&s,b)->state==NUSANTARA_OS_TASK_READY);
 assert(nusantara_os_scheduler_find(&s,c)->state==NUSANTARA_OS_TASK_READY);
 assert(nusantara_os_wait_queue_wake_one(&q,&s,&woken_id)==NUSANTARA_OS_WAIT_QUEUE_NOT_FOUND);
 puts("Phase 126 wait queue contract: PASS");return 0;
}
