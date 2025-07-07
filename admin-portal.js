const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const session = require('express-session');

const app = express();
const PORT = 5000;

// MongoDB connection
mongoose.connect('mongodb+srv://vasuvasu06092005:$Mom$dad$2005$@cluster0.hvvxk.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(session({ secret: 'adminsecret', resave: false, saveUninitialized: true }));

// Simple admin login (for demo, use env vars or better auth in production)
const ADMIN_EMAIL = 'vasuvasu06092005@gmail.com';
const ADMIN_PASSWORD = 'Pass123';

// Middleware for admin auth
function requireAdmin(req, res, next) {
  if (req.session && req.session.admin) return next();
  res.redirect('/admin/login');
}

// Admin login page
app.get('/admin/login', (req, res) => {
  res.render('login');
});
app.post('/admin/login', (req, res) => {
  const { email, password } = req.body;
  if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    req.session.admin = true;
    res.redirect('/admin');
  } else {
    res.render('login', { error: 'Invalid credentials' });
  }
});
app.get('/admin/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/admin/login');
});

// Example admin dashboard (replace with MongoDB logic as needed)
app.get('/admin', requireAdmin, async (req, res) => {
  // TODO: Replace with MongoDB user fetch logic
  res.render('admin', { users: [] });
});

app.listen(PORT, () => console.log(`Admin portal running on http://localhost:${PORT}/admin`));