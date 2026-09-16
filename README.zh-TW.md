# Gridline — 資料中心基礎設施情報

Gridline 是雙語決策輔助與研究驗證儀表板，將 AI／資料中心實體建設、供電限制、法規事件與市場預期串連起來。它適合定位成 **production-style 研究平台示範**，不是自動交易系統、不是正式市場資料終端，也不是投資建議。

公開 Demo：`https://leo0331.github.io/RobotFriends/`

示範準備度：[繁體中文](docs/demo-readiness.zh-TW.md) · [English](docs/demo-readiness.en.md)  
帳戶設定（選用 Supabase）：[繁體中文](docs/accounts.zh-TW.md) · [English](docs/accounts.en.md)

## 這個 Demo 展示什麼

- **基礎設施情報**：Arizona、Texas、Ohio/PJM、Northern Virginia 的全國／區域切換與限制分析。
- **期間化公司曝險**：30D / 90D / 1Y 市場 lookback；資料不足時明確顯示 unavailable，不製造數字。
- **可稽核 provenance**：deterministic observation ID、provider/source metadata、`observedAt` / `retrievedAt`、confidence、來源 URL 與 lineage。
- **版本化 scoring**：公司分數具方法論版本、component contribution 與 point-in-time cutoff。
- **持久化歷史**：Node API profile 以 SQLite/WAL 保存不可變觀察值、來源健康狀態、分數快照、情境分析與回測執行紀錄。
- **Scenario Lab**：針對供電交付、可用電力、需求、CAPEX、法規進行 deterministic sensitivity analysis。
- **時點驗證**：區分實際記錄與歷史重建、30D / 90D 後續結果、pending window 與 no-look-ahead 防護。
- **資料健康**：`#health` 顯示公開 snapshot 的新鮮度、來源降級、價格涵蓋、方法論與歷史重建狀態。
- **Fail-closed ingestion**：空白／無效 provider 回應標為 degraded，不視為成功；保留 last-known-good 歷史。
- **雙語研究 UX**：Research Lab 的主要流程支援 English / 繁中。
- **選用帳戶**：Supabase 註冊、登入、密碼恢復與偏好設定已完成 React 專案端實作，但不會阻擋公開研究 demo。
- **工程品質 Gate**：PR 測試／build／audit、snapshot acceptance gate、GitHub Pages 部署與 Lighthouse CI。

設計文件：[資料血緣](docs/data-provenance.md) · [Scoring](docs/scoring-methodology.md) · [持久化儲存](docs/persistent-storage.md) · [情境分析](docs/scenario-analysis.md) · [回測](docs/backtesting.md) · [PR CI](docs/pr-ci.md)。

## 系統需求

- Node.js **22+**（API/storage profile 使用 `node:sqlite`）
- 依 repository 已提交的 `package-lock.json` 使用 npm

## 快速啟動

```bash
npm ci
npm run dev
```

`npm run dev` 會同時啟動：

- React UI：`http://localhost:3000/RobotFriends`
- Research API：`http://localhost:8787`

按 `Ctrl+C` 可一起停止。只開 UI 可用 `npm start`；只開 API 可用 `npm run api`。

Provider 設定請參考 [.env.example](.env.example) 與 [資料擷取 API 說明](docs/api-ingestion.zh-TW.md)。

## 架構

```text
 SEC / EIA / PJM / FERC / 官方 IR / 市場價格
                         │
                         ▼
                    source adapters
                         │
                 validate + fail closed
                         │
                         ▼
          normalized observations + provenance
                         │
             ┌───────────┴───────────┐
             ▼                       ▼
       SQLite/WAL 歷史          versioned scoring
             │                       │
             └───────────┬───────────┘
                         ▼
                    research API
              ┌──────────┼──────────┐
              ▼          ▼          ▼
        Scenario Lab  Backtest   audit queries
                         │
                         ▼
                     React UI

GitHub Pages profile：
provider refresh → schema-v4 snapshot → demo readiness gate
                → commit main → Pages build/deploy → Lighthouse CI
```

主要模組：

- `server/sources.js`：SEC、EIA、PJM、FERC、官方 company IR 與市場價格 adapter。
- `server/price-history.js`：驗證 Stooq 歷史資料，失敗時使用 Yahoo Finance demo fallback。
- `server/service.js`：cache/source health 與 zero-row fail-closed 行為。
- `server/provenance.js`：deterministic observation identity 與 audit metadata。
- `server/database.js` / `server/store.js`：SQLite schema 與持久化研究歷史。
- `server/scoring/`：版本化、可解釋公司 scoring。
- `server/scenario-engine.js`：deterministic infrastructure sensitivity model。
- `server/backtest.js` / `src/backtestModel.js`：point-in-time validation。
- `server/historical-reconstruction.js`：具有歷史 cutoff、且清楚標示來源的 demo reconstruction。
- `server/demo-readiness.js`：公開 snapshot 的驗收條件。
- `src/DataHealth.js`：營運／示範準備度 workspace。
- `src/ScenarioLab.js` / `src/BacktestLab.js`：研究工作區。

Storage interface 刻意保持窄介面，正式環境要把 SQLite 換成 Postgres 時，不必重寫 scoring／scenario／backtest domain logic。

## Research API

API 預設只綁定 `127.0.0.1`。若刻意部署到網路，請設定 `HOST`、`ALLOWED_ORIGINS` 與長且隨機的 `API_WRITE_TOKEN`；非 loopback 的狀態變更 request 需要 bearer token。不可把 token 放進靜態 React build。

主要 endpoints：

```text
GET  /api/health
GET  /api/observations
GET  /api/provenance?observationId=...
GET  /api/scores?ticker=NBIS
POST /api/ingest?source=prices
POST /api/scenario
GET  /api/scenario/runs
POST /api/backtest
GET  /api/backtest/runs
```

詳見 [docs/api-ingestion.zh-TW.md](docs/api-ingestion.zh-TW.md)。

## 市場價格擷取

公開 demo 先使用 Stooq。如果某個 ticker 的歷史為空、過舊、筆數不足或不可用，會改用 Yahoo Finance chart endpoint。`prices` 要標為健康時，每個設定的 ticker 都至少要有 60 筆可用且近期的日資料。

HTTP `200` 但 0 筆可用資料會標成 **degraded**，不會標 `ok`。降級更新不會刪掉既有歷史；實際使用的 provider 與 origin URL 會保存到 provenance。若用於商業金融情境，應改成公司核准／授權的市場資料 provider。

## 時點驗證

公開 demo 清楚區分：

- **實際記錄**：原日期當天產生的 score snapshot。
- **歷史重建**：之後以明確 historical `asOf` cutoff 重建的資料。
- **部分重建品質**：methodology-v1 的基本面與結構性曝險目前尚未具備完整 historical-vintage source inputs。

30D / 90D 是**日曆日**，不是交易日。若目標日期落在週末或市場假日，Gridline 會在文件規範的 tolerance 內使用下一個可取得的收盤價，不會對不存在的價格做 interpolation。每日 snapshot 向前推進時，舊訊號保持固定，pending outcome 則可能成熟為 complete。

詳見 [docs/backtesting.md](docs/backtesting.md)。

## 驗證

程式品質 gate：

```bash
npm run verify
```

等同：

```bash
npm run test:api
npm run test:unit
npm run build
```

產生最新靜態 snapshot 後，可驗證公開 demo 的資料狀態：

```bash
npm run demo:check
```

或一次執行程式驗證與 snapshot 驗收：

```bash
npm run verify:demo
```

`verify:demo` 比 PR CI 更嚴格；repository 目前若仍是舊／不完整 snapshot，它可以合理失敗。PR CI 只驗證 code，不依賴 live provider 是否可用。

## 靜態每日 Snapshot 與 Pages 部署

`Refresh daily dashboard snapshot` 於工作日 **22:00 UTC** 執行，也支援手動 dispatch。它會重試各來源、對 degraded provider 保留 last-known-good 資料、產生 schemaVersion 4 歷史資料（`scores`、`companyHistory`、`backtestCoverage`、`demoReadiness`），然後執行 `npm run demo:check`。

只有通過示範關鍵 gate 的 snapshot 才會提交到 `main`。這次 push 會觸發另一個 `Deploy to GitHub Pages` workflow，執行 Node 22 lockfile install、production build、Pages deploy 與 Lighthouse CI。

Gate 的關鍵條件包含：四個追蹤 ticker 都有近期可用價格歷史，且至少有一筆清楚標示的 historical reconstruction。選用 provider degraded 會以警示顯示，不會被靜默隱藏。

部署文件：[繁體中文](docs/static-snapshot-deployment.zh-TW.md) · [English](docs/static-snapshot-deployment.en.md)。

## 資料健康

開啟 **研究實驗室 → 資料健康** 或直接前往 `#health`，可以檢查公開儀表板正在使用的同一份 committed snapshot。畫面包含：

- 產生時間／資料年齡；
- source health 與 degraded 原因；
- 每個 ticker 的價格筆數、期間與 provider；
- schema／方法論版本；
- 實際記錄 vs 歷史重建涵蓋；
- `示範就緒`、`可展示，但有警示`、`需要處理`。

這是營運透明度畫面，不表示所有選用 provider 都必須即時在線。

## 選用 Supabase 帳戶

React 專案端已具備註冊、Email 確認／重寄、登入、session restoration、密碼恢復／變更、偏好載入／保存與登出。未設定 Supabase 時，公開研究 demo 仍可正常使用。

若面試需要展示 live account，請依 [docs/accounts.zh-TW.md](docs/accounts.zh-TW.md) 設定 Supabase project、redirect、RLS SQL 與 browser-safe publishable variables。Service-role／secret key 不應放在前端。

## EIA 來源標示

顯示 EIA 觀察值之處，Gridline 會標示**美國能源資訊署（EIA）**為來源，並保留 observation/retrieval timestamps。Gridline 分數不是由 EIA 製作、背書或核准。任何衍生研究結果都應保留 EIA attribution 與時間脈絡。

English README：[README.md](README.md)。
