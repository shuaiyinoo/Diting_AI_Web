import request from '@/utils/request'
import type { UserVO } from '@/api/system/user/types'

// ─────────────────────────────────────────────
// 类型定义（兼容 ArgusRAG UserManagementView）
// ─────────────────────────────────────────────

/** 用户状态枚举：ACTIVE = 正常，DISABLED = 已禁用 */
export type UserStatus = 'ACTIVE' | 'DISABLED'

/** 系统角色（简化版，Diting 使用 RBAC 角色，此处做兼容映射） */
export type SystemRole = 'ADMIN' | 'USER'

/**
 * 管理员用户列表项
 * 适配 Diting sys_user 结构，兼容 ArgusRAG 前端组件
 */
export interface AdminUserItem {
  /** 用户 ID */
  userId: number
  /** 用户编码（Diting 无此字段，使用 userName 代替） */
  userCode: string
  /** 用户名（登录用） */
  username: string
  /** 注册邮箱 */
  email: string
  /** 显示名称（Diting nickName） */
  displayName: string
  /** 系统角色 */
  systemRole: SystemRole
  /** 账号状态 */
  status: UserStatus
  /** 是否强制要求修改密码（Diting 无此字段，固定 false） */
  mustChangePassword: boolean
  /** 最后登录时间（ISO 8601 字符串），从未登录则为 null */
  lastLoginAt: string | null
}

// ─────────────────────────────────────────────
// 内部转换工具
// ─────────────────────────────────────────────

/** Diting 状态码转 ArgusRAG 状态：'0' -> ACTIVE, '1' -> DISABLED */
function ditingStatusToRag(status: string): UserStatus {
  return status === '1' ? 'DISABLED' : 'ACTIVE'
}

/** ArgusRAG 状态转 Diting 状态码 */
function ragStatusToDiting(status: UserStatus): string {
  return status === 'DISABLED' ? '1' : '0'
}

/** 判断是否为管理员（Diting 通过 admin 字段或角色判断） */
function inferSystemRole(user: UserVO): SystemRole {
  if (user.admin === true) return 'ADMIN'
  if (user.roles?.some((r) => r.roleKey === 'admin' || r.roleKey === 'super')) return 'ADMIN'
  return 'USER'
}

/** 将 Diting UserVO 转换为 AdminUserItem */
function toAdminUserItem(user: UserVO): AdminUserItem {
  return {
    userId: Number(user.userId),
    userCode: user.userName,
    username: user.userName,
    email: user.email ?? '',
    displayName: user.nickName ?? user.userName,
    systemRole: inferSystemRole(user),
    status: ditingStatusToRag(user.status),
    mustChangePassword: false,
    lastLoginAt: user.loginDate ?? null,
  }
}

// ─────────────────────────────────────────────
// API 函数
// ─────────────────────────────────────────────

/**
 * 获取全部用户列表（仅系统管理员可调用）
 * 适配 Diting /system/user/list 接口
 */
export async function fetchAdminUsers(): Promise<AdminUserItem[]> {
  const res = await request({
    url: '/system/user/list',
    method: 'get',
    params: { pageSize: 1000 }
  })
  const rows = (res as any).rows ?? (res as any).data ?? []
  return rows.map(toAdminUserItem)
}

/**
 * 根据用户 ID 获取单个用户详情
 * 适配 Diting /system/user/{userId} 接口
 */
export async function fetchAdminUserDetail(userId: number): Promise<AdminUserItem> {
  const res = await request({
    url: `/system/user/${userId}`,
    method: 'get'
  })
  const data = (res as any).data ?? res
  const user: UserVO = data.user ?? data
  return toAdminUserItem(user)
}

/**
 * 修改用户状态（启用/禁用）
 * 适配 Diting /system/user/changeStatus 接口
 */
export async function updateAdminUserStatus(userId: number, status: UserStatus): Promise<void> {
  await request({
    url: '/system/user/changeStatus',
    method: 'put',
    data: {
      userId,
      status: ragStatusToDiting(status)
    }
  })
}
