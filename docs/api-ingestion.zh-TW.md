# 資料擷取 API

可以用 `npm run api` 啟動 API，或用 `npm run dev` 一次啟動 API 與 React UI。API 預設網址為 `http://localhost:8787`。執行 provider ingestion 前，請將 `.env.example` 複製為本機環境設定，或匯出相應環境變數。

API 預設只綁定 `127.0.0.1`。若刻意對外開放，請設定 `HOST`、限制 `ALLOWED_ORIGINS`，並建立長且隨機的 `API_WRITE_TOKEN`。所有非 loopback 的狀態變更 POST endpoint 都必須使用 `Authorization: Bearer <token>`，且會套用速率限制。不得將此 token 放入靜態 React build。公開觀察值與分數查詢均有分頁及筆數上限。

| Endpoint | 用途 |
|---|---|
| `GET /api/health` | 各來源狀態、最近成功時間與降級原因。 |
| `GET /api/observations?ticker=ORCL&type=close` | 正規化後的歷史觀察值。 |
| `GET /api/provenance?observationId=...` | 查詢單一觀察值的資料血緣。 |
| `GET /api/scores?ticker=NBIS` | 當前版本價格訊號快照；不回傳舊版人工分數。 |
| `POST /api/ingest?source=prices` | 更新單一來源；支援 `sec`、`eia`、`pjm`、`ferc`、`company-ir`、`prices`。 |
| `POST /api/ingest/all` | 各來源獨立更新；缺少憑證只會讓該來源降級。 |
| `POST /api/scenario` | 執行／保存一筆情境分析。 |
| `POST /api/backtest` | 執行／保存一筆時點回測。 |

## 儲存模型

Gridline 同時保留兩種部署 profile：

- **API／production-style profile：**原始回應存到 `data/bronze`；正規化觀察值、來源健康狀態、版本化分數快照、情境分析與回測紀錄持久化到 SQLite/WAL。觀察值 ID 為 deterministic，因此重新擷取相同來源資料是 idempotent，不會刪除既有歷史。
- **GitHub Pages demo profile：**排程 exporter 寫入 `public/data/dashboard-snapshot.json`。成功來源會取代該來源先前的靜態資料；降級來源則保留 last-known-good 觀察值。

`data/` 不會提交到 Git。已提交的靜態 snapshot 是可攜式公開示範 artifact，不等於 API database。

## Provider 需求

- **SEC EDGAR：**公開 API，只應由 server-side 呼叫。`SEC_USER_AGENT` 必須設定且需能識別呼叫者；filing availability time 要與財報涵蓋期間分開保存。
- **EIA：**需要 API key；目前 starter connector 讀取 PJM hourly RTO regional data。
- **PJM Data Miner 2：**需要 PJM account／subscription key；目前 starter connector 讀取 `gen_by_fuel`。正式重新散布資料前應確認 PJM 條款。
- **Data.FERC.gov：**需要 API key；目前 starter connector 驗證並保存 dataset catalog。若要正式當成 live indicator，需指定並實作實際 FERC dataset。
- **Company IR：**`COMPANY_IR_FEEDS` 只能放官方 RSS/Atom URL；原始資料會保留，以便之後升級 parser/version。
- **Prices：**公開示範先嘗試 Stooq；若資料為空、過舊、筆數不足或不可用，Gridline 會針對該 ticker 改用 Yahoo Finance chart endpoint。每個追蹤 ticker 至少要有 60 筆可用日資料，且最新市場觀察值不能過舊，`prices` 才能標為健康。若是金融公司正式部署，應改用公司核准／授權的市場資料供應商。

每一筆價格觀察值都會在 provenance 中保存實際採用的 provider 與 origin URL。

## Fail-closed ingestion

HTTP `200` 不等於健康資料更新。Adapter 執行後，正規化結果仍必須包含可用觀察值；空結果會標為 `degraded`，而且不會被保存成「成功但空白」的更新。

靜態 snapshot 遇到降級來源會保留 last-known-good 資料；SQLite profile 則保留不可變歷史觀察值。這對價格歷史尤其重要，因為 30D／90D lookback 與時點回測都依賴連續資料。

缺失資料絕不會轉成零。

## Demo acceptance

產生靜態快照後可執行：

```bash
npm run demo:check
```

Gate 會檢查 schema-v4 metadata、所有追蹤 ticker 的完整／近期市場價格、健康來源不可為零筆資料，以及已標示來源的時點歷史重建。排程 snapshot workflow 也會在提交新的公開快照前自動執行這個 gate。

UI 可從 `#health`／**研究實驗室 → 資料健康**檢查同一份已提交快照。

## EIA 來源標示與資料完整性

顯示衍生自 EIA 的觀察值時，必須標示美國能源資訊署（EIA）為來源，並連結至 EIA Open Data。原始 EIA 觀察值、觀察期間與擷取時間需與 Gridline 衍生指標分開保存。不得使用 EIA 標誌，也不得以文字暗示 EIA 背書本儀表板、分數或投資結論。

EIA 資料僅限 Gridline 的研究與決策輔助用途。不得傳送至不相關的產品或服務，呈現資料時也不得移除來源標示或時間脈絡。

## 排程

當 `SCHEDULE_ENABLED=true` 時，本機 API scheduler 會每分鐘檢查一次，並可能在每週一至週五 **America/New_York 16:15** 之後執行一次更新。GitHub Pages 的 snapshot workflow 則另外在工作日 `22:00 UTC` 執行，也支援手動 dispatch。市場假日不會虛構價格，而是由歷史價格驗證與 tolerance 規則處理。

示範環境刻意採低頻更新，而不是持續 polling。正式部署時，provider licensing、SLA、historical-vintage availability 與 redistribution rights 仍需由實際部署環境負責。
