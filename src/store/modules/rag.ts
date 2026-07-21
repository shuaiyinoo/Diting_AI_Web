import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { GroupItem, GroupQueryResult, GroupRelation, PendingInvitationItem } from '@/api/rag/group/types';

/**
 * RAG 模块全局状态管理
 *
 * 替代 ArgusRAG 前端的 useAppStore，管理群组列表、当前选中群组等状态。
 */
export const useRagStore = defineStore('rag', () => {
  // ── 群组数据 ──
  const ownedGroups = ref<GroupItem[]>([]);
  const joinedGroups = ref<GroupItem[]>([]);
  const pendingInvitations = ref<PendingInvitationItem[]>([]);
  const currentGroupId = ref<number | null>(null);

  // ── 计算属性 ──
  const visibleGroups = computed<GroupItem[]>(() => [
    ...ownedGroups.value.map((g) => ({ ...g, relation: 'OWNER' as GroupRelation })),
    ...joinedGroups.value.map((g) => ({ ...g, relation: 'MEMBER' as GroupRelation })),
  ]);

  const currentGroupName = computed(() => {
    if (currentGroupId.value === null) return '';
    const group = visibleGroups.value.find((g) => g.groupId === currentGroupId.value);
    return group?.groupName ?? '';
  });

  // ── Actions ──
  function applyGroupQueryResult(result: GroupQueryResult) {
    ownedGroups.value = result.ownedGroups ?? [];
    joinedGroups.value = result.joinedGroups ?? [];
    pendingInvitations.value = result.pendingInvitations ?? [];
    if (currentGroupId.value === null && visibleGroups.value.length > 0) {
      currentGroupId.value = visibleGroups.value[0].groupId;
    }
  }

  function setCurrentGroupId(id: number | null) {
    currentGroupId.value = id;
  }

  function reset() {
    ownedGroups.value = [];
    joinedGroups.value = [];
    pendingInvitations.value = [];
    currentGroupId.value = null;
  }

  return {
    ownedGroups,
    joinedGroups,
    pendingInvitations,
    currentGroupId,
    visibleGroups,
    currentGroupName,
    applyGroupQueryResult,
    setCurrentGroupId,
    reset
  };
});
