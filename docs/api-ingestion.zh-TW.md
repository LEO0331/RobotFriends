# 資料擷取 API

以 `npm run api` 在本機啟動 API，預設網址為 `http://localhost:8787`。請將 `.env.example` 複製為本機環境設定，或在執行前匯出相應環境變數。

API 預設只綁定 `127.0.0.1`。若刻意對外開放，請設定 `HOST`、限制 `ALLOWED_ORIGINS`，並建立長且隨機的 `API_WRITE_TOKEN`。所有非本機 POST 請求都必須使用 `Authorization: Bearer <token>`，且會套用速率限制。不得將此 token 放入靜態 React 建置。公開觀察值與分數查詢均有分頁及筆數上限。

| Endpoint | 用途 |
|---|---|
| `GET /api/health` | 各來源狀態、最近成功時間與降級原因。 |
| `GET /api/observations?ticker=ORCL&type=close` | 標準化後的 silver 觀察值。 |
| `POST /api/ingest?source=sec` | 更新一個來源。 |
| `POST /api/ingest/all` | 各來源獨立更新；缺少憑證只會使該來源降級。 |

資料流程會將不可變原始回應存至 bronze、正規化資料存至 silver、來源健康狀態存至 gold。遺失值絕不會轉為零。

## EIA 來源標示與資料完整性

顯示衍生自 EIA 的觀察值時，必須標示美國能源資訊署（EIA）為來源，並連結至 EIA Open Data。原始 EIA 觀察值、觀察期間與擷取時間需與 Gridline 衍生指標分開保存。不得使用 EIA 標誌，亦不得以文字暗示 EIA 背書本儀表板、分數或投資結論。

EIA 資料僅限 Gridline 的研究與決策輔助用途。不得傳送至不相關的產品或服務，呈現資料時也不得移除其來源標示或時間脈絡。
