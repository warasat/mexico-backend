const jwt = require('jsonwebtoken');
const Patient = require('../models/Patient');
const DoctorAuth = require('../models/DoctorAuth');
const Admin = require('../models/Admin');

module.exports = function auth(req, res, next) {
  try {
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized: Missing token' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key');
    
    // Skip password version check for password reset tokens
    if (decoded.type === 'password_reset') {
      return res.status(401).json({ message: 'Unauthorized: Invalid token type' });
    }
    
    req.user = decoded; // { id, ... }
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Unauthorized: Invalid token' });
  }
};

// Enhanced auth middleware that checks password version
module.exports.verifyPasswordVersion = async function(req, res, next) {
  try {
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized: Missing token' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key');
    
    // Skip password version check for password reset tokens
    if (decoded.type === 'password_reset') {
      return res.status(401).json({ message: 'Unauthorized: Invalid token type' });
    }
    
    // Check password version if token contains it
    if (decoded.passwordVersion) {
      let user;
      if (decoded.role === 'admin') {
        user = await Admin.findById(decoded.id).select('passwordVersion');
      } else if (decoded.role === 'doctor') {
        user = await DoctorAuth.findById(decoded.id).select('passwordVersion');
      } else {
        user = await Patient.findById(decoded.id).select('passwordVersion');
      }
      
      if (!user || user.passwordVersion !== decoded.passwordVersion) {
        return res.status(401).json({ message: 'Unauthorized: Session expired due to password change' });
      }
    }
    
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Unauthorized: Invalid token' });
  }
};


