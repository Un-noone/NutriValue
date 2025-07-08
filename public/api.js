// API integration for backend communication - Updated for local hosting
const API_BASE_URL = 'http://localhost:3000/api';

class ApiService {
    constructor() {
        this.baseUrl = API_BASE_URL;
    }

    // For local development, we'll skip Firebase auth token requirement
    async getIdToken() {
        // For local development, return a dummy token or skip auth
        const user = typeof auth !== 'undefined' && auth.currentUser;
        if (!user) {
            console.log('No authenticated user for local development');
            return null;
        }
        try {
            return await user.getIdToken();
        } catch (error) {
            console.log('Error getting Firebase token, proceeding without auth for local development');
            return null;
        }
    }

    // Make API request (modified for local development)
    async makeRequest(endpoint, options = {}) {
        try {
            // For local development, we'll still try to get the token but not require it
            let token = null;
            try {
                token = await this.getIdToken();
            } catch (error) {
                console.log('Proceeding without auth token for local development');
            }

            const headers = {
                'Content-Type': 'application/json',
                ...options.headers
            };

            // Only add auth header if we have a token
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                ...options,
                headers
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

    // Make request without auth (for local development)
    async makeRequestWithUid(endpoint, uid, options = {}) {
        try {
            // Add uid to query params or body
            let url = `${this.baseUrl}${endpoint}`;
            
            if (options.method === 'GET' || !options.method) {
                // Add uid as query parameter for GET requests
                const separator = endpoint.includes('?') ? '&' : '?';
                url += `${separator}uid=${uid}`;
            } else {
                // Add uid to body for POST/PUT/DELETE requests
                const body = options.body ? JSON.parse(options.body) : {};
                body.uid = uid;
                options.body = JSON.stringify(body);
            }

            const response = await fetch(url, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
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
        const user = typeof auth !== 'undefined' && auth.currentUser;
        if (!user) throw new Error('No authenticated user');
        return this.makeRequestWithUid('/user/profile', user.uid);
    }

    // Save user profile to MongoDB
    async saveUserProfile(profileData) {
        const user = typeof auth !== 'undefined' && auth.currentUser;
        if (!user) throw new Error('No authenticated user');
        
        // Ensure uid and email are included
        const dataWithAuth = {
            ...profileData,
            uid: user.uid,
            email: user.email
        };
        
        return this.makeRequestWithUid('/user/profile', user.uid, {
            method: 'POST',
            body: JSON.stringify(dataWithAuth)
        });
    }

    // Get all users (admin function)
    async getAllUsers() {
        const user = typeof auth !== 'undefined' && auth.currentUser;
        if (!user) throw new Error('No authenticated user');
        return this.makeRequestWithUid('/users', user.uid);
    }

    // Log a meal
    async logMeal(mealData) {
        const user = typeof auth !== 'undefined' && auth.currentUser;
        if (!user) throw new Error('No authenticated user');
        
        const dataWithAuth = {
            ...mealData,
            uid: user.uid
        };
        
        return this.makeRequestWithUid('/meals', user.uid, {
            method: 'POST',
            body: JSON.stringify(dataWithAuth)
        });
    }

    // Get meals by date
    async getMealsByDate(date) {
        const user = typeof auth !== 'undefined' && auth.currentUser;
        if (!user) throw new Error('No authenticated user');
        return this.makeRequestWithUid(`/meals/${date}`, user.uid);
    }

    // Get meals by date range
    async getMealsByDateRange(startDate, endDate) {
        const user = typeof auth !== 'undefined' && auth.currentUser;
        if (!user) throw new Error('No authenticated user');
        return this.makeRequestWithUid(`/meals/range/${startDate}/${endDate}`, user.uid);
    }

    // Get all meals (with optional pagination)
    async getAllMeals(limit = 50, offset = 0) {
        const user = typeof auth !== 'undefined' && auth.currentUser;
        if (!user) throw new Error('No authenticated user');
        return this.makeRequestWithUid(`/meals?limit=${limit}&offset=${offset}`, user.uid);
    }

    // Delete a meal
    async deleteMeal(mealId) {
        const user = typeof auth !== 'undefined' && auth.currentUser;
        if (!user) throw new Error('No authenticated user');
        return this.makeRequestWithUid(`/meals/${mealId}`, user.uid, {
            method: 'DELETE'
        });
    }
}

// Create global API service instance
const apiService = new ApiService();

// Export for use in other modules
export { apiService };