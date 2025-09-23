# Landing Page API Documentation

This document describes the API endpoints for the Doctor Appointment System landing page.

## Base URL
```
http://localhost:5000/api/landing
```

## Endpoints

### 1. Get All Landing Page Data
**GET** `/api/landing`

Returns all landing page data in a single request.

**Response:**
```json
{
  "success": true,
  "data": {
    "hero": {
      "title": "Discover Health: Find Your Trusted",
      "subtitle": "Doctors Today",
      "ctaText": "Book Appointment",
      "imageUrl": "assets/img/banner/banner-doctor.svg",
      "stats": {
        "appointments": "5K+",
        "rating": "5.0"
      }
    },
    "doctors": [...],
    "specialties": [...],
    "testimonials": [...],
    "stats": {
      "doctorsAvailable": 300,
      "specialities": 18,
      "bookingsDone": 30000,
      "hospitalsClinics": 97,
      "labTests": 317
    },
    "services": [...],
    "reasons": [...],
    "companyLogos": [...]
  }
}
```

### 2. Get Hero Section Data
**GET** `/api/landing/hero`

Returns hero banner data.

**Response:**
```json
{
  "success": true,
  "data": {
    "title": "Discover Health: Find Your Trusted",
    "subtitle": "Doctors Today",
    "ctaText": "Book Appointment",
    "imageUrl": "assets/img/banner/banner-doctor.svg",
    "stats": {
      "appointments": "5K+",
      "rating": "5.0"
    }
  }
}
```

### 3. Get Featured Doctors
**GET** `/api/landing/doctors`

Returns featured doctors for the landing page.

**Query Parameters:**
- `limit` (optional): Number of doctors to return (default: 8)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "name": "Dr. Michael Brown",
      "specialty": "Psychologist",
      "rating": 5.0,
      "location": "Minneapolis, MN",
      "imageUrl": "assets/img/doctor-grid/doctor-grid-01.jpg",
      "available": true,
      "duration": 30,
      "experience": 8,
      "consultationFee": 150
    }
  ]
}
```

### 4. Get Medical Specialties
**GET** `/api/landing/specialties`

Returns all medical specialties.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "name": "Cardiology",
      "slug": "cardiology",
      "doctorCount": 254,
      "imageUrl": "assets/img/specialities/speciality-01.jpg",
      "iconUrl": "assets/img/specialities/speciality-icon-01.svg",
      "description": "Heart and cardiovascular system specialists"
    }
  ]
}
```

### 5. Get Testimonials
**GET** `/api/landing/testimonials`

Returns patient testimonials.

**Query Parameters:**
- `limit` (optional): Number of testimonials to return (default: 10)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "patientName": "Deny Hendrawan",
      "comment": "I had a wonderful experience...",
      "rating": 5,
      "location": "United States",
      "imageUrl": "assets/img/patients/patient22.jpg",
      "doctorId": {
        "_id": "...",
        "name": "Dr. Smith",
        "specialty": "Cardiologist"
      }
    }
  ]
}
```

### 6. Get Statistics
**GET** `/api/landing/stats`

Returns landing page statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "doctorsAvailable": 300,
    "specialities": 18,
    "bookingsDone": 30000,
    "hospitalsClinics": 97,
    "labTests": 317
  }
}
```

### 7. Get Services
**GET** `/api/landing/services`

Returns service offerings.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "title": "Multi Speciality Treatments & Doctors"
    },
    {
      "title": "Lab Testing Services"
    }
  ]
}
```

### 8. Get Reasons to Choose Us
**GET** `/api/landing/reasons`

Returns reasons why patients should choose the platform.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "title": "Follow-Up Care",
      "description": "We ensure continuity of care...",
      "icon": "isax isax-tag-user5"
    }
  ]
}
```

### 9. Get Company Logos
**GET** `/api/landing/companies`

Returns company logos for the testimonials section.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "name": "Company 1",
      "imageUrl": "assets/img/company/company-01.svg"
    }
  ]
}
```

## Error Responses

All endpoints return error responses in the following format:

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message"
}
```

## Example cURL Commands

### Get all landing page data:
```bash
curl -X GET http://localhost:5000/api/landing
```

### Get featured doctors:
```bash
curl -X GET http://localhost:5000/api/landing/doctors?limit=4
```

### Get specialties:
```bash
curl -X GET http://localhost:5000/api/landing/specialties
```

### Get testimonials:
```bash
curl -X GET http://localhost:5000/api/landing/testimonials?limit=3
```

### Get statistics:
```bash
curl -X GET http://localhost:5000/api/landing/stats
```

## Setup Instructions

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Seed the database:**
   ```bash
   npm run seed
   ```

3. **Start the server:**
   ```bash
   npm start
   ```

The server will run on `http://localhost:5000` and is configured to accept CORS requests from `http://localhost:5173` (the frontend development server).

## Database Models

The API uses the following MongoDB collections:
- `doctors` - Doctor information
- `specialties` - Medical specialties
- `testimonials` - Patient testimonials
- `landingpages` - Landing page configuration

All models include timestamps and proper validation.
