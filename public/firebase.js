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

// --- Enhanced Functions with Deactivation Check ---

/**
 * Checks if the current user is deactivated by calling the backend
 * @returns {Promise<boolean>} True if deactivated, false otherwise.
 */
async function isUserDeactivated() {
    try {
        const user = auth.currentUser;
        if (!user) return false;
        
        // Try to get user profile - this will fail if user is deactivated
        const response = await fetch(`http://localhost:3000/api/user/profile?uid=${user.uid}`);
        const data = await response.json();
        
        if (response.status === 403 && data.error === 'Account deactivated') {
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error checking user status:', error);
        return false;
    }
}

/**
 * Shows deactivation modal and signs out user
 */
function showDeactivatedModal() {
    // Create modal
    const modal = document.createElement('div');
    modal.innerHTML = `
        <div style="position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.8);z-index:9999;display:flex;align-items:center;justify-content:center;">
            <div style="background:white;padding:2rem 2.5rem;border-radius:1rem;box-shadow:0 4px 24px rgba(0,0,0,0.15);max-width:90vw;text-align:center;">
                <h2 style="font-size:1.5rem;font-weight:bold;color:#ef4444;margin-bottom:1rem;">Account Deactivated</h2>
                <p style="margin:0 0 1.5rem 0;color:#374151;">Your account has been deactivated by the administrator. Please contact support for assistance.</p>
                <button id="deactivated-ok-btn" style="background:#ef4444;color:white;font-weight:bold;padding:0.75rem 2rem;border:none;border-radius:0.5rem;font-size:1rem;cursor:pointer;">OK</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    document.getElementById('deactivated-ok-btn').onclick = async () => {
        modal.remove();
        await signOut(auth);
        window.location.href = 'login.html';
    };
}

/**
 * Enhanced sign in function that checks for deactivation
 */
async function signInAndCheckStatus(email, password) {
    try {
        // First, sign in with Firebase
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Then check if user is deactivated
        const isDeactivated = await isUserDeactivated();
        
        if (isDeactivated) {
            // Sign out immediately and show modal
            await signOut(auth);
            showDeactivatedModal();
            throw new Error('Account deactivated');
        }
        
        return userCredential;
    } catch (error) {
        throw error;
    }
}

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

// Enhanced auth state observer that checks for deactivation
const enhancedOnAuthStateChanged = (callback) => {
    return onAuthStateChanged(auth, async (user) => {
        if (user) {
            // Check if user is deactivated whenever auth state changes
            const isDeactivated = await isUserDeactivated();
            if (isDeactivated) {
                showDeactivatedModal();
                return;
            }
        }
        callback(user);
    });
};

// Export all necessary functions
export { 
    auth, 
    db, 
    onAuthStateChanged: enhancedOnAuthStateChanged, // Use enhanced version
    saveUserProfile, 
    getUserProfile, 
    logMeal, 
    getMealsByDate,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword: signInAndCheckStatus, // Use enhanced sign in
    signOut,
    isUserDeactivated
};