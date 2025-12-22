import axios from "axios";

let apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Handle Render's internal hostname
if (apiUrl && !apiUrl.includes(".") && !apiUrl.includes("localhost")) {
    apiUrl = `${apiUrl}.onrender.com`;
}

if (apiUrl && !apiUrl.startsWith("http")) {
    apiUrl = `https://${apiUrl}`;
}

export const API_BASE = apiUrl;

// Create axios instance
const api = axios.create({
    baseURL: API_BASE,
    timeout: 15000,
    headers: {
        "Content-Type": "application/json",
    },
});

// Add a request interceptor to include the token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("token");
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Add a response interceptor to handle 401 errors globally
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            // Token is invalid, expired, or forbidden
            const token = localStorage.getItem("token");
            if (token || error.response.status === 403) {
                console.warn("Session expired, invalid token, or forbidden. Logging out...");
                localStorage.removeItem("token");
                // Force reload to reset application state
                if (typeof window !== "undefined") {
                    window.location.href = "/auth/login";
                }
            }
        }
        return Promise.reject(error);
    }
);

export interface Category {
    id: string;
    name: string;
    created_at: string;
}

export interface Project {
    id: string;
    title: string;
    description?: string;
    category_id?: string | null;
    created_at: string;
    updated_at: string;
    source_count: number;
    first_source_id?: string;
    first_source_url?: string;
    first_source_preview?: string;
    type?: string;
    status?: string;
}

export const categoriesApi = {
    async list(): Promise<Category[]> {
        // FastAPI @router.get("/") on prefix "/categories" -> expects "/categories/"
        const res = await api.get('/categories/');
        return res.data;
    },

    async create(name: string): Promise<Category> {
        // FastAPI @router.post("/") -> expects "/categories/"
        const res = await api.post('/categories/', { name });
        return res.data;
    },

    async update(id: string, name: string): Promise<Category> {
        // FastAPI @router.put("/{id}") -> expects "/categories/{id}" (no trailing slash)
        const res = await api.put(`/categories/${id}`, { name });
        return res.data;
    },

    async delete(id: string): Promise<void> {
        await api.delete(`/categories/${id}`);
    },
};

export const projectsApi = {
    async list(categoryId?: string): Promise<Project[]> {
        // FastAPI @router.get("/projects") -> expects "/sources/projects" (no trailing slash)
        const res = await api.get('/sources/projects', {
            params: { category_id: categoryId }
        });
        return res.data;
    },

    async updateCategory(projectId: string, categoryId: string | null): Promise<void> {
        await api.put(`/sources/projects/${projectId}/category`, { category_id: categoryId });
    },

    async delete(id: string): Promise<void> {
        await api.delete(`/sources/projects/${id}`);
    },

    async claim(projectIds: string[]): Promise<void> {
        await api.post('/sources/projects/claim', { project_ids: projectIds });
    },
};

export const authApi = {
    async requestOtp(email: string, type: "login" | "signup"): Promise<void> {
        await api.post('/auth/otp/request', { email, type });
    },

    async verifyOtp(email: string, code: string, fullName?: string, phone?: string, role?: string, consent?: boolean): Promise<{ access_token: string; is_new_user: boolean }> {
        const res = await api.post('/auth/otp/verify', {
            email,
            code,
            full_name: fullName,
            phone_number: phone,
            role,
            accepted_sms_terms: consent
        });
        return res.data;
    },
};

export default api;
