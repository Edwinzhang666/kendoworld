# 一介新手，制霸剑道全国 — 开发说明

快速开始（推荐使用 Taro）

安装依赖：
```bash
npm install
```

开发（微信小程序）：
```bash
npm run dev:weapp
```

构建发布：
```bash
npm run build:weapp
```

目录说明：
- `src/` 小程序源文件
- `src/data/` 卡牌与事件数据
- `src/utils/cardEngine.ts` 卡牌引擎示例

报告部署（GitHub Pages）
- 手动生成报告：`npm run report:generate` 会在 `test/` 目录生成 `report_<ts>.html`。
- 自动部署：仓库中已包含 GitHub Actions 工作流 `/.github/workflows/deploy_report.yml`，可在 Actions 面板手动触发（或 push 到 `main`）生成并发布报告到 Pages。工作流会运行 `npm run report:generate` 并将最新 `test/report_*.html` 部署为静态页面。

注意：首次使用请确保仓库已启用 GitHub Pages，或在仓库设置中核验 Pages 权限与发布源。
