### Frontend ↔ Backend Mapping (Doctor Profile)

Scanned frontend folder: `doctor-appointment-system-frontend`.

Key findings:
- Profile UI (`src/feature-module/frontend/doctors/profilesetting/index.tsx`) manages these fields and saves to a local in-memory service (no HTTP yet):
  - `selectedInsurances: string[]`
  - `experience: string`
  - `education: string` (single text)
  - `languages: string[]`
  - `specialtyRank?: number`
- Many inputs exist visually (first/last/display name, designation, phones, address, aboutMe, education/work/awards detail, services offered, profile image) but are not wired to state/API. Backend supports them now to allow seamless wiring later.
- Existing auth services use `http://localhost:5000/api` as base URL. This backend serves profile endpoints under `/api/doctors/*` to match.

Field mappings

- `languages: string[]` → `knownLanguages: string[]`
- `selectedInsurances: string[]` → `insurances: string[]`
- `experience: string` → `experience: string`
- `education: string` → `education: [{ institution, degree, startYear, endYear, description }]`
  - Transform: if frontend sends a string, backend stores a single array entry `{ degree: <string>, institution: "", startYear: null, endYear: null, description: "" }`.
- `specialtyRank: number` → `specialtyRank: number`

Additional supported fields (present in UI, not yet wired):
- `firstName`, `lastName`, `displayName`, `designation`
- `phones: [string]`, `email`
- `address: { address, city, state, country, pincode }`
- `aboutMe`, `servicesOffered: [string]`
- `education: [{ institution, degree, startYear, endYear, description }]`
- `workExperience: [{ organization, position, startYear, endYear, isCurrent, description }]`
- `awards: [{ title, year, organization, description }]`
- `profileImage: { url, public_id }` (upload field name must be `image`)

Availability mapping
- Sidebar presents availability labels only. Backend field: `availability: 'available'|'unavailable'`, plus `availabilityUpdatedAt`.
- Socket event emitted on change: `doctorAvailabilityUpdate` with `{ doctorId, availability }`.

Endpoints (implemented now to match frontend expectations)
- `GET /api/doctors` — query: `q`, `city`, `specialty` (maps to `designation`), `page`, `limit`, `sort` (`rank` → `specialtyRank` desc). Returns doctor cards: `{ id, displayName, designation, image, location, experience, insurances, specialtyRank, availability }`.
- `GET /api/doctors/:id` — returns full public profile (all profile fields except auth internals).
- `GET /api/doctors/me` — protected; profile for logged-in doctor (linked via `user: ObjectId`).
- `PUT /api/doctors/me` — protected; upsert. Accepts the fields above. Transform applied if `education` is a string.
- `POST /api/doctors/me/upload-image` — protected; `multipart/form-data` field name `image`; validates jpg/jpeg/png/svg and ≤4MB; uploads to Cloudinary and stores `{ url, public_id }`.
- `PATCH /api/doctors/me/availability` — protected; body `{ availability: 'available'|'unavailable' }`; updates `availability` and `availabilityUpdatedAt`; emits socket event.

Auth compatibility
- Uses `Authorization: Bearer <token>`; middleware decodes and sets `req.user = { id, ... }`.

Summary of transforms
- `education` (string) → first item in `education[]` with `degree` populated; others blank/null.
- `languages[]` → `knownLanguages[]`.
- `selectedInsurances[]` → `insurances[]`.

Note about models
- This project already has a `models/Doctor.js` used by Landing pages. To avoid breaking it, the profile module uses a new model `models/DoctorProfile.js` with the required fields and linkage to `User`. Routes and controllers reference `DoctorProfile`. Landing routes remain unchanged.


