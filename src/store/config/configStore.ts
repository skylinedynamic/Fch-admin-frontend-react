import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type BrandingConfig = {
  site_name?: string | null;
  site_slogan?: string | null;
  copyright_text?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
  meta_title?: string | null;
  header_logo?: string | null;
  footer_logo?: string | null;
  primary_logo?: string | null;
  secondary_logo?: string | null;
  favicon?: string | null;
  website_favicon?: string | null;
  is_white_label?: boolean;
};

export type StatusFlags = {
  is_fresh_email?: boolean | null;
  is_fresh_settings?: boolean | null;
  is_fresh_site_settings?: boolean | null;
};

type ConfigState = {
  branding: BrandingConfig | null;
  statusFlags: StatusFlags | null;
  setBranding: (branding: BrandingConfig | null) => void;
  setStatusFlags: (flags: StatusFlags | null) => void;
  setGlobalConfigs: (branding: BrandingConfig | null, flags: StatusFlags | null) => void;
  clearConfigs: () => void;
};

export const useConfigStore = create<ConfigState>()(
  persist(
    (set) => ({
      branding: null,
      statusFlags: null,
      setBranding: (branding) => set({ branding }),
      setStatusFlags: (flags) => set({ statusFlags: flags }),
      setGlobalConfigs: (branding, flags) => set({ branding, statusFlags: flags }),
      clearConfigs: () => set({ branding: null, statusFlags: null }),
    }),
    {
      name: 'app-config-store',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
