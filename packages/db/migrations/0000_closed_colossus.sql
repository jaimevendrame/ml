CREATE TYPE "public"."status_oferta" AS ENUM('pendente', 'pronto', 'enviada', 'rejeitada', 'expirada');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "categorias" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"url" text NOT NULL,
	"ativa" boolean DEFAULT true NOT NULL,
	"ultima_coleta" timestamp with time zone,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grupos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"jid" text NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"janela_inicio" integer DEFAULT 8 NOT NULL,
	"janela_fim" integer DEFAULT 22 NOT NULL,
	"intervalo_min_minutos" integer DEFAULT 5 NOT NULL,
	"ultimo_envio" timestamp with time zone,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "grupos_jid_unique" UNIQUE("jid")
);
--> statement-breakpoint
CREATE TABLE "ml_link_builder_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cookie_raw" text NOT NULL,
	"cookie_hash_preview" text,
	"tag_afiliado" text NOT NULL,
	"ativa" boolean DEFAULT true NOT NULL,
	"ultimo_uso" timestamp with time zone,
	"ultimo_erro" text,
	"ultimo_erro_em" timestamp with time zone,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ofertas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ml_item_id" text NOT NULL,
	"titulo" text NOT NULL,
	"preco_atual" numeric(10, 2) NOT NULL,
	"preco_original" numeric(10, 2),
	"desconto_pct" integer,
	"imagem_url" text,
	"permalink" text NOT NULL,
	"link_afiliado" text,
	"categoria_id" uuid,
	"status" "status_oferta" DEFAULT 'pendente' NOT NULL,
	"ml_session_id" uuid,
	"ultimo_erro" text,
	"coletado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"enriquecido_em" timestamp with time zone,
	"publicado_em" timestamp with time zone,
	CONSTRAINT "ofertas_ml_item_id_unique" UNIQUE("ml_item_id")
);
--> statement-breakpoint
CREATE TABLE "ofertas_arquivadas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ml_item_id" text NOT NULL,
	"titulo" text NOT NULL,
	"preco_atual" numeric(10, 2) NOT NULL,
	"preco_original" numeric(10, 2),
	"desconto_pct" integer,
	"imagem_url" text,
	"permalink" text NOT NULL,
	"link_afiliado" text,
	"categoria_id" uuid,
	"status" "status_oferta" NOT NULL,
	"ml_session_id" uuid,
	"ultimo_erro" text,
	"coletado_em" timestamp with time zone NOT NULL,
	"enriquecido_em" timestamp with time zone,
	"publicado_em" timestamp with time zone,
	"arquivado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "publicacoes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"oferta_id" uuid NOT NULL,
	"grupo_id" uuid NOT NULL,
	"enviado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"status" text DEFAULT 'enviado' NOT NULL,
	"erro" text
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ofertas" ADD CONSTRAINT "ofertas_categoria_id_categorias_id_fk" FOREIGN KEY ("categoria_id") REFERENCES "public"."categorias"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ofertas" ADD CONSTRAINT "ofertas_ml_session_id_ml_link_builder_sessions_id_fk" FOREIGN KEY ("ml_session_id") REFERENCES "public"."ml_link_builder_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publicacoes" ADD CONSTRAINT "publicacoes_oferta_id_ofertas_id_fk" FOREIGN KEY ("oferta_id") REFERENCES "public"."ofertas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publicacoes" ADD CONSTRAINT "publicacoes_grupo_id_grupos_id_fk" FOREIGN KEY ("grupo_id") REFERENCES "public"."grupos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_ofertas_status" ON "ofertas" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_ofertas_coletado_em" ON "ofertas" USING btree ("coletado_em");--> statement-breakpoint
CREATE INDEX "idx_publicacoes_oferta" ON "publicacoes" USING btree ("oferta_id");--> statement-breakpoint
CREATE INDEX "idx_publicacoes_grupo" ON "publicacoes" USING btree ("grupo_id");