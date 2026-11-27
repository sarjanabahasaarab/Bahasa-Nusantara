/* SPDX-License-Identifier: Apache-2.0 */
#include "user-syscall.h"
static nusantara_arm64_user_syscall_ops_t active_ops;
static uint8_t active;
int nusantara_arm64_user_syscall_init(const nusantara_arm64_user_syscall_ops_t *ops)
{
 if(!ops||!ops->validate_user_range||!ops->write||
    (!ops->exit&&!ops->exit_frame)||(!ops->yield&&!ops->yield_frame)) return 0;
 active_ops=*ops;active=1u;
 return nusantara_arm64_exception_set_handler(
  nusantara_arm64_user_syscall_handle_exception,&active_ops);
}
nusantara_arm64_exception_frame_t *nusantara_arm64_user_syscall_handle_exception(
 void *context,nusantara_arm64_exception_frame_t *frame)
{
 nusantara_arm64_user_syscall_ops_t *ops=(nusantara_arm64_user_syscall_ops_t*)context;
 uint32_t ec,imm;uint64_t number;int64_t result;
 if(!active||!ops||!frame||((uintptr_t)frame&15u)||frame->vector!=8u)return 0;
 ec=(uint32_t)((frame->esr_el1>>26)&0x3fu);
 imm=(uint32_t)(frame->esr_el1&0xffffu);
 if(ec!=0x15u||imm!=NUSANTARA_ARM64_SVC_IMMEDIATE)return 0;
 number=frame->x[8];
 switch(number){
 case NUSANTARA_ARM64_SYSCALL_WRITE:
#if SIZE_MAX < UINT64_MAX
  if(frame->x[1]>(uint64_t)SIZE_MAX){result=NUSANTARA_ARM64_SYSCALL_EFAULT;break;}
#endif
  if(!ops->validate_user_range(ops->context,(uintptr_t)frame->x[0],(size_t)frame->x[1]))
   result=NUSANTARA_ARM64_SYSCALL_EFAULT;
  else result=ops->write(ops->context,(uintptr_t)frame->x[0],(size_t)frame->x[1]);
  break;
 case NUSANTARA_ARM64_SYSCALL_EXIT:
  if(ops->exit_frame)return ops->exit_frame(ops->context,frame,(int)frame->x[0]);
  result=ops->exit(ops->context,(int)frame->x[0]);break;
 case NUSANTARA_ARM64_SYSCALL_YIELD:
  if(ops->yield_frame)return ops->yield_frame(ops->context,frame);
  result=ops->yield(ops->context);break;
 default: result=NUSANTARA_ARM64_SYSCALL_ENOSYS;break;
 }
 frame->x[0]=(uint64_t)result;return frame;
}
