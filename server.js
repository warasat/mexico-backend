const express = require("express");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const cors = require("cors");

// Load env vars
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// ✅ CORS middleware (place before routes)
app.use(
  cors({
    origin: [
      "https://doctor-appointment-system-frontend-brown.vercel.app", // frontend vercel domain
      "http://localhost:5173", // local dev
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Origin",
      "X-Requested-With",
      "Content-Type",
      "Accept",
      "Authorization",
    ],
    credentials: true,
  })
);

app.options("*", cors()); // ✅ handle preflight requests

// Body parser middleware
app.use(express.json());

// Routes
app.get("/", (req, res) => {
  res.send("API is running...");
});

app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/landing", require("./routes/landingRoutes"));
app.use("/api/patients", require("./routes/patientRoutes"));
app.use("/api/doctors", require("./routes/doctorRoutes"));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
