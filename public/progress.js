import { auth, onAuthStateChanged, getUserProfile, getMealsByDate } from './firebase.js';

// Wait for user authentication
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
    // Fetch and display progress data
    await renderProgress(user.uid);
});

async function renderProgress(userId) {
    // Placeholder: Fetch last 7 days of meals and weight
    const today = new Date();
    const labels = [];
    const caloriesData = [];
    const proteinData = [];
    const carbsData = [];
    const fatsData = [];
    const weightData = [];
    const stepsData = [];

    for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        labels.push(dateStr);
        // Fetch meals for this date
        await new Promise((resolve) => {
            getMealsByDate(userId, dateStr, (meals) => {
                let totalCalories = 0, totalProtein = 0, totalCarbs = 0, totalFats = 0;
                meals.forEach(meal => {
                    if (meal.total) {
                        totalCalories += parseFloat(meal.total.calories) || 0;
                        totalProtein += parseFloat(meal.total.protein) || 0;
                        totalCarbs += parseFloat(meal.total.carbohydrates) || 0;
                        totalFats += parseFloat(meal.total.fats) || 0;
                    }
                });
                caloriesData.push(totalCalories);
                proteinData.push(totalProtein);
                carbsData.push(totalCarbs);
                fatsData.push(totalFats);
                resolve();
            });
        });
        // Fetch weight (use latest profile weight for now)
        const profile = await getUserProfile(userId);
        weightData.push(profile && profile.weight ? parseFloat(profile.weight) : null);
        // Fetch steps (from localStorage for now)
        const steps = localStorage.getItem('stepCount_' + dateStr);
        stepsData.push(steps ? parseInt(steps) : 0);
    }

    // Render charts
    renderNutritionChart(labels, caloriesData, proteinData, carbsData, fatsData);
    renderWeightChart(labels, weightData);
    renderStepsChart(labels, stepsData);

    // Fetch and display all meals for the last 7 days in the Meals Log section
    const mealLogDiv = document.getElementById('progress-meal-log');
    if (mealLogDiv) {
        mealLogDiv.innerHTML = 'Loading...';
        const today = new Date();
        const days = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            days.push(d.toISOString().split('T')[0]);
        }
        let allMeals = [];
        let loaded = 0;
        days.forEach(dateStr => {
            getMealsByDate(userId, dateStr, (meals) => {
                allMeals.push({ date: dateStr, meals });
                loaded++;
                if (loaded === days.length) {
                    // Sort by date descending
                    allMeals.sort((a, b) => b.date.localeCompare(a.date));
                    mealLogDiv.innerHTML = '';
                    allMeals.forEach(({ date, meals }) => {
                        mealLogDiv.innerHTML += `<div class='mb-2 mt-4 text-sm text-gray-500 font-semibold'>${date}</div>`;
                        if (!meals || meals.length === 0) {
                            mealLogDiv.innerHTML += '<p class="text-gray-400 ml-2 mb-2">No meals logged.</p>';
                            return;
                        }
                        // Group by type
                        const mealOrder = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];
                        const mealsByType = {};
                        meals.forEach(meal => {
                            const type = meal.type || 'Other';
                            if (!mealsByType[type]) mealsByType[type] = [];
                            mealsByType[type].push(meal);
                        });
                        mealOrder.forEach(type => {
                            if (mealsByType[type]) {
                                let mealHtml = `<div class='mb-2'><h3 class='font-bold text-blue-600'>${type}</h3>`;
                                mealsByType[type].forEach(meal => {
                                    if (meal.items && Array.isArray(meal.items)) {
                                        meal.items.forEach(item => {
                                            const calories = parseFloat(item.calories) || 0;
                                            mealHtml += `<p class='text-sm text-gray-600 ml-2'>• ${item.name || 'Unknown'} - ${calories.toFixed(0)} kcal</p>`;
                                        });
                                    }
                                });
                                mealHtml += `</div>`;
                                mealLogDiv.innerHTML += mealHtml;
                            }
                        });
                        // Show any other types
                        Object.keys(mealsByType).forEach(type => {
                            if (!mealOrder.includes(type)) {
                                let mealHtml = `<div class='mb-2'><h3 class='font-bold text-blue-600'>${type}</h3>`;
                                mealsByType[type].forEach(meal => {
                                    if (meal.items && Array.isArray(meal.items)) {
                                        meal.items.forEach(item => {
                                            const calories = parseFloat(item.calories) || 0;
                                            mealHtml += `<p class='text-sm text-gray-600 ml-2'>• ${item.name || 'Unknown'} - ${calories.toFixed(0)} kcal</p>`;
                                        });
                                    }
                                });
                                mealHtml += `</div>`;
                                mealLogDiv.innerHTML += mealHtml;
                            }
                        });
                    });
                }
            });
        });
    }
}

function renderNutritionChart(labels, calories, protein, carbs, fats) {
    const ctx = document.getElementById('nutritionChart').getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [
                { label: 'Calories', data: calories, borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.1)', fill: true },
                { label: 'Protein', data: protein, borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.1)', fill: true },
                { label: 'Carbs', data: carbs, borderColor: '#f59e42', backgroundColor: 'rgba(245,158,66,0.1)', fill: true },
                { label: 'Fats', data: fats, borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.1)', fill: true },
            ]
        },
        options: {
            responsive: true,
            plugins: { legend: { position: 'top' } },
            scales: { y: { beginAtZero: true } }
        }
    });
}

function renderWeightChart(labels, weight) {
    const ctx = document.getElementById('weightChart').getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [
                { label: 'Weight (kg)', data: weight, borderColor: '#6366f1', backgroundColor: 'rgba(99,102,241,0.1)', fill: true }
            ]
        },
        options: {
            responsive: true,
            plugins: { legend: { position: 'top' } },
            scales: { y: { beginAtZero: false } }
        }
    });
}

function renderStepsChart(labels, steps) {
    const ctx = document.getElementById('stepsChart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                { label: 'Steps', data: steps, backgroundColor: '#fbbf24' }
            ]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true } }
        }
    });
} 