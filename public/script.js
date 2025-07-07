import { 
    auth, 
    onAuthStateChanged,
    saveUserProfile, 
    getUserProfile, 
    logMeal, 
    getMealsByDate,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut
} from './firebase.js';

document.addEventListener('DOMContentLoaded', () => {
    const page = window.location.pathname.split("/").pop() || 'index.html';

    onAuthStateChanged(auth, user => {
        if (user) {
            // Show subscription popup on login (not on login.html)
            if (page !== 'login.html') {
                showSubscriptionPopup();
            }
            // User is signed in.
            // If they are on the login page, redirect them to the main page.
            if (page === 'login.html') {
                window.location.href = 'index.html';
            } else {
                // Otherwise, initialize the page they are on.
                initPage(user.uid);
            }
        } else {
            // User is signed out.
            // If they are not on the login page, redirect them there.
            if (page !== 'login.html') {
                window.location.href = 'login.html';
            } else {
                // If they are on the login page, initialize it.
                initLoginPage();
            }
        }
    });
});

function showSubscriptionPopup() {
    // Only show if not already shown in this session
    if (sessionStorage.getItem('subscriptionPopupShown')) return;
    sessionStorage.setItem('subscriptionPopupShown', '1');
    const popup = document.createElement('div');
    popup.innerHTML = `
        <div style="position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.4);z-index:9999;display:flex;align-items:center;justify-content:center;">
            <div style="background:white;padding:2rem 2.5rem;border-radius:1rem;box-shadow:0 4px 24px rgba(0,0,0,0.15);max-width:90vw;text-align:center;">
                <h2 style="font-size:1.5rem;font-weight:bold;color:#2563eb;">Upgrade to Pro</h2>
                <p style="margin:1rem 0 1.5rem 0;">Get <b>unlimited AI meal suggestions</b> and tips for just <b>$5/month</b>.</p>
                <button id="popup-subscribe-btn" style="background:#2563eb;color:white;font-weight:bold;padding:0.75rem 2rem;border-radius:0.5rem;font-size:1rem;">Subscribe Now</button>
                <button id="popup-close-btn" style="margin-left:1rem;background:#e5e7eb;color:#374151;font-weight:bold;padding:0.75rem 2rem;border-radius:0.5rem;font-size:1rem;">Maybe Later</button>
            </div>
        </div>
    `;
    document.body.appendChild(popup);
    document.getElementById('popup-subscribe-btn').onclick = () => {
        window.location.href = 'subscription.html';
    };
    document.getElementById('popup-close-btn').onclick = () => {
        popup.remove();
    };
}

function initPage(userId) {
    const page = window.location.pathname.split("/").pop() || 'index.html';

    // Add event listener for all sign-out buttons
    const signOutBtn = document.getElementById('sign-out-btn');
    if (signOutBtn) {
        signOutBtn.addEventListener('click', async () => {
            try {
                await signOut(auth);
                console.log("User signed out successfully");
            } catch (error) {
                console.error("Sign out error", error);
                alert("Error signing out. Please try again.");
            }
        });
    }

    // Initialize the correct page logic
    if (page === 'index.html' || page === '') {
        initTrackerPage();
    } else if (page === 'profile.html') {
        initProfilePage(userId);
    } else if (page === 'dashboard.html') {
        initDashboardPage(userId);
    }
}

// -----------------------------------------------------------------------------
// --- LOGIN PAGE (login.html) ---
// -----------------------------------------------------------------------------
function initLoginPage() {
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const showLoginBtn = document.getElementById('show-login-btn');
    const showSignupBtn = document.getElementById('show-signup-btn');
    const authError = document.getElementById('auth-error');
    const authErrorText = document.getElementById('auth-error-text');

    if (showLoginBtn) {
        showLoginBtn.addEventListener('click', () => {
            loginForm.classList.remove('hidden');
            signupForm.classList.add('hidden');
            showLoginBtn.classList.add('border-blue-600', 'text-blue-600');
            showSignupBtn.classList.remove('border-blue-600', 'text-blue-600');
            if (authError) authError.classList.add('hidden');
        });
    }

    if (showSignupBtn) {
        showSignupBtn.addEventListener('click', () => {
            signupForm.classList.remove('hidden');
            loginForm.classList.add('hidden');
            showSignupBtn.classList.add('border-blue-600', 'text-blue-600');
            showLoginBtn.classList.remove('border-blue-600', 'text-blue-600');
            if (authError) authError.classList.add('hidden');
        });
    }

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email')?.value;
            const password = document.getElementById('login-password')?.value;

            if (!email || !password) {
                if (authErrorText) authErrorText.textContent = "Please fill in all fields.";
                if (authError) authError.classList.remove('hidden');
                return;
            }

            // Try to sign in with Firebase Auth
            try {
                await signInWithEmailAndPassword(auth, email, password);
                // If successful, check if user is approved (optional: you can add a custom claim or check a flag in your DB)
            } catch (error) {
                if (error.code === 'auth/user-not-found') {
                    if (authErrorText) authErrorText.textContent = "Your account is pending approval or does not exist.";
                } else {
                    if (authErrorText) authErrorText.textContent = error.message;
                }
                if (authError) authError.classList.remove('hidden');
            }
        });
    }

    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('signup-email')?.value;
            const password = document.getElementById('signup-password')?.value;
            const confirmPassword = document.getElementById('signup-password-confirm')?.value;

            if (!email || !password || !confirmPassword) {
                if (authErrorText) authErrorText.textContent = "Please fill in all fields.";
                if (authError) authError.classList.remove('hidden');
                return;
            }

            if (password !== confirmPassword) {
                if (authErrorText) authErrorText.textContent = "Passwords do not match.";
                if (authError) authError.classList.remove('hidden');
                return;
            }

            if (password.length < 6) {
                if (authErrorText) authErrorText.textContent = "Password must be at least 6 characters long.";
                if (authError) authError.classList.remove('hidden');
                return;
            }

            // Send signup request to backend
            try {
                const res = await fetch('http://localhost:4000/api/request-signup', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                const data = await res.json();
                if (data.approvalToken) {
                    sendSignupNotification(email, data.approvalToken);
                    alert('Signup request sent. You will be notified after approval.');
                    signupForm.reset();
                } else {
                    alert('Error sending signup request.');
                }
            } catch (err) {
                alert('Error sending signup request.');
            }
        });
    }
}


// -----------------------------------------------------------------------------
// --- TRACKER PAGE (index.html) ---
// -----------------------------------------------------------------------------
function initTrackerPage() {
    const foodInput = document.getElementById('food-input');
    const textSearchBtn = document.getElementById('text-search-btn');
    const voiceSearchBtn = document.getElementById('voice-search-btn');
    const cameraSearchBtn = document.getElementById('camera-search-btn');
    const cameraPreviewModal = document.getElementById('camera-preview-modal');
    const cameraPreview = document.getElementById('camera-preview');
    const captureBtn = document.getElementById('capture-btn');
    const cancelCaptureBtn = document.getElementById('cancel-capture-btn');
    const loader = document.getElementById('loader');
    const errorMessage = document.getElementById('error-message');
    const errorText = document.getElementById('error-text');
    const nutritionalInfo = document.getElementById('nutritional-info');
    let stream = null;

    if(textSearchBtn) {
        textSearchBtn.addEventListener('click', () => {
            const query = foodInput?.value?.trim();
            if (query) {
                getNutritionalData(query);
            } else {
                showError('Please enter some food items.');
            }
        });
    }

    if(foodInput) {
        foodInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter' && textSearchBtn) {
                textSearchBtn.click();
            }
        });
    }

    if(voiceSearchBtn) {
        voiceSearchBtn.addEventListener('click', async () => {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (!SpeechRecognition) {
                showError("Speech recognition is not supported in your browser. Try using Chrome on desktop or Android.");
                return;
            }
            try {
                await navigator.mediaDevices.getUserMedia({ audio: true });
            } catch (err) {
                showError("Microphone access denied. Please allow mic access and try again.");
                return;
            }
            const recognition = new SpeechRecognition();
            recognition.continuous = false;
            recognition.interimResults = false;
            recognition.lang = 'en-US';
            recognition.onstart = () => {
                voiceSearchBtn.classList.add('animate-pulse');
                showError('Listening... Speak now!');
            };
            recognition.onresult = (event) => {
                const speechResult = event.results[0][0].transcript;
                if (foodInput) foodInput.value = speechResult;
                getNutritionalData(speechResult, true);
            };
            recognition.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                showError(`Speech recognition error: ${event.error}`);
            };
            recognition.onend = () => {
                voiceSearchBtn.classList.remove('animate-pulse');
                hideError();
            };
            try {
                recognition.start();
            } catch (error) {
                showError("Could not start speech recognition. Please try again.");
            }
        });
    }

    if(cameraSearchBtn) {
        cameraSearchBtn.addEventListener('click', async () => {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                showError("Camera access is not supported by your browser. Try using Chrome or a modern mobile browser.");
                return;
            }
            try {
                stream = await navigator.mediaDevices.getUserMedia({ 
                    video: { 
                        facingMode: 'environment',
                        width: { ideal: 1280 },
                        height: { ideal: 720 }
                    } 
                });
                if (cameraPreview) {
                    cameraPreview.srcObject = stream;
                    cameraPreview.play();
                }
                if (cameraPreviewModal) {
                    cameraPreviewModal.classList.remove('hidden');
                }
            } catch (err) {
                if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                    showError("Camera access denied. Please allow camera access and try again.");
                } else {
                    showError("Could not access the camera. Please grant permission or try a different device.");
                }
                console.error('Camera access error:', err);
            }
        });
    }
    
    if(captureBtn) {
        captureBtn.addEventListener('click', () => {
            if (!cameraPreview || !stream) {
                showError("Camera not ready. Please try again.");
                return;
            }
            
            try {
                const canvas = document.createElement('canvas');
                canvas.width = cameraPreview.videoWidth;
                canvas.height = cameraPreview.videoHeight;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(cameraPreview, 0, 0, canvas.width, canvas.height);
                const base64ImageData = canvas.toDataURL('image/png').split(',')[1];
                stopCameraStream();
                getNutritionalDataFromImage(base64ImageData);
            } catch (error) {
                console.error('Capture error:', error);
                showError("Failed to capture image. Please try again.");
                stopCameraStream();
            }
        });
    }

    if(cancelCaptureBtn) {
        cancelCaptureBtn.addEventListener('click', stopCameraStream);
    }
    
    function stopCameraStream() {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
        }
        if (cameraPreviewModal) {
            cameraPreviewModal.classList.add('hidden');
        }
    }

    async function getNutritionalData(query, fromMic = false) {
        if (!query || query.trim() === '') {
            showError('Please enter a valid food item.');
            return;
        }
        showLoading();
        const prompt = `Provide a detailed nutritional breakdown for: ${query}. Format as JSON with "items" (array of objects with name, quantity, calories, protein, carbohydrates, fats) and "total" (object with total calories, protein, carbohydrates, fats).`;
        try {
            const data = await callGeminiAPI(prompt);
            displayNutritionalInfo(data);
            if (fromMic && foodInput) {
                foodInput.value = query;
            }
        } catch (error) {
            console.error('Nutritional data error:', error);
            showError(error.message || 'Failed to get nutritional data. Please try again.');
        } finally {
            hideLoading();
            if (nutritionalInfo) nutritionalInfo.classList.remove('hidden');
        }
    }

    async function getNutritionalDataFromImage(base64ImageData) {
        if (!base64ImageData) {
            showError('No image data available.');
            return;
        }
        showLoading();
        const prompt = "Identify food in the image. Provide a nutritional breakdown as JSON with 'items' (array of objects with name, estimated quantity, calories, protein, carbohydrates, fats) and 'total' (object with total calories, protein, carbohydrates, fats).";
        try {
            const data = await callGeminiAPI(prompt, base64ImageData);
            displayNutritionalInfo(data);
        } catch (error) {
            console.error('Image analysis error:', error);
            showError(error.message || 'Failed to analyze image. Please try again.');
        } finally {
            hideLoading();
            if (nutritionalInfo) nutritionalInfo.classList.remove('hidden');
        }
    }

    function displayNutritionalInfo(data) {
        hideError();
        if (!nutritionalInfo) return;
        
        nutritionalInfo.innerHTML = '';
        if (!data || !data.items || !Array.isArray(data.items)) {
            showError("Could not parse nutritional information.");
            return;
        }
        
        let html = `<h2 class="text-2xl font-bold mb-4 border-b pb-2">Nutritional Summary</h2>`;
        html += `
            <div class="overflow-x-auto">
                <table class="min-w-full bg-white">
                    <thead class="bg-gray-200">
                        <tr>
                            <th class="py-2 px-4 text-left">Food Item</th>
                            <th class="py-2 px-4 text-right">Calories</th>
                            <th class="py-2 px-4 text-right">Protein</th>
                            <th class="py-2 px-4 text-right">Carbs</th>
                            <th class="py-2 px-4 text-right">Fats</th>
                        </tr>
                    </thead>
                    <tbody>`;
        
        data.items.forEach(item => {
            const calories = parseFloat(item.calories) || 0;
            const protein = item.protein || '0g';
            const carbs = item.carbohydrates || '0g';
            const fats = item.fats || '0g';
            
            html += `
                <tr class="border-b">
                    <td class="py-3 px-4 text-left capitalize">${item.name || 'Unknown'} (${item.quantity || '1 serving'})</td>
                    <td class="py-3 px-4 text-right">${calories.toFixed(1)}</td>
                    <td class="py-3 px-4 text-right">${protein}</td>
                    <td class="py-3 px-4 text-right">${carbs}</td>
                    <td class="py-3 px-4 text-right">${fats}</td>
                </tr>`;
        });
        html += `</tbody></table></div>`;

        if (data.total) {
            const totalCalories = parseFloat(data.total.calories) || 0;
            const totalProtein = data.total.protein || '0g';
            const totalCarbs = data.total.carbohydrates || '0g';
            const totalFats = data.total.fats || '0g';
            
            html += `
                <div class="mt-6 p-4 bg-blue-50 rounded-lg">
                    <h3 class="text-xl font-bold mb-2 text-blue-800">Total Nutrition</h3>
                    <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                        <div class="p-2 bg-white rounded shadow"><p class="text-sm text-gray-600">Calories</p><p class="text-lg font-bold">${totalCalories.toFixed(1)}</p></div>
                        <div class="p-2 bg-white rounded shadow"><p class="text-sm text-gray-600">Protein</p><p class="text-lg font-bold">${totalProtein}</p></div>
                        <div class="p-2 bg-white rounded shadow"><p class="text-sm text-gray-600">Carbs</p><p class="text-lg font-bold">${totalCarbs}</p></div>
                        <div class="p-2 bg-white rounded shadow"><p class="text-sm text-gray-600">Fats</p><p class="text-lg font-bold">${totalFats}</p></div>
                    </div>
                </div>`;
        }
        nutritionalInfo.innerHTML = html;
        nutritionalInfo.classList.remove('hidden');
    }
    
    function showLoading() {
        if (!loader) return;
        hideError();
        if (nutritionalInfo) nutritionalInfo.classList.add('hidden');
        loader.classList.remove('hidden');
        loader.classList.add('flex');
    }

    function hideLoading() {
        if (loader) {
            loader.classList.add('hidden');
            loader.classList.remove('flex');
        }
    }

    function showError(message) {
        if (!errorMessage || !errorText) return;
        hideLoading();
        errorText.textContent = message;
        errorMessage.classList.remove('hidden');
    }

    function hideError() {
        if (errorMessage) {
            errorMessage.classList.add('hidden');
        }
    }
}


// -----------------------------------------------------------------------------
// --- PROFILE PAGE (profile.html) ---
// -----------------------------------------------------------------------------
function initProfilePage(userId) {
    const ageInput = document.getElementById('age');
    const heightInput = document.getElementById('height');
    const weightInput = document.getElementById('weight');
    const bmiResult = document.getElementById('bmi-result');
    const fitnessGoalSelect = document.getElementById('fitness-goal');
    const targetWeightContainer = document.getElementById('target-weight-container');
    const targetWeightInput = document.getElementById('target-weight');
    const saveProfileBtn = document.getElementById('save-profile-btn');
    const successMessage = document.getElementById('success-message');
    const weightHistoryList = document.getElementById('weight-history');
    const aiSuggestionDiv = document.getElementById('ai-suggestion');
    const newSuggestionBtn = document.getElementById('new-suggestion-btn');

    let profileHistory = [];

    function calculateBMI() {
        if (!heightInput || !weightInput || !bmiResult) return;
        const height = parseFloat(heightInput.value);
        const weight = parseFloat(weightInput.value);
        if (height > 0 && weight > 0) {
            const heightInMeters = height / 100;
            const bmi = weight / (heightInMeters * heightInMeters);
            bmiResult.textContent = bmi.toFixed(2);
        } else {
            bmiResult.textContent = '-';
        }
    }

    function toggleTargetWeight() {
        if (!fitnessGoalSelect || !targetWeightContainer) return;
        if (fitnessGoalSelect.value === 'maintain') {
            targetWeightContainer.classList.add('hidden');
        } else {
            targetWeightContainer.classList.remove('hidden');
        }
    }

    async function loadProfile() {
        if (!userId) return;
        try {
            const profile = await getUserProfile(userId);
            if (profile) {
                if (ageInput) ageInput.value = profile.age ?? '';
                if (heightInput) heightInput.value = profile.height ?? '';
                if (weightInput) weightInput.value = profile.weight ?? '';
                if (fitnessGoalSelect) fitnessGoalSelect.value = profile.goal ?? 'reduce';
                if (targetWeightInput) targetWeightInput.value = profile.targetWeight ?? '';
                calculateBMI();
                toggleTargetWeight();
                // Load weight history
                profileHistory = profile.history || [];
                renderWeightHistory();
                // Show AI suggestion
                showAISuggestion();
            } else {
                // If no profile, clear fields
                if (ageInput) ageInput.value = '';
                if (heightInput) heightInput.value = '';
                if (weightInput) weightInput.value = '';
                if (fitnessGoalSelect) fitnessGoalSelect.value = 'reduce';
                if (targetWeightInput) targetWeightInput.value = '';
                profileHistory = [];
                renderWeightHistory();
                showAISuggestion();
            }
        } catch (error) {
            console.error('Error loading profile:', error);
            if (ageInput) ageInput.value = '';
            if (heightInput) heightInput.value = '';
            if (weightInput) weightInput.value = '';
            if (fitnessGoalSelect) fitnessGoalSelect.value = 'reduce';
            if (targetWeightInput) targetWeightInput.value = '';
            profileHistory = [];
            renderWeightHistory();
            showAISuggestion();
        }
    }

    function renderWeightHistory() {
        if (!weightHistoryList) return;
        weightHistoryList.innerHTML = '';
        if (!profileHistory.length) {
            weightHistoryList.innerHTML = '<li>No weight history yet.</li>';
            return;
        }
        profileHistory.slice().reverse().forEach(entry => {
            weightHistoryList.innerHTML += `<li>${entry.date}: <span class="font-semibold">${entry.weight} kg</span></li>`;
        });
    }

    async function saveProfile() {
        if (!userId) return;
        try {
            const newWeight = parseFloat(weightInput?.value) || null;
            // Add to history if weight changed
            let history = profileHistory || [];
            if (history.length === 0 || history[history.length - 1].weight !== newWeight) {
                history.push({ date: new Date().toISOString().split('T')[0], weight: newWeight });
            }
            const profileData = {
                age: parseInt(ageInput?.value) || null,
                height: parseFloat(heightInput?.value) || null,
                weight: newWeight,
                goal: fitnessGoalSelect?.value || 'reduce',
                targetWeight: parseFloat(targetWeightInput?.value) || null,
                history
            };
            await saveUserProfile(userId, profileData);
            profileHistory = history;
            renderWeightHistory();
            if (successMessage) {
                successMessage.classList.remove('hidden');
                setTimeout(() => successMessage.classList.add('hidden'), 3000);
            }
            // Reload profile to update UI
            await loadProfile();
        } catch (error) {
            console.error('Error saving profile:', error);
            alert('Failed to save profile. Please try again.');
        }
    }

    async function showAISuggestion() {
        if (!aiSuggestionDiv) return;
        aiSuggestionDiv.innerHTML = 'Loading suggestion...';
        const goal = fitnessGoalSelect?.value || 'reduce';
        let prompt = '';
        if (goal === 'reduce') {
            prompt = 'Suggest a healthy meal and a weight loss tip for someone trying to lose weight.';
        } else if (goal === 'gain') {
            prompt = 'Suggest a high-calorie meal and a weight gain tip for someone trying to gain weight.';
        } else {
            prompt = 'Suggest a balanced meal and a tip for someone maintaining their weight.';
        }
        try {
            const data = await callGeminiAPI(prompt);
            let mealHtml = '';
            if (data.items && Array.isArray(data.items)) {
                mealHtml += '<ul>';
                data.items.forEach(item => {
                    mealHtml += `<li><strong>${item.name}</strong> (${item.quantity})<br>Calories: ${item.calories}, Protein: ${item.protein}, Carbs: ${item.carbohydrates}, Fats: ${item.fats}</li>`;
                });
                mealHtml += '</ul>';
            } else if (data.meal) {
                mealHtml += `<div>${data.meal}</div>`;
            } else {
                mealHtml += `<div>${JSON.stringify(data)}</div>`;
            }
            let tipHtml = data.tip ? data.tip : '';
            aiSuggestionDiv.innerHTML = `<div><strong>Meal:</strong> ${mealHtml}</div><div class="mt-2"><strong>Tip:</strong> ${tipHtml}</div>`;
        } catch (error) {
            aiSuggestionDiv.innerHTML = 'Could not load suggestion.';
        }
    }

    if (saveProfileBtn) {
        saveProfileBtn.addEventListener('click', saveProfile);
    }
    if (heightInput) heightInput.addEventListener('input', calculateBMI);
    if (weightInput) weightInput.addEventListener('input', calculateBMI);
    if (fitnessGoalSelect) fitnessGoalSelect.addEventListener('change', () => {
        toggleTargetWeight();
        showAISuggestion();
    });
    if (newSuggestionBtn) newSuggestionBtn.addEventListener('click', () => {
        const userId = auth.currentUser?.uid;
        if (!userId) return;
        const today = new Date().toISOString().split('T')[0];
        const key = `suggestionCount_${userId}_${today}`;
        let count = parseInt(localStorage.getItem(key) || '0');
        if (count >= 2) {
            alert('You’ve reached your daily limit. Subscribe for unlimited suggestions.');
            window.location.href = 'subscription.html';
            return;
        }
        count++;
        localStorage.setItem(key, count.toString());
        showAISuggestion();
    });

    loadProfile();

    // Step Counter Integration (DeviceMotion API)
    if ('DeviceMotionEvent' in window && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
        let lastAcc = null;
        let stepCount = 0;
        let lastStepTime = 0;
        window.addEventListener('devicemotion', (event) => {
            const acc = event.accelerationIncludingGravity;
            if (!acc) return;
            const magnitude = Math.sqrt(acc.x * acc.x + acc.y * acc.y + acc.z * acc.z);
            const now = Date.now();
            if (magnitude > 12 && (!lastAcc || now - lastStepTime > 400)) {
                stepCount++;
                lastStepTime = now;
                localStorage.setItem('stepCount', stepCount.toString());
            }
            lastAcc = acc;
        });
    }
}


// -----------------------------------------------------------------------------
// --- DASHBOARD PAGE (dashboard.html) ---
// -----------------------------------------------------------------------------
function initDashboardPage(userId) {
    const logMealBtn = document.getElementById('log-meal-btn');
    const mealLogContainer = document.getElementById('meal-log');
    const addStepsBtn = document.getElementById('add-steps-btn');
    const stepCountEl = document.getElementById('step-count');
    const goalSummaryContainer = document.getElementById('goal-summary');
    const errorModal = document.getElementById('error-modal');
    const errorModalText = document.getElementById('error-modal-text');
    const closeErrorModalBtn = document.getElementById('close-error-modal-btn');
    const mealLogDateInput = document.getElementById('meal-log-date');
    const prevDayBtn = document.getElementById('prev-day-btn');
    const nextDayBtn = document.getElementById('next-day-btn');
    const thisWeekBtn = document.getElementById('this-week-btn');

    let selectedDate = new Date();
    let weekView = false;

    function formatDate(date) {
        return date.toISOString().split('T')[0];
    }

    function updateMealLogDateInput() {
        if (mealLogDateInput) {
            mealLogDateInput.value = formatDate(selectedDate);
        }
    }

    function fetchAndDisplayMeals() {
        if (!userId) return;
        if (weekView) {
            // Show meals for the last 7 days
            const today = new Date(selectedDate);
            const days = [];
            for (let i = 6; i >= 0; i--) {
                const d = new Date(today);
                d.setDate(today.getDate() - i);
                days.push(formatDate(d));
            }
            let allMeals = [];
            let loaded = 0;
            days.forEach(dateStr => {
                getMealsByDate(userId, dateStr, (meals) => {
                    allMeals.push({ date: dateStr, meals });
                    loaded++;
                    if (loaded === days.length) {
                        displayMealsByDate(allMeals);
                    }
                });
            });
        } else {
            // Show meals for selected date
            getMealsByDate(userId, formatDate(selectedDate), displayMeals);
        }
    }

    function displayMealsByDate(allMeals) {
        if (!mealLogContainer) return;
        mealLogContainer.innerHTML = '';
        allMeals.forEach(({ date, meals }) => {
            mealLogContainer.innerHTML += `<div class="mb-2 mt-4 text-sm text-gray-500 font-semibold">${date}</div>`;
            if (!meals || meals.length === 0) {
                mealLogContainer.innerHTML += '<p class="text-gray-400 ml-2 mb-2">No meals logged.</p>';
                return;
            }
            const mealsByType = meals.reduce((acc, meal) => {
                (acc[meal.type] = acc[meal.type] || []).push(meal);
                return acc;
            }, {});
            for (const type in mealsByType) {
                let mealHtml = `<div class="mb-2"><h3 class="font-bold text-blue-600">${type}</h3>`;
                mealsByType[type].forEach(meal => {
                    if (meal.items && Array.isArray(meal.items)) {
                        meal.items.forEach(item => {
                            const calories = parseFloat(item.calories) || 0;
                            mealHtml += `<p class="text-sm text-gray-600 ml-2">• ${item.name || 'Unknown'} - ${calories.toFixed(0)} kcal</p>`;
                        });
                    }
                });
                mealHtml += `</div>`;
                mealLogContainer.innerHTML += mealHtml;
            }
        });
    }

    function showErrorModal(message) {
        if (errorModalText) errorModalText.textContent = message;
        if (errorModal) errorModal.classList.remove('hidden');
    }

    function hideErrorModal() {
        if (errorModal) errorModal.classList.add('hidden');
    }

    async function handleLogMeal() {
        if (!userId) {
            showErrorModal("Cannot log meal, user not authenticated.");
            return;
        }
        
        const mealType = document.getElementById('meal-type')?.value || 'Snack';
        const mealInput = document.getElementById('meal-input')?.value?.trim();
        
        if (!mealInput) {
            showErrorModal("Please enter food items to log.");
            return;
        }

        try {
            const prompt = `Provide a nutritional breakdown for: ${mealInput}. Format as JSON with "items" and "total".`;
            const nutritionData = await callGeminiAPI(prompt);
            
            if (nutritionData && nutritionData.items) {
                const mealData = {
                    date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
                    type: mealType,
                    items: nutritionData.items,
                    total: nutritionData.total,
                    createdAt: new Date().toISOString()
                };
                
                await logMeal(userId, mealData);
                
                // Clear input after successful log
                const mealInputEl = document.getElementById('meal-input');
                if (mealInputEl) mealInputEl.value = '';
                
                console.log("Meal logged successfully");
            } else {
                showErrorModal("Could not get nutritional data for the meal.");
            }
        } catch (error) {
            console.error('Error logging meal:', error);
            showErrorModal(`Error logging meal: ${error.message}`);
        }
    }

    function displayMeals(meals) {
        if (!mealLogContainer) return;
        mealLogContainer.innerHTML = '';
        if (!meals || meals.length === 0) {
            mealLogContainer.innerHTML = '<p class="text-gray-500">No meals logged for today.</p>';
            return;
        }
        // Group meals by type and sort by time
        const mealOrder = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];
        const mealsByType = {};
        meals.forEach(meal => {
            const type = meal.type || 'Other';
            if (!mealsByType[type]) mealsByType[type] = [];
            mealsByType[type].push(meal);
        });
        mealOrder.forEach(type => {
            if (mealsByType[type]) {
                let mealHtml = `<div class="mb-4"><h3 class="font-bold text-lg text-blue-600">${type}</h3>`;
                mealsByType[type].forEach(meal => {
                    if (meal.items && Array.isArray(meal.items)) {
                        meal.items.forEach(item => {
                            const calories = parseFloat(item.calories) || 0;
                            mealHtml += `<p class="text-sm text-gray-600 ml-2">• ${item.name || 'Unknown'} - ${calories.toFixed(0)} kcal</p>`;
                        });
                    }
                });
                mealHtml += `</div>`;
                mealLogContainer.innerHTML += mealHtml;
            }
        });
        // Show any other types not in the main order
        Object.keys(mealsByType).forEach(type => {
            if (!mealOrder.includes(type)) {
                let mealHtml = `<div class="mb-4"><h3 class="font-bold text-lg text-blue-600">${type}</h3>`;
                mealsByType[type].forEach(meal => {
                    if (meal.items && Array.isArray(meal.items)) {
                        meal.items.forEach(item => {
                            const calories = parseFloat(item.calories) || 0;
                            mealHtml += `<p class="text-sm text-gray-600 ml-2">• ${item.name || 'Unknown'} - ${calories.toFixed(0)} kcal</p>`;
                        });
                    }
                });
                mealHtml += `</div>`;
                mealLogContainer.innerHTML += mealHtml;
            }
        });
    }
    
    function handleAddSteps() {
        if (!stepCountEl) return;
        
        const currentSteps = parseInt(stepCountEl.textContent) || 0;
        const stepsToAdd = prompt("How many steps to add?", "1000");
        
        if (stepsToAdd && !isNaN(stepsToAdd) && parseInt(stepsToAdd) > 0) {
            const newTotal = currentSteps + parseInt(stepsToAdd);
            stepCountEl.textContent = newTotal;
            
            // Save to localStorage for persistence
            localStorage.setItem('stepCount', newTotal.toString());
        }
    }
    
    async function displayGoals() {
        if(!userId || !goalSummaryContainer) return;
        
        try {
            const profile = await getUserProfile(userId);
            if(!profile || !profile.weight) {
                goalSummaryContainer.innerHTML = '<p class="text-gray-500">Please complete your profile to see goals.</p>';
                return;
            }
            
            goalSummaryContainer.innerHTML = `
                <div class="flex justify-between items-center mb-2">
                    <span class="text-gray-600">Current Weight:</span> 
                    <span class="font-bold">${profile.weight} kg</span>
                </div>
                <div class="flex justify-between items-center">
                    <span class="text-gray-600">Goal:</span> 
                    <span class="font-bold capitalize">${profile.goal} Weight</span>
                </div>
                ${profile.goal !== 'maintain' && profile.targetWeight ? 
                    `<div class="flex justify-between items-center mt-2">
                        <span class="text-gray-600">Target:</span> 
                        <span class="font-bold">${profile.targetWeight} kg</span>
                    </div>` : ''}
            `;
        } catch (error) {
            console.error('Error loading goals:', error);
            goalSummaryContainer.innerHTML = '<p class="text-red-500">Error loading goals.</p>';
        }
    }

    // Add event listeners
    if (logMealBtn) logMealBtn.addEventListener('click', handleLogMeal);
    if (addStepsBtn) addStepsBtn.addEventListener('click', handleAddSteps);
    if (closeErrorModalBtn) closeErrorModalBtn.addEventListener('click', hideErrorModal);

    // Load saved step count from localStorage
    if (stepCountEl) {
        const savedSteps = localStorage.getItem('stepCount');
        if (savedSteps) {
            stepCountEl.textContent = savedSteps;
        }
    }

    // Subscribe to meal updates for today
    if (userId) {
        const today = new Date().toISOString().split('T')[0];
        getMealsByDate(userId, today, displayMeals);
        displayGoals();
    }

    // Replace the old meal log subscription logic:
    if (mealLogDateInput) {
        mealLogDateInput.addEventListener('change', (e) => {
            selectedDate = new Date(e.target.value);
            weekView = false;
            fetchAndDisplayMeals();
        });
    }
    if (prevDayBtn) {
        prevDayBtn.addEventListener('click', () => {
            selectedDate.setDate(selectedDate.getDate() - 1);
            weekView = false;
            updateMealLogDateInput();
            fetchAndDisplayMeals();
        });
    }
    if (nextDayBtn) {
        nextDayBtn.addEventListener('click', () => {
            selectedDate.setDate(selectedDate.getDate() + 1);
            weekView = false;
            updateMealLogDateInput();
            fetchAndDisplayMeals();
        });
    }
    if (thisWeekBtn) {
        thisWeekBtn.addEventListener('click', () => {
            weekView = true;
            fetchAndDisplayMeals();
        });
    }

    // Set initial date to today
    updateMealLogDateInput();
    fetchAndDisplayMeals();
}

// -----------------------------------------------------------------------------
// --- GEMINI API HELPER ---
// -----------------------------------------------------------------------------
async function callGeminiAPI(prompt, base64ImageData = null) {
    const apiKey = "AIzaSyB446tV-JOGs78qkN3A206UsMntsbJuYm8"; 
    
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const parts = [{ text: prompt }];
    if (base64ImageData) {
        parts.push({ mimeType: "image/png", data: base64ImageData });
    }

    const payload = {
        contents: [{ role: "user", parts }],
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
                type: "OBJECT",
                properties: {
                    "items": {
                        type: "ARRAY",
                        items: {
                            type: "OBJECT",
                            properties: {
                                "name": { "type": "STRING" }, 
                                "quantity": { "type": "STRING" },
                                "calories": { "type": "NUMBER" }, 
                                "protein": { "type": "STRING" },
                                "carbohydrates": { "type": "STRING" }, 
                                "fats": { "type": "STRING" }
                            },
                            required: ["name", "quantity", "calories", "protein", "carbohydrates", "fats"]
                        }
                    },
                    "total": {
                        type: "OBJECT",
                        properties: {
                            "calories": { "type": "NUMBER" }, 
                            "protein": { "type": "STRING" },
                            "carbohydrates": { "type": "STRING" }, 
                            "fats": { "type": "STRING" }
                        },
                        required: ["calories", "protein", "carbohydrates", "fats"]
                    }
                },
                required: ["items", "total"]
            }
        }
    };

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`API request failed with status ${response.status}: ${errorBody}`);
        }

        const result = await response.json();

        if (result.candidates && result.candidates[0].content && result.candidates[0].content.parts[0]) {
            try {
                return JSON.parse(result.candidates[0].content.parts[0].text);
            } catch(e) {
                console.error('JSON parse error:', e);
                throw new Error("Failed to parse JSON from API response.");
            }
        } else {
            console.error("Invalid API Response:", result);
            throw new Error("Invalid response structure from API.");
        }
    } catch (error) {
        console.error('API call error:', error);
        throw error;
    }
}

// EmailJS config
const EMAILJS_SERVICE_ID = 'service_472za2c';
const EMAILJS_TEMPLATE_ID = 'template_nsl3mfc';
const EMAILJS_PUBLIC_KEY = 'yjXQ2dziULsw8Z0eq';

// Initialize EmailJS
if (typeof emailjs !== 'undefined') {
    emailjs.init(EMAILJS_PUBLIC_KEY);
}

function sendSignupNotification(email, approvalToken) {
    emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
        signup_email: email,
        signup_time: new Date().toLocaleString(),
        approve_link: `http://localhost:4000/api/approve-signup?token=${approvalToken}`,
        decline_link: `http://localhost:4000/api/decline-signup?token=${approvalToken}`
    }).then(function(response) {
        console.log('Signup notification sent!', response.status, response.text);
    }, function(error) {
        console.error('Failed to send signup notification:', error);
    });
}
