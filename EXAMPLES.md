### Axios examples (base URL http://localhost:5000/api)

List doctors with query params:
```ts
import axios from 'axios';
const res = await axios.get('http://localhost:5000/api/doctors', {
  params: { q: 'cardio', city: 'Guadalajara', specialty: 'Cardio', page: 1, limit: 12, sort: 'rank' }
});
console.log(res.data.results);
```

Get doctor by id:
```ts
const res = await axios.get(`http://localhost:5000/api/doctors/${doctorId}`);
```

Get my profile:
```ts
const res = await axios.get('http://localhost:5000/api/doctors/me', {
  headers: { Authorization: `Bearer ${token}` }
});
```

Update my profile (upsert):
```ts
const body = {
  displayName: 'Dr. Current User',
  designation: 'Cardiologist',
  experience: '10+ years',
  selectedInsurances: undefined, // frontend should send insurances
  insurances: ['Aetna', 'Cigna'],
  languages: undefined, // frontend should send knownLanguages
  knownLanguages: ['English', 'Spanish'],
  specialtyRank: 3,
};
const res = await axios.put('http://localhost:5000/api/doctors/me', body, {
  headers: { Authorization: `Bearer ${token}` }
});
```

Upload profile image (field name 'image'):
```ts
const form = new FormData();
form.append('image', file);
const res = await axios.post('http://localhost:5000/api/doctors/me/upload-image', form, {
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
});
```

Toggle availability:
```ts
await axios.patch('http://localhost:5000/api/doctors/me/availability', { availability: 'available' }, {
  headers: { Authorization: `Bearer ${token}` }
});
```

### socket.io-client example
```ts
import { io } from 'socket.io-client';
const socket = io('http://localhost:5000', { transports: ['websocket'] });
socket.on('doctorAvailabilityUpdate', (payload) => {
  console.log('availability update', payload);
});
```

### cURL snippets
```bash
curl "http://localhost:5000/api/doctors?q=cardio&sort=rank"

curl "http://localhost:5000/api/doctors/DOCTOR_ID"

curl -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/doctors/me

curl -X PUT -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"displayName":"Dr X","knownLanguages":["English"],"insurances":["Aetna"]}' \
  http://localhost:5000/api/doctors/me

curl -X POST -H "Authorization: Bearer $TOKEN" -F image=@/path/to/image.jpg \
  http://localhost:5000/api/doctors/me/upload-image

curl -X PATCH -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"availability":"available"}' \
  http://localhost:5000/api/doctors/me/availability
```

### Postman collection (minimal)
```json
{
  "info": {"name": "Doctor Profile API", "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"},
  "item": [
    {"name": "List Doctors", "request": {"method": "GET", "url": "http://localhost:5000/api/doctors"}},
    {"name": "Get Doctor", "request": {"method": "GET", "url": "http://localhost:5000/api/doctors/{{doctorId}}"}},
    {"name": "Me", "request": {"method": "GET", "header": [{"key": "Authorization", "value": "Bearer {{token}}"}], "url": "http://localhost:5000/api/doctors/me"}},
    {"name": "Update Me", "request": {"method": "PUT", "header": [{"key": "Authorization", "value": "Bearer {{token}}"},{"key":"Content-Type","value":"application/json"}], "body": {"mode": "raw", "raw": "{\n  \"displayName\": \"Dr. X\",\n  \"knownLanguages\": [\"English\"],\n  \"insurances\": [\"Aetna\"]\n}"}, "url": "http://localhost:5000/api/doctors/me"}},
    {"name": "Upload Image", "request": {"method": "POST", "header": [{"key": "Authorization", "value": "Bearer {{token}}"}], "body": {"mode": "formdata", "formdata": [{"key": "image", "type": "file", "src": ""}]}, "url": "http://localhost:5000/api/doctors/me/upload-image"}},
    {"name": "Availability", "request": {"method": "PATCH", "header": [{"key": "Authorization", "value": "Bearer {{token}}"},{"key":"Content-Type","value":"application/json"}], "body": {"mode": "raw", "raw": "{\n  \"availability\": \"available\"\n}"}, "url": "http://localhost:5000/api/doctors/me/availability"}}
  ]
}
```


