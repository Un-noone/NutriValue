// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
// Import all necessary auth functions
import { 
    getAuth, 
    onAuthStateChanged, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
// Import Realtime Database functions
import { getDatabase, ref, set, get, push, onValue } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-database.js";
import { apiService } from './api.js';

// Your web app's Firebase configuration from your project
const firebaseConfig = {
  apiKey: "AIzaSyCW0U98UC5fG4--cZzQ2LvNhPsFtOKDPSU",
  authDomain: "nutritrack-2c5db.firebaseapp.com",
  projectId: "nutritrack-2c5db",
  storageBucket: "nutritrack-2c5db.appspot.com",
  messagingSenderId: "674288937824",
  appId: "1:674288937824:web:7c9f2cc25f19316ec10c05",
  databaseURL: "https://nutritrack-2c5db-default-rtdb.firebaseio.com"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// --- Realtime Database Functions ---

/**
 * Saves user profile data to MongoDB via backend API.
 * @param {object} profileData - The user's profile data.
 */
async function saveUserProfile(profileData) {
    return apiService.saveUserProfile(profileData);
}

/**
 * Retrieves user profile data from MongoDB via backend API.
 * @returns {object|null} The user's profile data or null if not found.
 */
async function getUserProfile() {
    return apiService.getUserProfile();
}

/**
 * Logs a meal to MongoDB via backend API.
 * @param {object} mealData - The meal data to log.
 */
async function logMeal(mealData) {
    return apiService.logMeal(mealData);
}

/**
 * Gets meals for a specific date from MongoDB via backend API.
 * @param {string} date - The date to fetch meals for (YYYY-MM-DD).
 * @returns {Promise<Array>} Array of meals for the date.
 */
async function getMealsByDate(date) {
    const response = await apiService.getMealsByDate(date);
    return response.success ? response.meals : [];
}

/**
 * Checks if the current user is deactivated.
 * @returns {Promise<boolean>} True if deactivated, false otherwise.
 */
async function isUserDeactivated() {
    try {
        const profile = await getUserProfile();
        return profile && profile.user && profile.user.disabled;
    } catch (e) {
        return false;
    }
}

// Export all necessary functions. `onAuthStateChanged` is removed from here.
export { 
    auth, 
    db, 
    onAuthStateChanged,
    saveUserProfile, 
    getUserProfile, 
    logMeal, 
    getMealsByDate,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    isUserDeactivated
};
