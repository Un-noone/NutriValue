# Firebase + MongoDB Atlas Integration Setup

This project combines **Firebase Authentication** for user management and **MongoDB Atlas** for data storage with a **Node.js backend**.

## 🚀 Quick Start

### 1. Start the Backend Server
```bash
# Install dependencies (if not already done)
npm install

# Start the backend server
npm start
```

The backend will run on `http://localhost:3000`

### 2. Deploy Frontend to Firebase
```bash
# Deploy to Firebase Hosting
firebase deploy --only hosting
```

Your app will be available at: `https://your-project-id.firebaseapp.com`

## 📁 Project Structure

```
project/
├── admin-portal.js          # Node.js backend server
├── public/                  # Frontend files (deployed to Firebase)
│   ├── firebase.js         # Firebase configuration
│   ├── api.js              # Backend API integration
│   ├── script.js           # Main frontend logic
│   ├── login.html          # Authentication page
│   ├── profile.html        # User profile page
│   └── test-api.html       # API testing page
├── serviceAccountKey.json  # Firebase Admin SDK key
└── package.json           # Node.js dependencies
```

## 🔧 Configuration

### Backend Configuration
- **Port**: 3000 (configurable via `PORT` environment variable)
- **MongoDB**: Atlas connection string in `admin-portal.js`
- **Firebase Admin**: Uses `serviceAccountKey.json`

### Frontend Configuration
- **Firebase Config**: In `public/firebase.js`
- **API Base URL**: `http://localhost:3000/api` (in `public/api.js`)

## 🧪 Testing the Integration

1. **Start the backend**: `npm start`
2. **Open**: `http://localhost:3000/health` (health check)
3. **Deploy frontend**: `firebase deploy --only hosting`
4. **Test API**: Visit `https://your-project-id.firebaseapp.com/test-api.html`

## 🔐 Authentication Flow

1. User signs up/logs in via Firebase Authentication
2. Frontend gets Firebase ID token
3. Frontend sends API requests with token in Authorization header
4. Backend verifies token with Firebase Admin SDK
5. Backend performs MongoDB operations
6. Backend returns data to frontend

## 📊 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Server health check |
| `/api/user/profile` | GET | Get user profile from MongoDB |
| `/api/user/profile` | POST | Save/update user profile to MongoDB |
| `/api/users` | GET | Get all users (admin) |

## 🛠️ Development

### Local Development
```bash
# Backend (with auto-restart)
npm run dev

# Frontend (serve locally)
firebase serve --only hosting
```

### Environment Variables
Create a `.env` file for production:
```env
PORT=3000
MONGODB_URI=your_mongodb_atlas_connection_string
```

## 🔍 Troubleshooting

### Common Issues

1. **CORS Errors**: Backend has CORS enabled for all origins
2. **Authentication Errors**: Check Firebase Admin SDK configuration
3. **MongoDB Connection**: Verify connection string and network access
4. **Port Conflicts**: Change `PORT` in `admin-portal.js`

### Debug Steps

1. Check backend logs: `npm start`
2. Test health endpoint: `http://localhost:3000/health`
3. Use test page: `test-api.html`
4. Check browser console for frontend errors
5. Verify Firebase project settings

## 📝 Next Steps

- Add more API endpoints for your app features
- Implement user roles and permissions
- Add data validation and sanitization
- Set up environment-specific configurations
- Add logging and monitoring

## 🔗 Useful Links

- [Firebase Console](https://console.firebase.google.com/)
- [MongoDB Atlas](https://cloud.mongodb.com/)
- [Firebase Hosting](https://firebase.google.com/docs/hosting)
- [Node.js Documentation](https://nodejs.org/docs/) 