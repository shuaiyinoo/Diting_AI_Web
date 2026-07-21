import { fileViewerRenderers } from '@file-viewer/vite-plugin';

export default () => {
  return fileViewerRenderers({
    // 自动发现已安装的 @file-viewer/*-full 包，并把 Worker/WASM/字体/vendor
    // 资源复制到部署基址下的 file-viewer/（开发期 public/file-viewer，构建期 dist/file-viewer）
    copyAssets: true
  });
};
