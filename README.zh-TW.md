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

## EIA 資料使用與來源標示

顯示 EIA 觀察值之處，儀表板會標示**美國能源資訊署（EIA）**為來源，並連結至 EIA Open Data。Gridline 為呈現目的可能轉換或彙總 EIA 觀察值，但來源紀錄保留觀察與擷取時間戳記。Gridline 分數不是由 EIA 製作、背書或核准，且不使用 EIA 標誌。請參閱 [EIA Open Data API](https://www.eia.gov/opendata/) 與 [隱私及安全政策](https://www.eia.gov/about/privacy_security_policy.php)。

本專案中的 EIA API 資料僅限 Gridline 自身研究與決策輔助儀表板使用，不會轉傳至不相關的產品、使用者或服務。任何顯示的研究結果均應保留 EIA 衍生觀察值、來源標示及時間戳記。

## 驗證

```bash
npm run test:api
npm run build
```

詳細操作說明請見：[英文部署文件](docs/static-snapshot-deployment.en.md) 與 [繁體中文部署文件](docs/static-snapshot-deployment.zh-TW.md)。
