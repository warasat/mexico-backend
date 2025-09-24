const express = require("express");
const dotenv = require("dotenv");
const http = require("http");
const connectDB = require("./config/db");
const cors = require("cors");
const { Server } = require("socket.io");

dotenv.config();
connectDB();

const app = express();

// ✅ CORS middleware
const allowedOrigins = [
  process.env.CORS_ORIGIN || 'http://localhost:5173',
  process.env.CORS_ORIGIN_ALT || 'http://localhost:5174'
];
app.use(cors({ origin: allowedOrigins, credentials: true }));

// Body parser middleware
app.use(express.json());

// Routes
app.get("/", (req, res) => {
  res.send("API is running....");
});

app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/landing", require("./routes/landingRoutes"));
app.use("/api/patients", require("./routes/patientRoutes"));
// Mount appointments BEFORE the broad '/api' doctorProfileRoutes to avoid swallowing
app.use("/api", require("./routes/appointmentRoutes"));
app.use("/api/doctors", require("./routes/doctorRoutes"));
app.use("/api", require("./routes/doctorProfileRoutes"));
app.use("/api", require("./routes/adminRoutes"));

// Centralized error handler
app.use((err, req, res, next) => {
  if (err && err.name === "MulterError") {
    return res.status(400).json({ message: err.message });
  }
  if (err && typeof err.message === "string") {
    return res.status(400).json({ message: err.message });
  }
  return res.status(500).json({ message: "Internal server error" });
});

const server = http.createServer(app);

// ✅ Socket.IO with CORS from environment
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  },
});

io.on("connection", (socket) => {
  socket.emit("connected", { ok: true });
  // Clients should emit: joinRoom, with one of patient_<id>, doctor_<doctorProfileId>, doctorUser_<authUserId>, admin
  socket.on('joinRoom', (room) => {
    if (typeof room === 'string' && room.length <= 64) {
      socket.join(room);
      socket.emit('joinedRoom', { room });
    }
  });
  socket.on("disconnect", () => {});
});
app.set("io", io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
