# Adkinest Backend

TypeScript Express API for the Adkinest frontend.

## Setup

1. Install Node.js 20 or newer.
2. Run `npm install` inside this folder.
3. Copy `.env.example` to `.env`.
4. Add your MongoDB Compass or Atlas connection string to `MONGODB_URI`.
5. Run `npm run dev`.

To generate admin credentials, run `npm run generate:admin`. Copy the printed
`ADMIN_EMAIL` and `ADMIN_PASSWORD_HASH` values into `.env`. The generated plain
password is printed once, so store it securely.

The API runs on `http://localhost:5000` by default.

## Deploying to Vercel

Deploy this `backend` folder as the Vercel project root. The included
`vercel.json` builds the TypeScript project and rewrites `/api/*` requests to
the serverless Express entry point in `api/index.ts`.

Add these environment variables in Vercel Project Settings:

- `NODE_ENV=production`
- `MONGODB_URI`
- `CLIENT_ORIGIN`
- `JWT_SECRET`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD_HASH`
- `RATE_LIMIT_WINDOW_MS`
- `RATE_LIMIT_MAX`
- `RESEND_API_KEY` if email notifications are enabled
- `NOTIFICATION_FROM_EMAIL` if email notifications are enabled

After deployment, test `https://<your-backend-domain>/api/health`.

## Endpoints

- `GET /api/health` returns service and database status.
- `POST /api/leads` validates and stores a lead submitted by the frontend.
- `POST /api/auth/login` and `GET /api/auth/me` manage admin sessions.
- `POST /api/user/register`, `POST /api/user/login`, and `GET /api/user/me` manage client accounts.
- `GET /api/chat/me` and `POST /api/chat/me/messages` provide each client with a persistent private conversation.
- `GET /api/chat/conversations` and `/api/chat/conversations/:id/*` let admins manage multiple client conversations.
- `POST /api/user/reviews` accepts client feedback; `/api/admin/reviews` provides moderation.
- `GET /api/portfolio` and `GET /api/testimonials` serve public content.
- `GET /api/admin/*` and `PUT`/`DELETE /api/admin/*/:id` power the admin dashboard.

For local frontend development, copy `frontend/.env.example` to `frontend/.env`.
Set `CLIENT_ORIGIN` to the deployed frontend URL in production and set
`VITE_BACKEND_URL` to the deployed backend URL before building the frontend.

The API applies Helmet security headers, strict JSON limits, CORS allow-listing, rate limiting, input validation, and centralized error responses.
