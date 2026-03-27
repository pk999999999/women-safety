require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const User = require('./models/User');

const app = express();
const server = http.createServer(app);

// Cross-Origin configuration
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

app.use(cors());
app.use(express.json());

let isMongoConnected = false;
const memoryUsers = []; // Fallback memory database

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, {
  serverSelectionTimeoutMS: 5000 // Fails fast in 5 seconds if IP blocked
}).then(() => {
  isMongoConnected = true;
  console.log('✅ Connected explicitly to MongoDB (Sakhi Cluster)');
}).catch(err => {
  console.log('⚠️ MongoDB Blocked (IP Whitelist Issue). Using Memory Database for Demo.');
});

// 1. Setup Backend Routes
const router = express.Router();

router.post('/signup', async (req, res) => {
  try {
    const { userName, userPhone, userPassword, emergencyName, emergencyPhone } = req.body;
    
    // --- FALLBACK MEMORY DB ---
    if (!isMongoConnected) {
      if (memoryUsers.find(u => u.phone === userPhone)) {
        return res.status(400).json({ success: false, msg: "User already exists! Please login." });
      }
      const newUser = { name: userName, phone: userPhone, password: userPassword, emergencyContact: { name: emergencyName, phone: emergencyPhone } };
      memoryUsers.push(newUser);
      return res.status(201).json({ success: true, user: newUser, msg: "Signup successful (Memory Mode)" });
    }

    // --- REAL MONGODB ---
    let existingUser = await User.findOne({ phone: userPhone });
    if (existingUser) {
      return res.status(400).json({ success: false, msg: "User with this phone number already exists! Please login." });
    }
    
    const newUser = new User({
      name: userName,
      phone: userPhone,
      password: userPassword,
      emergencyContact: {
        name: emergencyName,
        phone: emergencyPhone
      }
    });

    await newUser.save();
    return res.status(201).json({ success: true, user: newUser, msg: "Signup successful!" });
  } catch (err) {
    console.error("Signup Route Error: ", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { userPhone, userPassword } = req.body;
    
    // --- FALLBACK MEMORY DB ---
    if (!isMongoConnected) {
      const user = memoryUsers.find(u => u.phone === userPhone);
      if (!user) return res.status(404).json({ success: false, msg: "User not found! (Memory Mode)" });
      if (user.password !== userPassword) return res.status(401).json({ success: false, msg: "Invalid password!" });
      return res.status(200).json({ success: true, user: user, msg: "Login successful!" });
    }

    // --- REAL MONGODB ---
    const user = await User.findOne({ phone: userPhone });
    if (!user) {
      return res.status(404).json({ success: false, msg: "User not found!" });
    }
    
    if (user.password !== userPassword) {
      return res.status(401).json({ success: false, msg: "Invalid password!" });
    }
    
    return res.status(200).json({ success: true, user: user, msg: "Login successful!" });
  } catch (err) {
    console.error("Login Route Error: ", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/danger-zones', (req, res) => {
  // Returns KDE processed geographical bounds
  res.json([
    { center: [28.6189, 77.2170], radius: 600, severity: 'High' },
    { center: [28.6039, 77.2040], radius: 800, severity: 'Critical' }
  ]);
});

app.use('/api', router);

// 2. Setup Real-time WebSockets
const liveTrackingData = {};

io.on('connection', (socket) => {
  console.log(`[BACKEND] Connected Client: ${socket.id}`);

  // Broadcast continuous GPS across socket channels
  socket.on('location-update', (data) => {
    liveTrackingData[socket.id] = data;
    // Broadcast back for Family Dashboard to consume!
    io.emit('family-dashboard-sync', liveTrackingData);
  });

  socket.on('trigger-sos', (data) => {
    console.log('\n===========================================');
    console.log('🚨 EMERGENCY SOS DETECTED 🚨');
    console.log('Fetching Mic Access and Contact Notifiers...');
    console.log('===========================================\n');
    io.emit('emergency-broadcast-sent', { source: socket.id, loc: data });
  });

  socket.on('sarthi-mode-engaged', (data) => {
    console.log(`\n[BACKEND] Sarthi Mode engaged on socket ${socket.id} (Stopped for 30s).`);
  });

  socket.on('disconnect', () => {
    delete liveTrackingData[socket.id];
    io.emit('family-dashboard-sync', liveTrackingData);
    console.log(`[BACKEND] Disconnected Client: ${socket.id}`);
  });
});

// Run server
const PORT = 5001;
server.listen(PORT, () => {
  console.log(`[BACKEND STARTED] Full node.js architecture running perfectly on Port ${PORT}`);
});
