import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type BrandingConfig = {
  // Logos, one per surface they appear on
  logo_sidebar?: string | null;
  logo_sidebar_full_url?: string | null;
  logo_document?: string | null;
  logo_document_full_url?: string | null;
  logo_mail?: string | null;
  logo_mail_full_url?: string | null;
  logo_mobile?: string | null;
  logo_mobile_full_url?: string | null;
  logo_mark?: string | null;
  logo_mark_full_url?: string | null;
  // Superseded names, still served while partners migrate
  logo_on_light?: string | null;
  logo_on_light_full_url?: string | null;
  logo_on_dark?: string | null;
  logo_on_dark_full_url?: string | null;
  // Identity
  site_name?: string | null;
  site_slogan?: string | null;
  is_white_label?: boolean | null;
  // Colours
  primary_color?: string | null;
  secondary_color?: string | null;
  sidebar_bg_color?: string | null;
  sidebar_text_color?: string | null;
  sidebar_icon_color?: string | null;
  sidebar_hover_bg_color?: string | null;
  sidebar_text_hover_color?: string | null;
  sidebar_icon_hover_color?: string | null;
  sidebar_active_bg_color?: string | null;
  sidebar_active_text_color?: string | null;
  sidebar_active_icon_color?: string | null;
  // Top bar — unset keeps the white bar the theme ships with
  topbar_bg_color?: string | null;
  topbar_text_color?: string | null;
  // Legacy names, still served while partners migrate
  primary_logo?: string | null;
  primary_logo_full_url?: string | null;
  secondary_logo?: string | null;
  secondary_logo_full_url?: string | null;
  favicon?: string | null;
  favicon_full_url?: string | null;
};

export type StatusFlags = {
  is_fresh_email?: boolean | null;
  is_fresh_settings?: boolean | null;
  is_fresh_site_settings?: boolean | null;
  is_fresh_payment?: boolean | null;
};

type ConfigState = {
  branding: BrandingConfig | null;
  statusFlags: StatusFlags | null;
  setBranding: (branding: BrandingConfig | null) => void;
  setStatusFlags: (flags: StatusFlags | null) => void;
  setGlobalConfigs: (branding: BrandingConfig | null, flags: StatusFlags | null) => void;
  setPaymentMethodSettings: (isFreshPayment: boolean | null) => void;
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
      setPaymentMethodSettings: (isFreshPayment) =>
        set((state) => ({
          statusFlags: {
            ...state.statusFlags,
            is_fresh_payment: isFreshPayment,
          },
        })),
      clearConfigs: () => set({ branding: null, statusFlags: null }),
    }),
    {
      name: 'app-config-store',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
