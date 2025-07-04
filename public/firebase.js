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
 * Saves user profile data to Realtime Database.
 * @param {string} uid - The user's unique ID.
 * @param {object} profileData - The user's profile data.
 */
async function saveUserProfile(uid, profileData) {
    if (!uid) return;
    try {
        await set(ref(db, 'users/' + uid + '/profile'), profileData);
        console.log("Profile saved successfully!");
    } catch (error) {
        console.error("Error saving profile: ", error);
    }
}

/**
 * Retrieves user profile data from Realtime Database.
 * @param {string} uid - The user's unique ID.
 * @returns {object|null} The user's profile data or null if not found.
 */
async function getUserProfile(uid) {
    if (!uid) return null;
    try {
        const snapshot = await get(ref(db, 'users/' + uid + '/profile'));
        if (snapshot.exists()) {
            return snapshot.val();
        } else {
            console.log("No profile data available");
            return null;
        }
    } catch (error) {
        console.error("Error getting profile: ", error);
        return null;
    }
}

/**
 * Logs a meal to the user's meal log in Realtime Database.
 * @param {string} uid - The user's unique ID.
 * @param {object} mealData - The meal data to log.
 */
async function logMeal(uid, mealData) {
    if (!uid) return;
    try {
        const mealDate = mealData.date;
        const mealRef = ref(db, `users/${uid}/meals/${mealDate}`);
        await push(mealRef, mealData);
        console.log("Meal logged successfully!");
    } catch (error) {
        console.error("Error logging meal: ", error);
    }
}

/**
 * Gets a real-time stream of a user's meals for a specific date.
 * @param {string} uid - The user's unique ID.
 * @param {string} date - The date to fetch meals for (YYYY-MM-DD).
 * @param {function} callback - The function to call with the meal data.
 * @returns {function} An unsubscribe function to stop listening for changes.
 */
function getMealsByDate(uid, date, callback) {
    if (!uid) return () => {};
    const mealsRef = ref(db, `users/${uid}/meals/${date}`);
    
    const unsubscribe = onValue(mealsRef, (snapshot) => {
        const data = snapshot.val();
        const meals = data ? Object.values(data) : [];
        callback(meals);
    });

    return unsubscribe;
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
    signOut
};
