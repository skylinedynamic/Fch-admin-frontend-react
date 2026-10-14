import { apiClient } from "../../lib/http/apiClient";
import type { SingleApiResponse } from "../application/types";
import type {
  BlogListParams,
  BlogListResponse,
  BlogResponse,
  CategoryPayload,
  CategoryResponse,
  CategoryListResponse,
  TagPayload,
  TagResponse,
  TagListResponse,
  SeoListParams,
  SeoListResponse,
  SeoSetting,
  SeoSettingResponse,
  SiteSetting,
} from "./types";

export const cmsService = {
  // Blogs
  fetchBlogs: async (params?: BlogListParams): Promise<BlogListResponse> => {
    const response = await apiClient.post("/admin/cms/blogs/fetch", params);
    return response.data;
  },
  fetchBlog: async (id: string | number): Promise<BlogResponse> => {
    const response = await apiClient.get(`/admin/cms/blogs/${id}`);
    return response.data;
  },
  saveBlog: async (id: string | number | undefined, data: FormData): Promise<BlogResponse> => {
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
  deleteBlogs: async (ids: number[]): Promise<SingleApiResponse<null>> => {
    const response = await apiClient.post("/admin/cms/blogs-multiple-delete", { ids });
    return response.data;
  },
  // Categories
  fetchCategories: async (): Promise<CategoryListResponse> => {
    const response = await apiClient.get("/admin/cms/blog-categories");
    return response.data;
  },
  createCategory: async (data: CategoryPayload): Promise<CategoryResponse> => {
    const response = await apiClient.post("/admin/cms/blog-categories", data);
    return response.data;
  },
  updateCategory: async ({ id, data }: { id: number; data: CategoryPayload }): Promise<CategoryResponse> => {
    const response = await apiClient.post(`/admin/cms/blog-categories/${id}`, data);
    return response.data;
  },
  deleteCategories: async (ids: number[]): Promise<SingleApiResponse<null>> => {
    const response = await apiClient.post("/admin/cms/blog-categories-multiple-delete", { ids });
    return response.data;
  },

  // Tags
  fetchTags: async (): Promise<TagListResponse> => {
    const response = await apiClient.get("/admin/cms/blog-tags");
    return response.data;
  },
  createTag: async (data: TagPayload): Promise<TagResponse> => {
    const response = await apiClient.post("/admin/cms/blog-tags", data);
    return response.data;
  },
  updateTag: async ({ id, data }: { id: number; data: TagPayload }): Promise<TagResponse> => {
    const response = await apiClient.post(`/admin/cms/blog-tags/${id}`, data);
    return response.data;
  },
  deleteTags: async (ids: number[]): Promise<SingleApiResponse<null>> => {
    const response = await apiClient.post("/admin/cms/blog-tags-multiple-delete", { ids });
    return response.data;
  },

  // SEO
  fetchSeoSettings: async (params?: SeoListParams): Promise<SeoListResponse> => {
    const response = await apiClient.post("/admin/cms/seo-settings", params);
    return response.data;
  },
  fetchAllSeoSettings: async (): Promise<SingleApiResponse<SeoSetting[]>> => {
    const response = await apiClient.get("/admin/cms/seo-settings");
    return response.data;
  },
  fetchSeoSetting: async (id: string | number): Promise<SeoSettingResponse> => {
    const response = await apiClient.get(`/admin/cms/seo-settings/${id}`);
    return response.data;
  },
  saveSeoSetting: async (id: number | undefined, data: FormData): Promise<SeoSettingResponse> => {
    if (id) {
      const response = await apiClient.post(`/admin/cms/seo-settings/${id}`, data, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data;
    } else {
      const response = await apiClient.post("/admin/cms/seo-settings/store", data, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data;
    }
  },
  deleteSeoSettings: async (ids: number[]): Promise<SingleApiResponse<null>> => {
    const response = await apiClient.post("/admin/cms/seo-settings-multiple-delete", { ids });
    return response.data;
  },

  // Site Settings
  fetchSiteSettings: async (): Promise<SingleApiResponse<SiteSetting>> => {
    const response = await apiClient.get("/admin/cms/site-settings");
    return response.data;
  },
  fetchAdminSiteSettings: async (): Promise<SingleApiResponse<SiteSetting>> => {
    const response = await apiClient.get("/admin/cms/site-settings");
    return response.data;
  },
  updateSiteSettings: async (data: FormData): Promise<SingleApiResponse<SiteSetting>> => {
    const response = await apiClient.post("/admin/cms/site-settings", data, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },
  fetchPublicSettings: async (): Promise<SingleApiResponse<SiteSetting>> => {
    const response = await apiClient.get("/website/settings");
    return response.data;
  },
};
