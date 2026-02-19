export const api = {

    get: async (path: string) => {
        const res = await fetch(`/api/${path}`);
        return res.json();
    },

    post: async (path: string, data: any) => {
        const res = await fetch(`/api/${path}`, {
            method: "POST",
            body: JSON.stringify(data),
        });
        return res.json();
    },

    put: async (path: string, data: any) => {
        const res = await fetch(`/api/${path}`, {
            method: "PUT",
            body: JSON.stringify(data),
        });
        return res.json();
    },

    delete: async (path: string) => {
        const res = await fetch(`/api/${path}`, {
            method: "DELETE",
        });
        return res.json();
    },
};
