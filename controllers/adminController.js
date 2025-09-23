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
    // Deduplicate doctors by user and join with DoctorAuth to get doctorId
    const agg = await DoctorProfile.aggregate([
      { $sort: { createdAt: -1 } },
      { $group: { _id: '$user', doc: { $first: '$$ROOT' } } },
      { $replaceRoot: { newRoot: '$doc' } },
      {
        $lookup: {
          from: 'doctorauths',
          localField: 'user',
          foreignField: '_id',
          as: 'doctorAuth',
          pipeline: [
            { $project: { doctorId: 1, fullName: 1 } }
          ]
        }
      },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
    ]);
    const totalDistinct = (await DoctorProfile.distinct('user')).length;
    const results = agg.map(d => {
      // Provide fallback image for missing profile pictures
      const getDoctorImage = () => {
        if (d.profileImage && d.profileImage.url && d.profileImage.url.trim()) {
          console.log(`[Page ${page}] Doctor profile image found for ${d.firstName || 'Unknown'}:`, d.profileImage.url);
          return d.profileImage.url;
        }
        // Fallback to default doctor image
        console.log(`[Page ${page}] Using fallback doctor image for doctor:`, d.firstName || 'Unknown', 'Doctor profile exists:', !!d);
        return '/src/assets/admin/assets/img/profiles/doctor-03.jpg';
      };
      
      // Get doctorId from DoctorAuth
      const doctorAuth = d.doctorAuth && d.doctorAuth[0] ? d.doctorAuth[0] : null;
      const doctorId = doctorAuth?.doctorId || '';

      // Debug the raw data
      console.log(`[Page ${page}] Raw doctor data:`, {
        _id: d._id,
        user: d.user,
        userType: typeof d.user,
        firstName: d.firstName,
        lastName: d.lastName,
        displayName: d.displayName,
        isBlocked: d.isBlocked,
        doctorId: doctorId,
        doctorAuth: doctorAuth
      });

      // Ensure we have a valid user ID
      const userId = d.user ? String(d.user) : String(d._id);
      console.log(`[Page ${page}] Using userId:`, userId, 'for doctor:', d.firstName || 'Unknown');
      
      return {
        id: userId, // Use user ID, fallback to profile ID if user is missing
        profileId: String(d._id), // Keep profile ID for reference
        doctorId: doctorId, // Add doctorId field (DRXXXXXX format)
        DoctorName: d.displayName || `${d.firstName || ''} ${d.lastName || ''}`.trim() || 'Unknown Doctor',
        Speciality: d.designation || 'General Practice',
        image: getDoctorImage(),
        Date: new Date(d.createdAt || Date.now()).toISOString().slice(0,10),
        time: new Date(d.createdAt || Date.now()).toISOString().slice(11,16),
        createdAt: d.createdAt,
        isBlocked: d.isBlocked || false,
        // Debug info (remove in production)
        _debug: {
          page: page,
          doctorProfileExists: !!d,
          doctorHasImage: !!(d.profileImage && d.profileImage.url),
          doctorImageUrl: d.profileImage ? d.profileImage.url : null,
          doctorName: d.displayName || `${d.firstName || ''} ${d.lastName || ''}`.trim(),
          doctorDesignation: d.designation,
          isBlocked: d.isBlocked,
          userId: d.user,
          profileId: d._id,
          finalUserId: userId,
          doctorId: doctorId,
          doctorAuth: doctorAuth
        }
      };
    });
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

    // First, let's try a direct query to see what data we have
    console.log(`[Page ${page}] Fetching patient profiles directly from database...`);
    
    // Build a pipeline that deduplicates by user (latest profile wins), then paginates
    const profiles = await PatientProfile.aggregate([
      { $sort: { createdAt: -1 } },
      { $group: { _id: '$user', doc: { $first: '$$ROOT' } } },
      { $replaceRoot: { newRoot: '$doc' } },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      // Lookup Patient collection to get the patientId (PTF9D3B6 format)
      {
        $lookup: {
          from: 'patients',
          localField: 'user',
          foreignField: '_id',
          as: 'patientDoc',
          pipeline: [
            { $project: { patientId: 1 } }
          ]
        }
      },
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
      // Add explicit projection to ensure we get all necessary fields
      {
        $project: {
          _id: 1,
          user: 1,
          firstName: 1,
          lastName: 1,
          dateOfBirth: 1,
          gender: 1,
          phone: 1,
          email: 1,
          bloodGroup: 1,
          addressLine: 1,
          city: 1,
          state: 1,
          country: 1,
          pincode: 1,
          profileImage: 1,
          createdAt: 1,
          lastAppt: 1,
          patientDoc: 1
        }
      }
    ]);
    
    // Also try a direct query to see all patient profiles
    const allProfiles = await PatientProfile.find({}).limit(20);
    console.log(`[Page ${page}] Direct query - All patient profiles:`, allProfiles.map(p => ({
      firstName: p.firstName,
      lastName: p.lastName,
      dateOfBirth: p.dateOfBirth,
      addressLine: p.addressLine,
      user: p.user
    })));
    
    // Also try a direct query to see all patients with their patientIds
    const Patient = require('../models/Patient');
    const allPatients = await Patient.find({}).limit(20);
    console.log(`[Page ${page}] Direct query - All patients with patientIds:`, allPatients.map(p => ({
      _id: p._id,
      patientId: p.patientId,
      fullName: p.fullName,
      email: p.email
    })));

    // Debug: Log all profiles data to see what we're getting from database
    console.log(`[Page ${page}] Total profiles fetched from database:`, profiles.length);
    profiles.forEach((pf, index) => {
      console.log(`[Page ${page}] Profile ${index + 1}:`, {
        firstName: pf.firstName,
        lastName: pf.lastName,
        dateOfBirth: pf.dateOfBirth,
        addressLine: pf.addressLine,
        phone: pf.phone,
        user: pf.user,
        patientDoc: pf.patientDoc,
        hasPatientDoc: !!pf.patientDoc,
        patientDocLength: pf.patientDoc ? pf.patientDoc.length : 0
      });
    });

    const results = await Promise.all(profiles.map(async (pf) => {
      const last = Array.isArray(pf.lastAppt) && pf.lastAppt[0] ? pf.lastAppt[0] : null;
      const lastDate = last?.date || last?.createdAt || null;
      const lastVisitDate = lastDate ? new Date(lastDate) : null;
      const lastVisit = lastVisitDate ? lastVisitDate.toISOString().slice(0, 10) : '';
      const lastVisitTime = last?.timeSlot || (lastVisitDate ? lastVisitDate.toISOString().slice(11, 16) : '');
      const patientName = [pf.firstName, pf.lastName].filter(Boolean).join(' ').trim() || 'Unknown Patient';
      const phone = pf.phone || '';
      
      // Get patient ID from Patient collection (PTF9D3B6 format)
      const patientDoc = Array.isArray(pf.patientDoc) && pf.patientDoc[0] ? pf.patientDoc[0] : null;
      const patientIdFromPatient = patientDoc?.patientId || '';
      console.log(`[Page ${page}] Patient ID from Patient collection for ${patientName}:`, {
        patientId: patientIdFromPatient,
        patientDoc: patientDoc,
        hasPatientDoc: !!patientDoc,
        user: pf.user
      });
      
      // If patientId is empty, try to fetch it directly from Patient collection
      let finalPatientId = patientIdFromPatient;
      if (!finalPatientId) {
        try {
          const directPatient = await Patient.findById(pf.user).lean();
          finalPatientId = directPatient?.patientId || '';
          console.log(`[Page ${page}] Direct Patient query for ${patientName}:`, {
            patientId: finalPatientId,
            patient: directPatient
          });
        } catch (error) {
          console.log(`[Page ${page}] Error fetching patient directly for ${patientName}:`, error);
        }
      }
      
      // Calculate age from dateOfBirth
      const calculateAge = (dateOfBirth) => {
        console.log(`[Page ${page}] Processing dateOfBirth for ${patientName}:`, dateOfBirth, 'Type:', typeof dateOfBirth);
        if (!dateOfBirth || dateOfBirth.trim() === '') {
          console.log(`[Page ${page}] No dateOfBirth found for ${patientName}`);
          return '';
        }
        try {
          const birthDate = new Date(dateOfBirth);
          const today = new Date();
          let age = today.getFullYear() - birthDate.getFullYear();
          const monthDiff = today.getMonth() - birthDate.getMonth();
          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
          }
          const calculatedAge = age >= 0 ? age.toString() : '';
          console.log(`[Page ${page}] Calculated age for ${patientName}: ${calculatedAge} from dateOfBirth: ${dateOfBirth}`);
          return calculatedAge;
        } catch (error) {
          console.log('Error calculating age for dateOfBirth:', dateOfBirth, error);
          return '';
        }
      };
      
      // Get address from addressLine
      const address = pf.addressLine || '';
      console.log(`[Page ${page}] Address for ${patientName}:`, address, 'Type:', typeof address);
      
      // Provide fallback image for missing profile pictures
      const getPatientImage = () => {
        if (pf.profileImage && pf.profileImage.url && pf.profileImage.url.trim()) {
          console.log(`[Page ${page}] Patient profile image found for ${patientName}:`, pf.profileImage.url);
          return pf.profileImage.url;
        }
        // Fallback to default patient image
        console.log(`[Page ${page}] Using fallback patient image for patient:`, patientName, 'Patient profile exists:', !!pf);
        return '/src/assets/admin/assets/img/profiles/avatar-01.jpg';
      };
      
      const result = {
        id: String(pf.user),
        PatientID: finalPatientId || '',
        PatientName: patientName,
        Age: calculateAge(pf.dateOfBirth),
        Address: address,
        Phone: phone,
        profileImage: getPatientImage(),
        LastVisit: lastVisit,
        LastVisitTime: lastVisitTime,
        Date: pf.createdAt ? new Date(pf.createdAt).toISOString().slice(0,10) : '',
        time: pf.createdAt ? new Date(pf.createdAt).toISOString().slice(11,16) : '',
        // Debug info (remove in production)
        _debug: {
          page: page,
          patientProfileExists: !!pf,
          patientHasImage: !!(pf.profileImage && pf.profileImage.url),
          patientImageUrl: pf.profileImage ? pf.profileImage.url : null,
          patientName: patientName,
          dateOfBirth: pf.dateOfBirth,
          calculatedAge: calculateAge(pf.dateOfBirth),
          addressLine: pf.addressLine,
          patientIdFromPatient: patientIdFromPatient,
          finalPatientId: finalPatientId,
          rawProfileData: {
            firstName: pf.firstName,
            lastName: pf.lastName,
            dateOfBirth: pf.dateOfBirth,
            addressLine: pf.addressLine,
            phone: pf.phone
          }
        }
      };
      
      console.log(`[Page ${page}] Final result for ${patientName}:`, {
        PatientID: result.PatientID,
        Age: result.Age,
        Address: result.Address,
        dateOfBirth: pf.dateOfBirth,
        addressLine: pf.addressLine,
        patientIdFromPatient: patientIdFromPatient,
        finalPatientId: finalPatientId
      });
      
      return result;
    }));

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
        // Add projection to ensure we get all necessary fields
        {
          $project: {
            _id: 1,
            doctorId: 1,
            patientId: 1,
            date: 1,
            timeSlot: 1,
            status: 1,
            doctorName: 1,
            doctorDisplayName: 1,
            doctorDesignation: 1,
            patientName: 1,
            createdAt: 1,
            // Doctor profile data - get first element from array
            doctorDoc: { $arrayElemAt: ['$doctorDoc', 0] },
            // Patient profile data - get first element from array
            patientDoc: { $arrayElemAt: ['$patientDoc', 0] }
          }
        }
      ]),
      Appointment.countDocuments({}),
    ]);
    const results = items.map(a => {
      const doctor = a.doctorDoc || {};
      const patient = a.patientDoc || {};
      // Names and speciality from Appointments snapshot; fall back to profile only if missing
      const doctorName = a.doctorName || a.doctorDisplayName || (doctor.displayName || `${doctor.firstName || ''} ${doctor.lastName || ''}`.trim());
      
      // Fetch specialty from appointment schema's doctorDesignation field first, then fallback to doctor profile
      const speciality = a.doctorDesignation || doctor.designation || 'General Practice';
      console.log(`[Page ${page}] Doctor specialty for ${doctorName}:`, {
        appointmentDesignation: a.doctorDesignation,
        doctorProfileDesignation: doctor.designation,
        finalSpecialty: speciality
      });
      
      const patientName = a.patientName || (`${patient.firstName || ''} ${patient.lastName || ''}`.trim());
      
      // Provide fallback images for missing profile pictures
      const getDoctorImage = () => {
        // Check if doctor profile exists and has profileImage with url
        if (doctor && doctor.profileImage && doctor.profileImage.url && doctor.profileImage.url.trim()) {
          console.log(`[Page ${page}] Doctor profile image found for ${doctor.firstName || 'Unknown'}:`, doctor.profileImage.url);
          return doctor.profileImage.url;
        }
        // Fallback to default doctor image
        console.log(`[Page ${page}] Using fallback doctor image for doctor:`, doctor.firstName || 'Unknown', 'Doctor profile exists:', !!doctor);
        return '/src/assets/admin/assets/img/profiles/doctor-03.jpg';
      };
      
      const getPatientImage = () => {
        // Check if patient profile exists and has profileImage with url
        if (patient && patient.profileImage && patient.profileImage.url && patient.profileImage.url.trim()) {
          console.log(`[Page ${page}] Patient profile image found for ${patient.firstName || 'Unknown'}:`, patient.profileImage.url);
          return patient.profileImage.url;
        }
        // Fallback to default patient image
        console.log(`[Page ${page}] Using fallback patient image for patient:`, patient.firstName || 'Unknown', 'Patient profile exists:', !!patient);
        return '/src/assets/admin/assets/img/profiles/avatar-01.jpg';
      };
      
      const doctorImage = getDoctorImage();
      const patientImage = getPatientImage();
      
      return {
        id: String(a._id),
        DoctorName: doctorName || 'Unknown Doctor',
        Speciality: speciality || 'General Practice',
        PatientName: patientName || 'Unknown Patient',
        AppointmentTime: a.timeSlot,
        Date: a.date ? new Date(a.date).toISOString().slice(0,10) : '',
        Status: a.status,
        // Images fetched from database schemas
        DoctorProfileImage: doctorImage,
        PatientProfileImage: patientImage,
        CreatedAt: a.createdAt ? new Date(a.createdAt).toISOString() : '',
        time: a.date ? new Date(a.date).toISOString().slice(11,16) : '',
        // Debug info (remove in production)
        _debug: {
          page: page,
          doctorProfileExists: !!doctor,
          doctorHasImage: !!(doctor && doctor.profileImage && doctor.profileImage.url),
          doctorImageUrl: doctor && doctor.profileImage ? doctor.profileImage.url : null,
          patientProfileExists: !!patient,
          patientHasImage: !!(patient && patient.profileImage && patient.profileImage.url),
          patientImageUrl: patient && patient.profileImage ? patient.profileImage.url : null,
          // Specialty debugging
          appointmentDesignation: a.doctorDesignation,
          doctorProfileDesignation: doctor.designation,
          finalSpecialty: speciality
        }
      };
    });
    return res.json({ success: true, data: results, pagination: { currentPage: page, totalPages: Math.ceil(total/limit), totalAppointments: total, hasNextPage: skip + items.length < total, hasPrevPage: page > 1 } });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to fetch appointments list' });
  }
};
