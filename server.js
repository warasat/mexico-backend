const express = require("express");
const dotenv = require("dotenv");
const connectDB = require("./config/db");

// Load env vars
dotenv.config();

// Connect to MongoDB
connectDB();
const app = express();

// Allow all origins
app.use(cors());

// Or if you want specific methods and headers:
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Origin",
      "X-Requested-With",
      "Content-Type",
      "Accept",
      "Authorization",
    ],
  })
);

app.use((req, res, next) => {
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

app.use("/api/users", require("./routes/userRoutes")); // already existing
app.use("/api/landing", require("./routes/landingRoutes")); // already existing
app.use("/api/patients", require("./routes/patientRoutes")); // patient authentication
app.use("/api/doctors", require("./routes/doctorRoutes")); // doctor authentication

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
