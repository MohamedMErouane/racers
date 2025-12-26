# App Platform Deployment Guide — Docker Build Args Fix

## Problem
The `racers` Docker service (`racers1`) fails to build because App Platform does not automatically pass RUN_AND_BUILD environment variables as Docker build args. The `Dockerfile` needs `PRIVY_APP_ID`, `WS_URL`, and `API_URL` as build args, but they weren't being passed.

## Solution
The `app-spec.yaml` file has been created with proper Docker build args configuration for the Docker service.

## How to Apply

### Option A: Using the App Platform UI (Manual)
1. Open DigitalOcean Dashboard → Apps → Your App
2. Select the `racers-docker` service (the Dockerfile-based one)
3. Click **Edit** → **Build & Run**
4. Scroll to **Docker Build Args** and add:
   ```
   PRIVY_APP_ID: cmfq86fx6005yk10cfyapbkjk
   WS_URL: ws://localhost:3001
   API_URL: http://localhost:3001/api
   ```
5. Click **Save** and **Deploy**
6. Monitor build logs — you should see `✅ Config file generated with environment variables` in the `node build.js` output

### Option B: Using doctl CLI (Recommended)
```powershell
# Update your app with the spec
doctl apps update <APP_ID> --spec app-spec.yaml

# Follow build logs in real-time
doctl apps logs <APP_ID> --type build --follow
```

Replace `<APP_ID>` with your actual App Platform app ID (find it in the Dashboard or run `doctl apps list`).

## Verification
After deployment completes, check the build logs for this line:
```
✅ Config file generated with environment variables
    WS_URL: ws://localhost:3001
    API_URL: http://localhost:3001/api
```

If you see this, the Docker build succeeded and the frontend config was injected correctly.

## Key Points
- **Docker build args** are passed during the Docker build phase (when `RUN npm run build` executes)
- **Runtime envs** (scope: RUN) are available after the container starts
- The `app-spec.yaml` includes all necessary runtime envs for the server (database, secrets, Solana, Redis, etc.)
- Update `WS_URL` and `API_URL` values if you deploy to a different domain (e.g., production)

## Next Steps After Successful Build
1. **Verify the backend is running** — test the health endpoint:
   ```
   curl https://<your-app-domain>/health
   ```
2. **Update frontend envs on Vercel** — set `WS_URL` and `API_URL` to point to your App Platform domain
3. **Run DB initialization** — in the App Platform console, execute:
   ```
   node -e "require('./server/db').initializeTables()"
   ```
4. **Test the frontend** — open your Vercel frontend URL and confirm Socket.IO connects (no 404 errors)

## Troubleshooting
- **Build still fails with "WS_URL environment variable is required"**: Ensure Docker build args are set with exact names (case-sensitive: `WS_URL`, not `ws_url`)
- **Can't find Docker Build Args section**: Your App Platform service may be using "Source" build instead of "Dockerfile" build. Switch to Dockerfile build or use the UI guide
- **CORS errors in browser**: Update `CORS_ORIGIN` runtime env to include your frontend domain(s)
