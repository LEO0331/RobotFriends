# Supabase 免費方案帳戶

公開儀表板無需登入。帳戶可儲存追蹤清單、語言與容量權重。修改儀表板設定後，於帳戶面板按「儲存偏好設定」；登入及恢復工作階段時會載入偏好。

1. 在 https://supabase.com/dashboard 建立 **Free** 專案，無需啟用付費附加功能。
2. 在 SQL Editor 執行 `supabase/user-preferences.sql` 一次。資料列層級安全性（RLS）讓每位使用者只能存取自己的設定，匿名訪客無存取權。
3. 啟用 Email 登入、保留電子郵件確認，並設定至少 8 碼密碼。
4. Authentication → URL Configuration：Site URL 設為 `https://leo0331.github.io/RobotFriends/`；允許此回呼網址、無尾端斜線版本及 `http://localhost:3000/RobotFriends`。確認與重設連結請在發出請求的同一瀏覽器開啟。
5. 從 Connect/API Keys 複製專案 URL 與 **publishable** key（`sb_publishable_...`）。React 不可使用 secret 或 service-role key。
6. 本機 `.env.local` 設定 `REACT_APP_SUPABASE_URL` 與 `REACT_APP_SUPABASE_PUBLISHABLE_KEY`，重新啟動開發伺服器。
7. GitHub Settings → Secrets and variables → Actions → **Variables** 新增同名 repository variables，再建置部署。這兩項為可公開的瀏覽器設定。

未設定時，帳戶面板會說明尚未啟用，公開頁面仍可使用。Supabase SDK 負責保存及更新工作階段；登出清除本機工作階段。Supabase 僅保存偏好與追蹤清單，市場或 EIA 原始資料不會傳送至 Supabase。密碼直接交由 Supabase Auth 處理。

內建郵件服務可能僅允許寄給專案成員，且有寄送限制。開放一般使用者註冊與重設密碼前，須設定自訂 SMTP 並驗證寄送。免費專案可能因閒置而暫停，請參閱 https://supabase.com/pricing 及 https://supabase.com/docs/guides/auth/auth-smtp 。

設定完成後測試註冊、確認、登入、保存及重新載入偏好、錯誤密碼、重設密碼與登出。用第二個帳戶確認無法存取第一個帳戶的設定。專案與 SQL 尚未設定前，無法在此驗證真實登入及資料庫政策。
