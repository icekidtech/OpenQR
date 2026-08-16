# OpenQR

OpenQR is a cross-platform QR code generator. Create customizable QR codes for links you want to embed — with custom colors, gradients, logos, and error-correction levels — then save them to your cloud-synced library, batch-generate dozens at once, and export them as PNG/SVG.

- **Mobile app**: iOS + Android + Web (Expo / React Native / TypeScript)
- **Backend**: Go REST API + PostgreSQL
- **Auth**: Google & Apple OAuth only (no email/password)

## Repo layout

```
openQR/
  mobile/    # Expo app (Expo Router, React Native, TypeScript)
  backend/   # Go API (cmd/, internal/, migrations/)
```

## Backend

```
cd backend
cp .env.example .env      # set DATABASE_URL, JWT_SECRET, OAuth client IDs
go run ./cmd/api          # starts API on :8080
```

Apply migrations automatically on startup (embedded SQL files in `backend/migrations/`).

## Mobile

```
cd mobile
cp .env.example .env      # set EXPO_PUBLIC_API_URL, OAuth client IDs
npm install
npx expo start            # iOS/Android/web
```

## API overview

```
POST /v1/auth/google        { idToken }
POST /v1/auth/apple         { identityToken, fullName? }
POST /v1/auth/refresh       { refreshToken }
GET  /v1/me
GET  /v1/qrcodes            ?batchId=
POST /v1/qrcodes            { label, url, settings, format }
GET  /v1/qrcodes/{id}
PATCH /v1/qrcodes/{id}
DELETE /v1/qrcodes/{id}
GET  /v1/batches
POST /v1/batches            { name?, qrcodes: [...] }
DELETE /v1/batches/{id}
GET  /healthz
```
