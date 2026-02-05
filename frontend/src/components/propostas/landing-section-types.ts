export type SectionType =
  | "hero"
  | "beneficios"
  | "oferta"
  | "depoimentos"
  | "faq"
  | "cta"
  | "video"
  | "para_quem"
  | "quem_somos"
  | "sobre_projeto"
  | "servicos_valores"
  | "nossos_clientes"
  | "cases_sucesso"
  | "dores_cliente"
  | "produtos_alternados"
  | "time"
  | "garantia"
  | "proximos_passos"
  | "resumo_proposta"
  | "diferenciais"
  | "rodape";

export interface LandingSection {
  id: string;
  type: SectionType;
  data: Record<string, unknown>;
}

export const SECTION_TYPE_LABELS: Record<SectionType, string> = {
  hero: "Hero",
  beneficios: "Benefícios",
  oferta: "Oferta",
  depoimentos: "Depoimentos",
  faq: "FAQ",
  cta: "CTA",
  video: "Vídeo",
  para_quem: "Para quem é",
  quem_somos: "Quem Somos",
  sobre_projeto: "Sobre o Projeto",
  servicos_valores: "Serviços e Valores",
  nossos_clientes: "Nossos Clientes",
  cases_sucesso: "Cases de Sucesso",
  dores_cliente: "Dores do Cliente",
  produtos_alternados: "Produtos / Soluções",
  time: "Time",
  garantia: "Garantia",
  proximos_passos: "Próximos Passos",
  resumo_proposta: "Resumo da Proposta",
  diferenciais: "Diferenciais",
  rodape: "Rodapé / Contato",
};

export function defaultSectionData(type: SectionType): Record<string, unknown> {
  switch (type) {
    case "hero":
      return {
        logo_url: "",
        headline: "",
        headline_highlight: "",
        subheadline: "",
        subheadline_highlight: "",
        cta_text: "",
        cta_url: "",
        background_image_url: "",
        cor_texto: "white",
        cor_destaque: "cyan",
      };
    case "beneficios":
      return { titulo: "", items: [{ titulo: "", descricao: "", icon: "" }] };
    case "oferta":
      return {
        titulo: "",
        valor: "",
        parcelas: "",
        garantia: "",
        cta_text: "",
        destaques: [""],
      };
    case "depoimentos":
      return {
        titulo: "",
        items: [{ nome: "", texto: "", role: "", avatar_url: "" }],
      };
    case "faq":
      return { titulo: "", titulo_highlight: "", items: [{ pergunta: "", resposta: "" }] };
    case "cta":
      return {
        headline: "",
        subheadline: "",
        cta_text: "",
        cta_url: "",
      };
    case "video":
      return {
        titulo: "",
        titulo_highlight: "",
        video_url: "",
        thumbnail_url: "",
        cta_text: "",
        cta_url: "",
      };
    case "para_quem":
      return {
        titulo: "",
        titulo_highlight: "",
        items: [
          { titulo: "", descricao: "", image_url: "" },
          { titulo: "", descricao: "", image_url: "" },
          { titulo: "", descricao: "", image_url: "" },
        ],
      };
    case "quem_somos":
      return {
        titulo: "Quem Somos",
        titulo_highlight: "Somos",
        conteudo: "",
        logo_url: "",
        image_url: "",
        background_image_url: "",
        cor: "cyan",
        bg_cor: "escuro",
        badges: [],
      };
    case "sobre_projeto":
      return { titulo: "", titulo_highlight: "", conteudo: "" };
    case "servicos_valores":
      return {
        titulo: "",
        titulo_highlight: "",
        valor_total: "",
        cor: "cyan",
        bg_cor: "escuro",
        items: [{ titulo: "", descricao: "", valor: "" }],
      };
    case "nossos_clientes":
      return { titulo: "", titulo_highlight: "", cor: "cyan", items: [{ logo_url: "", nome: "" }] };
    case "cases_sucesso":
      return {
        titulo: "",
        titulo_highlight: "",
        cor: "cyan",
        items: [{ titulo: "", descricao: "", image_url: "", cliente: "" }],
      };
    case "dores_cliente":
      return {
        titulo: "Você está passando por isso?",
        titulo_highlight: "passando por isso",
        subtitulo: "Sabemos como é difícil lidar com esses desafios no dia a dia",
        cor: "green",
        items: [
          { titulo: "Processos manuais", descricao: "Horas perdidas com tarefas repetitivas", icone: "clock" },
          { titulo: "Falta de controle", descricao: "Dificuldade em acompanhar projetos", icone: "eye-off" },
          { titulo: "Dados espalhados", descricao: "Informações em sistemas que não se comunicam", icone: "folders" },
          { titulo: "Retrabalho constante", descricao: "Erros que poderiam ser evitados", icone: "repeat" },
          { titulo: "Decisões no escuro", descricao: "Falta de relatórios e métricas claras", icone: "bar-chart" },
          { titulo: "Comunicação falha", descricao: "Informações perdidas entre equipes", icone: "message-x" },
        ],
      };
    case "produtos_alternados":
      return {
        titulo: "Conheça Nossa Solução",
        titulo_highlight: "Solução",
        subtitulo: "Tudo que você precisa para transformar seu negócio",
        cor: "cyan",
        bg_tipo: "cor",
        bg_cor: "claro",
        bg_image_url: "",
        items: [
          {
            titulo: "Agente de Atendimento IA",
            descricao: "Atendimento automático 24/7 com linguagem natural. Responde dúvidas, qualifica leads e encaminha para o time comercial quando necessário.",
            image_url: "",
            features: ["Atendimento 24/7", "Linguagem natural", "Qualificação de leads"],
          },
          {
            titulo: "Dashboard Completo",
            descricao: "Visualize métricas, atendimentos e performance em tempo real. Acompanhe tudo em um só lugar com gráficos e indicadores claros.",
            image_url: "",
            features: ["Métricas em tempo real", "Gráficos interativos", "Exportação de dados"],
          },
          {
            titulo: "Integração com Vendas",
            descricao: "Conecte com seu CRM, ERP e sistemas existentes. Sincronize dados automaticamente e mantenha tudo atualizado.",
            image_url: "",
            features: ["CRM e ERP", "Sincronização automática", "APIs abertas"],
          },
        ],
      };
    case "time":
      return {
        titulo: "Nosso Time",
        titulo_highlight: "Time",
        subtitulo: "Especialistas focados em resultado e execução.",
        cor: "cyan",
        bg_tipo: "cor",
        bg_cor: "claro",
        bg_image_url: "",
        items: [
          { nome: "Nome Sobrenome", instagram: "@nomedeusuario", funcao: "CEO / Founder", foto_url: "" },
          { nome: "Nome Sobrenome", instagram: "@nomedeusuario", funcao: "Head Comercial", foto_url: "" },
          { nome: "Nome Sobrenome", instagram: "@nomedeusuario", funcao: "Sucesso do Cliente", foto_url: "" },
        ],
      };
    case "garantia":
      return {
        titulo: "Compromisso com a entrega",
        titulo_highlight: "entrega",
        subtitulo:
          "Seu projeto entregue funcionando, com suporte técnico e ajustes garantidos por 30 dias após a implantação.",
        prazo_dias: 30,
        selo_titulo: "Garantia de funcionamento",
        selo_subtitulo: "30 dias de suporte",
        texto:
          "Desenvolvemos soluções de software e automação com agentes de IA sob medida. Nosso compromisso vai além do código: garantimos que tudo funcione no seu ambiente, com acompanhamento dedicado na implantação.",
        itens: [
          "Correções de bugs sem custo adicional no período de garantia",
          "Suporte técnico prioritário via chat e call",
          "Treinamento da equipe para operar a solução",
          "Documentação completa do sistema entregue",
          "Ajustes finos de comportamento do agente de IA",
        ],
        cor: "green",
        bg_tipo: "cor",
        bg_cor: "escuro",
        bg_image_url: "",
        cta_texto: "Solicitar proposta",
        cta_url: "#contato",
      };
    case "proximos_passos":
      return {
        titulo: "Próximos Passos",
        titulo_highlight: "Passos",
        subtitulo: "Veja como é simples começar a transformar seu negócio",
        cor: "cyan",
        bg_tipo: "cor",
        bg_cor: "escuro",
        bg_image_url: "",
        passos: [
          {
            numero: 1,
            titulo: "Proposta Aprovada",
            descricao: "Assinatura do contrato e alinhamento de escopo",
            icone: "file-check",
          },
          {
            numero: 2,
            titulo: "Kickoff do Projeto",
            descricao: "Reunião inicial para entender seu negócio em detalhes",
            icone: "rocket",
          },
          {
            numero: 3,
            titulo: "Desenvolvimento",
            descricao: "Construção da solução com entregas incrementais",
            icone: "code",
          },
          {
            numero: 4,
            titulo: "Entrega e Treinamento",
            descricao: "Implantação, testes e capacitação da equipe",
            icone: "graduation-cap",
          },
        ],
      };
    case "resumo_proposta":
      return {
        titulo: "Resumo da Proposta",
        titulo_highlight: "Proposta",
        valor_total: "R$ 15.000",
        parcelas: "ou 3x de R$ 5.000",
        prazo_entrega: "30 dias",
        cor: "cyan",
        bg_tipo: "cor",
        bg_cor: "escuro",
        bg_image_url: "",
        itens_inclusos: [
          "Desenvolvimento completo da solução",
          "Integração com sistemas existentes",
          "Treinamento da equipe",
          "30 dias de suporte pós-entrega",
          "Documentação técnica",
        ],
        cta_texto: "Aprovar Proposta",
        cta_url: "#contato",
      };
    case "diferenciais":
      return {
        titulo: "Por Que Nos Escolher?",
        titulo_highlight: "Escolher",
        subtitulo: "Conheça os diferenciais que fazem a diferença no seu projeto",
        cor: "cyan",
        bg_tipo: "cor",
        bg_cor: "claro",
        bg_image_url: "",
        items: [
          {
            icone: "award",
            titulo: "+10 anos",
            subtitulo: "de experiência no mercado",
          },
          {
            icone: "check-circle",
            titulo: "+150 projetos",
            subtitulo: "entregues com sucesso",
          },
          {
            icone: "headphones",
            titulo: "Suporte dedicado",
            subtitulo: "atendimento humanizado",
          },
          {
            icone: "zap",
            titulo: "Tecnologia de ponta",
            subtitulo: "IA e automação avançada",
          },
        ],
      };
    case "rodape":
      return {
        logo_url: "",
        nome_empresa: "Sua Empresa",
        slogan: "Transformando negócios com tecnologia",
        telefone: "(11) 99999-9999",
        email: "contato@suaempresa.com",
        whatsapp: "5511999999999",
        endereco: "São Paulo, SP - Brasil",
        cnpj: "00.000.000/0001-00",
        instagram: "",
        linkedin: "",
        youtube: "",
        cor: "cyan",
        bg_cor: "escuro",
      };
    default:
      return {};
  }
}

export function sectionPreview(section: LandingSection): string {
  const d = section.data as Record<string, unknown>;
  switch (section.type) {
    case "hero":
      return (d.headline as string) || "Hero";
    case "beneficios":
      return (d.titulo as string) || "Benefícios";
    case "oferta":
      return (d.titulo as string) || "Oferta";
    case "depoimentos":
      return (d.titulo as string) || "Depoimentos";
    case "faq":
      return (d.titulo as string) || "FAQ";
    case "cta":
      return (d.headline as string) || "CTA";
    case "video":
      return (d.titulo as string) || (d.video_url as string) || "Vídeo";
    case "para_quem":
      return (d.titulo as string) || "Para quem é";
    case "quem_somos":
      return (d.titulo as string) || "Quem Somos";
    case "sobre_projeto":
      return (d.titulo as string) || "Sobre o Projeto";
    case "servicos_valores":
      return (d.titulo as string) || "Serviços e Valores";
    case "nossos_clientes":
      return (d.titulo as string) || "Nossos Clientes";
    case "cases_sucesso":
      return (d.titulo as string) || "Cases de Sucesso";
    case "dores_cliente":
      return (d.titulo as string) || "Dores do Cliente";
    case "produtos_alternados":
      return (d.titulo as string) || "Produtos / Soluções";
    case "time":
      return (d.titulo as string) || "Time";
    case "garantia":
      return (d.titulo as string) || "Garantia";
    case "proximos_passos":
      return (d.titulo as string) || "Próximos Passos";
    case "resumo_proposta":
      return (d.titulo as string) || "Resumo da Proposta";
    case "diferenciais":
      return (d.titulo as string) || "Diferenciais";
    case "rodape":
      return (d.nome_empresa as string) || "Rodapé";
    default:
      return section.type;
  }
}
