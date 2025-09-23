const express = require('express');
const router = express.Router();
const {
  getHeroData,
  getFeaturedDoctors,
  getSpecialties,
  getTestimonials,
  getStats,
  getServices,
  getReasons,
  getCompanyLogos,
  getAllLandingData
} = require('../controllers/landingController');

// @route   GET /api/landing
// @desc    Get all landing page data
// @access  Public
router.get('/', getAllLandingData);

// @route   GET /api/landing/hero
// @desc    Get hero section data
// @access  Public
router.get('/hero', getHeroData);

// @route   GET /api/landing/doctors
// @desc    Get featured doctors
// @access  Public
router.get('/doctors', getFeaturedDoctors);

// @route   GET /api/landing/specialties
// @desc    Get all specialties
// @access  Public
router.get('/specialties', getSpecialties);

// @route   GET /api/landing/testimonials
// @desc    Get testimonials
// @access  Public
router.get('/testimonials', getTestimonials);

// @route   GET /api/landing/stats
// @desc    Get landing page statistics
// @access  Public
router.get('/stats', getStats);

// @route   GET /api/landing/services
// @desc    Get services
// @access  Public
router.get('/services', getServices);

// @route   GET /api/landing/reasons
// @desc    Get reasons to choose us
// @access  Public
router.get('/reasons', getReasons);

// @route   GET /api/landing/companies
// @desc    Get company logos
// @access  Public
router.get('/companies', getCompanyLogos);

module.exports = router;
