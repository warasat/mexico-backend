const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password are required' });

    const admin = await Admin.findOne({ email: String(email).toLowerCase().trim() }).lean();
    if (!admin) return res.status(401).json({ success: false, message: 'Invalid email or password' });

    const ok = await bcrypt.compare(password, admin.passwordHash);
    if (!ok) return res.status(401).json({ success: false, message: 'Invalid email or password' });

    const token = jwt.sign({ role: 'admin', id: String(admin._id) }, process.env.JWT_SECRET || 'fallback_secret_key', { expiresIn: '7d' });
    return res.json({ success: true, token, role: 'admin' });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.requireAdmin = (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key');
    if (payload.role !== 'admin') return res.status(403).json({ success: false, message: 'Forbidden' });
    req.admin = payload;
    next();
  } catch (e) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
};


