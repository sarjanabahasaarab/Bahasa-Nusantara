/* SPDX-License-Identifier: Apache-2.0 */
#include "priority-inheritance.h"
void nusantara_os_priority_manager_init(nusantara_os_priority_manager_t *m,nusantara_os_scheduler_t *s) {
 size_t i;if(!m)return;m->scheduler=s;m->count=0u;
 for(i=0;i<NUSANTARA_OS_PI_MAX_MUTEXES;++i)m->mutexes[i]=NULL;
}
nusantara_os_pi_status_t nusantara_os_priority_manager_recompute(nusantara_os_priority_manager_t *m) {
 size_t pass,i,j;int changed;
 if(!m||!m->scheduler)return NUSANTARA_OS_PI_INVALID_ARGUMENT;
 if(nusantara_os_scheduler_reset_effective_priorities(m->scheduler)!=NUSANTARA_OS_SCHEDULER_OK)return NUSANTARA_OS_PI_SCHEDULER_ERROR;
 /* Fixed-point propagation handles chains and all mutexes held by one task. */
 for(pass=0;pass<NUSANTARA_OS_SCHEDULER_MAX_TASKS;++pass) {
  changed=0;
  for(i=0;i<m->count;++i) {
   nusantara_os_mutex_t *mx=m->mutexes[i];const nusantara_os_task_t *owner;
   if(!mx||mx->owner==0u||mx->waiters.count==0u)continue;
   owner=nusantara_os_scheduler_find(m->scheduler,mx->owner);
   if(!owner)return NUSANTARA_OS_PI_SCHEDULER_ERROR;
   for(j=0;j<mx->waiters.count;++j) {
    const nusantara_os_task_t *waiter=nusantara_os_scheduler_find(m->scheduler,mx->waiters.waiters[j]);
    if(!waiter)return NUSANTARA_OS_PI_SCHEDULER_ERROR;
    if(waiter->effective_priority>owner->effective_priority) {
     if(nusantara_os_scheduler_set_effective_priority(m->scheduler,mx->owner,waiter->effective_priority)!=NUSANTARA_OS_SCHEDULER_OK)return NUSANTARA_OS_PI_SCHEDULER_ERROR;
     owner=nusantara_os_scheduler_find(m->scheduler,mx->owner);changed=1;
    }
   }
  }
  if(!changed)return NUSANTARA_OS_PI_OK;
 }
 /* A 64-task dependency chain converges within 64 passes; non-convergence is invalid state. */
 return NUSANTARA_OS_PI_INVALID_STATE;
}
nusantara_os_pi_status_t nusantara_os_priority_manager_register(nusantara_os_priority_manager_t *m,nusantara_os_mutex_t *mx) {
 size_t i;if(!m||!m->scheduler||!mx||!mx->waiters.channel)return NUSANTARA_OS_PI_INVALID_ARGUMENT;
 for(i=0;i<m->count;++i)if(m->mutexes[i]==mx)return NUSANTARA_OS_PI_INVALID_STATE;
 if(m->count>=NUSANTARA_OS_PI_MAX_MUTEXES)return NUSANTARA_OS_PI_FULL;
 m->mutexes[m->count++]=mx;return nusantara_os_priority_manager_recompute(m);
}
nusantara_os_pi_status_t nusantara_os_priority_manager_unregister(nusantara_os_priority_manager_t *m,nusantara_os_mutex_t *mx) {
 size_t i,j;if(!m||!mx)return NUSANTARA_OS_PI_INVALID_ARGUMENT;
 for(i=0;i<m->count;++i)if(m->mutexes[i]==mx) {
  if(mx->owner||mx->waiters.count)return NUSANTARA_OS_PI_INVALID_STATE;
  for(j=i+1u;j<m->count;++j)m->mutexes[j-1u]=m->mutexes[j];
  m->mutexes[--m->count]=NULL;return nusantara_os_priority_manager_recompute(m);
 }
 return NUSANTARA_OS_PI_NOT_FOUND;
}
nusantara_os_pi_status_t nusantara_os_priority_manager_set_base_priority(nusantara_os_priority_manager_t *m,uint64_t id,uint32_t p) {
 if(!m||!m->scheduler)return NUSANTARA_OS_PI_INVALID_ARGUMENT;
 if(nusantara_os_scheduler_set_priority(m->scheduler,id,p)!=NUSANTARA_OS_SCHEDULER_OK)return NUSANTARA_OS_PI_SCHEDULER_ERROR;
 return nusantara_os_priority_manager_recompute(m);
}
nusantara_os_pi_status_t nusantara_os_priority_mutex_lock(nusantara_os_priority_manager_t *m,nusantara_os_mutex_t *mx,uint64_t id) {
 nusantara_os_sync_status_t st;
 if(!m||!m->scheduler||!mx)return NUSANTARA_OS_PI_INVALID_ARGUMENT;
 st=nusantara_os_mutex_lock(mx,m->scheduler,id);
 if(st!=NUSANTARA_OS_SYNC_OK&&st!=NUSANTARA_OS_SYNC_WOULD_BLOCK)return NUSANTARA_OS_PI_SYNC_ERROR;
 if(nusantara_os_priority_manager_recompute(m)!=NUSANTARA_OS_PI_OK)return NUSANTARA_OS_PI_INVALID_STATE;
 return st==NUSANTARA_OS_SYNC_OK?NUSANTARA_OS_PI_OK:NUSANTARA_OS_PI_SYNC_ERROR;
}
nusantara_os_pi_status_t nusantara_os_priority_mutex_unlock(nusantara_os_priority_manager_t *m,nusantara_os_mutex_t *mx,uint64_t id) {
 if(!m||!m->scheduler||!mx)return NUSANTARA_OS_PI_INVALID_ARGUMENT;
 if(nusantara_os_mutex_unlock(mx,m->scheduler,id)!=NUSANTARA_OS_SYNC_OK)return NUSANTARA_OS_PI_SYNC_ERROR;
 return nusantara_os_priority_manager_recompute(m);
}
