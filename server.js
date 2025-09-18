const express = require("express");
const dotenv = require("dotenv");
const http = require("http");
const connectDB = require("./config/db");
const cors = require("cors");
const { Server } = require("socket.io");

dotenv.config();
connectDB();

const app = express();

// ✅ CORS middleware (allow all origins)
app.use(cors({ origin: "*", credentials: true }));

// Body parser middleware
app.use(express.json());

// Routes
app.get("/", (req, res) => {
  res.send("API is running....");
});

app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/landing", require("./routes/landingRoutes"));
app.use("/api/patients", require("./routes/patientRoutes"));
app.use("/api", require("./routes/doctorProfileRoutes"));
app.use("/api/doctors", require("./routes/doctorRoutes"));

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

// ✅ Socket.IO with allow all CORS
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  },
});

io.on("connection", (socket) => {
  socket.emit("connected", { ok: true });
  socket.on("disconnect", () => {});
});
app.set("io", io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
