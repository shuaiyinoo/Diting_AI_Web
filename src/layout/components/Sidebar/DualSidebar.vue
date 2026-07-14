<template>
  <div
    class="sidebar-shell dual-sidebar-shell"
    :class="{ 'dual-no-second': childMenus.length === 0 }"
    :style="menuStyle"
  >
    <!-- Logo：横跨两列，放在最上方 -->
    <div class="dual-sidebar-logo" v-if="showLogo">
      <logo :collapse="false" />
    </div>

    <!-- 主体：第一列 + 第二列 并排 -->
    <div class="dual-sidebar-body">
      <!-- 第一列：折叠的一级菜单（仅图标） -->
      <div class="dual-sidebar-first">
        <el-scrollbar :class="sideTheme" wrap-class="scrollbar-wrapper">
          <el-menu
            :default-active="selectedTopPath"
            :collapse="true"
            :collapse-transition="false"
            :unique-opened="true"
            mode="vertical"
            @select="handleTopSelect"
          >
            <template v-for="(r, index) in topMenus" :key="r.path + index">
              <el-menu-item v-if="!r.hidden" :index="r.path">
                <svg-icon :icon-class="getMenuIcon(r.meta?.icon)" />
                <template #title>
                  <span>{{ r.meta?.title }}</span>
                </template>
              </el-menu-item>
            </template>
          </el-menu>
        </el-scrollbar>
      </div>

      <!-- 第二列：展开的子菜单（动态显示/隐藏） -->
      <div class="dual-sidebar-second" v-if="childMenus.length > 0">
        <el-scrollbar :class="sideTheme" wrap-class="scrollbar-wrapper">
          <el-menu
            :default-active="activeMenu"
            :collapse="false"
            :unique-opened="true"
            :collapse-transition="false"
            :popper-offset="12"
            mode="vertical"
          >
            <sidebar-item
              v-for="(r, index) in childMenus"
              :key="r.path + index"
              :item="r"
              :base-path="resolveChildBasePath(r.path)"
            />
          </el-menu>
        </el-scrollbar>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { RouteRecordRaw } from 'vue-router';
import { getNormalPath } from '@/utils/ruoyi';
import { usePermissionStore } from '@/store/modules/permission';
import { useSettingsStore } from '@/store/modules/settings';
import { isHttp } from '@/utils/validate';
import Logo from './Logo.vue';
import SidebarItem from './SidebarItem.vue';

const route = useRoute();
const router = useRouter();
const settingsStore = useSettingsStore();
const permissionStore = usePermissionStore();

const showLogo = computed(() => settingsStore.sidebarLogo);
const sideTheme = computed(() => settingsStore.sideTheme);
const theme = computed(() => settingsStore.theme);

// 所有路由（包含常量路由 + 动态路由）
const allRoutes = computed<RouteRecordRaw[]>(() => permissionStore.getDefaultRoutes());

// 第一列：一级菜单
const topMenus = computed<RouteRecordRaw[]>(() => {
  const menus: RouteRecordRaw[] = [];
  allRoutes.value.forEach(menu => {
    if (menu.hidden !== true) {
      // 兼容根路径（path 为 '' 或 '/'）下子路由
      if ((menu.path === '/' || menu.path === '') && menu.children && menu.children.length > 0) {
        const child = { ...menu.children[0] };
        // 确保路径为绝对路径
        if (child.path && !child.path.startsWith('/')) {
          child.path = '/' + child.path;
        }
        menus.push(child);
      } else {
        menus.push(menu);
      }
    }
  });
  return menus;
});

// 根据当前路由推算激活的一级菜单路径
const activeTopPath = computed(() => {
  const currentPath = route.meta.activeMenu || route.path;
  for (const menu of topMenus.value) {
    if (!menu.path) continue;
    if (currentPath === menu.path || currentPath.startsWith(menu.path + '/')) {
      return menu.path;
    }
  }
  // 默认取第一个
  return topMenus.value[0]?.path || '';
});

// 用户手动选择的一级菜单（初始化为路由推算值）
const selectedTopPath = ref('');

watch(
  activeTopPath,
  val => {
    selectedTopPath.value = val;
  },
  { immediate: true }
);

// 第二列：激活一级菜单的子菜单
const childMenus = computed<RouteRecordRaw[]>(() => {
  const menu = topMenus.value.find(m => m.path === selectedTopPath.value);
  if (!menu || !menu.children) return [];
  return menu.children.filter(c => !c.hidden);
});

// 第二列激活菜单
const activeMenu = computed(() => {
  const { meta, path } = route;
  if (meta.activeMenu) {
    return meta.activeMenu;
  }
  return path;
});

// 点击一级菜单
const handleTopSelect = (key: string) => {
  const menu = topMenus.value.find(m => m.path === key);
  // 无论有无子菜单，都先更新 selectedTopPath，确保第二列动态联动
  selectedTopPath.value = key;
  if (isHttp(key)) {
    window.open(key, '_blank');
    return;
  }
  if (!menu || !menu.children || menu.children.length === 0) {
    // 无子菜单直接跳转，第二列因 childMenus 为空自动隐藏
    router.push({ path: key });
    return;
  }
  // 有子菜单时第二列已通过 selectedTopPath 更新自动显示
};

// 解析子菜单的完整 base-path：selectedTopPath + '/' + childPath
// 这样 SidebarItem 内部的路径递归才能正确拼接
const resolveChildBasePath = (childPath: string): string => {
  return getNormalPath(selectedTopPath.value + '/' + childPath);
};

// 获取菜单图标，如果没有则返回默认图标
const getMenuIcon = (icon?: string): string => {
  if (!icon || icon === '#' || icon === '') {
    return 'component';
  }
  return icon;
};

// 菜单样式
const bgColor = computed(() => (sideTheme.value === 'theme-dark' ? '#111827' : '#ffffff'));
const textColor = computed(() => (sideTheme.value === 'theme-dark' ? '#e5edf8' : '#1f2937'));
const menuStyle = computed(() => ({
  backgroundColor: bgColor.value,
  '--el-menu-bg-color': bgColor.value,
  '--el-menu-text-color': textColor.value,
  '--el-menu-active-color': theme.value
}));
</script>

<style lang="scss" scoped>
.dual-sidebar-shell {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 0 !important;
  border: 1px solid var(--app-sidebar-border);
  border-radius: var(--app-radius-base);
  box-shadow: var(--app-shadow-sm);
  background: v-bind(bgColor) !important;
  overflow: hidden;
}

/* Logo 区域：横跨两列 */
.dual-sidebar-logo {
  flex-shrink: 0;
  padding: 10px 8px 0;
  box-sizing: border-box;

  :deep(.sidebar-logo-container) {
    margin-top: 0;
  }
}

/* 主体：两列并排 */
.dual-sidebar-body {
  flex: 1;
  display: flex;
  flex-direction: row;
  min-height: 0;
}

/* 第一列：折叠侧栏 */
.dual-sidebar-first {
  width: 58px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  padding: 0 4px 12px;
  border-right: 1px solid var(--app-sidebar-border);
  box-sizing: border-box;

  :deep(.el-scrollbar) {
    flex: 1;
    min-height: 0;
    height: auto !important;
  }

  :deep(.el-scrollbar__view) {
    min-height: 0;
    padding-bottom: 12px;
    /* 距顶部 12px，确保不被滚动容器吞掉 */
    margin-top: 12px !important;
  }

  :deep(.el-scrollbar__wrap) {
    height: 100%;
    overflow-x: hidden;
  }

  :deep(.el-menu) {
    border: none;
    background: transparent !important;
    width: 100% !important;
  }

  /* el-menu-item 折叠模式：固定 40x40 居中，间距 12px */
  :deep(.el-menu-item) {
    width: 40px !important;
    min-width: 40px !important;
    height: 40px !important;
    /* 6px 上下边距 = 12px 间距 */
    margin: 6px auto !important;
    padding: 0 !important;
    border-radius: var(--app-radius-md);
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    box-sizing: border-box;
    background: transparent !important;
    color: var(--side-menu-text) !important;
    line-height: 1 !important;
    text-align: center !important;

    &:not(.is-active):hover {
      background-color: var(--side-menu-hover-bg) !important;
      color: var(--side-menu-hover-text) !important;
    }

    &.is-active {
      background: var(--side-menu-active-bg) !important;
      color: var(--side-menu-active-text) !important;
      box-shadow: inset 3px 0 0 var(--side-menu-active-line);
    }
  }

  /* tooltip 触发器：撑满父容器并居中 */
  :deep(.el-menu-item .el-menu-tooltip__trigger) {
    width: 100% !important;
    height: 100% !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    line-height: 1 !important;
    padding: 0 !important;
  }

  /* svg 图标：去除全局 margin-right，确保居中 */
  :deep(.el-menu-item .svg-icon) {
    margin: 0 !important;
    margin-right: 0 !important;
    width: 16px !important;
    height: 16px !important;
    flex-shrink: 0;
    vertical-align: middle !important;
    margin-top: 12px !important;
  }

  /* 折叠菜单中隐藏文字和箭头 */
  :deep(.el-menu--collapse) {
    .el-menu-item > span {
      height: 0 !important;
      width: 0 !important;
      overflow: hidden !important;
      visibility: hidden !important;
      display: inline-block !important;
    }

    .el-menu-item .el-sub-menu__icon-arrow {
      display: none !important;
    }
  }
}

/* 第二列：展开侧栏 */
.dual-sidebar-second {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  padding: 10px 8px 12px;
  box-sizing: border-box;

  :deep(.el-scrollbar) {
    flex: 1;
    min-height: 0;
    height: auto !important;
  }

  :deep(.el-scrollbar__view) {
    min-height: 0;
    padding-bottom: 12px;
  }

  :deep(.el-scrollbar__wrap) {
    height: 100%;
    overflow-x: hidden;
  }

  :deep(.el-menu) {
    border: none;
    height: 100%;
    width: 100% !important;
    background: transparent !important;
  }

  :deep(.el-menu--inline) {
    background: transparent !important;
  }

  :deep(.el-menu-item),
  :deep(.menu-title) {
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    white-space: nowrap !important;
  }

  :deep(.el-menu-item),
  :deep(.el-sub-menu__title),
  :deep(.el-menu-item .svg-icon),
  :deep(.el-sub-menu__title .svg-icon),
  :deep(.el-sub-menu__icon-arrow) {
    color: var(--side-menu-text) !important;
    fill: currentColor;
  }

  :deep(.el-menu-item),
  :deep(.el-sub-menu__title) {
    position: relative;
    font-weight: 500;
  }

  /* 菜单项样式 */
  :deep(.submenu-title-noDropdown),
  :deep(.el-sub-menu__title) {
    border-radius: var(--app-radius-md);
    margin: 3px 8px;
    height: 40px;
    color: var(--side-menu-text) !important;

    &:hover {
      background-color: var(--side-menu-hover-bg) !important;
      color: var(--side-menu-hover-text) !important;
    }
  }

  :deep(.nest-menu .el-sub-menu > .el-sub-menu__title),
  :deep(.el-sub-menu .el-menu-item) {
    min-width: calc(100% - 16px) !important;
    border-radius: var(--app-radius-md);
    height: 40px;
    margin: 3px 8px;
    background: transparent !important;

    &.is-active {
      background: var(--side-menu-active-bg) !important;
      color: var(--side-menu-active-text) !important;
      box-shadow:
        inset 3px 0 0 var(--side-menu-active-line),
        inset 0 0 0 1px var(--side-menu-active-border);
    }

    &:not(.is-active):hover {
      background-color: var(--side-menu-hover-bg) !important;
      color: var(--side-menu-hover-text) !important;
    }
  }

  :deep(.el-menu-item) {
    border-radius: var(--app-radius-md);
    height: 40px;
    margin: 3px 8px;
    background: transparent !important;

    &.is-active {
      background: var(--side-menu-active-bg) !important;
      color: var(--side-menu-active-text) !important;
      box-shadow:
        inset 3px 0 0 var(--side-menu-active-line),
        inset 0 0 0 1px var(--side-menu-active-border);
    }

    &:not(.is-active):hover {
      background-color: var(--side-menu-hover-bg) !important;
      color: var(--side-menu-hover-text) !important;
    }
  }
}

/* 侧边栏主题色变量 */
:deep(.el-scrollbar.theme-light) {
  --side-menu-text: #1f2937;
  --side-menu-hover-bg: rgba(64, 158, 255, 0.08);
  --side-menu-hover-text: #111827;
  --side-menu-active-bg: rgba(64, 158, 255, 0.12);
  --side-menu-active-text: #409eff;
  --side-menu-active-border: rgba(64, 158, 255, 0.16);
  --side-menu-active-line: #409eff;
}

:deep(.el-scrollbar.theme-dark) {
  --side-menu-text: #e5edf8;
  --side-menu-hover-bg: rgba(255, 255, 255, 0.08);
  --side-menu-hover-text: #ffffff;
  --side-menu-active-bg: rgba(64, 158, 255, 0.22);
  --side-menu-active-text: #ffffff;
  --side-menu-active-border: rgba(96, 165, 250, 0.24);
  --side-menu-active-line: #60a5fa;
}
</style>
