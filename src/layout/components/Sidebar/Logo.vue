<template>
  <div class="sidebar-logo-container" :class="{ collapse: collapse }">
    <transition :enter-active-class="animateConfig.logoAnimate.enter" mode="out-in">
      <router-link key="logo" class="sidebar-logo-link" to="/">
        <img v-if="logo" :src="logo" class="sidebar-logo" alt="谛听 Diting AI RAG" />
        <h1 v-if="!collapse" class="sidebar-title">
          谛听 <span class="title-en">Diting AI RAG</span>
        </h1>
      </router-link>
    </transition>
  </div>
</template>

<script setup lang="ts">
import animateConfig from '@/animate';
import logo from '@/assets/logo/logo.png';
import { NavTypeEnum } from '@/enums/NavTypeEnum';
import { useSettingsStore } from '@/store/modules/settings';

defineProps({
  collapse: {
    type: Boolean,
    required: true
  }
});

const settingsStore = useSettingsStore();
const sideTheme = computed(() => settingsStore.sideTheme);
const isTopNav = computed(() => settingsStore.navType === NavTypeEnum.TOP);
const isDarkSide = computed(() => !isTopNav.value && sideTheme.value === 'theme-dark');
const logoTextColor = computed(() => (isDarkSide.value ? '#f8fbff' : 'var(--app-text-title)'));
</script>

<style lang="scss" scoped>
.sidebarLogoFade-enter-active {
  transition: opacity 1.5s;
}

.sidebarLogoFade-enter,
.sidebarLogoFade-leave-to {
  opacity: 0;
}

.sidebar-logo-container {
  position: relative;
  flex-shrink: 0;
  width: 100%;
  height: 40px;
  line-height: 1;
  margin-top: 2px;
  background: transparent;
  border: none;
  overflow: hidden;
  margin-bottom: 0;

  & .sidebar-logo-link {
    height: 100%;
    width: 100%;
    display: block;
    position: relative;
    background: transparent;
    border: none;
    border-radius: 0;
    padding: 0;

    & .sidebar-logo {
      position: absolute;
      top: 50%;
      left: 5px;
      transform: translateY(-50%);
      width: 32px;
      height: 32px;
      flex-shrink: 0;
      margin: 0;
      border-radius: 2px;
      box-shadow: none;
    }

    & .sidebar-title {
      position: absolute;
      top: 50%;
      left: 47px;
      transform: translateY(-50%);
      display: inline-flex;
      align-items: center;
      margin: 0;
      color: v-bind(logoTextColor);
      font-weight: 700;
      line-height: 1;
      font-size: 16px;
      letter-spacing: 0.02em;
      font-family: 'MiSans', 'HarmonyOS Sans SC', 'PingFang SC', sans-serif;
      white-space: nowrap;

      & .title-en {
        font-weight: 600;
        font-size: 13px;
        opacity: 0.85;
        margin-left: 4px;
      }
    }
  }

  /* 收缩状态：仅图标，水平垂直居中于顶部 */
  &.collapse {
    .sidebar-logo-link {
      position: relative;
    }

    .sidebar-logo {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      margin: 0;
    }
  }
}
</style>
