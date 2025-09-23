const DoctorProfile = require('../models/DoctorProfile');
const Patient = require('../models/Patient');
const Appointment = require('../models/Appointment');

exports.getDashboardStats = async (req, res) => {
  try {
    const [totalDoctors, totalPatients, totalAppointments] = await Promise.all([
      DoctorProfile.countDocuments({}),
      Patient.countDocuments({}),
      Appointment.countDocuments({}),
    ]);
    return res.json({ success: true, data: { totalDoctors, totalPatients, totalAppointments } });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to fetch stats' });
  }
};

exports.getMonthlyStats = async (req, res) => {
  try {
    const monthLabels = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    // Build the last 12 months keys in order
    const months = [];
    const keys = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
      months.push(monthLabels[d.getMonth()]);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      keys.push(key);
    }

    // Aggregate DoctorProfile by year-month
    const doctorAgg = await DoctorProfile.aggregate([
      { $match: { createdAt: { $gte: start, $lt: end } } },
      { $project: { ym: { $dateToString: { format: '%Y-%m', date: '$createdAt' } } } },
      { $group: { _id: '$ym', count: { $sum: 1 } } },
    ]);
    const doctorMap = doctorAgg.reduce((acc, cur) => { acc[cur._id] = cur.count; return acc; }, {});

    // Aggregate Patient by year-month
    const patientAgg = await Patient.aggregate([
      { $match: { createdAt: { $gte: start, $lt: end } } },
      { $project: { ym: { $dateToString: { format: '%Y-%m', date: '$createdAt' } } } },
      { $group: { _id: '$ym', count: { $sum: 1 } } },
    ]);
    const patientMap = patientAgg.reduce((acc, cur) => { acc[cur._id] = cur.count; return acc; }, {});

    // Build response in order
    const data = keys.map((k, idx) => ({
      month: months[idx],
      doctors: doctorMap[k] || 0,
      patients: patientMap[k] || 0,
    }));

    return res.json({ success: true, data });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to fetch monthly stats' });
  }
};

exports.getDoctorsList = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
    const skip = (page - 1) * limit;
    // Deduplicate doctors by user
    const agg = await DoctorProfile.aggregate([
      { $sort: { createdAt: -1 } },
      { $group: { _id: '$user', doc: { $first: '$$ROOT' } } },
      { $replaceRoot: { newRoot: '$doc' } },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
    ]);
    const totalDistinct = (await DoctorProfile.distinct('user')).length;
    const results = agg.map(d => ({
      id: String(d._id),
      DoctorName: d.displayName || `${d.firstName || ''} ${d.lastName || ''}`.trim(),
      Speciality: d.designation || '',
      image: d.profileImage?.url || '',
      Date: new Date(d.createdAt || Date.now()).toISOString().slice(0,10),
      time: new Date(d.createdAt || Date.now()).toISOString().slice(11,16),
      createdAt: d.createdAt,
    }));
    return res.json({ success: true, data: results, pagination: { currentPage: page, totalPages: Math.ceil(totalDistinct/limit), totalDoctors: totalDistinct, hasNextPage: skip + agg.length < totalDistinct, hasPrevPage: page > 1 } });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to fetch doctors list' });
  }
};

exports.getPatientsList = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
    const skip = (page - 1) * limit;

    const PatientProfile = require('../models/PatientProfile');
    // Count distinct patients by user id to avoid duplicates
    const distinctUsers = await PatientProfile.distinct('user');
    const total = distinctUsers.length;

    // Build a pipeline that deduplicates by user (latest profile wins), then paginates
    const profiles = await PatientProfile.aggregate([
      { $sort: { createdAt: -1 } },
      { $group: { _id: '$user', doc: { $first: '$$ROOT' } } },
      { $replaceRoot: { newRoot: '$doc' } },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: 'appointments',
          let: {
            pid: '$user',
            pname: {
              $trim: {
                input: { $concat: [{ $ifNull: ['$firstName', ''] }, ' ', { $ifNull: ['$lastName', ''] }] }
              }
            }
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $or: [
                    { $eq: ['$patientId', '$$pid'] },
                    { $eq: ['$patientName', '$$pname'] }
                  ]
                }
              }
            },
            { $addFields: { _computedDate: { $ifNull: ['$date', '$createdAt'] } } },
            { $sort: { _computedDate: -1 } },
            { $limit: 1 },
            { $project: { date: 1, timeSlot: 1, createdAt: 1 } },
          ],
          as: 'lastAppt',
        },
      },
    ]);

    const results = profiles.map((pf) => {
      const last = Array.isArray(pf.lastAppt) && pf.lastAppt[0] ? pf.lastAppt[0] : null;
      const lastDate = last?.date || last?.createdAt || null;
      const lastVisitDate = lastDate ? new Date(lastDate) : null;
      const lastVisit = lastVisitDate ? lastVisitDate.toISOString().slice(0, 10) : '';
      const lastVisitTime = last?.timeSlot || (lastVisitDate ? lastVisitDate.toISOString().slice(11, 16) : '');
      const patientName = [pf.firstName, pf.lastName].filter(Boolean).join(' ').trim();
      const phone = pf.phone || '';
      const imageUrl = pf.profileImage?.url || '';
      return {
        id: String(pf.user),
        PatientID: '',
        PatientName: patientName,
        Age: '',
        Address: '',
        Phone: phone,
        profileImage: imageUrl,
        LastVisit: lastVisit,
        LastVisitTime: lastVisitTime,
        Date: pf.createdAt ? new Date(pf.createdAt).toISOString().slice(0,10) : '',
        time: pf.createdAt ? new Date(pf.createdAt).toISOString().slice(11,16) : '',
      };
    });

    return res.json({ success: true, data: results, pagination: { currentPage: page, totalPages: Math.ceil(total/limit), totalPatients: total, hasNextPage: skip + profiles.length < total, hasPrevPage: page > 1 } });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to fetch patients list' });
  }
};

exports.getAppointmentsList = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      Appointment.aggregate([
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
        {
          $lookup: {
            from: 'doctorprofiles',
            localField: 'doctorId',
            foreignField: '_id',
            as: 'doctorDoc'
          }
        },
        { $unwind: { path: '$doctorDoc', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: 'patientprofiles',
            let: { pid: '$patientId' },
            pipeline: [
              { $match: { $expr: { $eq: ['$user', '$$pid'] } } }
            ],
            as: 'patientDoc'
          }
        },
        { $unwind: { path: '$patientDoc', preserveNullAndEmptyArrays: true } },
      ]),
      Appointment.countDocuments({}),
    ]);
    const results = items.map(a => {
      const doctor = a.doctorDoc || {};
      const patient = a.patientDoc || {};
      // Names and speciality from Appointments snapshot; fall back to profile only if missing
      const doctorName = a.doctorName || a.doctorDisplayName || (doctor.displayName || `${doctor.firstName || ''} ${doctor.lastName || ''}`.trim());
      const speciality = a.doctorDesignation || doctor.designation || '';
      const patientName = a.patientName || (`${patient.firstName || ''} ${patient.lastName || ''}`.trim());
      return {
        id: String(a._id),
        DoctorName: doctorName || '',
        Speciality: speciality || '',
        PatientName: patientName || '',
        AppointmentTime: a.timeSlot,
        Date: a.date ? new Date(a.date).toISOString().slice(0,10) : '',
        Status: a.status,
        // Images strictly from respective profiles per instruction
        DoctorProfileImage: (doctor.profileImage && doctor.profileImage.url) ? doctor.profileImage.url : '',
        PatientProfileImage: (patient.profileImage && patient.profileImage.url) ? patient.profileImage.url : '',
        CreatedAt: a.createdAt ? new Date(a.createdAt).toISOString() : '',
        time: a.date ? new Date(a.date).toISOString().slice(11,16) : '',
      };
    });
    return res.json({ success: true, data: results, pagination: { currentPage: page, totalPages: Math.ceil(total/limit), totalAppointments: total, hasNextPage: skip + items.length < total, hasPrevPage: page > 1 } });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to fetch appointments list' });
  }
};
