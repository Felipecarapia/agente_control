"""
Script para popular a proposta do Samuel Souza com conteúdo completo
Dr. André Felipe | Cirurgia Estética • Salvador, BA
"""
import json
import uuid
import psycopg2
from psycopg2.extras import Json

# Configurações do banco
DB_CONFIG = {
    "host": "78.142.242.97",
    "port": 5432,
    "database": "sistemaxi-crm",
    "user": "fortis",
    "password": "Fortis2107",
}

# Conteúdo completo da landing da proposta
LANDING_CONTENT = [
    # ── SEÇÃO 1: Hero Principal ──────────────────────────────────────────────────
    {
        "id": str(uuid.uuid4()),
        "type": "hero",
        "data": {
            "logo_url": "",
            "headline": "Dr. André Felipe",
            "headline_highlight": "André Felipe",
            "subheadline": "Cirurgia Estética de Alta Complexidade • Salvador, BA",
            "subheadline_highlight": "Salvador, BA",
            "cta_text": "Ver Proposta Personalizada",
            "cta_url": "#proposta",
            "background_image_url": "",
            "cor_texto": "white",
            "cor_destaque": "gold",
            "proposta_numero": "001/2025",
            "responsavel": "Dr. André Felipe",
            "telefone": "{{WHATSAPP}}",
            "cliente": "Samuel Souza",
        },
    },
    # ── SEÇÃO 2: Hero Proposta ───────────────────────────────────────────────────
    {
        "id": str(uuid.uuid4()),
        "type": "resumo_proposta",
        "data": {
            "titulo": "Proposta Personalizada",
            "titulo_highlight": "Personalizada",
            "valor_total": "R$ 22.500,00",
            "parcelas": "Cartão/PIX · parcelamento conforme disponibilidade",
            "prazo_entrega": "Avaliação em até 7 dias",
            "cor": "cyan",
            "bg_tipo": "cor",
            "bg_cor": "escuro",
            "bg_image_url": "",
            "itens_inclusos": [
                "Avaliação médica completa personalizada para Samuel Souza",
                "Plano de Contorno Corporal individualizado",
                "Lipoaspiração / escultura corporal com técnica avançada",
                "Contorno de abdômen com planejamento preciso",
                "Glúteo Brazilian Butt Sculpt™ com modelagem natural",
                "Acompanhamento pré e pós-operatório dedicado",
                "Protocolo de segurança clínica e exames completos",
                "Consultoria de decisão informada (sem pressão)",
            ],
            "cta_texto": "Agendar Avaliação pelo WhatsApp",
            "cta_url": "https://wa.me/{{WHATSAPP}}",
        },
    },
    # ── SEÇÃO 3: Vídeo – O Método ────────────────────────────────────────────────
    {
        "id": str(uuid.uuid4()),
        "type": "video",
        "data": {
            "titulo": "O Método Dr. André Felipe",
            "titulo_highlight": "Método",
            "video_url": "",
            "thumbnail_url": "",
            "cta_text": "Quero saber mais",
            "cta_url": "https://wa.me/{{WHATSAPP}}",
            "subtitulo": "Proporção é técnica. Segurança é método. Assista e entenda como cada procedimento é planejado antes mesmo de entrar no centro cirúrgico.",
            "bullets": [
                "Como a avaliação corporal define o plano cirúrgico",
                "Por que o planejamento 3D aumenta a previsibilidade do resultado",
                "O protocolo de segurança anestésica e de monitoramento",
                "A diferença entre lipoaspiração convencional e escultura corporal de alta definição",
                "Brazilian Butt Sculpt™: técnica, proporcionalidade e cuidados",
                "O que esperar da recuperação e do acompanhamento pós-operatório",
            ],
        },
    },
    # ── SEÇÃO 4: Dores do Cliente ────────────────────────────────────────────────
    {
        "id": str(uuid.uuid4()),
        "type": "dores_cliente",
        "data": {
            "titulo": "Você se identifica com algum desses cenários?",
            "titulo_highlight": "algum desses cenários",
            "subtitulo": "São preocupações legítimas — e merecem respostas claras e honestas antes de qualquer decisão.",
            "cor": "gold",
            "items": [
                {
                    "titulo": "Gordura resistente ao treino",
                    "descricao": "Você mantém uma rotina saudável, mas certas regiões simplesmente não respondem ao esforço.",
                    "icone": "zap",
                },
                {
                    "titulo": "Desproporção corporal",
                    "descricao": "A silhueta não reflete o cuidado que você tem com o próprio corpo. O contorno não corresponde ao esforço.",
                    "icone": "sliders",
                },
                {
                    "titulo": "Insegurança sobre riscos cirúrgicos",
                    "descricao": "Você quer se informar de verdade antes de decidir — e tem dificuldade em encontrar respostas técnicas e honestas.",
                    "icone": "shield-alert",
                },
                {
                    "titulo": "Medo de resultado artificial",
                    "descricao": "Você preza pelo natural. Não quer exagero, quer proporcionalidade e harmonia com seu biotipo.",
                    "icone": "eye",
                },
                {
                    "titulo": "Dúvidas sobre recuperação",
                    "descricao": "Você tem compromissos profissionais e pessoais. Precisa saber com clareza o que esperar do pós-operatório.",
                    "icone": "clock",
                },
                {
                    "titulo": "Pele flácida após perda de peso",
                    "descricao": "O emagrecimento foi conquistado, mas a pele e o abdômen precisam de uma solução que o treino não oferece.",
                    "icone": "layers",
                },
            ],
        },
    },
    # ── SEÇÃO 5: Para Quem É ─────────────────────────────────────────────────────
    {
        "id": str(uuid.uuid4()),
        "type": "para_quem",
        "data": {
            "titulo": "Para quem é esta proposta?",
            "titulo_highlight": "esta proposta",
            "items": [
                {
                    "titulo": "Paciente próximo do peso ideal",
                    "descricao": "Que deseja refinar contornos, eliminar gordura localizada resistente e atingir a proporcionalidade que o treino não entrega.",
                    "image_url": "",
                },
                {
                    "titulo": "Quem valoriza segurança acima de tudo",
                    "descricao": "Que prioriza o rigor técnico, os protocolos clínicos e um acompanhamento médico de ponta a ponta — não apenas o resultado estético.",
                    "image_url": "",
                },
                {
                    "titulo": "Quem busca decisão informada",
                    "descricao": "Que quer entender o procedimento, os riscos reais, as expectativas realistas e o processo completo antes de assinar qualquer consentimento.",
                    "image_url": "",
                },
            ],
        },
    },
    # ── SEÇÃO 6: Produtos / Soluções ─────────────────────────────────────────────
    {
        "id": str(uuid.uuid4()),
        "type": "produtos_alternados",
        "data": {
            "titulo": "O que está incluso no seu plano",
            "titulo_highlight": "incluso no seu plano",
            "subtitulo": "Avaliação + Plano de Contorno Corporal Personalizado — estruturado para Samuel Souza, Salvador/BA",
            "cor": "cyan",
            "bg_tipo": "cor",
            "bg_cor": "claro",
            "bg_image_url": "",
            "items": [
                {
                    "titulo": "Consulta de Avaliação Completa",
                    "descricao": "Sessão dedicada para análise corporal, histórico de saúde, exames, biotipo e expectativas. Base de todo o planejamento cirúrgico.",
                    "image_url": "",
                    "features": [
                        "Análise postural e de composição corporal",
                        "Discussão de objetivos e expectativas realistas",
                        "Avaliação de indicação cirúrgica individual",
                    ],
                },
                {
                    "titulo": "Lipoaspiração / Escultura Corporal",
                    "descricao": "Técnica avançada de modelagem que vai além da simples remoção de gordura — foco em proporção, harmonia e naturalidade do contorno.",
                    "image_url": "",
                    "features": [
                        "Planejamento corporal 3D pré-operatório",
                        "Escultura de flancos, abdômen e regiões resistentes",
                        "Preservação de tecidos para resultado natural",
                    ],
                },
                {
                    "titulo": "Brazilian Butt Sculpt™",
                    "descricao": "Procedimento de modelagem glútea com foco em proporcionalidade anatômica. Resultado depende de avaliação individual e indicação técnica.",
                    "image_url": "",
                    "features": [
                        "Técnica de transferência e escultura glútea",
                        "Proporcionalidade respeitando biotipo",
                        "Protocolos de segurança específicos para o procedimento",
                    ],
                },
                {
                    "titulo": "Acompanhamento Pós-Operatório",
                    "descricao": "Protocolo estruturado de retornos, orientações e suporte durante a recuperação. A continuidade do cuidado é parte do método.",
                    "image_url": "",
                    "features": [
                        "Consultas de retorno programadas",
                        "Protocolo de cuidados e restrições detalhado",
                        "Canal direto para dúvidas durante a recuperação",
                    ],
                },
            ],
        },
    },
    # ── SEÇÃO 7: Benefícios ───────────────────────────────────────────────────────
    {
        "id": str(uuid.uuid4()),
        "type": "beneficios",
        "data": {
            "titulo": "Benefícios da experiência clínica",
            "items": [
                {
                    "titulo": "Planejamento preciso",
                    "descricao": "Cada procedimento é desenhado antes do centro cirúrgico. Planejamento corporal é o que garante naturalidade.",
                    "icon": "ruler",
                },
                {
                    "titulo": "Resultado proporcional",
                    "descricao": "O objetivo não é exagero — é harmonia. A técnica respeita seu biotipo e estilo de vida.",
                    "icon": "balance",
                },
                {
                    "titulo": "Segurança como protocolo",
                    "descricao": "Exames pré-operatórios, avaliação anestésica, monitoramento cirúrgico e pós-operatório estruturado.",
                    "icon": "shield",
                },
                {
                    "titulo": "Decisão sem pressão",
                    "descricao": "Você recebe todas as informações necessárias. A decisão é sua, com tempo e clareza.",
                    "icon": "info",
                },
                {
                    "titulo": "Atendimento premium",
                    "descricao": "Ambiente clínico de alto padrão, equipe especializada e comunicação direta com o médico responsável.",
                    "icon": "star",
                },
                {
                    "titulo": "Transparência total",
                    "descricao": "Riscos, limitações, tempo de recuperação e expectativas realistas são apresentados com clareza na consulta.",
                    "icon": "eye",
                },
            ],
        },
    },
    # ── SEÇÃO 8: Diferenciais ─────────────────────────────────────────────────────
    {
        "id": str(uuid.uuid4()),
        "type": "diferenciais",
        "data": {
            "titulo": "Por que o Dr. André Felipe?",
            "titulo_highlight": "Dr. André Felipe",
            "subtitulo": "Proporção é técnica. Segurança é método. Esses são os pilares de cada procedimento.",
            "cor": "cyan",
            "bg_tipo": "cor",
            "bg_cor": "claro",
            "bg_image_url": "",
            "items": [
                {
                    "icone": "award",
                    "titulo": "Especialização em contorno corporal",
                    "subtitulo": "Foco técnico em lipoaspiração, escultura e glúteo — não um generalista",
                },
                {
                    "icone": "shield-check",
                    "titulo": "Protocolo de segurança rigoroso",
                    "subtitulo": "Exames, avaliação anestésica e monitoramento em cada etapa",
                },
                {
                    "icone": "sliders",
                    "titulo": "Planejamento individualizado",
                    "subtitulo": "Não existe procedimento padrão — cada paciente tem seu plano",
                },
                {
                    "icone": "map-pin",
                    "titulo": "Referência em Salvador/BA",
                    "subtitulo": "Atendimento local com padrão técnico de referência nacional",
                },
                {
                    "icone": "message-circle",
                    "titulo": "Comunicação direta com o médico",
                    "subtitulo": "O Dr. André Felipe acompanha o caso pessoalmente do início ao fim",
                },
                {
                    "icone": "heart",
                    "titulo": "Ética e responsabilidade médica",
                    "subtitulo": "Indicação honesta: se o procedimento não for indicado, você saberá",
                },
            ],
        },
    },
    # ── SEÇÃO 9: Quem Somos ───────────────────────────────────────────────────────
    {
        "id": str(uuid.uuid4()),
        "type": "quem_somos",
        "data": {
            "titulo": "Dr. André Felipe",
            "titulo_highlight": "André Felipe",
            "conteudo": "Cirurgião plástico com formação sólida e atuação focada em contorno corporal e estética de alta complexidade em Salvador, Bahia. Seu trabalho é orientado por três pilares inegociáveis: planejamento técnico rigoroso, segurança do paciente e resultados proporcionais ao biotipo individual.\n\nAo longo da carreira, especializou-se em procedimentos como lipoaspiração e escultura corporal, modelagem glútea e cirurgias de abdômen — sempre com foco em naturalidade e previsibilidade de processo. Cada consulta é conduzida com escuta ativa, informação clara e respeito ao tempo de decisão do paciente.\n\nSua clínica em Salvador atende pacientes de Salvador/BA e região, oferecendo ambiente de alto padrão e acompanhamento médico personalizado do primeiro contato ao pós-operatório completo.",
            "logo_url": "",
            "image_url": "",
            "background_image_url": "",
            "cor": "gold",
            "bg_cor": "escuro",
            "badges": [
                "Especialista em Contorno Corporal",
                "Salvador, BA",
                "Atendimento Premium",
                "Protocolos de Segurança",
            ],
        },
    },
    # ── SEÇÃO 10: Time ────────────────────────────────────────────────────────────
    {
        "id": str(uuid.uuid4()),
        "type": "time",
        "data": {
            "titulo": "Equipe Clínica",
            "titulo_highlight": "Equipe",
            "subtitulo": "Profissionais especializados em cada etapa do cuidado — do primeiro contato à recuperação completa.",
            "cor": "cyan",
            "bg_tipo": "cor",
            "bg_cor": "claro",
            "bg_image_url": "",
            "items": [
                {
                    "nome": "Cirurgião Responsável",
                    "instagram": "",
                    "funcao": "Dr. André Felipe — responsável pelo planejamento, execução cirúrgica e acompanhamento médico de ponta a ponta.",
                    "foto_url": "",
                },
                {
                    "nome": "Equipe de Atendimento",
                    "instagram": "",
                    "funcao": "Coordenação de agendamentos, orientações pré-consulta e comunicação direta com o paciente com agilidade e cuidado.",
                    "foto_url": "",
                },
                {
                    "nome": "Equipe de Enfermagem",
                    "instagram": "",
                    "funcao": "Suporte clínico especializado no pré e pós-operatório, aplicação de protocolos e acompanhamento da recuperação.",
                    "foto_url": "",
                },
            ],
        },
    },
    # ── SEÇÃO 11: Garantia / Compromisso ─────────────────────────────────────────
    {
        "id": str(uuid.uuid4()),
        "type": "garantia",
        "data": {
            "titulo": "Compromisso com Segurança",
            "titulo_highlight": "Segurança",
            "subtitulo": "Não prometemos resultado. Prometemos processo — rigoroso, seguro e acompanhado em cada etapa.",
            "prazo_dias": 90,
            "selo_titulo": "Acompanhamento Integral",
            "selo_subtitulo": "Pré, trans e pós-operatório",
            "texto": "A segurança cirúrgica não começa na sala de operações — começa na avaliação. Por isso, exigimos exames pré-operatórios completos, avaliação anestésica rigorosa e indicação técnica individualizada. Nenhum procedimento é realizado sem que o paciente compreenda plenamente o processo, os riscos e as expectativas reais.",
            "itens": [
                "Exames pré-operatórios completos obrigatórios",
                "Avaliação anestésica e clínica individual",
                "Indicação cirúrgica honesta — sem pressão, sem promessas",
                "Protocolo cirúrgico padronizado com monitoramento contínuo",
                "Orientações detalhadas para recuperação",
                "Consultas de retorno programadas no pós-operatório",
                "Canal direto com a equipe para dúvidas e intercorrências",
            ],
            "cor": "green",
            "bg_tipo": "cor",
            "bg_cor": "escuro",
            "bg_image_url": "",
            "cta_texto": "Agendar Avaliação",
            "cta_url": "https://wa.me/{{WHATSAPP}}",
        },
    },
    # ── SEÇÃO 12: Depoimentos ─────────────────────────────────────────────────────
    {
        "id": str(uuid.uuid4()),
        "type": "depoimentos",
        "data": {
            "titulo": "O que pacientes relatam",
            "items": [
                {
                    "nome": "A. M., Salvador/BA",
                    "texto": "O que mais me surpreendeu foi a honestidade da consulta. O Dr. André foi muito claro sobre o que era possível, o que não era e o que dependia da minha recuperação. Me senti segura para decidir.",
                    "role": "Paciente — Lipoaspiração + Contorno Abdominal",
                    "avatar_url": "",
                },
                {
                    "nome": "C. R., Feira de Santana/BA",
                    "texto": "Fiz minha pesquisa antes e escolhi pelo rigor técnico. O planejamento foi detalhado, os exames todos feitos, e o acompanhamento pós-operatório foi exatamente como prometido. Resultado proporcional e natural.",
                    "role": "Paciente — Escultura Corporal",
                    "avatar_url": "",
                },
                {
                    "nome": "P. S., Salvador/BA",
                    "texto": "Tinha muito medo de resultado artificial. Fui com essa preocupação na consulta e saí com clareza total. O médico explicou cada etapa, os riscos reais e o que era realista esperar. Fiz o procedimento com tranquilidade.",
                    "role": "Paciente — Brazilian Butt Sculpt™",
                    "avatar_url": "",
                },
            ],
        },
    },
    # ── SEÇÃO 13: Cases de Sucesso ────────────────────────────────────────────────
    {
        "id": str(uuid.uuid4()),
        "type": "cases_sucesso",
        "data": {
            "titulo": "Perfis de pacientes atendidos",
            "titulo_highlight": "Perfis de pacientes",
            "cor": "cyan",
            "items": [
                {
                    "titulo": "Contorno corporal após emagrecimento",
                    "descricao": "Paciente que atingiu o peso desejado com dieta e treino, mas apresentava gordura localizada resistente em flancos e abdômen. Após avaliação completa e indicação técnica precisa, realizou escultura corporal com foco em harmonia e naturalidade. Recuperação dentro do esperado, com retorno às atividades leves em três semanas. Os resultados variam conforme avaliação individual.",
                    "image_url": "",
                    "cliente": "Perfil A — Contorno Corporal",
                },
                {
                    "titulo": "Modelagem glútea com proporcionalidade",
                    "descricao": "Paciente com objetivo de melhorar a projeção e proporcionalidade glútea, sem exageros. A avaliação identificou indicação para Brazilian Butt Sculpt™ com técnica de transferência. O planejamento incluiu análise postural e definição de volumes respeitando o biotipo. Cada paciente tem um plano diferente — os resultados dependem de avaliação individual.",
                    "image_url": "",
                    "cliente": "Perfil B — Modelagem Glútea",
                },
                {
                    "titulo": "Abdômen + flacidez após gestação",
                    "descricao": "Paciente que buscava solução para flacidez abdominal e separação de músculo após gestação. A avaliação indicou procedimento combinado com abdominoplastia, conduzido com protocolo de segurança rigoroso e acompanhamento pós-operatório estruturado. A indicação de abdominoplastia é individual e depende de critérios clínicos avaliados em consulta.",
                    "image_url": "",
                    "cliente": "Perfil C — Reconstrução Abdominal",
                },
            ],
        },
    },
    # ── SEÇÃO 14: FAQ ──────────────────────────────────────────────────────────────
    {
        "id": str(uuid.uuid4()),
        "type": "faq",
        "data": {
            "titulo": "Perguntas frequentes",
            "titulo_highlight": "frequentes",
            "items": [
                {
                    "pergunta": "Quanto tempo dura a recuperação de uma lipoaspiração?",
                    "resposta": "A recuperação varia conforme a extensão do procedimento e o organismo de cada paciente. Em geral, atividades leves podem ser retomadas em 7 a 14 dias e atividades físicas intensas entre 4 e 6 semanas. O médico orientará o protocolo individualizado durante as consultas de retorno.",
                },
                {
                    "pergunta": "O procedimento é doloroso?",
                    "resposta": "O procedimento é realizado sob anestesia. No pós-operatório imediato pode haver desconforto, edema e sensibilidade na região operada — sensações normais e esperadas. A equipe orienta sobre medicação e cuidados para tornar a recuperação mais confortável.",
                },
                {
                    "pergunta": "Ficará cicatriz visível?",
                    "resposta": "As incisões da lipoaspiração são pequenas e posicionadas estrategicamente em locais discretos. A aparência das cicatrizes varia conforme o tipo de pele, a extensão do procedimento e os cuidados pós-operatórios. Em abdominoplastia, a cicatriz é posicionada na linha do biquíni. O médico esclarecerá em detalhes na consulta.",
                },
                {
                    "pergunta": "Quanto tempo leva o procedimento?",
                    "resposta": "Depende do planejamento e das áreas envolvidas. Procedimentos de escultura corporal variam entre 2 e 5 horas. O tempo é definido após avaliação e planejamento cirúrgico detalhado.",
                },
                {
                    "pergunta": "Quais são os riscos reais da cirurgia?",
                    "resposta": "Como qualquer intervenção cirúrgica, existem riscos inerentes: reações à anestesia, infecção, hematoma, assimetria, alterações de sensibilidade e resultados aquém do esperado. O propósito da avaliação e dos exames pré-operatórios é minimizá-los. Todos os riscos são discutidos abertamente em consulta.",
                },
                {
                    "pergunta": "Quem pode realizar o procedimento?",
                    "resposta": "A indicação é determinada em consulta, após análise do histórico clínico, exames, biotipo e objetivos. Não existe um perfil único — cada caso é avaliado individualmente. Pacientes com certas condições de saúde podem não ter indicação para o procedimento.",
                },
                {
                    "pergunta": "Quais exames são necessários antes da cirurgia?",
                    "resposta": "O protocolo inclui exames laboratoriais, eletrocardiograma, avaliação cardiológica (conforme idade e histórico) e outros exames que o médico julgar necessários. A lista completa é fornecida após a consulta de avaliação.",
                },
                {
                    "pergunta": "Quando posso voltar ao trabalho?",
                    "resposta": "Para trabalhos de escritório, o retorno costuma ocorrer entre 7 e 14 dias. Para atividades que exijam esforço físico, o prazo é maior. Tudo é orientado de forma individualizada e depende da extensão do procedimento realizado.",
                },
                {
                    "pergunta": "Que tipo de anestesia é utilizada?",
                    "resposta": "O tipo de anestesia depende do procedimento e é definido em conjunto com o anestesiologista na avaliação pré-operatória. As opções incluem anestesia geral, sedação e anestesia local com sedação. O conforto e a segurança do paciente são prioridade.",
                },
                {
                    "pergunta": "Como é o acompanhamento após a cirurgia?",
                    "resposta": "O pós-operatório inclui consultas de retorno programadas, orientações de cuidados, protocolo de recuperação e canal de comunicação direto com a equipe para dúvidas e eventuais intercorrências. O acompanhamento é parte integral do procedimento, não um adicional.",
                },
                {
                    "pergunta": "O resultado é permanente?",
                    "resposta": "As células de gordura removidas não retornam às regiões tratadas. Contudo, o resultado depende da manutenção do peso e de hábitos saudáveis. Variações de peso significativas após o procedimento podem alterar o contorno alcançado.",
                },
                {
                    "pergunta": "Posso combinar mais de um procedimento?",
                    "resposta": "A combinação de procedimentos é avaliada caso a caso, levando em conta a segurança, o tempo cirúrgico total e as condições clínicas do paciente. Não há uma resposta padrão — isso é definido na consulta de planejamento.",
                },
            ],
        },
    },
    # ── SEÇÃO 15: Resumo da Proposta ─────────────────────────────────────────────
    {
        "id": str(uuid.uuid4()),
        "type": "sobre_projeto",
        "data": {
            "titulo": "O que foi acordado nesta proposta",
            "titulo_highlight": "acordado nesta proposta",
            "conteudo": "Samuel Souza | Salvador/BA e região\n\n**Procedimento / Plano:** Avaliação + Plano de Contorno Corporal Personalizado\n**Objetivo:** Definir abdômen e reduzir gordura resistente, com contorno natural\n**Valor:** R$ 22.500,00\n**Condição de pagamento:** Cartão/PIX · parcelamento conforme disponibilidade\n**Prazo para agendar avaliação:** Até 7 dias a partir do recebimento desta proposta\n\n---\n\nEsta proposta inclui a consulta de avaliação completa, o planejamento cirúrgico individualizado, a realização do procedimento e o acompanhamento pós-operatório conforme protocolo clínico do Dr. André Felipe.\n\n*Este material é informativo e não substitui consulta médica. Indicação e resultados variam conforme avaliação individual.*",
        },
    },
    # ── SEÇÃO 16: Próximos Passos ────────────────────────────────────────────────
    {
        "id": str(uuid.uuid4()),
        "type": "proximos_passos",
        "data": {
            "titulo": "Próximos Passos",
            "titulo_highlight": "Passos",
            "subtitulo": "Processo simples, sem burocracia. Você decide no seu tempo.",
            "cor": "cyan",
            "bg_tipo": "cor",
            "bg_cor": "escuro",
            "bg_image_url": "",
            "passos": [
                {
                    "numero": 1,
                    "titulo": "Confirme o interesse",
                    "descricao": "Entre em contato pelo WhatsApp para confirmar que recebeu a proposta e deseja avançar com o agendamento.",
                    "icone": "message-circle",
                },
                {
                    "numero": 2,
                    "titulo": "Agende a consulta de avaliação",
                    "descricao": "Nossa equipe de atendimento verifica a agenda e confirma a data e horário que melhor se encaixa na sua rotina.",
                    "icone": "calendar",
                },
                {
                    "numero": 3,
                    "titulo": "Consulta de avaliação médica",
                    "descricao": "Sessão com o Dr. André Felipe para análise corporal, definição do plano, esclarecimento de dúvidas e solicitação de exames.",
                    "icone": "stethoscope",
                },
                {
                    "numero": 4,
                    "titulo": "Exames e avaliação pré-operatória",
                    "descricao": "Realização dos exames solicitados e avaliação anestesiológica — etapa obrigatória do protocolo de segurança.",
                    "icone": "file-check",
                },
                {
                    "numero": 5,
                    "titulo": "Planejamento e agendamento cirúrgico",
                    "descricao": "Com exames aprovados e indicação confirmada, definimos a data do procedimento e orientamos sobre os preparativos.",
                    "icone": "clipboard-list",
                },
                {
                    "numero": 6,
                    "titulo": "Procedimento e acompanhamento",
                    "descricao": "Realização do procedimento com equipe especializada e início do protocolo de acompanhamento pós-operatório.",
                    "icone": "heart-pulse",
                },
            ],
        },
    },
    # ── SEÇÃO 17: Contato / Rodapé ────────────────────────────────────────────────
    {
        "id": str(uuid.uuid4()),
        "type": "rodape",
        "data": {
            "logo_url": "",
            "nome_empresa": "Dr. André Felipe | Cirurgia Estética",
            "slogan": "Proporção é técnica. Segurança é método.",
            "telefone": "{{WHATSAPP}}",
            "email": "",
            "whatsapp": "{{WHATSAPP}}",
            "endereco": "Salvador, BA — endereço informado no agendamento",
            "cnpj": "",
            "instagram": "",
            "linkedin": "",
            "youtube": "",
            "cor": "gold",
            "bg_cor": "escuro",
            "observacoes": "Atendimento de segunda a sexta, horário comercial. Agendamentos e dúvidas via WhatsApp. Esta proposta é válida por 7 dias a partir do envio.",
            "disclaimer": "Este material é informativo e não substitui consulta médica. Indicação e resultados variam conforme avaliação individual. CRM/CFM — informações técnicas fornecidas em consulta.",
        },
    },
]


def main():
    print("Conectando ao banco de dados...")
    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()

    # Buscar a proposta do Samuel Souza
    print("Buscando proposta do Samuel Souza...")
    cur.execute(
        """
        SELECT p.id, p.titulo, c.nome as cliente_nome
        FROM propostas p
        JOIN clientes c ON c.id = p.cliente_id
        WHERE c.nome ILIKE '%Samuel%'
        ORDER BY p.created_at DESC
        LIMIT 5
    """
    )
    rows = cur.fetchall()

    if not rows:
        print("❌ Nenhuma proposta encontrada para Samuel Souza")
        print("\nBuscando todas as propostas disponíveis:")
        cur.execute(
            """
            SELECT p.id, p.titulo, c.nome as cliente_nome, p.status
            FROM propostas p
            JOIN clientes c ON c.id = p.cliente_id
            ORDER BY p.created_at DESC
            LIMIT 10
        """
        )
        all_rows = cur.fetchall()
        for r in all_rows:
            print(f"  ID: {r[0]} | Título: {r[1]} | Cliente: {r[2]} | Status: {r[3]}")
        cur.close()
        conn.close()
        return

    print(f"\nPropostas encontradas:")
    for i, row in enumerate(rows):
        print(f"  [{i}] ID: {row[0]} | Título: {row[1]} | Cliente: {row[2]}")

    # Usa a primeira (mais recente)
    proposta_id = rows[0][0]
    proposta_titulo = rows[0][1]
    cliente_nome = rows[0][2]

    print(f"\n✅ Usando proposta: '{proposta_titulo}' do cliente '{cliente_nome}'")
    print(f"   ID: {proposta_id}")
    print(f"   Total de seções a inserir: {len(LANDING_CONTENT)}")

    # Atualizar o landing_content
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
    print(f"\n🎉 Proposta populada com sucesso!")
    print(f"   {len(LANDING_CONTENT)} seções inseridas:")
    for s in LANDING_CONTENT:
        print(f"   - [{s['type']}] {s['data'].get('titulo', s['data'].get('headline', '—'))}")

    cur.close()
    conn.close()
    print("\n✅ Concluído! Abra o builder da proposta para visualizar.")


if __name__ == "__main__":
    main()
