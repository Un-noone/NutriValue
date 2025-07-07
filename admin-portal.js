const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const admin = require('firebase-admin');
const serviceAccount = require('/secrets/serviceAccountKey.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

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

// Middleware to verify Firebase ID token
async function authenticateToken(req, res, next) {
  try {
    const idToken = req.headers.authorization?.split('Bearer ')[1];
    if (!idToken) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedToken;
    next();
  } catch (err) {
    console.error('Token verification error:', err);
    res.status(401).json({ error: 'Invalid token' });
  }
}

// Health check route
app.get('/login', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Create or update user profile
app.post('/api/user/profile', authenticateToken, async (req, res) => {
  try {
    const { name, email, age, height, weight, goal, targetWeight, history } = req.body;
    const uid = req.user.uid;

    let user = await User.findOne({ uid });
    
    if (user) {
      // Update existing user
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
      // Create new user
      user = new User({
        uid,
        email: email || req.user.email,
        name: name || req.user.name || 'User',
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

// Get user profile
app.get('/api/user/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findOne({ uid: req.user.uid });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ success: true, user });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// Get all users (admin route)
app.get('/api/users', authenticateToken, async (req, res) => {
  try {
    const users = await User.find({}).select('-__v');
    res.json({ success: true, users });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Log a meal
app.post('/api/meals', authenticateToken, async (req, res) => {
  try {
    const { date, type, items, total } = req.body;
    const uid = req.user.uid;

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

// Get meals by date
app.get('/api/meals/:date', authenticateToken, async (req, res) => {
  try {
    const { date } = req.params;
    const uid = req.user.uid;

    const meals = await Meal.find({ uid, date }).sort({ createdAt: 1 });
    res.json({ success: true, meals });
  } catch (error) {
    console.error('Error fetching meals:', error);
    res.status(500).json({ error: 'Failed to fetch meals' });
  }
});

// Get meals by date range
app.get('/api/meals/range/:startDate/:endDate', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.params;
    const uid = req.user.uid;

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

// Get all meals for a user
app.get('/api/meals', authenticateToken, async (req, res) => {
  try {
    const uid = req.user.uid;
    const { limit = 50, offset = 0 } = req.query;

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

// Delete a meal
app.delete('/api/meals/:mealId', authenticateToken, async (req, res) => {
  try {
    const { mealId } = req.params;
    const uid = req.user.uid;

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
  console.log(`📊 Health check: http://localhost:${PORT}/login`);
});