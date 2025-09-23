const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import models
const Doctor = require('../models/Doctor');
const Specialty = require('../models/Specialty');
const Testimonial = require('../models/Testimonial');
const LandingPage = require('../models/LandingPage');

// Connect to MongoDB
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || "mongodb+srv://hafiz:hello123@cluster0.y0q6feb.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0");
    console.log("MongoDB Connected: Database is connected successfully");
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

// Sample data
const sampleDoctors = [
  {
    name: "Dr. Michael Brown",
    specialty: "Psychologist",
    rating: 5.0,
    location: "Minneapolis, MN",
    imageUrl: "assets/img/doctor-grid/doctor-grid-01.jpg",
    available: true,
    duration: 30,
    featured: true,
    experience: 8,
    consultationFee: 150
  },
  {
    name: "Dr. Nicholas Tello",
    specialty: "Pediatrician",
    rating: 4.6,
    location: "Ogden, IA",
    imageUrl: "assets/img/doctor-grid/doctor-grid-02.jpg",
    available: true,
    duration: 60,
    featured: true,
    experience: 12,
    consultationFee: 200
  },
  {
    name: "Dr. Harold Bryant",
    specialty: "Neurologist",
    rating: 4.8,
    location: "Winona, MS",
    imageUrl: "assets/img/doctor-grid/doctor-grid-03.jpg",
    available: true,
    duration: 30,
    featured: true,
    experience: 15,
    consultationFee: 250
  },
  {
    name: "Dr. Sandra Jones",
    specialty: "Cardiologist",
    rating: 4.8,
    location: "Beckley, WV",
    imageUrl: "assets/img/doctor-grid/doctor-grid-04.jpg",
    available: true,
    duration: 30,
    featured: true,
    experience: 10,
    consultationFee: 300
  },
  {
    name: "Dr. Charles Scott",
    specialty: "Neurologist",
    rating: 4.2,
    location: "Hamshire, TX",
    imageUrl: "assets/img/doctor-grid/doctor-grid-05.jpg",
    available: true,
    duration: 30,
    featured: true,
    experience: 6,
    consultationFee: 180
  },
  {
    name: "Dr. Sarah Wilson",
    specialty: "Dermatologist",
    rating: 4.9,
    location: "Phoenix, AZ",
    imageUrl: "assets/img/doctor-grid/doctor-grid-06.jpg",
    available: true,
    duration: 45,
    featured: true,
    experience: 9,
    consultationFee: 220
  },
  {
    name: "Dr. Robert Chen",
    specialty: "Orthopedic Surgeon",
    rating: 4.7,
    location: "Seattle, WA",
    imageUrl: "assets/img/doctor-grid/doctor-grid-07.jpg",
    available: true,
    duration: 60,
    featured: true,
    experience: 14,
    consultationFee: 350
  },
  {
    name: "Dr. Emily Davis",
    specialty: "Gynecologist",
    rating: 4.5,
    location: "Miami, FL",
    imageUrl: "assets/img/doctor-grid/doctor-grid-08.jpg",
    available: true,
    duration: 30,
    featured: true,
    experience: 7,
    consultationFee: 190
  }
];

const sampleSpecialties = [
  {
    name: "Cardiology",
    slug: "cardiology",
    doctorCount: 254,
    imageUrl: "assets/img/specialities/speciality-01.jpg",
    iconUrl: "assets/img/specialities/speciality-icon-01.svg",
    description: "Heart and cardiovascular system specialists"
  },
  {
    name: "Orthopedics",
    slug: "orthopedics",
    doctorCount: 151,
    imageUrl: "assets/img/specialities/speciality-02.jpg",
    iconUrl: "assets/img/specialities/speciality-icon-02.svg",
    description: "Bone, joint, and muscle specialists"
  },
  {
    name: "Neurology",
    slug: "neurology",
    doctorCount: 176,
    imageUrl: "assets/img/specialities/speciality-03.jpg",
    iconUrl: "assets/img/specialities/speciality-icon-03.svg",
    description: "Brain and nervous system specialists"
  },
  {
    name: "Pediatrics",
    slug: "pediatrics",
    doctorCount: 124,
    imageUrl: "assets/img/specialities/speciality-04.jpg",
    iconUrl: "assets/img/specialities/speciality-icon-04.svg",
    description: "Children's health specialists"
  },
  {
    name: "Psychiatry",
    slug: "psychiatry",
    doctorCount: 112,
    imageUrl: "assets/img/specialities/speciality-05.jpg",
    iconUrl: "assets/img/specialities/speciality-icon-05.svg",
    description: "Mental health specialists"
  },
  {
    name: "Endocrinology",
    slug: "endocrinology",
    doctorCount: 104,
    imageUrl: "assets/img/specialities/speciality-06.jpg",
    iconUrl: "assets/img/specialities/speciality-icon-06.svg",
    description: "Hormone and metabolism specialists"
  },
  {
    name: "Pulmonology",
    slug: "pulmonology",
    doctorCount: 41,
    imageUrl: "assets/img/specialities/speciality-07.jpg",
    iconUrl: "assets/img/specialities/speciality-icon-07.svg",
    description: "Lung and respiratory specialists"
  },
  {
    name: "Urology",
    slug: "urology",
    doctorCount: 39,
    imageUrl: "assets/img/specialities/speciality-08.jpg",
    iconUrl: "assets/img/specialities/speciality-icon-08.svg",
    description: "Urinary system specialists"
  }
];

const sampleTestimonials = [
  {
    patientName: "Deny Hendrawan",
    comment: "I had a wonderful experience the staff was friendly and attentive, and Dr. Smith took the time to explain everything clearly.",
    rating: 5,
    location: "United States",
    imageUrl: "assets/img/patients/patient22.jpg",
    isFeatured: true
  },
  {
    patientName: "Johnson DWayne",
    comment: "Genuinely cares about his patients. He helped me understand my condition and worked with me to create a plan.",
    rating: 5,
    location: "United States",
    imageUrl: "assets/img/patients/patient21.jpg",
    isFeatured: true
  },
  {
    patientName: "Rayan Smith",
    comment: "I had a great experience with Dr. Chen. She was not only professional but also made me feel comfortable discussing.",
    rating: 5,
    location: "United States",
    imageUrl: "assets/img/patients/patient.jpg",
    isFeatured: true
  },
  {
    patientName: "Sofia Doe",
    comment: "I had a wonderful experience the staff was friendly and attentive, and Dr. Smith took the time to explain everything clearly.",
    rating: 5,
    location: "United States",
    imageUrl: "assets/img/patients/patient23.jpg",
    isFeatured: true
  }
];

const sampleLandingPage = {
  hero: {
    title: "Discover Health: Find Your Trusted",
    subtitle: "Doctors Today",
    ctaText: "Book Appointment",
    imageUrl: "assets/img/banner/banner-doctor.svg",
    stats: {
      appointments: "5K+",
      rating: "5.0"
    }
  },
  stats: {
    doctorsAvailable: 300,
    specialities: 18,
    bookingsDone: 30000,
    hospitalsClinics: 97,
    labTests: 317
  },
  services: [
    {
      title: "Multi Speciality Treatments & Doctors"
    },
    {
      title: "Lab Testing Services"
    },
    {
      title: "Medecines & Supplies"
    },
    {
      title: "Hospitals & Clinics"
    },
    {
      title: "Health Care Services"
    },
    {
      title: "Talk to Doctors"
    },
    {
      title: "Home Care Services"
    }
  ],
  reasons: [
    {
      title: "Follow-Up Care",
      description: "We ensure continuity of care through regular follow-ups and communication, helping you stay on track with health goals.",
      icon: "isax isax-tag-user5"
    },
    {
      title: "Patient-Centered Approach",
      description: "We prioritize your comfort and preferences, tailoring our services to meet your individual needs and Care from Our Experts",
      icon: "isax isax-voice-cricle"
    },
    {
      title: "Convenient Access",
      description: "Easily book appointments online or through our dedicated customer service team, with flexible hours to fit your schedule.",
      icon: "isax isax-wallet-add-15"
    }
  ],
  companyLogos: [
    {
      name: "Company 1",
      imageUrl: "assets/img/company/company-01.svg"
    },
    {
      name: "Company 2",
      imageUrl: "assets/img/company/company-02.svg"
    },
    {
      name: "Company 3",
      imageUrl: "assets/img/company/company-03.svg"
    },
    {
      name: "Company 4",
      imageUrl: "assets/img/company/company-04.svg"
    },
    {
      name: "Company 5",
      imageUrl: "assets/img/company/company-05.svg"
    },
    {
      name: "Company 6",
      imageUrl: "assets/img/company/company-06.svg"
    },
    {
      name: "Company 7",
      imageUrl: "assets/img/company/company-07.svg"
    },
    {
      name: "Company 8",
      imageUrl: "assets/img/company/company-08.svg"
    }
  ]
};

// Seed function
const seedDatabase = async () => {
  try {
    console.log('Starting database seeding...');

    // Clear existing data
    await Doctor.deleteMany({});
    await Specialty.deleteMany({});
    await Testimonial.deleteMany({});
    await LandingPage.deleteMany({});

    console.log('Cleared existing data');

    // Insert sample data
    const doctors = await Doctor.insertMany(sampleDoctors);
    console.log(`Inserted ${doctors.length} doctors`);

    const specialties = await Specialty.insertMany(sampleSpecialties);
    console.log(`Inserted ${specialties.length} specialties`);

    const testimonials = await Testimonial.insertMany(sampleTestimonials);
    console.log(`Inserted ${testimonials.length} testimonials`);

    const landingPage = await LandingPage.create(sampleLandingPage);
    console.log('Inserted landing page data');

    console.log('Database seeding completed successfully!');
    console.log('\nSummary:');
    console.log(`- Doctors: ${doctors.length}`);
    console.log(`- Specialties: ${specialties.length}`);
    console.log(`- Testimonials: ${testimonials.length}`);
    console.log('- Landing Page: 1');

  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    mongoose.connection.close();
    console.log('Database connection closed');
  }
};

// Run the seed function
const runSeed = async () => {
  await connectDB();
  await seedDatabase();
};

// Check if this script is being run directly
if (require.main === module) {
  runSeed();
}

module.exports = { runSeed };
