# Start GlobeSync (local demo)

You need Node.js 20 or newer. No database is needed (demo data is kept in memory).

1. **Stop any old copy first** (Windows PowerShell): `taskkill /F /IM node.exe`
2. **Back end** (window 1):
   ```
   cd back-end
   npm ci
   npm run start:dev
   ```
   Wait for "Nest application successfully started" (port 3001).
   No `.env` needed for local testing: if it is missing, `.env.example` is used.
3. **Front end** (window 2):
   ```
   cd front-end
   npm ci
   npm run dev
   ```
   Open the address it prints (normally http://localhost:5173/login).
4. On the login page click a role button (Traveler, Guide, Agency, Support, Admin, Super Admin) and press Sign In.

Checks: in `back-end` run `npm run test:audit` (25 should pass).
Reports: `audit-reports/README.md`.
Data resets every time the back end restarts.
