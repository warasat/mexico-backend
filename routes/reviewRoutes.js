const express = require('express');
const auth = require('../middleware/auth');
const {
  getDoctorReviews,
  createReview,
  updateReview,
  deleteReview,
} = require('../controllers/reviewController');

const router = express.Router();

// Get all reviews for a specific doctor (public route)
router.get('/doctor/:doctorId', getDoctorReviews);

// Create a new review (protected route - patient only)
router.post('/doctor/:doctorId', auth, createReview);

// Update a review (protected route - patient only)
router.put('/:reviewId', auth, updateReview);

// Delete a review (protected route - patient only)
router.delete('/:reviewId', auth, deleteReview);

module.exports = router;
