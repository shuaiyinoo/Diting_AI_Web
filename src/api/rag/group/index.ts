import request from '@/utils/request';
import type {
  CreateGroupPayload,
  GroupMemberItem,
  GroupQueryResult,
  JoinRequestItem,
  MySentInvitationItem,
  OwnerJoinRequestItem,
  GroupItem,
  PendingInvitationItem
} from './types';

export type {
  CreateGroupPayload,
  GroupMemberItem,
  GroupQueryResult,
  JoinRequestItem,
  MySentInvitationItem,
  OwnerJoinRequestItem,
  GroupItem,
  PendingInvitationItem
} from './types';

/**
 * 获取当前用户可见的群组列表
 */
export async function fetchGroups(): Promise<GroupQueryResult> {
  const res = await request({ url: '/rag/groups/my', method: 'get' });
  return res.data as GroupQueryResult;
}

/**
 * 创建新群组
 */
export async function createGroup(data: CreateGroupPayload): Promise<number> {
  const res = await request({ url: '/rag/groups', method: 'post', data });
  return res.data as number;
}

/**
 * 邀请用户加入群组
 */
export async function createInvitation(groupId: number, inviteeUserId: number): Promise<number> {
  const res = await request({
    url: `/rag/groups/${groupId}/invitations`,
    method: 'post',
    data: { inviteeUserId }
  });
  return res.data as number;
}

/**
 * 获取群组成员列表
 */
export async function fetchGroupMembers(groupId: number): Promise<GroupMemberItem[]> {
  const res = await request({ url: `/rag/groups/${groupId}/members`, method: 'get' });
  return res.data as GroupMemberItem[];
}

/**
 * 移除群组成员
 */
export async function removeGroupMember(groupId: number, userId: number): Promise<void> {
  await request({ url: `/rag/groups/${groupId}/members/${userId}`, method: 'delete' });
}

/**
 * 退出群组
 */
export async function leaveGroup(groupId: number): Promise<void> {
  await request({ url: `/rag/groups/${groupId}/leave`, method: 'post' });
}

/**
 * 接受群组邀请
 */
export async function acceptInvitation(invitationId: number): Promise<void> {
  await request({ url: `/rag/invitations/${invitationId}/accept`, method: 'post' });
}

/**
 * 拒绝群组邀请
 */
export async function rejectInvitation(invitationId: number): Promise<void> {
  await request({ url: `/rag/invitations/${invitationId}/reject`, method: 'post' });
}

/**
 * 取消群组邀请（由邀请方操作）
 */
export async function cancelInvitation(invitationId: number): Promise<void> {
  await request({ url: `/rag/invitations/${invitationId}/cancel`, method: 'post' });
}

/**
 * 提交加入群组申请
 */
export async function submitJoinRequest(groupCode: string): Promise<number> {
  const res = await request({ url: '/rag/groups/join-requests', method: 'post', data: { groupCode } });
  return res.data as number;
}

/**
 * 查询当前用户的所有加入申请记录
 */
export async function fetchMyJoinRequests(): Promise<JoinRequestItem[]> {
  const res = await request({ url: '/rag/groups/join-requests/my', method: 'get' });
  return res.data as JoinRequestItem[];
}

/**
 * 查询当前用户发出的所有群组邀请
 */
export async function fetchMySentInvitations(): Promise<MySentInvitationItem[]> {
  const res = await request({ url: '/rag/groups/invitations/my-sent', method: 'get' });
  return res.data as MySentInvitationItem[];
}

/**
 * 查询指定群组的待处理加入申请（管理员视角）
 */
export async function fetchOwnerJoinRequests(groupId: number): Promise<OwnerJoinRequestItem[]> {
  const res = await request({ url: `/rag/groups/${groupId}/join-requests`, method: 'get' });
  return res.data as OwnerJoinRequestItem[];
}

/**
 * 审批通过加入申请
 */
export async function approveJoinRequest(groupId: number, requestId: number): Promise<void> {
  await request({ url: `/rag/groups/${groupId}/join-requests/${requestId}/approve`, method: 'post' });
}

/**
 * 拒绝加入申请
 */
export async function rejectJoinRequest(groupId: number, requestId: number): Promise<void> {
  await request({ url: `/rag/groups/${groupId}/join-requests/${requestId}/reject`, method: 'post' });
}
