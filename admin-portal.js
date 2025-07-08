const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
// Removed: const admin = require('firebase-admin');
// Removed: const serviceAccount = require('/etc/secrets/serviceAccountKey.json');hi

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// MongoDB Atlas connection with error handling
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://vasuvasu06092005:$Mom$dad$2005$@cluster0.hvvxk.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
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

// Health check route
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Middleware to block disabled users
async function blockIfDisabled(req, res, next) {
  const uid = req.body.uid || req.query.uid;
  if (!uid) return next(); // Allow if no uid (e.g., signup)
  const user = await User.findOne({ uid });
  if (user && user.disabled) {
    return res.status(403).json({ error: 'Account deactivated' });
  }
  next();
}

// Apply to all user-facing API endpoints
app.post('/api/user/profile', blockIfDisabled, async (req, res) => {
  try {
    const { uid, name, email, age, height, weight, goal, targetWeight, history } = req.body;
    if (!uid || !email) return res.status(400).json({ error: 'uid and email are required' });
    let user = await User.findOne({ uid });
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

// Get user profile (no auth)
app.get('/api/user/profile', blockIfDisabled, async (req, res) => {
  try {
    const { uid } = req.query;
    if (!uid) return res.status(400).json({ error: 'uid is required' });
    const user = await User.findOne({ uid });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ success: true, user });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// Get all users (no auth)
app.get('/api/users', blockIfDisabled, async (req, res) => {
  try {
    const users = await User.find({}).select('-__v');
    res.json({ success: true, users });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Log a meal (no auth)
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

// Get meals by date (no auth)
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

// Get meals by date range (no auth)
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

// Get all meals for a user (no auth)
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

// Delete a meal (no auth)
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

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/admin`);
});

// Admin credentials (for demo, use env vars in production)
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'vasu@edts.ca';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '$Mom$dad$2005$';

app.use(session({
  secret: process.env.SESSION_SECRET || 'supersecret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // Set to true if using HTTPS
}));

function requireAdminAuth(req, res, next) {
  if (req.session && req.session.admin) {
    return next();
  }
  return res.redirect('/admin/login');
}

// Admin login page
app.get('/admin/login', (req, res) => {
  res.render('login');
});

// Admin login POST
app.post('/admin/login', express.urlencoded({ extended: true }), (req, res) => {
  const { email, password } = req.body;
  if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    req.session.admin = true;
    return res.redirect('/admin');
  }
  res.render('login', { error: 'Invalid credentials' });
});

// Admin logout
app.get('/admin/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/admin/login');
  });
});

// Admin Portal Route (protected)
app.get('/admin', requireAdminAuth, async (req, res) => {
  const users = await User.find({}).lean();
  res.render('admin', { users });
});

// Toggle user activation (protected)
app.post('/admin/user/:uid/toggle', requireAdminAuth, async (req, res) => {
  const { uid } = req.params;
  const { disable } = req.body;
  const user = await User.findOne({ uid });
  if (!user) return res.status(404).json({ error: 'User not found' });
  user.disabled = !!disable;
  await user.save();
  res.json({ success: true });
});

// Delete user (protected)
app.post('/admin/user/:uid/delete', requireAdminAuth, async (req, res) => {
  const { uid } = req.params;
  await User.deleteOne({ uid });
  res.json({ success: true });
});

// Manage subscription (protected)
app.post('/admin/user/:uid/subscription', requireAdminAuth, async (req, res) => {
  const { uid } = req.params;
  const { subscribe } = req.body;
  const user = await User.findOne({ uid });
  if (!user) return res.status(404).json({ error: 'User not found' });
  user.subscription = !!subscribe;
  await user.save();
  res.json({ success: true });
});

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Simple signup endpoint (no approval, just creates user)
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