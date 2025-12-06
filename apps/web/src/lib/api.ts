let apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
if (apiUrl && !apiUrl.startsWith("http")) {
    apiUrl = `https://${apiUrl}`;
}
export const API_BASE = apiUrl;

export interface Category {
    id: string;
    name: string;
    created_at: string;
}

export interface Project {
    id: string;
    title: string;
    description?: string;
    category_id?: string;
    created_at: string;
    updated_at: string;
    source_count: number;
    first_source_id?: string;
    type?: string;
    status?: string;
}

export const categoriesApi = {
    async list(): Promise<Category[]> {
        const res = await fetch(`${API_BASE}/categories/`);
        if (!res.ok) throw new Error("Failed to fetch categories");
        return res.json();
    },

    async create(name: string): Promise<Category> {
        const res = await fetch(`${API_BASE}/categories/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name }),
        });
        if (!res.ok) throw new Error("Failed to create category");
        return res.json();
    },

    async update(id: string, name: string): Promise<Category> {
        const res = await fetch(`${API_BASE}/categories/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name }),
        });
        if (!res.ok) throw new Error("Failed to update category");
        return res.json();
    },

    async delete(id: string): Promise<void> {
        const res = await fetch(`${API_BASE}/categories/${id}`, {
            method: "DELETE",
        });
        if (!res.ok) throw new Error("Failed to delete category");
    },
};

export const projectsApi = {
    async list(categoryId?: string): Promise<Project[]> {
        const url = categoryId
            ? `${API_BASE}/sources/projects/?category_id=${categoryId}`
            : `${API_BASE}/sources/projects/`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to fetch projects");
        return res.json();
    },

    async updateCategory(projectId: string, categoryId: string | null): Promise<void> {
        const res = await fetch(`${API_BASE}/sources/projects/${projectId}/category`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ category_id: categoryId }),
        });
        if (!res.ok) throw new Error("Failed to update project category");
    },

    async delete(id: string): Promise<void> {
        const res = await fetch(`${API_BASE}/sources/projects/${id}`, {
            method: "DELETE",
        });
        if (!res.ok) throw new Error("Failed to delete project");
    },
};
