# Gridline — 資料中心基礎設施情報

Gridline 是決策輔助儀表板，將 AI／資料中心實體建設、供電限制、法規事件與市場預期連結起來；它不是自動交易系統，也不是投資建議。

## 本機啟動

```bash
npm install
npm start
```

開啟 `http://localhost:3000/RobotFriends`。

## 靜態每日快照部署

本示範以 GitHub Actions 和 GitHub Pages 運作。[daily-snapshot.yml](.github/workflows/daily-snapshot.yml) 會在每個工作日 22:00 UTC 執行，確保在美國正常收盤後才開始更新。它會產生並提交 `public/data/dashboard-snapshot.json`；GitHub Pages 只需提供這個靜態快照，無須常駐 Node 伺服器。

每個來源最多嘗試三次，並以 1 秒、2 秒退避重試。若仍失敗，系統保留上次成功快照的該來源資料，並將來源標示為 `degraded`，而不是以零取代遺失資料。

## 設定 Actions Secrets

在 GitHub repository 的 **Settings → Secrets and variables → Actions** 新增：

- `SEC_USER_AGENT`
- `EIA_API_KEY`
- `PJM_API_KEY`
- `FERC_API_KEY`
- `COMPANY_IR_FEEDS`（官方 RSS/Atom URL 的 JSON 對照表）

未設定的來源不會造成整個網站失效；快照會保留可用資料並顯示來源狀態。

## 驗證

```bash
npm run test:api
npm run build
```

詳細操作說明請見：[英文部署文件](docs/static-snapshot-deployment.en.md) 與 [繁體中文部署文件](docs/static-snapshot-deployment.zh-TW.md)。
