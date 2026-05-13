import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

export interface Category {
    id: number;
    name: string;
    description?: string;
}

export interface AIModel {
    id: number;
    name: string;
    description: string;
    creator: string;
    pricing: string;
    url?: string;
    coding_score: number;
    reasoning_score: number;
    creative_score: number;
    category?: Category;
    categories?: Category[]; // Included to match requested interface signature
    externalLink?: string;
    hasEmbedded?: boolean;
}

export interface Recommendation {
    model: AIModel;
    match_score: number;
    score?: number; // Included to match requested interface signature
    reasoning?: string;
}

export interface Review {
    id: number;
    model_id: number;
    rating: number;
    text: string;
    created_at: string;
}

export interface NewsItem {
    title: string;
    snippet: string;
    url?: string;
    source?: string;
}

export interface NewsResponse {
    news: NewsItem[];
    timestamp: string;
}

// Set up an axios instance
const apiClient = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Auto-inject JWT token on every request
apiClient.interceptors.request.use((config) => {
    if (typeof window !== 'undefined') {
        const token = localStorage.getItem('authToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    }
    return config;
});

export const getModels = async (): Promise<AIModel[]> => {
    try {
        const response = await apiClient.get<AIModel[]>('/models');
        return response.data;
    } catch (error) {
        console.error('Error fetching models:', error);
        throw error;
    }
};

export const searchModels = async (query: string): Promise<AIModel[]> => {
    try {
        const response = await apiClient.get<AIModel[]>('/models/search', {
            params: { q: query },
        });
        return response.data;
    } catch (error) {
        console.error(`Error searching models with query "${query}":`, error);
        throw error;
    }
};

export const getModel = async (id: number): Promise<AIModel> => {
    try {
        const response = await apiClient.get<AIModel>(`/models/${id}`);
        return response.data;
    } catch (error) {
        console.error(`Error fetching model ${id}:`, error);
        throw error;
    }
};

export const getRecommendations = async (task: string, category?: string): Promise<Recommendation[]> => {
    try {
        const response = await apiClient.post<Recommendation[]>('/recommend', {
            task,
            category: category || null,
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching recommendations:', error);
        throw error;
    }
};

export const getCategories = async (): Promise<Category[]> => {
    try {
        const response = await apiClient.get<Category[]>('/categories');
        return response.data;
    } catch (error) {
        console.error('Error fetching categories:', error);
        throw error;
    }
};

export const getReviews = async (modelId: number): Promise<Review[]> => {
    try {
        const response = await apiClient.get<Review[]>(`/models/${modelId}/reviews`);
        return response.data;
    } catch (error) {
        console.error(`Error fetching reviews for model ${modelId}:`, error);
        throw error;
    }
};

export const createReview = async (modelId: number, rating: number, text: string): Promise<Review> => {
    try {
        const response = await apiClient.post<Review>('/reviews', {
            model_id: modelId,
            rating,
            text,
        });
        return response.data;
    } catch (error) {
        console.error(`Error creating review for model ${modelId}:`, error);
        throw error;
    }
};

export interface IntegrationModel extends AIModel {
    externalLink: string;
    hasEmbedded: boolean;
    icon?: string;
}

export const getIntegrations = async (): Promise<IntegrationModel[]> => {
    try {
        const response = await apiClient.get<{ models: IntegrationModel[] }>('/ai-models/integrations');
        return response.data.models;
    } catch (error) {
        console.error('Error fetching integrations:', error);
        throw error;
    }
};

export const getMyReviews = async (): Promise<Review[]> => {
    try {
        const response = await apiClient.get<Review[]>('/auth/reviews');
        return response.data;
    } catch (error) {
        console.error('Error fetching my reviews:', error);
        throw error;
    }
};

export const updateProfile = async (data: { full_name?: string; email?: string; username?: string }): Promise<any> => {
    try {
        const response = await apiClient.patch('/auth/profile', data);
        return response.data;
    } catch (error) {
        console.error('Error updating profile:', error);
        throw error;
    }
};

export const getAINews = async (): Promise<NewsResponse> => {
    try {
        const response = await apiClient.get<NewsResponse>('/ai-news');
        return response.data;
    } catch (error) {
        console.error('Error fetching AI news:', error);
        throw error;
    }
};
