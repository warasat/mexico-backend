const Review = require('../models/Review');
const DoctorProfile = require('../models/DoctorProfile');
const Patient = require('../models/Patient');
const mongoose = require('mongoose');

// Get all reviews for a specific doctor
async function getDoctorReviews(req, res) {
  try {
    const { doctorId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(doctorId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid doctor ID',
      });
    }

    const reviews = await Review.find({ doctorId, isApproved: true })
      .populate('patientId', 'fullName email')
      .sort({ createdAt: -1 });

    // Calculate average rating
    const totalReviews = reviews.length;
    const averageRating = totalReviews > 0 
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews 
      : 0;

    res.json({
      success: true,
      data: {
        reviews,
        totalReviews,
        averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal place
      },
    });
  } catch (error) {
    console.error('Error fetching doctor reviews:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reviews',
      error: error.message,
    });
  }
}

// Create a new review
async function createReview(req, res) {
  try {
    const { doctorId } = req.params; // Get doctorId from URL parameters
    const { rating, comment } = req.body;
    const patientId = req.user.id; // From JWT token

    // console.log('Review creation request:', { doctorId, rating, comment, patientId });

    // Validate input
    if (!doctorId || !rating || !comment) {
      return res.status(400).json({
        success: false,
        message: 'Doctor ID, rating, and comment are required',
      });
    }

    if (!mongoose.Types.ObjectId.isValid(doctorId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid doctor ID',
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5',
      });
    }

    if (comment.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Comment cannot be empty',
      });
    }

    // Check if doctor exists
    const doctor = await DoctorProfile.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found',
      });
    }

    // Check if patient exists
    // console.log('Looking for patient with ID:', patientId);
    const patient = await Patient.findById(patientId);
    // console.log('Patient found:', patient ? 'Yes' : 'No');
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found',
      });
    }

    // Check if patient has already reviewed this doctor
    const existingReview = await Review.findOne({
      doctorId: doctorId,
      patientId: patientId,
    });

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this doctor',
      });
    }

    // Create new review
    const review = await Review.create({
      doctorId,
      patientId,
      rating,
      comment: comment.trim(),
      patientName: patient.fullName || `${patient.firstName || ''} ${patient.lastName || ''}`.trim(),
      patientEmail: patient.email,
    });

    // Populate the review with patient data
    await review.populate('patientId', 'fullName email');

    res.status(201).json({
      success: true,
      message: 'Review created successfully',
      data: review,
    });
  } catch (error) {
    console.error('Error creating review:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create review',
      error: error.message,
    });
  }
}

// Update a review
async function updateReview(req, res) {
  try {
    const { reviewId } = req.params;
    const { rating, comment } = req.body;
    const patientId = req.user.id; // From JWT token

    if (!mongoose.Types.ObjectId.isValid(reviewId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid review ID',
      });
    }

    // Find the review and check if it belongs to the current patient
    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found',
      });
    }

    if (String(review.patientId) !== String(patientId)) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own reviews',
      });
    }

    // Update the review
    const updatedReview = await Review.findByIdAndUpdate(
      reviewId,
      {
        rating: rating || review.rating,
        comment: comment ? comment.trim() : review.comment,
      },
      { new: true, runValidators: true }
    ).populate('patientId', 'fullName email');

    res.json({
      success: true,
      message: 'Review updated successfully',
      data: updatedReview,
    });
  } catch (error) {
    console.error('Error updating review:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update review',
      error: error.message,
    });
  }
}

// Delete a review
async function deleteReview(req, res) {
  try {
    const { reviewId } = req.params;
    const patientId = req.user.id; // From JWT token

    if (!mongoose.Types.ObjectId.isValid(reviewId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid review ID',
      });
    }

    // Find the review and check if it belongs to the current patient
    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found',
      });
    }

    if (String(review.patientId) !== String(patientId)) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own reviews',
      });
    }

    await Review.findByIdAndDelete(reviewId);

    res.json({
      success: true,
      message: 'Review deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting review:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete review',
      error: error.message,
    });
  }
}

module.exports = {
  getDoctorReviews,
  createReview,
  updateReview,
  deleteReview,
};
