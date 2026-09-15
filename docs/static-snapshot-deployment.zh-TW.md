# 靜態每日快照部署

## 流程

1. GitHub Actions 在每週一至週五 `22:00 UTC` 啟動；此時間在 EST 與 EDT 都已晚於美國正常收盤。
2. `npm run snapshot` 依序擷取每個已設定的來源。
3. 每個來源最多三次嘗試：立即、1 秒後及 2 秒後。
4. 程式寫入 `public/data/dashboard-snapshot.json`，其中包含觀察值、各來源健康狀態、執行結果、新鮮度及產生時間。
5. 若一個來源失敗，會保留前一次已提交快照中該來源的觀察值，並標記為 `degraded`，不會虛構零值。
6. 工作流程只在快照改變時提交檔案，接著建置 React 網站並將 `build` artifact 部署至 GitHub Pages。

## 設定

於 repository 的 Actions secrets 新增：`SEC_USER_AGENT`、`EIA_API_KEY`、`PJM_API_KEY`、`FERC_API_KEY`，以及選用的 `COMPANY_IR_FEEDS`。在 GitHub Pages 選擇 GitHub Actions 作為發布來源。排程工作可能延後數分鐘，請以畫面上的產生時間為準。

## 失敗處理

單一上游來源失敗不會丟棄可用的舊快照。系統會發布 partial/stale 快照、揭露來源健康狀態，並留下 GitHub Actions 日誌供診斷。若整個程式失敗，工作流程會標示失敗，方便維護者注意。
