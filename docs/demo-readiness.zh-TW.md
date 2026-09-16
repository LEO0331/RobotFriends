# 示範準備度與面試展示流程

Gridline 適合定位成**production-style 研究平台示範**，不是已上線的交易系統，也不是投資建議服務。

當主要使用流程完整、資料狀態可檢查、失敗模式會被揭露，而且 repository 能展示可重現的工程流程時，就可以把這個專案視為「示範完成」。不需要再為了看起來更大而增加更多頁面或 ticker。

## 示範完成驗收條件

### 1. 公開資料狀態可直接檢查

從 **研究實驗室 → 資料健康**（`#health`）查看。此頁讀取 GitHub Pages 實際使用的同一份 `public/data/dashboard-snapshot.json`，並顯示：

- 快照產生時間與資料年齡；
- schema 版本與分數方法論版本；
- 每個來源的狀態、資料筆數、最近成功時間與降級原因；
- NBIS / CRWV / ORCL / AVGO 的價格歷史涵蓋範圍與實際 provider；
- 時點資料中實際記錄與歷史重建的數量；
- `示範就緒`、`可展示，但有警示` 或 `需要處理` 的整體狀態。

選用 provider 可以處於 degraded 狀態，只要示範關鍵歷史資料仍完整，就可以顯示「可展示，但有警示」。降級來源不能被隱藏。

### 2. 靜態快照通過自動驗收 Gate

實際產生新快照後執行：

```bash
npm run demo:check
```

以下任何關鍵條件不成立時都會阻擋發布：

- schemaVersion 小於 4；
- 缺少產生時間、歷史或方法論 metadata；
- 任一追蹤 ticker 少於 60 筆近期日價格；
- 來源標示為 `ok` 但 `recordCount = 0`；
- 時點示範沒有任何清楚標示的歷史重建資料。

每日 snapshot workflow 會在提交新的公開快照前自動執行相同檢查。

### 3. CI 維持綠燈

每個 PR 都應通過：

```bash
npm run test:api
npm run test:unit
npm run build
```

GitHub PR workflow 另外執行 high-severity dependency audit；Pages 部署完成後也會用 Lighthouse CI 檢查已部署網站。

### 4. 本機啟動簡單

需求：Node.js 22+ 與 repository 已提交的 npm lockfile。

```bash
npm ci
npm run dev
```

`npm run dev` 會同時啟動 `http://localhost:8787` 的 research API 與 `http://localhost:3000/RobotFriends` 的 React UI，按 `Ctrl+C` 可一起停止。

若只想看靜態 UI，仍可使用 `npm start`。

### 5. 時點歷史資料來源清楚標示

驗證頁會區分：

- `實際記錄`：原日期當天建立的原生分數快照；
- `歷史重建`：之後以歷史 cutoff 重建的時點資料；
- `部分`重建品質：目前 methodology-v1 的基本面與結構性曝險仍缺少完整 historical-vintage 輸入。

30D／90D 代表日曆日，不是 30／90 個交易日。若目標日期落在週末或市場假日，會在文件所定 tolerance 內使用下一個可取得的收盤價。未來價格只用來評估已存在的訊號，不會拿來建立訊號。

### 6. 登入功能不是公開研究示範的必要條件

React 專案端已完成 Supabase 註冊、登入、密碼恢復與偏好設定流程，但 Supabase 專案本身的設定刻意留給實際部署環境。公開研究儀表板、資料健康、情境分析與時點驗證都不需要登入。

如果面試時要展示帳戶功能，就先完成 `docs/accounts.zh-TW.md` 的 Supabase 設定與驗收；否則可以把它說明為「程式端已完成、公開 demo 尚未配置的選用整合」。

## 建議 5–7 分鐘面試展示流程

1. **Overview — 核心 thesis 與 regime**  
   說明 Gridline 串連資料中心實體建設、電力／法規限制與市場預期，而不是直接產生買賣訊號。

2. **Infrastructure — 區域 drill-down**  
   選 Ohio/PJM 或 Texas，展示全國視角如何切換成區域焦點，並一起看建設階段、已確保電力與限制因素。

3. **Company exposure — 分析期間**  
   選 NBIS／CRWV，切換 30D ↔ 90D。說明市場報酬會隨期間變化，而結構性曝險是較慢變動的 point-in-time 輸入。

4. **Evidence / provenance**  
   展示來源時間、provider、confidence，以及 `observedAt` 與 `retrievedAt` 的差異；說明缺資料不會被轉成零。

5. **Scenario Lab**  
   調整供電延遲、可用電力或需求，展示 regime／公司敏感度與 contribution breakdown，並強調這是敏感度分析，不是股價預測。

6. **Point-in-time Validation**  
   展示實際記錄 vs 歷史重建、30D／90D 已完成 vs 待完成結果，以及 no-look-ahead 防護規則。

7. **Data Health + repository engineering**  
   開啟 `#health`，展示 provider degradation／price coverage，再快速帶到 GitHub CI、版本化 scoring、SQLite 歷史保存與 fail-closed price pipeline。

適合 backend 面試使用的失敗案例：

```text
Provider 回傳 HTTP 200 + 0 筆可用資料
                  ↓
          source = degraded
                  ↓
       不保存空白成功結果
                  ↓
   保留 last-known-good 價格歷史
                  ↓
公開 snapshot 仍必須通過 demo:check
```

## 目前刻意保留的邊界

以下是明確的 demo／產品邊界，不應隱藏：

- 部分基本面與結構性曝險仍是 curated methodology inputs，而非完整 historical-vintage source records；
- 因此前期歷史重建標示為 `Partial`；
- 免費示範市場資料端點若要商業金融用途，應替換成公司核准／授權的 provider；
- SEC/EIA/PJM/FERC/IR 是否可用取決於憑證與 provider 行為，降級狀態會直接顯示；
- GitHub Pages 使用 committed static snapshot；Node/SQLite profile 則另外展示持久化 API 架構；
- Supabase 在 live public account flow 驗收前仍需要實際專案端設定；
- Gridline 不宣稱具有預測能力，也不提供投資建議。

## 展示前 Checklist

面試或 pitch 前先執行：

```bash
npm ci
npm run verify
```

確認有最新的 post-close snapshot 後，再執行：

```bash
npm run demo:check
```

部署網站上確認：

- `#health` 不顯示「需要處理」；
- 價格涵蓋為 4/4；
- 歷史重建數量大於 0；
- 至少一個 ticker 可以看到預期的 30D／90D 結果；
- 情境分析與時點驗證的英文／繁中都可正常切換；
- Infrastructure 區域選擇與瀏覽器 back/forward 正常；
- 任何 degraded provider 都有清楚原因，不會被隱藏。

達到以上條件後，後續功能應由特定面試需求或客戶需求驅動，而不是繼續加入泛用 dashboard 功能。
