const Doctor = require('../models/Doctor');
const Specialty = require('../models/Specialty');
const Testimonial = require('../models/Testimonial');
const LandingPage = require('../models/LandingPage');

// @desc    Get hero section data
// @route   GET /api/landing/hero
// @access  Public
const getHeroData = async (req, res) => {
  try {
    const landingPage = await LandingPage.findOne({ isActive: true });
    
    if (!landingPage) {
      return res.status(404).json({
        success: false,
        message: 'Landing page data not found'
      });
    }

    res.json({
      success: true,
      data: landingPage.hero
    });
  } catch (error) {
    console.error('Error fetching hero data:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get featured doctors
// @route   GET /api/landing/doctors
// @access  Public
const getFeaturedDoctors = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 8;
    
    const doctors = await Doctor.find({ 
      featured: true, 
      available: true 
    })
    .select('name specialty rating location imageUrl available duration experience consultationFee')
    .limit(limit)
    .sort({ rating: -1, createdAt: -1 });

    res.json({
      success: true,
      data: doctors
    });
  } catch (error) {
    console.error('Error fetching featured doctors:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get all specialties
// @route   GET /api/landing/specialties
// @access  Public
const getSpecialties = async (req, res) => {
  try {
    const specialties = await Specialty.find({ isActive: true })
      .select('name slug doctorCount imageUrl iconUrl description')
      .sort({ doctorCount: -1 });

    res.json({
      success: true,
      data: specialties
    });
  } catch (error) {
    console.error('Error fetching specialties:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get testimonials
// @route   GET /api/landing/testimonials
// @access  Public
const getTestimonials = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    const testimonials = await Testimonial.find({ 
      isActive: true 
    })
    .select('patientName comment rating location imageUrl doctorId')
    .populate('doctorId', 'name specialty')
    .limit(limit)
    .sort({ rating: -1, createdAt: -1 });

    res.json({
      success: true,
      data: testimonials
    });
  } catch (error) {
    console.error('Error fetching testimonials:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get landing page statistics
// @route   GET /api/landing/stats
// @access  Public
const getStats = async (req, res) => {
  try {
    const landingPage = await LandingPage.findOne({ isActive: true });
    
    if (!landingPage) {
      return res.status(404).json({
        success: false,
        message: 'Landing page data not found'
      });
    }

    // Get real counts from database
    const [doctorCount, specialtyCount] = await Promise.all([
      Doctor.countDocuments({ available: true }),
      Specialty.countDocuments({ isActive: true })
    ]);

    const stats = {
      ...landingPage.stats,
      doctorsAvailable: doctorCount,
      specialities: specialtyCount
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get services
// @route   GET /api/landing/services
// @access  Public
const getServices = async (req, res) => {
  try {
    const landingPage = await LandingPage.findOne({ isActive: true });
    
    if (!landingPage) {
      return res.status(404).json({
        success: false,
        message: 'Landing page data not found'
      });
    }

    res.json({
      success: true,
      data: landingPage.services
    });
  } catch (error) {
    console.error('Error fetching services:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get reasons to choose us
// @route   GET /api/landing/reasons
// @access  Public
const getReasons = async (req, res) => {
  try {
    const landingPage = await LandingPage.findOne({ isActive: true });
    
    if (!landingPage) {
      return res.status(404).json({
        success: false,
        message: 'Landing page data not found'
      });
    }

    res.json({
      success: true,
      data: landingPage.reasons
    });
  } catch (error) {
    console.error('Error fetching reasons:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get company logos
// @route   GET /api/landing/companies
// @access  Public
const getCompanyLogos = async (req, res) => {
  try {
    const landingPage = await LandingPage.findOne({ isActive: true });
    
    if (!landingPage) {
      return res.status(404).json({
        success: false,
        message: 'Landing page data not found'
      });
    }

    res.json({
      success: true,
      data: landingPage.companyLogos
    });
  } catch (error) {
    console.error('Error fetching company logos:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get all landing page data
// @route   GET /api/landing
// @access  Public
const getAllLandingData = async (req, res) => {
  try {
    const [landingPage, doctors, specialties, testimonials] = await Promise.all([
      LandingPage.findOne({ isActive: true }),
      Doctor.find({ featured: true, available: true }).limit(8).sort({ rating: -1 }),
      Specialty.find({ isActive: true }).sort({ doctorCount: -1 }),
      Testimonial.find({ isActive: true }).limit(4).sort({ rating: -1 })
    ]);

    if (!landingPage) {
      return res.status(404).json({
        success: false,
        message: 'Landing page data not found'
      });
    }

    // Get real counts
    const [doctorCount, specialtyCount] = await Promise.all([
      Doctor.countDocuments({ available: true }),
      Specialty.countDocuments({ isActive: true })
    ]);

    const stats = {
      ...landingPage.stats,
      doctorsAvailable: doctorCount,
      specialities: specialtyCount
    };

    res.json({
      success: true,
      data: {
        hero: landingPage.hero,
        doctors,
        specialties,
        testimonials,
        stats,
        services: landingPage.services,
        reasons: landingPage.reasons,
        companyLogos: landingPage.companyLogos
      }
    });
  } catch (error) {
    console.error('Error fetching all landing data:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

module.exports = {
  getHeroData,
  getFeaturedDoctors,
  getSpecialties,
  getTestimonials,
  getStats,
  getServices,
  getReasons,
  getCompanyLogos,
  getAllLandingData
};
