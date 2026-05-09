"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";

interface BrandingData {
  logoUrl: string | null;
  companyName: string | null;
}

const DEFAULT_LOGO = null;
const DEFAULT_COMPANY_NAME = "Control.IA";

export function useBranding(): BrandingData & { loading: boolean } {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBranding() {
      try {
        // Buscar configurações de branding do endpoint (público, não requer auth)
        // O api-client já extrai o data do formato padronizado {ok: true, data: {...}}
        const data = await api<{ logo_url?: string | null; company_name?: string | null }>("/api/v1/config/empresa");
        
        // data já é o conteúdo extraído do response.data
        setLogoUrl(data?.logo_url || DEFAULT_LOGO);
        setCompanyName(data?.company_name || DEFAULT_COMPANY_NAME);
      } catch (e) {
        setLogoUrl(DEFAULT_LOGO);
        setCompanyName(DEFAULT_COMPANY_NAME);
      } finally {
        setLoading(false);
      }
    }
    fetchBranding();
  }, []);

  return {
    logoUrl,
    companyName,
    loading,
  };
}

