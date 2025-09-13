const express = require("express");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const cors = require("cors");

dotenv.config();
connectDB();

const app = express();

// ✅ Allow all CORS
app.use(cors());

// ✅ Body parser
app.use(express.json());

// Routes
app.get("/", (req, res) => {
  res.send("API is running....");
});

app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/landing", require("./routes/landingRoutes"));
app.use("/api/patients", require("./routes/patientRoutes"));
app.use("/api/doctors", require("./routes/doctorRoutes"));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
