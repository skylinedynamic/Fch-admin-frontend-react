import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cmsService } from "./services";

export const useBlogs = (params) => {
  return useQuery({
    queryKey: ["blogs", params],
    queryFn: () => cmsService.fetchBlogs(params),
  });
};

export const useBlog = (id) => {
  return useQuery({
    queryKey: ["blog", id],
    queryFn: () => cmsService.fetchBlog(id),
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
    mutationFn: (data) => cmsService.createCategory(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blog-categories"] });
    },
  });
};

export const useUpdateCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => cmsService.updateCategory({ id, data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blog-categories"] });
    },
  });
};

export const useDeleteCategories = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids) => cmsService.deleteCategories(ids),
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
    mutationFn: (data) => cmsService.createTag(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blog-tags"] });
    },
  });
};

export const useUpdateTag = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => cmsService.updateTag({ id, data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blog-tags"] });
    },
  });
};

export const useDeleteTags = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids) => cmsService.deleteTags(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blog-tags"] });
    },
  });
};

export const useSeoSettings = () => {
  return useQuery({
    queryKey: ["seo-settings"],
    queryFn: cmsService.fetchSeoSettings,
  });
};

export const useSeoSetting = (id) => {
  return useQuery({
    queryKey: ["seo-setting", id],
    queryFn: () => cmsService.fetchSeoSetting(id),
    enabled: !!id,
  });
};

export const useSaveBlog = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => cmsService.saveBlog(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blogs"] });
    },
  });
};

export const useDeleteBlogs = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids) => cmsService.deleteBlogs(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blogs"] });
    },
  });
};

export const useSaveSeoSetting = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => cmsService.saveSeoSetting(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seo-settings"] });
    },
  });
};

export const useDeleteSeoSettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids) => cmsService.deleteSeoSettings(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seo-settings"] });
    },
  });
};

export const useSiteSettings = () => {
  return useQuery({
    queryKey: ["site-settings"],
    queryFn: cmsService.fetchSiteSettings,
  });
};

export const useUpdateSiteSettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => cmsService.updateSiteSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["site-settings"] });
    },
  });
};

export const usePublicSiteSettings = () => {
  return useQuery({
    queryKey: ["public-site-settings"],
    queryFn: cmsService.fetchPublicSettings,
  });
};
