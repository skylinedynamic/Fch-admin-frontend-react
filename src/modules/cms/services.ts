import { apiClient } from "../../lib/http/apiClient";

export const cmsService = {
  // Blogs
  fetchBlogs: async (params) => {
    const response = await apiClient.post("/admin/cms/blogs/fetch", params);
    return response.data;
  },
  fetchBlog: async (id) => {
    const response = await apiClient.get(`/admin/cms/blogs/${id}`);
    return response.data;
  },
  saveBlog: async (id, data) => {
    if (id) {
      const response = await apiClient.post(`/admin/cms/blogs/${id}`, data, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data;
    } else {
      const response = await apiClient.post("/admin/cms/blogs", data, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data;
    }
  },
  deleteBlogs: async (ids) => {
    const response = await apiClient.post("/admin/cms/blogs-multiple-delete", { ids });
    return response.data;
  },
  // Categories
  fetchCategories: async () => {
    const response = await apiClient.get("/admin/cms/blog-categories");
    return response.data;
  },
  createCategory: async (data) => {
    const response = await apiClient.post("/admin/cms/blog-categories", data);
    return response.data;
  },
  updateCategory: async ({ id, data }) => {
    const response = await apiClient.post(`/admin/cms/blog-categories/${id}`, data);
    return response.data;
  },
  deleteCategories: async (ids) => {
    const response = await apiClient.post("/admin/cms/blog-categories-multiple-delete", { ids });
    return response.data;
  },

  // Tags
  fetchTags: async () => {
    const response = await apiClient.get("/admin/cms/blog-tags");
    return response.data;
  },
  createTag: async (data) => {
    const response = await apiClient.post("/admin/cms/blog-tags", data);
    return response.data;
  },
  updateTag: async ({ id, data }) => {
    const response = await apiClient.post(`/admin/cms/blog-tags/${id}`, data);
    return response.data;
  },
  deleteTags: async (ids) => {
    const response = await apiClient.post("/admin/cms/blog-tags-multiple-delete", { ids });
    return response.data;
  },

  // SEO
  fetchSeoSettings: async () => {
    const response = await apiClient.get("/admin/cms/seo-settings");
    return response.data;
  },
  fetchSeoSetting: async (id) => {
    const response = await apiClient.get(`/admin/cms/seo-settings/${id}`);
    return response.data;
  },
  saveSeoSetting: async (id, data) => {
    if (id) {
      const response = await apiClient.post(`/admin/cms/seo-settings/${id}`, data, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data;
    } else {
      const response = await apiClient.post("/admin/cms/seo-settings", data, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data;
    }
  },
  deleteSeoSettings: async (ids) => {
    const response = await apiClient.post("/admin/cms/seo-settings-multiple-delete", { ids });
    return response.data;
  },

  // Site Settings
  fetchSiteSettings: async () => {
    const response = await apiClient.get("/admin/cms/site-settings");
    return response.data;
  },
  updateSiteSettings: async (data) => {
    const response = await apiClient.post("/admin/cms/site-settings", data, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },
  fetchPublicSettings: async () => {
    const response = await apiClient.get("/website/settings");
    return response.data;
  },
};
