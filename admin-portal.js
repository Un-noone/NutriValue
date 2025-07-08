const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
const MongoStore = require('connect-mongo');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// MongoDB Atlas connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://vasuvasu06092005:$Mom$dad$2005$@cluster0.hvvxk.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

mongoose.connect(MONGODB_URI)
.then(() => console.log('✅ MongoDB Atlas connected successfully'))
.catch(err => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});

// User Schema
const userSchema = new mongoose.Schema({
  uid: { type: String, required: true, unique: true },
  email: { type: String, required: true },
  name: String,
  age: Number,
  height: Number,
  weight: Number,
  goal: String,
  targetWeight: Number,
  history: [{
    weight: Number,
    date: { type: Date, default: Date.now }
  }],
  disabled: { type: Boolean, default: false },
  subscription: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Meal Schema
const mealSchema = new mongoose.Schema({
  uid: { type: String, required: true },
  date: { type: String, required: true }, // YYYY-MM-DD format
  type: String, // Breakfast, Lunch, Dinner, Snack
  items: [{
    name: String,
    calories: Number,
    protein: Number,
    carbohydrates: Number,
    fats: Number,
    fiber: Number,
    sugar: Number
  }],
  total: {
    calories: Number,
    protein: Number,
    carbohydrates: Number,
    fats: Number,
    fiber: Number,
    sugar: Number
  },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Meal = mongoose.model('Meal', mealSchema);

// Admin credentials
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'vasu@edts.ca';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '$Mom$dad$2005$';

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'supersecret',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ 
    mongoUrl: MONGODB_URI,
    touchAfter: 24 * 3600 // lazy session update
  }),
  cookie: { 
    secure: false, // Set to true if using HTTPS
    maxAge: 1000 * 60 * 60 * 24 // 24 hours
  }
}));

// Serve static files from public directory FIRST
app.use(express.static(path.join(__dirname, 'public')));

// Health check route
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Server is running locally with MongoDB Atlas',
    timestamp: new Date().toISOString(),
    database: 'Connected to MongoDB Atlas'
  });
});

// Middleware to block disabled users
async function blockIfDisabled(req, res, next) {
  const uid = req.body.uid || req.query.uid;
  if (!uid) return next();
  const user = await User.findOne({ uid });
  if (user && user.disabled) {
    if (req.method === 'POST' && req.path === '/api/user/profile') {
      return res.status(403).json({ error: 'Account deactivated' });
    }
    return res.status(403).json({ error: 'Account deactivated' });
  }
  next();
}

// API Routes
app.post('/api/user/profile', blockIfDisabled, async (req, res) => {
  try {
    const { uid, name, email, age, height, weight, goal, targetWeight, history } = req.body;
    if (!uid || !email) return res.status(400).json({ error: 'uid and email are required' });
    let user = await User.findOne({ uid });
    if (user && user.disabled) return res.status(403).json({ error: 'Account deactivated' });
    if (user) {
      user.name = name || user.name;
      user.email = email || user.email;
      user.age = age !== undefined ? age : user.age;
      user.height = height !== undefined ? height : user.height;
      user.weight = weight !== undefined ? weight : user.weight;
      user.goal = goal || user.goal;
      user.targetWeight = targetWeight !== undefined ? targetWeight : user.targetWeight;
      if (history) user.history = history;
      user.updatedAt = new Date();
      await user.save();
    } else {
      user = new User({
        uid,
        email,
        name: name || 'User',
        age,
        height,
        weight,
        goal,
        targetWeight,
        history: history || []
      });
      await user.save();
    }
    res.json({ success: true, user });
  } catch (error) {
    console.error('Error saving user profile:', error);
    res.status(500).json({ error: 'Failed to save user profile' });
  }
});

app.get('/api/user/profile', blockIfDisabled, async (req, res) => {
  try {
    const { uid } = req.query;
    if (!uid) return res.status(400).json({ error: 'uid is required' });
    const user = await User.findOne({ uid });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (user.disabled) return res.status(403).json({ error: 'Account deactivated' });
    res.json({ success: true, user });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

app.get('/api/users', blockIfDisabled, async (req, res) => {
  try {
    const users = await User.find({}).select('-__v');
    res.json({ success: true, users });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.post('/api/meals', blockIfDisabled, async (req, res) => {
  try {
    const { uid, date, type, items, total } = req.body;
    if (!uid || !date) return res.status(400).json({ error: 'uid and date are required' });
    const meal = new Meal({
      uid,
      date,
      type,
      items,
      total
    });
    await meal.save();
    res.json({ success: true, meal });
  } catch (error) {
    console.error('Error logging meal:', error);
    res.status(500).json({ error: 'Failed to log meal' });
  }
});

app.get('/api/meals/:date', blockIfDisabled, async (req, res) => {
  try {
    const { uid } = req.query;
    const { date } = req.params;
    if (!uid || !date) return res.status(400).json({ error: 'uid and date are required' });
    const meals = await Meal.find({ uid, date }).sort({ createdAt: 1 });
    res.json({ success: true, meals });
  } catch (error) {
    console.error('Error fetching meals:', error);
    res.status(500).json({ error: 'Failed to fetch meals' });
  }
});

app.get('/api/meals/range/:startDate/:endDate', blockIfDisabled, async (req, res) => {
  try {
    const { uid } = req.query;
    const { startDate, endDate } = req.params;
    if (!uid || !startDate || !endDate) return res.status(400).json({ error: 'uid, startDate, and endDate are required' });
    const meals = await Meal.find({ 
      uid, 
      date: { $gte: startDate, $lte: endDate } 
    }).sort({ date: 1, createdAt: 1 });
    res.json({ success: true, meals });
  } catch (error) {
    console.error('Error fetching meals by range:', error);
    res.status(500).json({ error: 'Failed to fetch meals' });
  }
});

app.get('/api/meals', blockIfDisabled, async (req, res) => {
  try {
    const { uid, limit = 50, offset = 0 } = req.query;
    if (!uid) return res.status(400).json({ error: 'uid is required' });
    const meals = await Meal.find({ uid })
      .sort({ date: -1, createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset));
    res.json({ success: true, meals });
  } catch (error) {
    console.error('Error fetching all meals:', error);
    res.status(500).json({ error: 'Failed to fetch meals' });
  }
});

app.delete('/api/meals/:mealId', blockIfDisabled, async (req, res) => {
  try {
    const { uid } = req.query;
    const { mealId } = req.params;
    if (!uid || !mealId) return res.status(400).json({ error: 'uid and mealId are required' });
    const meal = await Meal.findOneAndDelete({ _id: mealId, uid });
    if (!meal) {
      return res.status(404).json({ error: 'Meal not found' });
    }
    res.json({ success: true, message: 'Meal deleted successfully' });
  } catch (error) {
    console.error('Error deleting meal:', error);
    res.status(500).json({ error: 'Failed to delete meal' });
  }
});

app.post('/api/signup', async (req, res) => {
  try {
    const { uid, email, name, password } = req.body;
    if (!uid || !email || !password) return res.status(400).json({ error: 'uid, email, and password are required' });
    let user = await User.findOne({ uid });
    if (user) return res.status(400).json({ error: 'User already exists' });
    user = new User({ uid, email, name: name || 'User' });
    await user.save();
    res.json({ success: true, user });
  } catch (error) {
    console.error('Error signing up user:', error);
    res.status(500).json({ error: 'Failed to sign up user' });
  }
});

// Admin auth middleware
function requireAdminAuth(req, res, next) {
  if (req.session && req.session.admin) {
    return next();
  }
  return res.redirect('/admin/login');
}

// Admin routes
app.get('/admin/login', (req, res) => {
  res.render('login');
});

app.post('/admin/login', express.urlencoded({ extended: true }), (req, res) => {
  const { email, password } = req.body;
  console.log('Admin login attempt:');
  console.log('Provided email:', email);
  console.log('Expected email:', ADMIN_EMAIL);
  console.log('Provided password:', password);
  console.log('Expected password:', ADMIN_PASSWORD);
  console.log('Email match:', email === ADMIN_EMAIL);
  console.log('Password match:', password === ADMIN_PASSWORD);
  
  if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    req.session.admin = true;
    console.log('✅ Admin login successful');
    return res.redirect('/admin');
  }
  console.log('❌ Admin login failed');
  res.render('login', { error: 'Invalid credentials' });
});

app.get('/admin/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/admin/login');
  });
});

app.get('/admin', requireAdminAuth, async (req, res) => {
  const users = await User.find({}).lean();
  res.render('admin', { users });
});

app.post('/admin/user/:uid/toggle', requireAdminAuth, async (req, res) => {
  const { uid } = req.params;
  const { disable } = req.body;
  const user = await User.findOne({ uid });
  if (!user) return res.status(404).json({ error: 'User not found' });
  user.disabled = !!disable;
  await user.save();
  res.json({ success: true });
});

app.post('/admin/user/:uid/delete', requireAdminAuth, async (req, res) => {
  const { uid } = req.params;
  await User.deleteOne({ uid });
  res.json({ success: true });
});

app.post('/admin/user/:uid/subscription', requireAdminAuth, async (req, res) => {
  const { uid } = req.params;
  const { subscribe } = req.body;
  const user = await User.findOne({ uid });
  if (!user) return res.status(404).json({ error: 'User not found' });
  user.subscription = !!subscribe;
  await user.save();
  res.json({ success: true });
});

// Default route serves login.html (your main entry point)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running locally on port ${PORT}`);
  console.log(`🔗 Main App (login): http://localhost:${PORT}/`);
  console.log(`🔗 Login Page: http://localhost:${PORT}/login.html`);
  console.log(`🔗 Dashboard: http://localhost:${PORT}/dashboard.html`);
  console.log(`🔗 Profile: http://localhost:${PORT}/profile.html`);
  console.log(`🔗 Progress: http://localhost:${PORT}/progress.html`);
  console.log(`🔗 Subscription: http://localhost:${PORT}/subscription.html`);
  console.log(`🔗 Admin Portal: http://localhost:${PORT}/admin`);
  console.log(`📊 Health Check: http://localhost:${PORT}/health`);
  console.log(`📊 API Test: http://localhost:${PORT}/test-api.html`);
});