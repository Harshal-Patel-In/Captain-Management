# Captain Insecticide

Full-stack app:
- Frontend: Next.js (App Router)
- Backend: FastAPI
- Real-time: WebSocket chat (`/management/chat/ws`)
- Email: SMTP (Gmail-style credentials in env vars)

## Local Development

Frontend:
```bash
npm install
npm run dev
```

Backend:
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Deployment Plan (Recommended)

- Deploy frontend on Vercel
- Deploy backend on Render

This repo includes [render.yaml](render.yaml) for Render Blueprint deployment.

## 1) Deploy Backend on Render

1. Push this repo to GitHub.
2. In Render, create service from Blueprint (use [render.yaml](render.yaml)).
3. Set required env vars in Render:
	- `DATABASE_URL`
	- `CLERK_SECRET_KEY`
	- `FRONTEND_URL`
	- `SMTP_EMAIL`
	- `SMTP_APP_PASSWORD`
	- `SMTP_FROM_NAME` (optional; default already set)
4. After deploy, copy your backend URL, for example:
	- `https://captain-insecticide-api.onrender.com`

`FRONTEND_URL` can be comma-separated for multiple domains, example:
```text
https://your-app.vercel.app,http://localhost:3000
```

## 2) Deploy Frontend on Vercel

1. Import this repo in Vercel.
2. Set these env vars in Vercel project settings:
	- `BACKEND_URL=https://captain-insecticide-api.onrender.com`
	- `NEXT_PUBLIC_BACKEND_URL=https://captain-insecticide-api.onrender.com`
3. Deploy.

Why both vars:
- `BACKEND_URL` is used for Next.js server/proxy routing (`/api/*`).
- `NEXT_PUBLIC_BACKEND_URL` is used by browser WebSocket URL generation.

## 3) Verify After Deployment

1. Open frontend and test normal API pages (products/orders/etc).
2. Open chat page and verify WebSocket live updates.
3. Trigger one email flow (order/payment/chat copy) and confirm SMTP delivery.

## Notes on Free Tiers

- SMTP: supported (outbound to your external SMTP provider).
- WebSocket: supported.
- Free plans may sleep or have limits; production reliability may need paid tier.

