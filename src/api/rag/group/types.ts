/** 群组与当前用户的关系 */
export type GroupRelation = 'OWNER' | 'MEMBER';

/** 群组简要信息 */
export interface GroupItem {
  /** 群组 ID */
  groupId: number;
  /** 群组唯一编码（用于加入申请） */
  groupCode: string;
  /** 群组名称 */
  groupName: string;
  /** 群组描述 */
  description?: string;
  /** 待处理申请数量 */
  pendingRequestCount?: number;
  /** 创建时间 */
  createTime?: string;
  /** 当前用户与该群组的关系（由前端在聚合 owned/joined 列表后填充） */
  relation?: GroupRelation;
}

/** 待处理的邀请信息（被邀请者视角） */
export interface PendingInvitationItem {
  invitationId: number;
  groupId: number;
  groupName: string;
  inviterUserId: number;
  inviterDisplayName: string;
  status: string;
}

/** 当前用户可见的群组查询结果 */
export interface GroupQueryResult {
  ownedGroups: GroupItem[];
  joinedGroups: GroupItem[];
  pendingInvitations: PendingInvitationItem[];
}

/** 创建群组请求参数 */
export interface CreateGroupPayload {
  name: string;
  description?: string;
}

/** 群组成员信息 */
export interface GroupMemberItem {
  userId: number;
  userCode: string;
  displayName: string;
  role: string;
}

/** 申请者视角的加入申请记录 */
export interface JoinRequestItem {
  requestId: number;
  groupId: number;
  groupCode: string;
  groupName: string;
  status: string;
  createTime: string;
  decidedAt?: string | null;
}

/** 邀请方视角的发出邀请记录 */
export interface MySentInvitationItem {
  invitationId: number;
  groupId: number;
  groupName: string;
  inviteeUserId: number;
  inviteeDisplayName: string;
  status: string;
  createTime: string;
  decidedAt?: string | null;
}

/** 管理员视角的加入申请记录 */
export interface OwnerJoinRequestItem {
  requestId: number;
  groupId: number;
  applicantUserId: number;
  applicantUserCode: string;
  applicantDisplayName: string;
  status: string;
  createTime: string;
}
