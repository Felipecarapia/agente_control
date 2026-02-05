"use client";

import {
  Phone,
  Mail,
  MapPin,
  Instagram,
  Linkedin,
  Youtube,
  MessageCircle,
  Building2,
} from "lucide-react";

interface Data {
  logo_url?: string;
  nome_empresa?: string;
  slogan?: string;
  telefone?: string;
  email?: string;
  whatsapp?: string;
  endereco?: string;
  cnpj?: string;
  instagram?: string;
  linkedin?: string;
  youtube?: string;
  cor?: string;
  bg_cor?: string;
}

const COLOR_CLASSES: Record<string, { text: string; hover: string; bg: string }> = {
  cyan: {
    text: "text-cyan-400",
    hover: "hover:text-cyan-400",
    bg: "bg-cyan-500",
  },
  green: {
    text: "text-green-400",
    hover: "hover:text-green-400",
    bg: "bg-green-500",
  },
  blue: {
    text: "text-blue-400",
    hover: "hover:text-blue-400",
    bg: "bg-blue-500",
  },
  purple: {
    text: "text-purple-400",
    hover: "hover:text-purple-400",
    bg: "bg-purple-500",
  },
  orange: {
    text: "text-orange-400",
    hover: "hover:text-orange-400",
    bg: "bg-orange-500",
  },
  pink: {
    text: "text-pink-400",
    hover: "hover:text-pink-400",
    bg: "bg-pink-500",
  },
};

const BG_CLASSES: Record<string, string> = {
  escuro: "bg-slate-950",
  claro: "bg-slate-100",
};

export function RodapeSection({ data }: { data: Data }) {
  const {
    logo_url = "",
    nome_empresa = "Sua Empresa",
    slogan = "",
    telefone = "",
    email = "",
    whatsapp = "",
    endereco = "",
    cnpj = "",
    instagram = "",
    linkedin = "",
    youtube = "",
    cor = "cyan",
    bg_cor = "escuro",
  } = data;

  const colorClasses = COLOR_CLASSES[cor] || COLOR_CLASSES.cyan;
  const bgClass = BG_CLASSES[bg_cor] || BG_CLASSES.escuro;
  const isDark = bg_cor === "escuro";

  const whatsappLink = whatsapp
    ? `https://wa.me/${whatsapp.replace(/\D/g, "")}`
    : "";

  return (
    <footer className={`${bgClass} ${isDark ? "text-white" : "text-slate-900"}`}>
      {/* Main Footer */}
      <div className="container mx-auto px-4 max-w-6xl py-16">
        <div className="grid md:grid-cols-3 gap-12">
          {/* Coluna 1: Logo e Sobre */}
          <div className="space-y-6">
            {logo_url ? (
              <img
                src={logo_url}
                alt={nome_empresa}
                className="h-12 object-contain"
              />
            ) : (
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg ${colorClasses.bg} flex items-center justify-center`}>
                  <Building2 className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-bold">{nome_empresa}</span>
              </div>
            )}
            {slogan && (
              <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                {slogan}
              </p>
            )}
            
            {/* Redes Sociais */}
            <div className="flex gap-4">
              {instagram && (
                <a
                  href={instagram.startsWith("http") ? instagram : `https://instagram.com/${instagram.replace("@", "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`w-10 h-10 rounded-full ${isDark ? "bg-white/10 hover:bg-white/20" : "bg-slate-200 hover:bg-slate-300"} flex items-center justify-center transition-colors ${colorClasses.hover}`}
                  aria-label="Instagram"
                >
                  <Instagram className="w-5 h-5" />
                </a>
              )}
              {linkedin && (
                <a
                  href={linkedin.startsWith("http") ? linkedin : `https://linkedin.com/company/${linkedin}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`w-10 h-10 rounded-full ${isDark ? "bg-white/10 hover:bg-white/20" : "bg-slate-200 hover:bg-slate-300"} flex items-center justify-center transition-colors ${colorClasses.hover}`}
                  aria-label="LinkedIn"
                >
                  <Linkedin className="w-5 h-5" />
                </a>
              )}
              {youtube && (
                <a
                  href={youtube.startsWith("http") ? youtube : `https://youtube.com/${youtube}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`w-10 h-10 rounded-full ${isDark ? "bg-white/10 hover:bg-white/20" : "bg-slate-200 hover:bg-slate-300"} flex items-center justify-center transition-colors ${colorClasses.hover}`}
                  aria-label="YouTube"
                >
                  <Youtube className="w-5 h-5" />
                </a>
              )}
            </div>
          </div>

          {/* Coluna 2: Contato */}
          <div className="space-y-6">
            <h3 className={`text-lg font-semibold ${colorClasses.text}`}>Contato</h3>
            <div className="space-y-4">
              {telefone && (
                <a
                  href={`tel:${telefone.replace(/\D/g, "")}`}
                  className={`flex items-center gap-3 text-sm ${isDark ? "text-slate-300 hover:text-white" : "text-slate-600 hover:text-slate-900"} transition-colors`}
                >
                  <Phone className="w-5 h-5 shrink-0" />
                  {telefone}
                </a>
              )}
              {email && (
                <a
                  href={`mailto:${email}`}
                  className={`flex items-center gap-3 text-sm ${isDark ? "text-slate-300 hover:text-white" : "text-slate-600 hover:text-slate-900"} transition-colors`}
                >
                  <Mail className="w-5 h-5 shrink-0" />
                  {email}
                </a>
              )}
              {whatsapp && (
                <a
                  href={whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-cta="rodape-whatsapp"
                  className={`flex items-center gap-3 text-sm ${isDark ? "text-slate-300 hover:text-white" : "text-slate-600 hover:text-slate-900"} transition-colors`}
                >
                  <MessageCircle className="w-5 h-5 shrink-0" />
                  WhatsApp
                </a>
              )}
              {endereco && (
                <div className={`flex items-start gap-3 text-sm ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                  <MapPin className="w-5 h-5 shrink-0 mt-0.5" />
                  {endereco}
                </div>
              )}
            </div>
          </div>

          {/* Coluna 3: CTA WhatsApp */}
          <div className="space-y-6">
            <h3 className={`text-lg font-semibold ${colorClasses.text}`}>Fale Conosco</h3>
            <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-600"}`}>
              Tire suas dúvidas ou solicite um orçamento. Estamos prontos para ajudar.
            </p>
            {whatsapp && (
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                data-cta="rodape-whatsapp-cta"
                className={`inline-flex items-center gap-2 px-6 py-3 ${colorClasses.bg} text-white font-semibold rounded-lg hover:opacity-90 transition-opacity`}
              >
                <MessageCircle className="w-5 h-5" />
                Iniciar Conversa
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Copyright Bar */}
      <div className={`border-t ${isDark ? "border-white/10" : "border-slate-200"}`}>
        <div className="container mx-auto px-4 max-w-6xl py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm">
            <div className={isDark ? "text-slate-500" : "text-slate-500"}>
              © {new Date().getFullYear()} {nome_empresa}. Todos os direitos reservados.
            </div>
            {cnpj && (
              <div className={isDark ? "text-slate-500" : "text-slate-500"}>
                CNPJ: {cnpj}
              </div>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
