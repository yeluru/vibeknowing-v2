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
    timeout: 120000,
    headers: {
        "Content-Type": "application/json",
    },
});

// Add a request interceptor to include auth token + AI provider keys
api.interceptors.request.use(
    (config) => {
        // Auth token
        const token = localStorage.getItem("token");
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        // AI provider keys from browser localStorage
        // Sent on every request; backend uses them only for AI calls
        try {
            const keys = JSON.parse(localStorage.getItem("vk_provider_keys") || "{}");
            const prefs = JSON.parse(localStorage.getItem("vk_ai_prefs") || "{}");

            // Send all configured keys so the backend can pick the right one
            if (keys.openai) config.headers["X-OpenAI-Key"] = keys.openai;
            if (keys.anthropic) config.headers["X-Anthropic-Key"] = keys.anthropic;
            if (keys.google) config.headers["X-Google-Key"] = keys.google;

            // Send preferred provider
            if (prefs.defaultProvider) {
                config.headers["X-AI-Provider"] = prefs.defaultProvider;
            }

            // Send task-specific model overrides as JSON
            if (prefs.taskModels && Object.keys(prefs.taskModels).length > 0) {
                config.headers["X-AI-Task-Models"] = JSON.stringify(prefs.taskModels);
            }
        } catch (e) {
            // localStorage not available or parse error, skip
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
    sources?: {
        id: string;
        title: string;
        type: string;
        created_at: string;
        has_content?: boolean;
    }[];
    first_source_id?: string;
    first_source_url?: string;
    first_source_preview?: string;
    type?: string;
    status?: string;
}

export const categoriesApi = {
    async list(): Promise<Category[]> {
        const res = await api.get('/categories/');
        return res.data;
    },

    async get(id: string): Promise<Category> {
        const res = await api.get(`/categories/${id}`);
        return res.data;
    },

    async create(name: string): Promise<Category> {
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

    async create(title: string): Promise<Project> {
        const res = await api.post('/sources/projects/', { title });
        return res.data;
    },
};

export const curriculumApi = {
    getProject: (projectId: string) => api.get(`/ai/curriculum/${projectId}`).then(res => res.data),
    getPath: (categoryId: string) => api.get(`/ai/curriculum/path/${categoryId}`).then(res => res.data),
    generate: (projectId: string) => api.post(`/ai/curriculum?project_id=${projectId}`).then(res => res.data),
    generatePath: (categoryId: string, params: { reset?: boolean } = {}) => 
        api.post(`/ai/curriculum/path/${categoryId}`, params).then(res => res.data),
    
    // Global Missions
    listMissions: () => api.get('/ai/curriculum/missions').then(res => res.data),
    getMission: (missionId: string) => api.get(`/ai/curriculum/mission/${missionId}`).then(res => res.data),
    createMission: (params: { vision?: string; job_description?: string; theme?: string; reset?: boolean }) => 
        api.post('/ai/curriculum/mission', params).then(res => res.data),
    deleteMission: (missionId: string) => api.delete(`/ai/curriculum/mission/${missionId}`).then(res => res.data),

    generateLesson: (nodeId: string) => api.post(`/ai/curriculum/node/${nodeId}/lesson`).then(res => res.data),
    scoutNode: (nodeId: string, deep: boolean = false) => api.post(`/ai/curriculum/node/${nodeId}/scout`, { deep_scan: deep }).then(res => res.data),
    masterNode: (nodeId: string) => api.post(`/ai/curriculum/node/${nodeId}/master`).then(res => res.data),
};

export const ScoutService = {
    // Legacy mapping if needed
    scoutNode: curriculumApi.scoutNode
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

/**
 * Builds the AI provider headers from localStorage.
 * Use this in any fetch() call that hits an /ai/* endpoint,
 * so they respect the user's provider/key settings just like axios does.
 */
export function buildAIHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};
    try {
        const token = localStorage.getItem("token");
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const keys = JSON.parse(localStorage.getItem("vk_provider_keys") || "{}");
        const prefs = JSON.parse(localStorage.getItem("vk_ai_prefs") || "{}");

        if (keys.openai) headers["X-OpenAI-Key"] = keys.openai;
        if (keys.anthropic) headers["X-Anthropic-Key"] = keys.anthropic;
        if (keys.google) headers["X-Google-Key"] = keys.google;
        if (prefs.defaultProvider) headers["X-AI-Provider"] = prefs.defaultProvider;
        if (prefs.taskModels && Object.keys(prefs.taskModels).length > 0) {
            headers["X-AI-Task-Models"] = JSON.stringify(prefs.taskModels);
        }
    } catch (e) {
        // localStorage not available, skip
    }
    return headers;
}

export default api;
