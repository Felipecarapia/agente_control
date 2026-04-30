"""
Script para popular a proposta do Dr. André Felipe com conteúdo completo
Projeto: Sistema Completo de Lançamento e Venda de Curso
"""
import json
import uuid
import psycopg2
import sys

sys.stdout.reconfigure(encoding="utf-8")

DB_CONFIG = {
    "host": "78.142.242.97",
    "port": 5432,
    "database": "sistemaxi-crm",
    "user": "fortis",
    "password": "Fortis2107",
}

from psycopg2.extras import Json

LANDING_CONTENT = [

    # ══════════════════════════════════════════════════════════════════
    # [1] HERO PRINCIPAL
    # ══════════════════════════════════════════════════════════════════
    {
        "id": str(uuid.uuid4()),
        "type": "hero",
        "data": {
            "logo_url": "",
            "headline": "Seu curso no ar.",
            "headline_highlight": "no ar.",
            "subheadline": "Estrutura completa de lançamento — da página de vendas à plataforma publicada, passando por copy, identidade visual, checkout e entrega final.",
            "subheadline_highlight": "entrega final.",
            "cta_text": "Aprovar proposta",
            "cta_url": "https://wa.me/{{WHATSAPP}}",
            "background_image_url": "",
            "cor_texto": "white",
            "cor_destaque": "gold",
            "proposta_numero": "001/2025",
            "responsavel": "{{AGENCY_NAME}}",
            "telefone": "{{WHATSAPP}}",
            "cliente": "Dr. André Felipe",
        },
    },

    # ══════════════════════════════════════════════════════════════════
    # [2] HERO PROPOSTA — RESUMO EXECUTIVO
    # ══════════════════════════════════════════════════════════════════
    {
        "id": str(uuid.uuid4()),
        "type": "resumo_proposta",
        "data": {
            "titulo": "Resumo da Proposta",
            "titulo_highlight": "Proposta",
            "valor_total": "{{PRICE}}",
            "parcelas": "{{PAYMENT_TERMS}}",
            "prazo_entrega": "{{TIMELINE}}",
            "cor": "cyan",
            "bg_tipo": "cor",
            "bg_cor": "escuro",
            "bg_image_url": "",
            "itens_inclusos": [
                "Landing page de vendas completa (copy + design + publicação)",
                "Copywriting estratégico da página",
                "Estruturação de módulos e aulas do curso",
                "Edição profissional das aulas em vídeo",
                "Identidade visual do curso (capas, módulos, padrão visual)",
                "Configuração completa da plataforma EAD",
                "Checkout integrado + testes de fluxo",
                "Entrega final publicada e 100% operacional",
            ],
            "cta_texto": "Aprovar agora pelo WhatsApp",
            "cta_url": "https://wa.me/{{WHATSAPP}}",
        },
    },

    # ══════════════════════════════════════════════════════════════════
    # [3] VÍDEO — O MÉTODO
    # ══════════════════════════════════════════════════════════════════
    {
        "id": str(uuid.uuid4()),
        "type": "video",
        "data": {
            "titulo": "Como funciona o processo",
            "titulo_highlight": "processo",
            "video_url": "",
            "thumbnail_url": "",
            "cta_text": "Falar com a equipe",
            "cta_url": "https://wa.me/{{WHATSAPP}}",
            "subtitulo": "Em 60 segundos: como transformamos o seu conhecimento em um curso publicado, com estrutura pronta para vender.",
            "bullets": [
                "Como mapeamos o conteúdo do curso a partir do que você já sabe",
                "O fluxo de produção: copy → design → plataforma → checkout",
                "Por que a landing page vem antes da plataforma (e por que isso importa)",
                "O que o Dr. André precisa entregar — e o que a equipe resolve",
                "Como garantimos que tudo está pronto antes da entrega final",
                "Cronograma real: sem promessa de prazo irreal, com processo claro",
            ],
        },
    },

    # ══════════════════════════════════════════════════════════════════
    # [4] SOBRE O PROJETO — VISÃO GERAL
    # ══════════════════════════════════════════════════════════════════
    {
        "id": str(uuid.uuid4()),
        "type": "sobre_projeto",
        "data": {
            "titulo": "O que será construído",
            "titulo_highlight": "construído",
            "conteudo": "**Dr. André Felipe** tem conhecimento, autoridade e audiência. O que falta é estrutura.\n\nEsta proposta entrega um sistema completo e funcionando: da página de vendas ao checkout ativo, passando pela identidade visual do curso, edição das aulas e configuração da plataforma.\n\nNão é consultoria. É execução. Ao final do prazo acordado, o Dr. André terá um curso publicado, com página de vendas no ar, checkout operacional e estrutura pronta para receber alunos.\n\n**O que conduz o processo:**\n- Planejamento editorial do curso (módulos, aulas, sequência lógica)\n- Copywriting da página de vendas com linguagem médica/educacional\n- Identidade visual profissional aplicada na plataforma\n- Integração técnica completa (LP → checkout → plataforma)\n- Revisão e aceite em cada entrega antes de avançar\n\n*Pré-requisito: o Dr. André precisa ter as aulas gravadas (ou iniciar a gravação durante o processo) para que a edição e publicação sejam possíveis.*",
        },
    },

    # ══════════════════════════════════════════════════════════════════
    # [5] SERVIÇOS E VALORES — INVESTIMENTO + ESCOPO
    # ══════════════════════════════════════════════════════════════════
    {
        "id": str(uuid.uuid4()),
        "type": "servicos_valores",
        "data": {
            "titulo": "Investimento e escopo",
            "titulo_highlight": "escopo",
            "valor_total": "{{PRICE}}",
            "cor": "cyan",
            "bg_cor": "escuro",
            "items": [
                {
                    "titulo": "Landing page de vendas",
                    "descricao": "Página completa com todos os blocos de conversão, copy, layout e publicação no domínio.",
                    "valor": "Incluso",
                },
                {
                    "titulo": "Copywriting estratégico",
                    "descricao": "Texto completo da página: headline, método, estrutura do curso, CTAs e objeções.",
                    "valor": "Incluso",
                },
                {
                    "titulo": "Estruturação do curso",
                    "descricao": "Mapeamento de módulos, aulas, sequência lógica e nomeação para EAD.",
                    "valor": "Incluso",
                },
                {
                    "titulo": "Edição das aulas",
                    "descricao": "Edição profissional dos vídeos: cortes, abertura/encerramento, export adequado.",
                    "valor": "Incluso",
                },
                {
                    "titulo": "Identidade visual do curso",
                    "descricao": "Capa do curso + capas de módulos/aulas + padrão visual aplicado na plataforma.",
                    "valor": "Incluso",
                },
                {
                    "titulo": "Configuração da plataforma",
                    "descricao": "Curso organizado, upload, capas aplicadas, acesso configurado.",
                    "valor": "Incluso",
                },
                {
                    "titulo": "Checkout + integração",
                    "descricao": "Checkout criado, campos configurados, integrado com a LP, fluxo testado.",
                    "valor": "Incluso",
                },
                {
                    "titulo": "Entrega final publicada",
                    "descricao": "LP no ar + curso publicado + checkout ativo. Estrutura pronta para vendas.",
                    "valor": "Incluso",
                },
            ],
        },
    },

    # ══════════════════════════════════════════════════════════════════
    # [6] MAPEAMENTO COMPLETO — DOBRAS DO ESCOPO (cards numerados)
    # ══════════════════════════════════════════════════════════════════
    {
        "id": str(uuid.uuid4()),
        "type": "produtos_alternados",
        "data": {
            "titulo": "O que entregamos, dobra por dobra",
            "titulo_highlight": "dobra por dobra",
            "subtitulo": "Cada entregável tem escopo claro, critério de aceite definido e responsável designado. Nada fica no ar.",
            "cor": "cyan",
            "bg_tipo": "cor",
            "bg_cor": "claro",
            "bg_image_url": "",
            "items": [
                {
                    "titulo": "3ª Dobra — Landing Page de Vendas",
                    "descricao": "Página de vendas completa com todos os blocos estruturais: headline, subheadline, apresentação do Dr. André, estrutura do curso, módulos/aulas, provas sociais e CTAs. Texto final. Formatação. Publicação no domínio. Integração com checkout.",
                    "image_url": "",
                    "features": [
                        "Todos os blocos de conversão estruturados",
                        "Copy completa e revisada",
                        "Design aplicado e publicado",
                        "Integrada ao checkout",
                    ],
                },
                {
                    "titulo": "4ª Dobra — Copywriting da Página",
                    "descricao": "Copy estratégica completa para a landing page: headline principal, subtítulos, texto de apresentação, método, estrutura do curso, descrição das aulas, quebra de objeções e CTAs. Linguagem médica + educacional — técnica, clara e persuasiva.",
                    "image_url": "",
                    "features": [
                        "Headline e subheadline de impacto",
                        "Texto do método e diferenciais",
                        "Descrição de módulos e aulas",
                        "CTAs e quebra de objeções",
                    ],
                },
                {
                    "titulo": "5ª Dobra — Estruturação do Curso",
                    "descricao": "Mapeamento editorial completo: módulos, títulos das aulas, sequência lógica de aprendizado, nomeação padronizada e estrutura pronta para upload na plataforma EAD. Base de tudo que será produzido.",
                    "image_url": "",
                    "features": [
                        "Mapa de módulos e aulas",
                        "Sequência lógica de aprendizado",
                        "Nomeação e padronização",
                        "Estrutura pronta para EAD",
                    ],
                },
                {
                    "titulo": "6ª Dobra — Edição das Aulas",
                    "descricao": "Edição profissional dos vídeos gravados pelo Dr. André: cortes de erros e pausas, abertura e encerramento padronizados, ajustes de áudio e imagem, exportação no formato adequado à plataforma.",
                    "image_url": "",
                    "features": [
                        "Cortes e limpeza de cada aula",
                        "Abertura e encerramento padrão",
                        "Ajustes de áudio e cor",
                        "Export no formato correto",
                    ],
                },
                {
                    "titulo": "7ª Dobra — Identidade Visual do Curso",
                    "descricao": "Criação da capa do curso, capas individuais de módulos e aulas, padrão visual completo (cores, tipografia, layout) aplicado na plataforma. Garante consistência visual e percepção de alto valor.",
                    "image_url": "",
                    "features": [
                        "Capa principal do curso",
                        "Capas de módulos e aulas",
                        "Padrão visual aplicado",
                        "Não inclui logomarca",
                    ],
                },
                {
                    "titulo": "8ª Dobra — Plataforma de Cursos",
                    "descricao": "Configuração completa da área do curso na plataforma escolhida: organização dos módulos, upload das aulas editadas, capas aplicadas, configuração de acesso, testes de navegação do aluno.",
                    "image_url": "",
                    "features": [
                        "Organização de módulos e aulas",
                        "Upload de todos os vídeos",
                        "Capas aplicadas",
                        "Acesso configurado e testado",
                    ],
                },
                {
                    "titulo": "9ª Dobra — Checkout e Pagamento",
                    "descricao": "Criação e configuração do checkout: campos, preços, oferta, integração com a landing page, configuração de entrega de acesso pós-pagamento e testes completos do fluxo de compra.",
                    "image_url": "",
                    "features": [
                        "Checkout criado e configurado",
                        "Integrado com a landing page",
                        "Entrega automática de acesso",
                        "Fluxo testado e validado",
                    ],
                },
                {
                    "titulo": "10ª Dobra — Entrega Final Publicada",
                    "descricao": "Entrega do sistema completo e operacional: landing page no ar, curso publicado na plataforma, aulas disponíveis, checkout ativo e integrado. O Dr. André recebe tudo publicado, testado e pronto para iniciar as vendas.",
                    "image_url": "",
                    "features": [
                        "LP publicada e no ar",
                        "Curso com todas as aulas disponíveis",
                        "Checkout ativo e integrado",
                        "Entrega com checklist de validação",
                    ],
                },
            ],
        },
    },

    # ══════════════════════════════════════════════════════════════════
    # [7] CRONOGRAMA — TIMELINE 30/45 DIAS
    # ══════════════════════════════════════════════════════════════════
    {
        "id": str(uuid.uuid4()),
        "type": "proximos_passos",
        "data": {
            "titulo": "Cronograma de execução",
            "titulo_highlight": "execução",
            "subtitulo": "{{TIMELINE}} — estruturado por fases. Cada fase tem entregável claro e revisão antes de avançar.",
            "cor": "cyan",
            "bg_tipo": "cor",
            "bg_cor": "escuro",
            "bg_image_url": "",
            "passos": [
                {
                    "numero": 1,
                    "titulo": "Semana 1 — Briefing e Estruturação",
                    "descricao": "Reunião de kickoff. Coleta de materiais. Mapeamento de módulos e aulas. Definição da oferta e validação do escopo do curso com o cliente.",
                    "icone": "clipboard-list",
                },
                {
                    "numero": 2,
                    "titulo": "Semana 2 — Copy + Identidade Visual",
                    "descricao": "Copywriting completo da landing page. Criação da identidade visual do curso (capa, módulos, padrão). Apresentação para aprovação antes de avançar.",
                    "icone": "pen-tool",
                },
                {
                    "numero": 3,
                    "titulo": "Semana 3 — Landing Page + Edição",
                    "descricao": "Design e publicação da landing page com copy aprovada. Início da edição das aulas à medida que os arquivos são entregues pelo cliente.",
                    "icone": "layout",
                },
                {
                    "numero": 4,
                    "titulo": "Semana 4 — Plataforma + Checkout",
                    "descricao": "Configuração completa da plataforma EAD: upload, organização, capas. Criação e integração do checkout. Testes do fluxo completo de compra.",
                    "icone": "settings",
                },
                {
                    "numero": 5,
                    "titulo": "Semana 5/6 — Revisão Final + Entrega",
                    "descricao": "Revisão geral com checklist de aceite. Ajustes finais. Entrega formal com tudo publicado, testado e operacional. Briefing de uso para o cliente.",
                    "icone": "check-circle",
                },
            ],
        },
    },

    # ══════════════════════════════════════════════════════════════════
    # [8] RESPONSABILIDADES — NOSSA EQUIPE x CLIENTE
    # ══════════════════════════════════════════════════════════════════
    {
        "id": str(uuid.uuid4()),
        "type": "dores_cliente",
        "data": {
            "titulo": "O que cada lado precisa fazer",
            "titulo_highlight": "cada lado precisa fazer",
            "subtitulo": "Clareza de responsabilidades é o que garante prazo e qualidade. Nada fica subentendido.",
            "cor": "cyan",
            "items": [
                {
                    "titulo": "Nossa equipe entrega",
                    "descricao": "Copy, design, edição, configuração técnica, identidade visual, integração checkout/plataforma, publicação e entrega final.",
                    "icone": "check-circle",
                },
                {
                    "titulo": "Dr. André precisa fornecer",
                    "descricao": "Arquivos das aulas gravadas (mp4), foto profissional de alta resolução, acesso às plataformas (hospedagem, EAD, gateway) e respostas ao briefing em até 48h.",
                    "icone": "user",
                },
                {
                    "titulo": "Revisões inclusas",
                    "descricao": "2 rodadas de revisão por entregável principal (copy, design, edição). Revisões adicionais são cobradas à parte e acordadas antes.",
                    "icone": "repeat",
                },
                {
                    "titulo": "Atualização de materiais",
                    "descricao": "Alterações de conteúdo das aulas após início da edição (regravação por escolha do cliente) não estão inclusas no escopo.",
                    "icone": "alert-circle",
                },
                {
                    "titulo": "Responsabilidade de conteúdo",
                    "descricao": "O conteúdo técnico/médico das aulas é de responsabilidade exclusiva do Dr. André. Nossa equipe viabiliza a produção, não valida o mérito clínico.",
                    "icone": "shield",
                },
                {
                    "titulo": "Prazo depende de ambos",
                    "descricao": "O cronograma é válido a partir da entrega dos materiais iniciais. Atrasos na entrega de materiais pelo cliente deslocam proporcionalmente o prazo de entrega.",
                    "icone": "clock",
                },
            ],
        },
    },

    # ══════════════════════════════════════════════════════════════════
    # [9] GARANTIA — GARANTIA DE PROCESSO E ENTREGA
    # ══════════════════════════════════════════════════════════════════
    {
        "id": str(uuid.uuid4()),
        "type": "garantia",
        "data": {
            "titulo": "Garantia de processo e entrega",
            "titulo_highlight": "processo e entrega",
            "subtitulo": "Não garantimos resultado de vendas. Garantimos que a estrutura vai estar publicada, funcional e dentro do escopo acordado.",
            "prazo_dias": 7,
            "selo_titulo": "Entrega garantida",
            "selo_subtitulo": "Dentro do escopo acordado",
            "texto": "Nossa garantia é técnica e processual. Cada entregável passa por checklist de aceite antes de ser entregue. Se qualquer item do escopo não estiver funcionando corretamente no momento da entrega, corrigimos sem custo adicional.\n\nO que não garantimos: volume de vendas, taxa de conversão da landing page ou resultado financeiro do lançamento. Esses fatores dependem de variáveis externas ao nosso escopo (audiência, oferta, preço, timing de mercado).",
            "itens": [
                "Todos os itens do escopo entregues e publicados",
                "2 rodadas de revisão incluídas por entregável principal",
                "Checklist de aceite antes da entrega final",
                "Correção de bugs técnicos no pós-entrega (7 dias)",
                "Documentação de entrega com acesso e instruções de uso",
                "Reunião de passagem ao fim do projeto",
            ],
            "cor": "green",
            "bg_tipo": "cor",
            "bg_cor": "escuro",
            "bg_image_url": "",
            "cta_texto": "Falar sobre a proposta",
            "cta_url": "https://wa.me/{{WHATSAPP}}",
        },
    },

    # ══════════════════════════════════════════════════════════════════
    # [10] CRITÉRIOS DE ACEITE + ENTREGA FINAL
    # ══════════════════════════════════════════════════════════════════
    {
        "id": str(uuid.uuid4()),
        "type": "beneficios",
        "data": {
            "titulo": "Critérios de aceite — quando consideramos entregue",
            "items": [
                {
                    "titulo": "Landing page publicada",
                    "descricao": "URL pública funcionando com todas as seções, copy e design aplicados. Responsiva para mobile e desktop.",
                    "icon": "globe",
                },
                {
                    "titulo": "Checkout ativo e integrado",
                    "descricao": "Fluxo de compra testado: do clique no CTA da LP até a confirmação de acesso na plataforma.",
                    "icon": "credit-card",
                },
                {
                    "titulo": "Curso publicado com todas as aulas",
                    "descricao": "Módulos organizados, aulas editadas e disponíveis, capas aplicadas, acesso funcionando.",
                    "icon": "play-circle",
                },
                {
                    "titulo": "Identidade visual aplicada",
                    "descricao": "Padrão visual consistente na plataforma (capa do curso, módulos, aulas). Igual ao aprovado na etapa de design.",
                    "icon": "palette",
                },
                {
                    "titulo": "Checklist de entrega assinado",
                    "descricao": "Documento formal listando cada item entregue, com validação de ambos os lados antes do encerramento do projeto.",
                    "icon": "file-check",
                },
                {
                    "titulo": "O que NÃO está incluso",
                    "descricao": "⚠️ Logomarca | Gravação das aulas | Tráfego pago | Gestão de redes sociais | Suporte pós-entrega além de 7 dias | Regravação de aulas por decisão do cliente após início da edição.",
                    "icon": "alert-triangle",
                },
            ],
        },
    },

    # ══════════════════════════════════════════════════════════════════
    # [11] FAQ
    # ══════════════════════════════════════════════════════════════════
    {
        "id": str(uuid.uuid4()),
        "type": "faq",
        "data": {
            "titulo": "Perguntas frequentes",
            "titulo_highlight": "frequentes",
            "items": [
                {
                    "pergunta": "Preciso ter as aulas gravadas antes de começar?",
                    "resposta": "Não necessariamente. A gravação pode ocorrer paralelamente ao início do projeto (estruturação e copy acontecem antes da edição). Porém, para entregar dentro do prazo, as aulas precisam ser enviadas até o início da Semana 3. Quanto antes, melhor.",
                },
                {
                    "pergunta": "Qual plataforma de curso vocês usam?",
                    "resposta": "Trabalhamos com as principais plataformas (Hotmart, Kiwify, Braip, Teachable, entre outras). A escolha é definida no kickoff com base na preferência do cliente e no modelo de negócio.",
                },
                {
                    "pergunta": "A logomarca está inclusa?",
                    "resposta": "Não. A identidade visual do curso (capas, padrão visual, layout) está inclusa, mas criação ou adaptação de logomarca não faz parte deste escopo. Se necessário, pode ser orçada à parte.",
                },
                {
                    "pergunta": "Quantas aulas posso incluir no curso?",
                    "resposta": "O escopo considera um volume razoável de aulas (até 30 aulas/vídeos). Volumes maiores impactam no prazo e podem gerar ajuste de investimento. Isso é alinhado no briefing inicial.",
                },
                {
                    "pergunta": "Vocês também fazem o lançamento (tráfego, e-mail, redes)?",
                    "resposta": "Este escopo cobre exclusivamente a estrutura: LP, curso, checkout e identidade visual. Gestão de tráfego pago, e-mail marketing e redes sociais não estão inclusos e podem ser discutidos como projetos complementares.",
                },
                {
                    "pergunta": "Como funciona a aprovação de cada entrega?",
                    "resposta": "Cada entregável (copy, design, edição, plataforma) é apresentado para o cliente antes de avançar para a próxima etapa. Você tem 48h para aprovar ou solicitar revisão. Após 2 rodadas de revisão, eventuais ajustes adicionais são cobrados à parte.",
                },
                {
                    "pergunta": "O prazo começa a contar quando?",
                    "resposta": "O prazo inicia na data do kickoff, desde que o pagamento inicial esteja confirmado e os materiais mínimos para início (briefing + acesso às plataformas) tenham sido enviados.",
                },
                {
                    "pergunta": "Posso alterar o escopo durante o projeto?",
                    "resposta": "Adições de escopo (novo módulo, novo entregável, mudança de plataforma após início) são possíveis, mas geram aditivo de prazo e/ou investimento. Mudanças menores dentro do trabalho em andamento são absorvidas na rodada de revisão.",
                },
                {
                    "pergunta": "Vocês garantem que o curso vai vender?",
                    "resposta": "Não. Nossa garantia é de processo e entrega: a estrutura estará publicada, funcional e dentro do escopo acordado. Resultados de vendas dependem de variáveis como oferta, audiência, preço e estratégia de lançamento — que estão fora do nosso escopo.",
                },
                {
                    "pergunta": "O que acontece se eu não conseguir entregar as aulas a tempo?",
                    "resposta": "O prazo do projeto se desloca proporcionalmente. Nossa equipe seguirá trabalhando nos itens que não dependem das aulas (copy, design, plataforma) e a edição será retomada assim que os vídeos forem enviados.",
                },
            ],
        },
    },

    # ══════════════════════════════════════════════════════════════════
    # [12] PRÓXIMOS PASSOS — COMO FECHAR
    # ══════════════════════════════════════════════════════════════════
    {
        "id": str(uuid.uuid4()),
        "type": "proximos_passos",
        "data": {
            "titulo": "Como avançar a partir daqui",
            "titulo_highlight": "a partir daqui",
            "subtitulo": "Quatro passos simples para sair desta proposta e chegar ao seu curso publicado.",
            "cor": "cyan",
            "bg_tipo": "cor",
            "bg_cor": "escuro",
            "bg_image_url": "",
            "passos": [
                {
                    "numero": 1,
                    "titulo": "Aprovar a proposta",
                    "descricao": "Confirme pelo WhatsApp que deseja avançar. Sem burocracia: uma mensagem já é suficiente para iniciar o processo.",
                    "icone": "check",
                },
                {
                    "numero": 2,
                    "titulo": "Contrato + pagamento inicial",
                    "descricao": "Enviamos o contrato digital para assinatura e alinhamos a condição de pagamento acordada. O projeto inicia após confirmação.",
                    "icone": "file-signature",
                },
                {
                    "numero": 3,
                    "titulo": "Kickoff (reunião de início)",
                    "descricao": "Reunião de alinhamento: briefing completo, definição da plataforma, coleta de materiais iniciais e confirmação do cronograma.",
                    "icone": "video",
                },
                {
                    "numero": 4,
                    "titulo": "Produção e entregas",
                    "descricao": "Nossa equipe entra em produção. Você acompanha cada entrega e aprova antes de avançar. Em 30–45 dias, tudo publicado.",
                    "icone": "rocket",
                },
            ],
        },
    },

    # ══════════════════════════════════════════════════════════════════
    # [13] CONTATO / CTA FINAL — RODAPÉ
    # ══════════════════════════════════════════════════════════════════
    {
        "id": str(uuid.uuid4()),
        "type": "rodape",
        "data": {
            "logo_url": "",
            "nome_empresa": "{{AGENCY_NAME}}",
            "slogan": "Estrutura pronta para vender. Do briefing à publicação.",
            "telefone": "{{WHATSAPP}}",
            "email": "",
            "whatsapp": "{{WHATSAPP}}",
            "endereco": "",
            "cnpj": "",
            "instagram": "",
            "linkedin": "",
            "youtube": "",
            "cor": "gold",
            "bg_cor": "escuro",
            "observacoes": "Esta proposta é válida por {{DEADLINE}} a partir do envio. Após esse prazo, valores e condições podem ser revisados.",
            "disclaimer": "Esta proposta não constitui garantia de resultado comercial ou financeiro. Os entregáveis descritos referem-se à estrutura técnica e criativa do projeto. Resultados de vendas dependem de variáveis externas ao escopo contratado.",
            "cta_aprovar_texto": "Aprovar proposta",
            "cta_aprovar_url": "https://wa.me/{{WHATSAPP}}?text=Dr.%20André%2C%20quero%20aprovar%20a%20proposta%20do%20curso.",
            "cta_duvidas_texto": "Tirar dúvidas",
            "cta_duvidas_url": "https://wa.me/{{WHATSAPP}}",
        },
    },
]

def main():
    print("Conectando ao banco de dados...")
    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()

    # Buscar a proposta do Samuel Souza (Dr. André Felipe)
    print("Buscando proposta...")
    cur.execute(
        """
        SELECT p.id, p.titulo, c.nome as cliente_nome
        FROM propostas p
        JOIN clientes c ON c.id = p.cliente_id
        WHERE c.nome ILIKE '%Samuel%' OR c.nome ILIKE '%André%'
        ORDER BY p.created_at DESC
        LIMIT 5
    """
    )
    rows = cur.fetchall()

    if not rows:
        print("Buscando todas as propostas...")
        cur.execute(
            """
            SELECT p.id, p.titulo, c.nome, p.status
            FROM propostas p
            JOIN clientes c ON c.id = p.cliente_id
            ORDER BY p.created_at DESC LIMIT 10
        """
        )
        rows2 = cur.fetchall()
        for r in rows2:
            print(f"  {r[0]} | {r[1]} | {r[2]} | {r[3]}")
        cur.close()
        conn.close()
        return

    proposta_id = rows[0][0]
    print(f"Proposta: {rows[0][1]} | Cliente: {rows[0][2]} | ID: {proposta_id}")
    print(f"Total de secoes: {len(LANDING_CONTENT)}")

    cur.execute(
        """
        UPDATE propostas
        SET landing_content = %s,
            updated_at = NOW()
        WHERE id = %s
    """,
        (Json(LANDING_CONTENT), proposta_id),
    )

    conn.commit()
    print(f"\nSucesso! {len(LANDING_CONTENT)} secoes inseridas:")
    for s in LANDING_CONTENT:
        t = s["data"].get("titulo") or s["data"].get("headline", "?")
        print(f"  [{s['type']:25s}] {t[:60]}")

    cur.close()
    conn.close()
    print("\nConcluido! Abra o builder da proposta para visualizar.")

if __name__ == "__main__":
    main()
