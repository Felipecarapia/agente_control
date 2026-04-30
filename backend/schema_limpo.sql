
CREATE TABLE contratos (
	tenant_id UUID, 
	id UUID NOT NULL, 
	numero VARCHAR(100) NOT NULL, 
	proposta_id UUID, 
	cliente_id UUID NOT NULL, 
	projeto_id UUID, 
	valor NUMERIC(15, 2), 
	data_inicio DATE, 
	data_fim DATE, 
	arquivo_url VARCHAR(500), 
	status VARCHAR(50) NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(tenant_id) REFERENCES tenants (id) ON DELETE CASCADE, 
	FOREIGN KEY(proposta_id) REFERENCES propostas (id), 
	FOREIGN KEY(cliente_id) REFERENCES clientes (id), 
	FOREIGN KEY(projeto_id) REFERENCES projetos (id)
)

;


CREATE TABLE deals (
	tenant_id UUID, 
	id UUID NOT NULL, 
	pipeline_id UUID NOT NULL, 
	stage_id UUID NOT NULL, 
	client_id UUID NOT NULL, 
	title VARCHAR(255) NOT NULL, 
	value_cents INTEGER, 
	currency VARCHAR(3) NOT NULL, 
	probability INTEGER NOT NULL, 
	expected_close_date DATE, 
	priority VARCHAR(20) NOT NULL, 
	status VARCHAR(20) NOT NULL, 
	position_index NUMERIC(10, 2) NOT NULL, 
	source VARCHAR(20), 
	proposal_id UUID, 
	contract_id UUID, 
	created_by_user_id UUID, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(tenant_id) REFERENCES tenants (id) ON DELETE CASCADE, 
	FOREIGN KEY(pipeline_id) REFERENCES pipelines (id) ON DELETE CASCADE, 
	FOREIGN KEY(stage_id) REFERENCES pipeline_stages (id) ON DELETE RESTRICT, 
	FOREIGN KEY(client_id) REFERENCES clientes (id) ON DELETE RESTRICT, 
	FOREIGN KEY(proposal_id) REFERENCES propostas (id) ON DELETE SET NULL, 
	FOREIGN KEY(contract_id) REFERENCES contratos (id) ON DELETE SET NULL, 
	FOREIGN KEY(created_by_user_id) REFERENCES usuarios (id) ON DELETE SET NULL
)

;


CREATE TABLE permissions (
	id UUID NOT NULL, 
	module VARCHAR(50) NOT NULL, 
	action VARCHAR(50) NOT NULL, 
	name VARCHAR(200) NOT NULL, 
	description TEXT, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	CONSTRAINT uq_permission_module_action UNIQUE (module, action)
)

;


CREATE TABLE pre_proposal_templates (
	id UUID NOT NULL, 
	name VARCHAR(255) NOT NULL, 
	schema_json JSONB NOT NULL, 
	is_default VARCHAR(20) NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id)
)

;


CREATE TABLE pre_proposals (
	id UUID NOT NULL, 
	client_id UUID NOT NULL, 
	deal_id UUID, 
	status VARCHAR(50) NOT NULL, 
	score_total INTEGER, 
	temperature VARCHAR(20), 
	summary TEXT, 
	recommendations JSONB, 
	created_by_user_id UUID, 
	updated_by_user_id UUID, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(client_id) REFERENCES clientes (id) ON DELETE RESTRICT, 
	FOREIGN KEY(deal_id) REFERENCES deals (id) ON DELETE SET NULL, 
	FOREIGN KEY(created_by_user_id) REFERENCES usuarios (id) ON DELETE SET NULL, 
	FOREIGN KEY(updated_by_user_id) REFERENCES usuarios (id) ON DELETE SET NULL
)

;


CREATE TABLE propostas (
	tenant_id UUID, 
	id UUID NOT NULL, 
	titulo VARCHAR(255) NOT NULL, 
	descricao TEXT, 
	valor NUMERIC(15, 2), 
	cliente_id UUID NOT NULL, 
	projeto_id UUID, 
	deal_id UUID, 
	from_pre_proposal_id UUID, 
	status VARCHAR(50) NOT NULL, 
	usuario_id UUID, 
	updated_by_user_id UUID, 
	validade_ate DATE, 
	slug VARCHAR(64), 
	landing_content JSON, 
	currency VARCHAR(3) NOT NULL, 
	total_value_cents INTEGER, 
	public_token VARCHAR(64), 
	accepted_at TIMESTAMP WITH TIME ZONE, 
	accepted_by_name VARCHAR(255), 
	accepted_ip VARCHAR(45), 
	accepted_user_agent TEXT, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(tenant_id) REFERENCES tenants (id) ON DELETE CASCADE, 
	FOREIGN KEY(cliente_id) REFERENCES clientes (id), 
	FOREIGN KEY(projeto_id) REFERENCES projetos (id), 
	FOREIGN KEY(deal_id) REFERENCES deals (id) ON DELETE SET NULL, 
	FOREIGN KEY(from_pre_proposal_id) REFERENCES pre_proposals (id) ON DELETE SET NULL, 
	FOREIGN KEY(usuario_id) REFERENCES usuarios (id), 
	FOREIGN KEY(updated_by_user_id) REFERENCES usuarios (id) ON DELETE SET NULL
)

;


CREATE TABLE roles (
	id UUID NOT NULL, 
	key VARCHAR(50) NOT NULL, 
	name VARCHAR(100) NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id)
)

;


CREATE TABLE tenants (
	id UUID NOT NULL, 
	nome_negocio VARCHAR(255) NOT NULL, 
	plano VARCHAR(20) NOT NULL, 
	llm_model VARCHAR(100), 
	system_prompt TEXT, 
	openai_api_key VARCHAR(255), 
	google_calendar_token TEXT, 
	evolution_api_url VARCHAR(500), 
	evolution_api_key VARCHAR(500), 
	evolution_instance_name VARCHAR(255), 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id)
)

;


CREATE TABLE centros_custo (
	tenant_id UUID, 
	id UUID NOT NULL, 
	nome VARCHAR(255) NOT NULL, 
	codigo VARCHAR(50) NOT NULL, 
	descricao TEXT, 
	ativo BOOLEAN NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(tenant_id) REFERENCES tenants (id) ON DELETE CASCADE, 
	UNIQUE (codigo)
)

;


CREATE TABLE contas_bancarias (
	tenant_id UUID, 
	id UUID NOT NULL, 
	nome_banco VARCHAR(255) NOT NULL, 
	agencia VARCHAR(20), 
	numero_conta VARCHAR(30), 
	tipo_conta VARCHAR(20) NOT NULL, 
	saldo_inicial NUMERIC(15, 2) NOT NULL, 
	pix_chave VARCHAR(255), 
	titular VARCHAR(255), 
	ativo BOOLEAN NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(tenant_id) REFERENCES tenants (id) ON DELETE CASCADE
)

;


CREATE TABLE deal_tags (
	tenant_id UUID, 
	id UUID NOT NULL, 
	name VARCHAR(100) NOT NULL, 
	color VARCHAR(20), 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(tenant_id) REFERENCES tenants (id) ON DELETE CASCADE, 
	UNIQUE (name)
)

;


CREATE TABLE email_outbox (
	tenant_id UUID, 
	id UUID NOT NULL, 
	to_email VARCHAR(255) NOT NULL, 
	subject VARCHAR(500) NOT NULL, 
	html_body TEXT NOT NULL, 
	status VARCHAR(50) NOT NULL, 
	provider_message_id VARCHAR(255), 
	error_text TEXT, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	sent_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id), 
	FOREIGN KEY(tenant_id) REFERENCES tenants (id) ON DELETE CASCADE
)

;


CREATE TABLE pre_proposal_answers (
	id UUID NOT NULL, 
	pre_proposal_id UUID NOT NULL, 
	step_key VARCHAR(50) NOT NULL, 
	field_key VARCHAR(100) NOT NULL, 
	answer_json JSONB NOT NULL, 
	weight INTEGER, 
	score INTEGER, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(pre_proposal_id) REFERENCES pre_proposals (id) ON DELETE CASCADE
)

;


CREATE TABLE proposal_analytics_summary (
	id UUID NOT NULL, 
	proposta_id UUID NOT NULL, 
	date TIMESTAMP WITH TIME ZONE NOT NULL, 
	total_sessions INTEGER, 
	unique_devices INTEGER, 
	total_events INTEGER, 
	avg_duration_seconds FLOAT, 
	avg_scroll_percent FLOAT, 
	total_clicks INTEGER, 
	cta_clicks INTEGER, 
	whatsapp_clicks INTEGER, 
	mobile_sessions INTEGER, 
	desktop_sessions INTEGER, 
	returning_sessions INTEGER, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(proposta_id) REFERENCES propostas (id) ON DELETE CASCADE
)

;


CREATE TABLE proposal_pricing_plans (
	tenant_id UUID, 
	id UUID NOT NULL, 
	proposal_id UUID NOT NULL, 
	plan_name VARCHAR(255) NOT NULL, 
	plan_summary TEXT, 
	includes_json JSONB NOT NULL, 
	timeline_text TEXT, 
	price_cents INTEGER NOT NULL, 
	payment_terms_text TEXT, 
	is_recommended VARCHAR(20) DEFAULT 'false' NOT NULL, 
	is_selected_default VARCHAR(20) DEFAULT 'false' NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(tenant_id) REFERENCES tenants (id) ON DELETE CASCADE, 
	FOREIGN KEY(proposal_id) REFERENCES propostas (id) ON DELETE CASCADE
)

;


CREATE TABLE proposal_sections (
	tenant_id UUID, 
	id UUID NOT NULL, 
	proposal_id UUID NOT NULL, 
	section_key VARCHAR(50) NOT NULL, 
	title VARCHAR(255) NOT NULL, 
	content_json JSONB NOT NULL, 
	order_index INTEGER NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(tenant_id) REFERENCES tenants (id) ON DELETE CASCADE, 
	FOREIGN KEY(proposal_id) REFERENCES propostas (id) ON DELETE CASCADE
)

;


CREATE TABLE proposal_sessions (
	id UUID NOT NULL, 
	proposta_id UUID NOT NULL, 
	session_id VARCHAR(64) NOT NULL, 
	device_id VARCHAR(128), 
	device_type VARCHAR(20), 
	browser VARCHAR(100), 
	os VARCHAR(100), 
	screen_width INTEGER, 
	screen_height INTEGER, 
	ip_address VARCHAR(45), 
	country VARCHAR(100), 
	city VARCHAR(100), 
	referrer TEXT, 
	utm_source VARCHAR(100), 
	utm_medium VARCHAR(100), 
	utm_campaign VARCHAR(100), 
	started_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	ended_at TIMESTAMP WITH TIME ZONE, 
	duration_seconds FLOAT, 
	is_returning BOOLEAN, 
	max_scroll_percent INTEGER, 
	total_clicks INTEGER, 
	sections_viewed INTEGER, 
	time_to_first_interaction FLOAT, 
	exit_intent_detected BOOLEAN, 
	exit_section VARCHAR(100), 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(proposta_id) REFERENCES propostas (id) ON DELETE CASCADE
)

;


CREATE TABLE proposal_status_events (
	tenant_id UUID, 
	id UUID NOT NULL, 
	proposal_id UUID NOT NULL, 
	event_type VARCHAR(50) NOT NULL, 
	payload_json JSONB, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(tenant_id) REFERENCES tenants (id) ON DELETE CASCADE, 
	FOREIGN KEY(proposal_id) REFERENCES propostas (id) ON DELETE CASCADE
)

;


CREATE TABLE role_permissions (
	id UUID NOT NULL, 
	role_id UUID NOT NULL, 
	permission_id UUID NOT NULL, 
	PRIMARY KEY (id), 
	CONSTRAINT uq_role_permission UNIQUE (role_id, permission_id), 
	FOREIGN KEY(role_id) REFERENCES roles (id) ON DELETE CASCADE, 
	FOREIGN KEY(permission_id) REFERENCES permissions (id) ON DELETE CASCADE
)

;


CREATE TABLE usuarios (
	tenant_id UUID, 
	id UUID NOT NULL, 
	email VARCHAR(255) NOT NULL, 
	hashed_password VARCHAR(255) NOT NULL, 
	nome VARCHAR(255) NOT NULL, 
	ativo BOOLEAN NOT NULL, 
	avatar_url TEXT, 
	bio TEXT, 
	phone VARCHAR(50), 
	presence_status VARCHAR(20), 
	notification_prefs JSONB, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(tenant_id) REFERENCES tenants (id) ON DELETE CASCADE
)

;


CREATE TABLE audit_events (
	id UUID NOT NULL, 
	event_type VARCHAR(50) NOT NULL, 
	actor_user_id UUID, 
	target_user_id UUID, 
	context_type VARCHAR(50), 
	context_id VARCHAR(255), 
	payload TEXT, 
	ip_address VARCHAR(45), 
	user_agent VARCHAR(500), 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(actor_user_id) REFERENCES usuarios (id) ON DELETE SET NULL, 
	FOREIGN KEY(target_user_id) REFERENCES usuarios (id) ON DELETE SET NULL
)

;


CREATE TABLE clientes (
	tenant_id UUID, 
	id UUID NOT NULL, 
	tipo VARCHAR(2) NOT NULL, 
	nome VARCHAR(255) NOT NULL, 
	razao_social VARCHAR(255), 
	cpf VARCHAR(14), 
	cnpj VARCHAR(18), 
	rg VARCHAR(20), 
	inscricao_estadual VARCHAR(20), 
	email VARCHAR(255), 
	telefone VARCHAR(50), 
	celular VARCHAR(50), 
	cep VARCHAR(9), 
	endereco VARCHAR(255), 
	numero VARCHAR(20), 
	complemento VARCHAR(100), 
	bairro VARCHAR(100), 
	cidade VARCHAR(100), 
	estado VARCHAR(2), 
	logo_url VARCHAR(1000), 
	usuario_id UUID, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(tenant_id) REFERENCES tenants (id) ON DELETE CASCADE, 
	FOREIGN KEY(usuario_id) REFERENCES usuarios (id)
)

;


CREATE TABLE conversations (
	id UUID NOT NULL, 
	kind conversationkind NOT NULL, 
	created_by_user_id UUID, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(created_by_user_id) REFERENCES usuarios (id) ON DELETE SET NULL
)

;


CREATE TABLE deal_activities (
	tenant_id UUID, 
	id UUID NOT NULL, 
	deal_id UUID NOT NULL, 
	type VARCHAR(20) NOT NULL, 
	title VARCHAR(255) NOT NULL, 
	due_at TIMESTAMP WITH TIME ZONE, 
	done_at TIMESTAMP WITH TIME ZONE, 
	created_by_user_id UUID, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(tenant_id) REFERENCES tenants (id) ON DELETE CASCADE, 
	FOREIGN KEY(deal_id) REFERENCES deals (id) ON DELETE CASCADE, 
	FOREIGN KEY(created_by_user_id) REFERENCES usuarios (id) ON DELETE SET NULL
)

;


CREATE TABLE deal_assignees (
	tenant_id UUID, 
	id UUID NOT NULL, 
	deal_id UUID NOT NULL, 
	user_id UUID NOT NULL, 
	role VARCHAR(20) NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(tenant_id) REFERENCES tenants (id) ON DELETE CASCADE, 
	FOREIGN KEY(deal_id) REFERENCES deals (id) ON DELETE CASCADE, 
	FOREIGN KEY(user_id) REFERENCES usuarios (id) ON DELETE CASCADE
)

;


CREATE TABLE deal_notes (
	tenant_id UUID, 
	id UUID NOT NULL, 
	deal_id UUID NOT NULL, 
	author_user_id UUID, 
	content TEXT NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(tenant_id) REFERENCES tenants (id) ON DELETE CASCADE, 
	FOREIGN KEY(deal_id) REFERENCES deals (id) ON DELETE CASCADE, 
	FOREIGN KEY(author_user_id) REFERENCES usuarios (id) ON DELETE SET NULL
)

;


CREATE TABLE deal_tag_links (
	tenant_id UUID, 
	id UUID NOT NULL, 
	deal_id UUID NOT NULL, 
	tag_id UUID NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(tenant_id) REFERENCES tenants (id) ON DELETE CASCADE, 
	FOREIGN KEY(deal_id) REFERENCES deals (id) ON DELETE CASCADE, 
	FOREIGN KEY(tag_id) REFERENCES deal_tags (id) ON DELETE CASCADE
)

;


CREATE TABLE despesas_fixas (
	tenant_id UUID, 
	id UUID NOT NULL, 
	descricao VARCHAR(500) NOT NULL, 
	valor NUMERIC(15, 2) NOT NULL, 
	categoria VARCHAR(30) NOT NULL, 
	fornecedor VARCHAR(255), 
	dia_vencimento INTEGER NOT NULL, 
	forma_pagamento VARCHAR(20), 
	centro_custo_id UUID, 
	conta_bancaria_id UUID, 
	ativo BOOLEAN NOT NULL, 
	observacoes TEXT, 
	created_by_user_id UUID, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(tenant_id) REFERENCES tenants (id) ON DELETE CASCADE, 
	FOREIGN KEY(centro_custo_id) REFERENCES centros_custo (id) ON DELETE SET NULL, 
	FOREIGN KEY(conta_bancaria_id) REFERENCES contas_bancarias (id) ON DELETE SET NULL, 
	FOREIGN KEY(created_by_user_id) REFERENCES usuarios (id) ON DELETE SET NULL
)

;


CREATE TABLE funcionarios (
	id UUID NOT NULL, 
	nome VARCHAR(255) NOT NULL, 
	cpf VARCHAR(14), 
	email VARCHAR(255), 
	telefone VARCHAR(20), 
	cargo VARCHAR(255), 
	departamento VARCHAR(255), 
	data_admissao DATE, 
	data_demissao DATE, 
	tipo_contrato VARCHAR(20) NOT NULL, 
	salario_bruto NUMERIC(15, 2) NOT NULL, 
	vale_transporte NUMERIC(15, 2), 
	vale_refeicao NUMERIC(15, 2), 
	plano_saude NUMERIC(15, 2), 
	outros_beneficios NUMERIC(15, 2), 
	centro_custo_id UUID, 
	ativo BOOLEAN NOT NULL, 
	observacoes TEXT, 
	created_by_user_id UUID, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	UNIQUE (cpf), 
	FOREIGN KEY(centro_custo_id) REFERENCES centros_custo (id) ON DELETE SET NULL, 
	FOREIGN KEY(created_by_user_id) REFERENCES usuarios (id) ON DELETE SET NULL
)

;


CREATE TABLE notifications (
	id UUID NOT NULL, 
	type VARCHAR(50) NOT NULL, 
	title VARCHAR(255) NOT NULL, 
	body TEXT NOT NULL, 
	priority VARCHAR(20) NOT NULL, 
	author_user_id UUID, 
	context_type VARCHAR(50), 
	context_id VARCHAR(255), 
	action_url TEXT, 
	extra_data JSONB, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(author_user_id) REFERENCES usuarios (id) ON DELETE SET NULL
)

;


CREATE TABLE pipelines (
	tenant_id UUID, 
	id UUID NOT NULL, 
	name VARCHAR(255) NOT NULL, 
	description TEXT, 
	is_default BOOLEAN NOT NULL, 
	created_by_user_id UUID, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(tenant_id) REFERENCES tenants (id) ON DELETE CASCADE, 
	FOREIGN KEY(created_by_user_id) REFERENCES usuarios (id) ON DELETE SET NULL
)

;


CREATE TABLE proposal_events (
	id UUID NOT NULL, 
	session_id UUID NOT NULL, 
	proposta_id UUID NOT NULL, 
	event_type VARCHAR(50) NOT NULL, 
	element_id VARCHAR(100), 
	section_id VARCHAR(100), 
	section_type VARCHAR(50), 
	value FLOAT, 
	value_string VARCHAR(255), 
	event_metadata JSON, 
	scroll_position INTEGER, 
	viewport_height INTEGER, 
	client_timestamp TIMESTAMP WITH TIME ZONE, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(session_id) REFERENCES proposal_sessions (id) ON DELETE CASCADE, 
	FOREIGN KEY(proposta_id) REFERENCES propostas (id) ON DELETE CASCADE
)

;


CREATE TABLE task_databases (
	id UUID NOT NULL, 
	name VARCHAR(255) NOT NULL, 
	description TEXT, 
	is_default BOOLEAN NOT NULL, 
	created_by_user_id UUID, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(created_by_user_id) REFERENCES usuarios (id) ON DELETE SET NULL
)

;


CREATE TABLE user_roles (
	id UUID NOT NULL, 
	user_id UUID NOT NULL, 
	role_id UUID NOT NULL, 
	PRIMARY KEY (id), 
	CONSTRAINT uq_user_role UNIQUE (user_id, role_id), 
	FOREIGN KEY(user_id) REFERENCES usuarios (id) ON DELETE CASCADE, 
	FOREIGN KEY(role_id) REFERENCES roles (id) ON DELETE CASCADE
)

;


CREATE TABLE whatsapp_connections (
	tenant_id UUID, 
	id UUID NOT NULL, 
	name VARCHAR(255) NOT NULL, 
	phone_number VARCHAR(20), 
	provider VARCHAR(20) NOT NULL, 
	api_url VARCHAR(500) NOT NULL, 
	api_key VARCHAR(500) NOT NULL, 
	instance_name VARCHAR(255), 
	status VARCHAR(20) NOT NULL, 
	webhook_url VARCHAR(500), 
	created_by_user_id UUID, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(tenant_id) REFERENCES tenants (id) ON DELETE CASCADE, 
	FOREIGN KEY(created_by_user_id) REFERENCES usuarios (id) ON DELETE SET NULL
)

;


CREATE TABLE ai_agents (
	tenant_id UUID, 
	id UUID NOT NULL, 
	name VARCHAR(255) NOT NULL, 
	description TEXT, 
	avatar_url TEXT, 
	system_prompt TEXT NOT NULL, 
	provider VARCHAR(20) NOT NULL, 
	model VARCHAR(100) NOT NULL, 
	temperature FLOAT NOT NULL, 
	max_tokens INTEGER, 
	tools_json JSONB, 
	knowledge_base_json JSONB, 
	whatsapp_connection_id UUID, 
	is_active BOOLEAN NOT NULL, 
	created_by_user_id UUID, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(tenant_id) REFERENCES tenants (id) ON DELETE CASCADE, 
	FOREIGN KEY(whatsapp_connection_id) REFERENCES whatsapp_connections (id) ON DELETE SET NULL, 
	FOREIGN KEY(created_by_user_id) REFERENCES usuarios (id) ON DELETE SET NULL
)

;


CREATE TABLE cliente_contatos_operacionais (
	id UUID NOT NULL, 
	cliente_id UUID NOT NULL, 
	nome VARCHAR(255) NOT NULL, 
	cargo VARCHAR(255), 
	email VARCHAR(255), 
	telefone VARCHAR(50), 
	observacao TEXT, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(cliente_id) REFERENCES clientes (id) ON DELETE CASCADE
)

;


CREATE TABLE cliente_cronograma_etapas (
	id UUID NOT NULL, 
	cliente_id UUID NOT NULL, 
	ordem INTEGER NOT NULL, 
	titulo VARCHAR(255) NOT NULL, 
	descricao TEXT, 
	cor VARCHAR(20), 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(cliente_id) REFERENCES clientes (id) ON DELETE CASCADE
)

;


CREATE TABLE cliente_documentos_rag (
	id UUID NOT NULL, 
	cliente_id UUID NOT NULL, 
	nome_original VARCHAR(500) NOT NULL, 
	nome_storage VARCHAR(500) NOT NULL, 
	url VARCHAR(1000) NOT NULL, 
	content_type VARCHAR(100), 
	tamanho_bytes INTEGER, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(cliente_id) REFERENCES clientes (id) ON DELETE CASCADE
)

;


CREATE TABLE cliente_imagens (
	id UUID NOT NULL, 
	cliente_id UUID NOT NULL, 
	nome_original VARCHAR(500) NOT NULL, 
	nome_storage VARCHAR(500) NOT NULL, 
	url VARCHAR(1000) NOT NULL, 
	content_type VARCHAR(100), 
	tamanho_bytes INTEGER, 
	descricao VARCHAR(500), 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(cliente_id) REFERENCES clientes (id) ON DELETE CASCADE
)

;


CREATE TABLE cliente_meta_whatsapp (
	id UUID NOT NULL, 
	cliente_id UUID NOT NULL, 
	nome_aplicativo VARCHAR(255), 
	numero_oficial VARCHAR(50), 
	token_acesso TEXT, 
	business_manager_id VARCHAR(100), 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	UNIQUE (cliente_id), 
	FOREIGN KEY(cliente_id) REFERENCES clientes (id) ON DELETE CASCADE
)

;


CREATE TABLE cliente_onboarding (
	id UUID NOT NULL, 
	cliente_id UUID NOT NULL, 
	quem_somos TEXT, 
	o_que_vendemos TEXT, 
	para_quem_vendemos TEXT, 
	diferenciais TEXT, 
	perguntas_frequentes TEXT, 
	logo_url VARCHAR(500), 
	fotos_urls TEXT, 
	redes_sociais TEXT, 
	conteudo_base_site TEXT, 
	conteudo_reutilizavel_bot TEXT, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	UNIQUE (cliente_id), 
	FOREIGN KEY(cliente_id) REFERENCES clientes (id) ON DELETE CASCADE
)

;


CREATE TABLE conversation_participants (
	id UUID NOT NULL, 
	conversation_id UUID NOT NULL, 
	user_id UUID NOT NULL, 
	last_read_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id), 
	FOREIGN KEY(conversation_id) REFERENCES conversations (id) ON DELETE CASCADE, 
	FOREIGN KEY(user_id) REFERENCES usuarios (id) ON DELETE CASCADE
)

;


CREATE TABLE leads (
	tenant_id UUID, 
	id UUID NOT NULL, 
	nome VARCHAR(255) NOT NULL, 
	email VARCHAR(255), 
	telefone VARCHAR(50), 
	whatsapp VARCHAR(50), 
	empresa VARCHAR(255), 
	cargo VARCHAR(255), 
	site VARCHAR(500), 
	cidade VARCHAR(100), 
	estado VARCHAR(2), 
	temperatura VARCHAR(20) NOT NULL, 
	status VARCHAR(30) NOT NULL, 
	score INTEGER, 
	origem VARCHAR(100), 
	origem_detalhe VARCHAR(500), 
	utm_source VARCHAR(255), 
	utm_medium VARCHAR(255), 
	utm_campaign VARCHAR(255), 
	utm_term VARCHAR(255), 
	utm_content VARCHAR(255), 
	landing_page VARCHAR(500), 
	referrer VARCHAR(500), 
	interesse TEXT, 
	necessidade TEXT, 
	orcamento_estimado FLOAT, 
	responsavel_id UUID, 
	cliente_id UUID, 
	proxima_acao VARCHAR(500), 
	proxima_acao_data TIMESTAMP WITH TIME ZONE, 
	motivo_perda VARCHAR(500), 
	observacoes TEXT, 
	criado_por_id UUID, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	convertido_em TIMESTAMP WITH TIME ZONE, 
	ultimo_contato TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id), 
	FOREIGN KEY(tenant_id) REFERENCES tenants (id) ON DELETE CASCADE, 
	FOREIGN KEY(responsavel_id) REFERENCES usuarios (id), 
	FOREIGN KEY(cliente_id) REFERENCES clientes (id), 
	FOREIGN KEY(criado_por_id) REFERENCES usuarios (id)
)

;


CREATE TABLE messages (
	id UUID NOT NULL, 
	conversation_id UUID NOT NULL, 
	author_user_id UUID, 
	content TEXT NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	edited_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id), 
	FOREIGN KEY(conversation_id) REFERENCES conversations (id) ON DELETE CASCADE, 
	FOREIGN KEY(author_user_id) REFERENCES usuarios (id) ON DELETE SET NULL
)

;


CREATE TABLE notification_recipients (
	id UUID NOT NULL, 
	notification_id UUID NOT NULL, 
	recipient_user_id UUID NOT NULL, 
	delivered_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	read_at TIMESTAMP WITH TIME ZONE, 
	archived_at TIMESTAMP WITH TIME ZONE, 
	pinned_at TIMESTAMP WITH TIME ZONE, 
	muted BOOLEAN NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(notification_id) REFERENCES notifications (id) ON DELETE CASCADE, 
	FOREIGN KEY(recipient_user_id) REFERENCES usuarios (id) ON DELETE CASCADE
)

;


CREATE TABLE pipeline_stages (
	tenant_id UUID, 
	id UUID NOT NULL, 
	pipeline_id UUID NOT NULL, 
	name VARCHAR(255) NOT NULL, 
	key VARCHAR(50), 
	order_index INTEGER NOT NULL, 
	wip_limit INTEGER, 
	color VARCHAR(20), 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(tenant_id) REFERENCES tenants (id) ON DELETE CASCADE, 
	FOREIGN KEY(pipeline_id) REFERENCES pipelines (id) ON DELETE CASCADE
)

;


CREATE TABLE projetos (
	tenant_id UUID, 
	id UUID NOT NULL, 
	tipo VARCHAR(50) NOT NULL, 
	nome VARCHAR(255) NOT NULL, 
	descricao TEXT, 
	cliente_id UUID NOT NULL, 
	status VARCHAR(50) NOT NULL, 
	usuario_id UUID, 
	data_inicio DATE, 
	data_fim DATE, 
	valor_orcado NUMERIC(15, 2), 
	valor_realizado NUMERIC(15, 2), 
	moeda VARCHAR(3) NOT NULL, 
	observacoes_financeiras TEXT, 
	budget_cents BIGINT NOT NULL, 
	expected_revenue_cents BIGINT NOT NULL, 
	actual_revenue_cents BIGINT NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(tenant_id) REFERENCES tenants (id) ON DELETE CASCADE, 
	FOREIGN KEY(cliente_id) REFERENCES clientes (id), 
	FOREIGN KEY(usuario_id) REFERENCES usuarios (id)
)

;


CREATE TABLE task_properties (
	id UUID NOT NULL, 
	task_database_id UUID NOT NULL, 
	key VARCHAR(100) NOT NULL, 
	name VARCHAR(255) NOT NULL, 
	type VARCHAR(50) NOT NULL, 
	config_json JSONB, 
	order_index INTEGER NOT NULL, 
	is_required BOOLEAN NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(task_database_id) REFERENCES task_databases (id) ON DELETE CASCADE
)

;


CREATE TABLE task_templates (
	id UUID NOT NULL, 
	task_database_id UUID NOT NULL, 
	name VARCHAR(255) NOT NULL, 
	description TEXT, 
	default_blocks_json JSONB, 
	default_property_values_json JSONB, 
	created_by_user_id UUID, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(task_database_id) REFERENCES task_databases (id) ON DELETE CASCADE, 
	FOREIGN KEY(created_by_user_id) REFERENCES usuarios (id) ON DELETE SET NULL
)

;


CREATE TABLE task_views (
	id UUID NOT NULL, 
	task_database_id UUID NOT NULL, 
	user_id UUID NOT NULL, 
	name VARCHAR(255) NOT NULL, 
	type VARCHAR(50) NOT NULL, 
	config_json JSONB, 
	is_default BOOLEAN NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(task_database_id) REFERENCES task_databases (id) ON DELETE CASCADE, 
	FOREIGN KEY(user_id) REFERENCES usuarios (id) ON DELETE CASCADE
)

;


CREATE TABLE agent_conversations (
	tenant_id UUID, 
	id UUID NOT NULL, 
	agent_id UUID NOT NULL, 
	external_phone VARCHAR(20), 
	channel VARCHAR(20) NOT NULL, 
	status VARCHAR(20) NOT NULL, 
	messages_json JSONB, 
	started_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	ended_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id), 
	FOREIGN KEY(tenant_id) REFERENCES tenants (id) ON DELETE CASCADE, 
	FOREIGN KEY(agent_id) REFERENCES ai_agents (id) ON DELETE CASCADE
)

;


CREATE TABLE campaigns (
	tenant_id UUID, 
	id UUID NOT NULL, 
	name VARCHAR(255) NOT NULL, 
	description TEXT, 
	type VARCHAR(20) NOT NULL, 
	status VARCHAR(20) NOT NULL, 
	config_json JSONB, 
	agent_id UUID, 
	whatsapp_connection_id UUID, 
	total_leads_found INTEGER NOT NULL, 
	created_by_user_id UUID, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(tenant_id) REFERENCES tenants (id) ON DELETE CASCADE, 
	FOREIGN KEY(agent_id) REFERENCES ai_agents (id) ON DELETE SET NULL, 
	FOREIGN KEY(whatsapp_connection_id) REFERENCES whatsapp_connections (id) ON DELETE SET NULL, 
	FOREIGN KEY(created_by_user_id) REFERENCES usuarios (id) ON DELETE SET NULL
)

;


CREATE TABLE cliente_cronograma_itens (
	id UUID NOT NULL, 
	etapa_id UUID NOT NULL, 
	ordem INTEGER NOT NULL, 
	texto VARCHAR(500) NOT NULL, 
	concluido BOOLEAN NOT NULL, 
	categoria VARCHAR(100), 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(etapa_id) REFERENCES cliente_cronograma_etapas (id) ON DELETE CASCADE
)

;


CREATE TABLE contas_pagar (
	tenant_id UUID, 
	id UUID NOT NULL, 
	descricao VARCHAR(500) NOT NULL, 
	fornecedor VARCHAR(255), 
	categoria VARCHAR(30) NOT NULL, 
	valor NUMERIC(15, 2) NOT NULL, 
	data_vencimento DATE NOT NULL, 
	data_pagamento DATE, 
	status VARCHAR(20) NOT NULL, 
	forma_pagamento VARCHAR(20), 
	observacoes TEXT, 
	recorrencia VARCHAR(20) NOT NULL, 
	parcela_atual INTEGER, 
	total_parcelas INTEGER, 
	documento_referencia VARCHAR(255), 
	projeto_id UUID, 
	centro_custo_id UUID, 
	conta_bancaria_id UUID, 
	despesa_fixa_id UUID, 
	created_by_user_id UUID, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(tenant_id) REFERENCES tenants (id) ON DELETE CASCADE, 
	FOREIGN KEY(projeto_id) REFERENCES projetos (id) ON DELETE SET NULL, 
	FOREIGN KEY(centro_custo_id) REFERENCES centros_custo (id) ON DELETE SET NULL, 
	FOREIGN KEY(conta_bancaria_id) REFERENCES contas_bancarias (id) ON DELETE SET NULL, 
	FOREIGN KEY(despesa_fixa_id) REFERENCES despesas_fixas (id) ON DELETE SET NULL, 
	FOREIGN KEY(created_by_user_id) REFERENCES usuarios (id) ON DELETE SET NULL
)

;


CREATE TABLE contas_receber (
	tenant_id UUID, 
	id UUID NOT NULL, 
	descricao VARCHAR(500) NOT NULL, 
	cliente_id UUID, 
	cliente_nome VARCHAR(255), 
	categoria VARCHAR(30) NOT NULL, 
	valor NUMERIC(15, 2) NOT NULL, 
	data_vencimento DATE NOT NULL, 
	data_recebimento DATE, 
	status VARCHAR(20) NOT NULL, 
	forma_pagamento VARCHAR(20), 
	observacoes TEXT, 
	recorrencia VARCHAR(20) NOT NULL, 
	parcela_atual INTEGER, 
	total_parcelas INTEGER, 
	documento_referencia VARCHAR(255), 
	projeto_id UUID, 
	centro_custo_id UUID, 
	conta_bancaria_id UUID, 
	created_by_user_id UUID, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(tenant_id) REFERENCES tenants (id) ON DELETE CASCADE, 
	FOREIGN KEY(cliente_id) REFERENCES clientes (id) ON DELETE SET NULL, 
	FOREIGN KEY(projeto_id) REFERENCES projetos (id) ON DELETE SET NULL, 
	FOREIGN KEY(centro_custo_id) REFERENCES centros_custo (id) ON DELETE SET NULL, 
	FOREIGN KEY(conta_bancaria_id) REFERENCES contas_bancarias (id) ON DELETE SET NULL, 
	FOREIGN KEY(created_by_user_id) REFERENCES usuarios (id) ON DELETE SET NULL
)

;


CREATE TABLE deal_stage_history (
	tenant_id UUID, 
	id UUID NOT NULL, 
	deal_id UUID NOT NULL, 
	from_stage_id UUID, 
	to_stage_id UUID NOT NULL, 
	moved_by_user_id UUID, 
	moved_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	reason TEXT, 
	extra_metadata TEXT, 
	PRIMARY KEY (id), 
	FOREIGN KEY(tenant_id) REFERENCES tenants (id) ON DELETE CASCADE, 
	FOREIGN KEY(deal_id) REFERENCES deals (id) ON DELETE CASCADE, 
	FOREIGN KEY(from_stage_id) REFERENCES pipeline_stages (id) ON DELETE SET NULL, 
	FOREIGN KEY(to_stage_id) REFERENCES pipeline_stages (id) ON DELETE RESTRICT, 
	FOREIGN KEY(moved_by_user_id) REFERENCES usuarios (id) ON DELETE SET NULL
)

;


CREATE TABLE lead_conversations (
	tenant_id UUID, 
	id UUID NOT NULL, 
	lead_id UUID NOT NULL, 
	agent_id UUID, 
	whatsapp_connection_id UUID, 
	remote_jid VARCHAR(255), 
	status VARCHAR(20) NOT NULL, 
	started_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	ended_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id), 
	FOREIGN KEY(tenant_id) REFERENCES tenants (id) ON DELETE CASCADE, 
	FOREIGN KEY(lead_id) REFERENCES leads (id) ON DELETE CASCADE, 
	FOREIGN KEY(agent_id) REFERENCES ai_agents (id) ON DELETE SET NULL, 
	FOREIGN KEY(whatsapp_connection_id) REFERENCES whatsapp_connections (id) ON DELETE SET NULL
)

;


CREATE TABLE message_to_notification_links (
	id UUID NOT NULL, 
	message_id UUID NOT NULL, 
	recipient_user_id UUID NOT NULL, 
	notification_recipient_id UUID, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(message_id) REFERENCES messages (id) ON DELETE CASCADE, 
	FOREIGN KEY(recipient_user_id) REFERENCES usuarios (id) ON DELETE CASCADE, 
	FOREIGN KEY(notification_recipient_id) REFERENCES notification_recipients (id) ON DELETE SET NULL
)

;


CREATE TABLE project_expenses (
	tenant_id UUID, 
	id UUID NOT NULL, 
	project_id UUID NOT NULL, 
	title VARCHAR(255) NOT NULL, 
	category VARCHAR(15) NOT NULL, 
	amount_cents BIGINT NOT NULL, 
	occurred_at DATE NOT NULL, 
	vendor VARCHAR(255), 
	notes TEXT, 
	created_by_id UUID, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(tenant_id) REFERENCES tenants (id) ON DELETE CASCADE, 
	FOREIGN KEY(project_id) REFERENCES projetos (id), 
	FOREIGN KEY(created_by_id) REFERENCES usuarios (id)
)

;


CREATE TABLE tarefas (
	tenant_id UUID, 
	id UUID NOT NULL, 
	titulo VARCHAR(255) NOT NULL, 
	descricao TEXT, 
	projeto_id UUID, 
	status VARCHAR(50) NOT NULL, 
	prioridade VARCHAR(20), 
	responsavel_id UUID, 
	data_vencimento DATE, 
	is_recurring BOOLEAN NOT NULL, 
	recurrence_type VARCHAR(20), 
	recurrence_interval INTEGER, 
	recurrence_end_date DATE, 
	parent_task_id UUID, 
	task_database_id UUID, 
	context_type VARCHAR(50), 
	context_id UUID, 
	completed_at TIMESTAMP WITH TIME ZONE, 
	completed_by_user_id UUID, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(tenant_id) REFERENCES tenants (id) ON DELETE CASCADE, 
	FOREIGN KEY(projeto_id) REFERENCES projetos (id), 
	FOREIGN KEY(responsavel_id) REFERENCES usuarios (id), 
	FOREIGN KEY(parent_task_id) REFERENCES tarefas (id), 
	FOREIGN KEY(task_database_id) REFERENCES task_databases (id) ON DELETE SET NULL, 
	FOREIGN KEY(completed_by_user_id) REFERENCES usuarios (id) ON DELETE SET NULL
)

;


CREATE TABLE campaign_leads (
	tenant_id UUID, 
	id UUID NOT NULL, 
	campaign_id UUID NOT NULL, 
	business_name VARCHAR(500) NOT NULL, 
	phone VARCHAR(30), 
	email VARCHAR(255), 
	website VARCHAR(500), 
	address TEXT, 
	city VARCHAR(255), 
	state VARCHAR(100), 
	category VARCHAR(255), 
	rating FLOAT, 
	source VARCHAR(20) NOT NULL, 
	status VARCHAR(20) NOT NULL, 
	metadata_json JSONB, 
	found_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	contacted_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id), 
	FOREIGN KEY(tenant_id) REFERENCES tenants (id) ON DELETE CASCADE, 
	FOREIGN KEY(campaign_id) REFERENCES campaigns (id) ON DELETE CASCADE
)

;


CREATE TABLE lead_messages (
	tenant_id UUID, 
	id UUID NOT NULL, 
	conversation_id UUID NOT NULL, 
	role VARCHAR(20) NOT NULL, 
	content TEXT NOT NULL, 
	sent_via VARCHAR(20) NOT NULL, 
	whatsapp_message_id VARCHAR(255), 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(tenant_id) REFERENCES tenants (id) ON DELETE CASCADE, 
	FOREIGN KEY(conversation_id) REFERENCES lead_conversations (id) ON DELETE CASCADE
)

;


CREATE TABLE tarefa_assignees (
	tenant_id UUID, 
	id UUID NOT NULL, 
	tarefa_id UUID NOT NULL, 
	usuario_id UUID NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(tenant_id) REFERENCES tenants (id) ON DELETE CASCADE, 
	FOREIGN KEY(tarefa_id) REFERENCES tarefas (id) ON DELETE CASCADE, 
	FOREIGN KEY(usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE
)

;


CREATE TABLE task_attachments (
	id UUID NOT NULL, 
	task_id UUID NOT NULL, 
	uploaded_by_user_id UUID, 
	file_name VARCHAR(255) NOT NULL, 
	mime_type VARCHAR(100), 
	size_bytes BIGINT NOT NULL, 
	storage_key VARCHAR(500), 
	url VARCHAR(1000), 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(task_id) REFERENCES tarefas (id) ON DELETE CASCADE, 
	FOREIGN KEY(uploaded_by_user_id) REFERENCES usuarios (id) ON DELETE SET NULL
)

;


CREATE TABLE task_blocks (
	id UUID NOT NULL, 
	task_id UUID NOT NULL, 
	type VARCHAR(50) NOT NULL, 
	content_json JSONB, 
	order_index INTEGER NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(task_id) REFERENCES tarefas (id) ON DELETE CASCADE
)

;


CREATE TABLE task_comments (
	id UUID NOT NULL, 
	task_id UUID NOT NULL, 
	author_user_id UUID, 
	content TEXT NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(task_id) REFERENCES tarefas (id) ON DELETE CASCADE, 
	FOREIGN KEY(author_user_id) REFERENCES usuarios (id) ON DELETE SET NULL
)

;


CREATE TABLE task_property_values (
	id UUID NOT NULL, 
	task_id UUID NOT NULL, 
	property_id UUID NOT NULL, 
	value_json JSONB, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(task_id) REFERENCES tarefas (id) ON DELETE CASCADE, 
	FOREIGN KEY(property_id) REFERENCES task_properties (id) ON DELETE CASCADE
)

;


CREATE TABLE campaign_lead_conversations (
	tenant_id UUID, 
	id UUID NOT NULL, 
	campaign_lead_id UUID NOT NULL, 
	agent_id UUID, 
	whatsapp_connection_id UUID, 
	remote_jid VARCHAR(255), 
	status VARCHAR(20) NOT NULL, 
	message_count INTEGER NOT NULL, 
	interest_detected BOOLEAN NOT NULL, 
	started_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	ended_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id), 
	FOREIGN KEY(tenant_id) REFERENCES tenants (id) ON DELETE CASCADE, 
	FOREIGN KEY(campaign_lead_id) REFERENCES campaign_leads (id) ON DELETE CASCADE, 
	FOREIGN KEY(agent_id) REFERENCES ai_agents (id) ON DELETE SET NULL, 
	FOREIGN KEY(whatsapp_connection_id) REFERENCES whatsapp_connections (id) ON DELETE SET NULL
)

;


CREATE TABLE task_mentions (
	id UUID NOT NULL, 
	task_id UUID NOT NULL, 
	mentioned_user_id UUID NOT NULL, 
	comment_id UUID, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(task_id) REFERENCES tarefas (id) ON DELETE CASCADE, 
	FOREIGN KEY(mentioned_user_id) REFERENCES usuarios (id) ON DELETE CASCADE, 
	FOREIGN KEY(comment_id) REFERENCES task_comments (id) ON DELETE CASCADE
)

;


CREATE TABLE campaign_lead_messages (
	tenant_id UUID, 
	id UUID NOT NULL, 
	conversation_id UUID NOT NULL, 
	role VARCHAR(20) NOT NULL, 
	content TEXT NOT NULL, 
	sent_via VARCHAR(20) NOT NULL, 
	whatsapp_message_id VARCHAR(255), 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(tenant_id) REFERENCES tenants (id) ON DELETE CASCADE, 
	FOREIGN KEY(conversation_id) REFERENCES campaign_lead_conversations (id) ON DELETE CASCADE
)

;

