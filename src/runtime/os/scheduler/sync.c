/* SPDX-License-Identifier: Apache-2.0 */
#include "sync.h"
void nusantara_os_mutex_init(nusantara_os_mutex_t *m,uintptr_t channel){
 if(!m)return;m->owner=0u;nusantara_os_wait_queue_init(&m->waiters,channel);
}
nusantara_os_sync_status_t nusantara_os_mutex_try_lock(nusantara_os_mutex_t *m,uint64_t id){
 if(!m||!id||!m->waiters.channel)return NUSANTARA_OS_SYNC_INVALID_ARGUMENT;
 if(m->owner==id)return NUSANTARA_OS_SYNC_INVALID_STATE;
 if(m->owner!=0u)return NUSANTARA_OS_SYNC_WOULD_BLOCK;
 m->owner=id;return NUSANTARA_OS_SYNC_OK;
}
nusantara_os_sync_status_t nusantara_os_mutex_lock(nusantara_os_mutex_t *m,nusantara_os_scheduler_t *s,uint64_t id){
 nusantara_os_sync_status_t st;
 if(!m||!s||!id||!m->waiters.channel)return NUSANTARA_OS_SYNC_INVALID_ARGUMENT;
 if(m->owner==0u)return nusantara_os_mutex_try_lock(m,id);
 if(m->owner==id)return NUSANTARA_OS_SYNC_INVALID_STATE;
 st=(nusantara_os_sync_status_t)nusantara_os_wait_queue_sleep(&m->waiters,s,id);
 if(st==NUSANTARA_OS_WAIT_QUEUE_OK)return NUSANTARA_OS_SYNC_WOULD_BLOCK;
 if(st==NUSANTARA_OS_WAIT_QUEUE_FULL)return NUSANTARA_OS_SYNC_OVERFLOW;
 return NUSANTARA_OS_SYNC_INVALID_STATE;
}
nusantara_os_sync_status_t nusantara_os_mutex_unlock(nusantara_os_mutex_t *m,nusantara_os_scheduler_t *s,uint64_t id){
 uint64_t next=0u;nusantara_os_wait_queue_status_t st;
 if(!m||!s||!id||!m->waiters.channel)return NUSANTARA_OS_SYNC_INVALID_ARGUMENT;
 if(m->owner!=id)return NUSANTARA_OS_SYNC_NOT_OWNER;
 if(m->waiters.count==0u){m->owner=0u;return NUSANTARA_OS_SYNC_OK;}
 st=nusantara_os_wait_queue_wake_one(&m->waiters,s,&next);
 if(st!=NUSANTARA_OS_WAIT_QUEUE_OK)return NUSANTARA_OS_SYNC_INVALID_STATE;
 m->owner=next;return NUSANTARA_OS_SYNC_OK;
}
void nusantara_os_semaphore_init(nusantara_os_semaphore_t *sem,uintptr_t channel,uint32_t initial,uint32_t maximum){
 if(!sem)return;sem->maximum=maximum;sem->value=(maximum&&initial<=maximum)?initial:0u;
 nusantara_os_wait_queue_init(&sem->waiters,channel);
}
nusantara_os_sync_status_t nusantara_os_semaphore_try_wait(nusantara_os_semaphore_t *sem){
 if(!sem||!sem->waiters.channel||!sem->maximum)return NUSANTARA_OS_SYNC_INVALID_ARGUMENT;
 if(sem->value==0u)return NUSANTARA_OS_SYNC_WOULD_BLOCK;
 --sem->value;return NUSANTARA_OS_SYNC_OK;
}
nusantara_os_sync_status_t nusantara_os_semaphore_wait(nusantara_os_semaphore_t *sem,nusantara_os_scheduler_t *s,uint64_t id){
 nusantara_os_wait_queue_status_t st;
 if(!sem||!s||!id||!sem->waiters.channel||!sem->maximum)return NUSANTARA_OS_SYNC_INVALID_ARGUMENT;
 if(sem->value>0u){--sem->value;return NUSANTARA_OS_SYNC_OK;}
 st=nusantara_os_wait_queue_sleep(&sem->waiters,s,id);
 if(st==NUSANTARA_OS_WAIT_QUEUE_OK)return NUSANTARA_OS_SYNC_WOULD_BLOCK;
 if(st==NUSANTARA_OS_WAIT_QUEUE_FULL)return NUSANTARA_OS_SYNC_OVERFLOW;
 return NUSANTARA_OS_SYNC_INVALID_STATE;
}
nusantara_os_sync_status_t nusantara_os_semaphore_post(nusantara_os_semaphore_t *sem,nusantara_os_scheduler_t *s){
 uint64_t woken;nusantara_os_wait_queue_status_t st;
 if(!sem||!s||!sem->waiters.channel||!sem->maximum)return NUSANTARA_OS_SYNC_INVALID_ARGUMENT;
 if(sem->waiters.count){
  st=nusantara_os_wait_queue_wake_one(&sem->waiters,s,&woken);
  return st==NUSANTARA_OS_WAIT_QUEUE_OK?NUSANTARA_OS_SYNC_OK:NUSANTARA_OS_SYNC_INVALID_STATE;
 }
 if(sem->value>=sem->maximum)return NUSANTARA_OS_SYNC_OVERFLOW;
 ++sem->value;return NUSANTARA_OS_SYNC_OK;
}
