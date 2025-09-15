const jwt = require('jsonwebtoken');

module.exports = function auth(req, res, next) {
  try {
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized: Missing token' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, ... }
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Unauthorized: Invalid token' });
  }
};


