// Node >=18 required (global fetch)
// Usage: node scripts/test_appointment_flow.js [BASE_URL]
// BASE_URL default: http://localhost:5000/api

const BASE_URL = process.argv[2] || process.env.API_BASE_URL || 'http://localhost:5000/api';

async function json(res) {
  const text = await res.text();
  try { return JSON.parse(text); } catch { return { raw: text }; }
}

function randomSuffix() {
  return Math.random().toString(36).slice(2, 8);
}

async function registerPatient() {
  const body = {
    fullName: `Test Patient ${randomSuffix()}`,
    email: `patient_${randomSuffix()}@example.com`,
    phone: `03${Math.floor(100000000 + Math.random() * 899999999)}`,
    password: 'secret123',
    confirmPassword: 'secret123',
  };
  const res = await fetch(`${BASE_URL}/patients/register`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  });
  const data = await json(res);
  if (!res.ok || data?.success === false) throw new Error(`registerPatient failed: ${JSON.stringify(data)}`);
  return body; // we will login next
}

async function loginPatient(email, password) {
  const res = await fetch(`${BASE_URL}/patients/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password })
  });
  const data = await json(res);
  if (!res.ok || !data?.success || !data?.token) throw new Error(`loginPatient failed: ${JSON.stringify(data)}`);
  return { token: data.token, patient: data.patient };
}

async function listDoctors() {
  const res = await fetch(`${BASE_URL}/doctors?limit=1&sort=rank`);
  const data = await json(res);
  if (!res.ok || !data?.success || !Array.isArray(data?.results) || data.results.length === 0) {
    throw new Error(`listDoctors failed or empty: ${JSON.stringify(data)}`);
  }
  return data.results[0]; // { id, displayName, ... }
}

async function createAppointment(token, doctorProfileId, patientId) {
  const now = new Date();
  const inOneHour = new Date(now.getTime() + 60 * 60 * 1000);
  const body = {
    doctorId: String(doctorProfileId),
    patientId: String(patientId),
    date: inOneHour.toISOString(),
    timeSlot: '10:00 AM - 10:30 AM',
    location: 'City Clinic',
    insurance: '',
    service: 'General Consultation',
    mode: 'clinic',
    patientEmail: `appt_${randomSuffix()}@example.com`,
    patientPhone: '03001234567',
    symptoms: 'Headache and fatigue',
    notes: 'Booked via automated test',
  };
  const res = await fetch(`${BASE_URL}/appointments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const data = await json(res);
  if (!res.ok || !data?.success) throw new Error(`createAppointment failed: ${JSON.stringify(data)}`);
  return data.data;
}

async function getMyAppointments(token) {
  const res = await fetch(`${BASE_URL}/appointments/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await json(res);
  if (!res.ok || !data?.success) throw new Error(`getMyAppointments failed: ${JSON.stringify(data)}`);
  return data.data;
}

(async () => {
  try {
    console.log(`[TEST] Using BASE_URL: ${BASE_URL}`);
    const reg = await registerPatient();
    console.log(`[TEST] Registered patient: ${reg.email}`);
    const { token, patient } = await loginPatient(reg.email, reg.password);
    console.log(`[TEST] Logged in patient id: ${patient.id}`);
    const doctor = await listDoctors();
    console.log(`[TEST] Using doctor profile id: ${doctor.id} (${doctor.displayName})`);
    const appt = await createAppointment(token, doctor.id, patient.id);
    console.log(`[TEST] Created appointment id: ${appt._id} for doctor: ${appt.doctorName}`);
    const mine = await getMyAppointments(token);
    const found = mine.find(a => a._id === appt._id);
    if (!found) throw new Error('Booked appointment not found in patient list');
    console.log('[TEST] Verified appointment appears in patient list. SUCCESS');
    process.exit(0);
  } catch (err) {
    console.error('[TEST] FAILURE:', err && (err.stack || err.message || err));
    process.exit(1);
  }
})();


