import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cmsService } from "./services";
import type { BlogListParams, CategoryPayload, TagPayload, SeoListParams } from "./types";

export const useBlogs = (params?: BlogListParams) => {
  return useQuery({
    queryKey: ["blogs", params],
    queryFn: () => cmsService.fetchBlogs(params),
  });
};

export const useBlog = (id: string | number | undefined) => {
  return useQuery({
    queryKey: ["blog", id],
    queryFn: () => cmsService.fetchBlog(id!),
    enabled: !!id,
  });
};

export const useCategories = () => {
  return useQuery({
    queryKey: ["blog-categories"],
    queryFn: cmsService.fetchCategories,
  });
};

export const useCreateCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CategoryPayload) => cmsService.createCategory(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blog-categories"] });
    },
  });
};

export const useUpdateCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: CategoryPayload }) => cmsService.updateCategory({ id, data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blog-categories"] });
    },
  });
};

export const useDeleteCategories = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: number[]) => cmsService.deleteCategories(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blog-categories"] });
    },
  });
};

export const useTags = () => {
  return useQuery({
    queryKey: ["blog-tags"],
    queryFn: cmsService.fetchTags,
  });
};

export const useCreateTag = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: TagPayload) => cmsService.createTag(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blog-tags"] });
    },
  });
};

export const useUpdateTag = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: TagPayload }) => cmsService.updateTag({ id, data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blog-tags"] });
    },
  });
};

export const useDeleteTags = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: number[]) => cmsService.deleteTags(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blog-tags"] });
    },
  });
};

export const useSeoSettings = (params?: SeoListParams) => {
  return useQuery({
    queryKey: ["seo-settings", params],
    queryFn: () => cmsService.fetchSeoSettings(params),
  });
};

export const useSeoSetting = (id: string | number | undefined) => {
  return useQuery({
    queryKey: ["seo-setting", id],
    queryFn: () => cmsService.fetchSeoSetting(id!),
    enabled: !!id,
  });
};

export const useSaveBlog = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string | number | undefined; data: FormData }) => cmsService.saveBlog(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blogs"] });
    },
  });
};

export const useDeleteBlogs = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: number[]) => cmsService.deleteBlogs(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blogs"] });
    },
  });
};

export const useSaveSeoSetting = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number | undefined; data: FormData }) => cmsService.saveSeoSetting(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seo-settings"] });
    },
  });
};

export const useDeleteSeoSettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: number[]) => cmsService.deleteSeoSettings(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seo-settings"] });
    },
  });
};

export const useSiteSettings = () => {
  return useQuery({
    queryKey: ["admin-site-settings"],
    queryFn: cmsService.fetchAdminSiteSettings,
  });
};

export const useUpdateSiteSettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: FormData) => cmsService.updateSiteSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-site-settings"] });
    },
  });
};

export const usePublicSiteSettings = () => {
  return useQuery({
    queryKey: ["public-site-settings"],
    queryFn: cmsService.fetchPublicSettings,
  });
};
