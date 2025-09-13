const express = require("express");
const dotenv = require("dotenv");
const connectDB = require("./config/db");

// Load env vars
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// CORS middleware
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "http://localhost:5173");
    res.header("Access-Control-Allow-Origin", "https://doctor-appointment-system-backend-rho.vercel.app");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");

    if (req.method === "OPTIONS") {
        res.sendStatus(200);
    } else {
        next();
    }
});

// Body parser middleware
app.use(express.json());

// Routes
app.get("/", (req, res) => {
    res.send("API is running...");
});

app.use("/api/users", require("./routes/userRoutes"));      // already existing
app.use("/api/landing", require("./routes/landingRoutes")); // already existing
app.use("/api/patients", require("./routes/patientRoutes")); // patient authentication
app.use("/api/doctors", require("./routes/doctorRoutes")); // doctor authentication

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
