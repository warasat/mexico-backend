# Doctor Appointment Backend – Doctor Profile Module

## What this adds
- Doctor profile model (`models/DoctorProfile.js`) linked to `User`
- Profile endpoints under `/api/doctors/*` (list, by id, me, update, upload-image, availability)
- JWT auth middleware, multer memory upload with 4MB limit, Cloudinary upload via upload_stream
- Socket.io broadcasting `doctorAvailabilityUpdate`

## Env vars
Create `.env` with:
```
MONGO_URI=mongodb://127.0.0.1:27017/doctorapp
JWT_SECRET=replace_with_strong_secret
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
PORT=5000
CORS_ORIGIN=http://localhost:5173
```

## Run locally
```bash
npm install
npm run dev # or npm start
```

## Cloudinary setup
- Create an account, copy cloud name, api key, api secret into `.env`.

## Endpoints
- GET `/api/doctors` – list with `q, city, specialty, page, limit, sort` (`rank`)
- GET `/api/doctors/:id`
- GET `/api/doctors/me` (Bearer token)
- PUT `/api/doctors/me` (upsert JSON)
- POST `/api/doctors/me/upload-image` (multipart field `image`)
- PATCH `/api/doctors/me/availability` (body `{ availability }`)

See `EXAMPLES.md` for axios, curl, and a Postman collection snippet.

## Security & production notes
- Configure `CORS_ORIGIN`
- Prefer short-lived JWTs and refresh flow
- Consider rate limiting and Helmet config tightening
