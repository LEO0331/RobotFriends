# Accounts on Supabase Free

The public dashboard needs no login. Accounts save a watchlist, language and capacity weight. Click Save preferences in the account panel after changing dashboard settings. Preferences load on sign-in and session restoration; saves are explicit to prevent unintended overwrites.

1. Create a **Free** project at https://supabase.com/dashboard. Do not enable paid add-ons.
2. Run `supabase/user-preferences.sql` in the project's SQL Editor once. It enables Row Level Security: users can read/write only their own row. No preference access is granted to anonymous users.
3. Enable Email authentication and keep email confirmation enabled. Use a minimum password length of 8.
4. Under Authentication → URL Configuration, set Site URL to `https://leo0331.github.io/RobotFriends/`. Allow that exact redirect, `https://leo0331.github.io/RobotFriends`, and your local development URL `http://localhost:3000/RobotFriends`. PKCE email links should be opened in the same browser that requested them. The SDK handles callback query parameters; application navigation uses hashes.
5. Copy the project URL and **publishable** key (`sb_publishable_...`) from the project's Connect/API Keys screen. Never put secret/service-role keys in React.
6. Local: put `REACT_APP_SUPABASE_URL` and `REACT_APP_SUPABASE_PUBLISHABLE_KEY` in `.env.local`, then restart npm start.
7. GitHub: Settings → Secrets and variables → Actions → **Variables** → create repository variables with those same names. Both deployment workflows inject them during build. Rebuild and deploy; the values are intentionally public browser configuration.

Without configuration, account entry points explain that accounts are not enabled; public research remains usable. The SDK persists and refreshes sessions. Sign out removes the local session. Language, weight and ticker watchlist are stored in Supabase; raw market/EIA data is not uploaded to Supabase. Passwords go directly to Supabase Auth.

Supabase's default email sender is limited and may restrict delivery to project-team addresses. For general public signups and recovery, configure supported custom SMTP and verify its delivery/rate limits. Free projects can pause after inactivity. Review https://supabase.com/pricing and https://supabase.com/docs/guides/auth/auth-smtp before launch.

## Acceptance checks after setup

Register → receive email → confirm in same browser → sign in. Select watchlist symbols and save dashboard language/weight; reload to confirm restoration. Test wrong password, recovery email and new password, sign out, and a second account. Verify account B cannot read or write account A's preferences through the Data API. Until the SQL and project variables are configured, live auth and database policies cannot be validated from this repository alone.
