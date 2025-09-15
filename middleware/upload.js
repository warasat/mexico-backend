const multer = require('multer');

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/svg+xml'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only jpg, jpeg, png, svg files are allowed'));
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 4 * 1024 * 1024 },
  fileFilter,
});

module.exports = upload;


