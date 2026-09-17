# 靜態每日快照部署

## 流程

Gridline 將**資料更新**與**網站部署**分開處理。

1. `Refresh daily dashboard snapshot` 於每週一至週五 `22:00 UTC` 啟動，也可用 `workflow_dispatch` 手動執行。GitHub 排程可能晚幾分鐘啟動，請以快照內的 `generatedAt` 為準。
2. `npm run snapshot` 依序更新已設定的來源。每個來源最多嘗試三次：立即、1 秒後與 2 秒後。
3. 股價歷史會逐一檢查每個 ticker。Stooq 是示範用主要來源，Yahoo Finance chart 資料作為備援。空資料、過舊、筆數不足或 ticker 涵蓋不完整都視為 `degraded`，不會當成成功。
4. 成功來源會取代舊的靜態觀察值；降級來源則保留上次成功資料，避免上游回傳空結果時把歷史資料洗掉。
5. 產生器寫入 **schemaVersion 4** 的 `public/data/dashboard-snapshot.json`，內容包含來源健康狀態、更新結果、觀察值、版本化分數、`companyHistory`、`backtestCoverage`，以及精簡的 `demoReadiness` 摘要。
6. 在提交檔案前，workflow 會執行 `npm run demo:check` 驗證示範關鍵條件。若存在 blocker，更新 workflow 會失敗，現有公開快照維持不變。
7. 快照有變更且通過 gate 後，workflow 才提交到 `main`。
8. 接著由 refresh workflow **明確 dispatch** `Deploy to GitHub Pages` 的 `workflow_dispatch`。這一步是必要的，因為使用 repository `GITHUB_TOKEN` 產生的 push 不會自動觸發另一個 push-based workflow。
9. Pages workflow 會從更新後的 `main` 依 lockfile 安裝、建置 React、部署 Pages artifact，最後以 Lighthouse CI 檢查已部署網站。

因此「snapshot commit 已成功」**不等於** GitHub Pages 已更新。請確認後續的 `Deploy to GitHub Pages` workflow 也有執行成功，或比對部署網站 `#health` 的產生時間是否已更新。

## 成功更新時會改變哪些內容

Action 每次都會寫入新的 `generatedAt` 以及各來源的執行結果與健康狀態。成功的來源會替換其靜態觀察值；降級來源則保留先前可用資料，並更新檢查時間與錯誤狀態。之後會重新計算公司分數、加入當日公司歷史點、更新時點／回測涵蓋範圍，並重新評估示範準備度。因此，價格與 EIA 來源成功時，相關資料會更新。

儀表板的快照日期直接讀取已部署 JSON 的 `generatedAt`，並以瀏覽者的本地時區顯示；資料健康頁仍會顯示精確 UTC 時間。`generatedAt` 代表檔案產生時間；各筆資料自己的 `observedAt` 才是市場或營運資料的實際觀察日期。

目前的擴張／阻力主指數、驅動因素卡片、區域專案假設及示範事件文字仍屬編輯式 MVP 輸入，不會只因 Action 執行而自動改變。等一級來源涵蓋足夠後，後續方法論版本才能以正規化觀察值計算這些內容。

## 示範準備度 Gate

每日 workflow 要發布公開快照前，必須通過以下關鍵條件：

- 快照 schema 為 v4 或更新版本；
- `generatedAt`、`companyHistory`、`backtestCoverage` 與公司分數方法論版本存在；
- NBIS、CRWV、ORCL、AVGO 各自至少有 60 筆可用日價格，且最新資料距離目前不超過 10 個日曆日；
- 任一來源不得在 `recordCount = 0` 時仍標示為 `ok`；
- 時點歷史至少包含一筆清楚標示的歷史重建資料。

若選用來源降級，但保留下來的快照仍滿足上述關鍵資料需求，會被視為**警示**而不是自動阻擋。這樣可以如實揭露 partial-data 狀態，同時保留仍有價值的示範環境。

本機可執行同一個 gate：

```bash
npm run demo:check
```

若要先跑測試／建置，再檢查目前的靜態快照：

```bash
npm run verify:demo
```

如果 repository 內仍是舊快照或刻意不完整的快照，`verify:demo` 失敗是預期結果。要驗證完整端到端示範狀態時，請先產生最新快照。

## 設定

在 repository 的 **Settings → Secrets and variables → Actions** 加入你實際要使用的 provider 設定：

- `SEC_USER_AGENT`
- `EIA_API_KEY`
- `PJM_API_KEY`
- `FERC_API_KEY`
- 選用的 `COMPANY_IR_FEEDS`

目前示範用市場價格來源不需要 repository secret。若正式部署改用核准／授權的供應商，可在其他部署 profile 覆寫 `PRICE_BASE_URL` 與 `PRICE_FALLBACK_BASE_URL`。

Supabase 只在你啟用選用帳戶功能時，由 Pages build 使用：

- `REACT_APP_SUPABASE_URL`
- `REACT_APP_SUPABASE_PUBLISHABLE_KEY`

公開研究儀表板與每日快照更新都不依賴登入功能。

## 失敗處理

Gridline 在資料邊界採 fail-closed：

- HTTP 成功但沒有可用觀察值，仍視為降級，不視為成功；
- 來源失敗／降級不會刪除上次成功的靜態歷史；
- 若保留資料仍符合示範關鍵 gate，可帶著明確警示發布；
- 若缺少市場歷史、schema-v4 時點資料或其他關鍵條件，`demo:check` 會在提交快照前失敗；
- 若整個 snapshot script 失敗，workflow 也會失敗，現有公開 artifact 維持不變；
- 若 snapshot commit 成功但 Pages dispatch 失敗，repository 已有新資料，但公開網站仍維持舊 build。此時手動重跑 `Deploy to GitHub Pages`，並檢查 dispatch step。

可在應用程式的 **研究實驗室 → 資料健康**（`#health`）檢查部署網站實際正在使用的 snapshot。
