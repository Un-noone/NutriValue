// API integration for backend communication
const API_BASE_URL = 'http://localhost:3000/api';

class ApiService {
    constructor() {
        this.baseUrl = API_BASE_URL;
    }

    // Get Firebase ID token for authentication
    async getIdToken() {
        const user = auth.currentUser;
        if (!user) {
            throw new Error('No authenticated user');
        }
        return await user.getIdToken();
    }

    // Make authenticated API request
    async makeRequest(endpoint, options = {}) {
        try {
            const token = await this.getIdToken();
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    ...options.headers
                }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    // Get user profile from MongoDB
    async getUserProfile() {
        return this.makeRequest('/user/profile');
    }

    // Save user profile to MongoDB
    async saveUserProfile(profileData) {
        return this.makeRequest('/user/profile', {
            method: 'POST',
            body: JSON.stringify(profileData)
        });
    }

    // Get all users (admin function)
    async getAllUsers() {
        return this.makeRequest('/users');
    }

    // Log a meal
    async logMeal(mealData) {
        return this.makeRequest('/meals', {
            method: 'POST',
            body: JSON.stringify(mealData)
        });
    }

    // Get meals by date
    async getMealsByDate(date) {
        return this.makeRequest(`/meals/${date}`);
    }

    // Get meals by date range
    async getMealsByDateRange(startDate, endDate) {
        return this.makeRequest(`/meals/range/${startDate}/${endDate}`);
    }

    // Get all meals (with optional pagination)
    async getAllMeals(limit = 50, offset = 0) {
        return this.makeRequest(`/meals?limit=${limit}&offset=${offset}`);
    }

    // Delete a meal
    async deleteMeal(mealId) {
        return this.makeRequest(`/meals/${mealId}`, {
            method: 'DELETE'
        });
    }
}

// Create global API service instance
const apiService = new ApiService();

// Export for use in other modules
export { apiService }; 