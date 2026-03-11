CREATE TYPE "public"."token_vault_auth_method" AS ENUM('oauth2', 'browser_login');--> statement-breakpoint
CREATE TYPE "public"."token_vault_login_detection" AS ENUM('url_pattern', 'response_intercept', 'domain_return');--> statement-breakpoint
CREATE TYPE "public"."token_vault_usage_mode" AS ENUM('token', 'session');--> statement-breakpoint
CREATE TABLE "token_vault_provider" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"icon_url" text,
	"auth_method" "token_vault_auth_method" NOT NULL,
	"usage_mode" "token_vault_usage_mode" NOT NULL,
	"login_detection_strategy" "token_vault_login_detection" DEFAULT 'url_pattern',
	"authorization_url" text,
	"token_url" text,
	"default_scopes" text,
	"login_url" text,
	"login_success_url_pattern" text,
	"auth_endpoint" text,
	"probe_url" text,
	"session_validation_endpoint" text,
	"session_cookie_name" text,
	"cookie_domains" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "token_vault_credential" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"organization_id" text,
	"provider_id" text NOT NULL,
	"auth_method" "token_vault_auth_method" NOT NULL,
	"shared" boolean DEFAULT false NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"cookies" text,
	"local_storage_tokens" text,
	"session_storage_tokens" text,
	"scope" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"stagehand_session_id" text,
	"external_account_id" text,
	"external_account_label" text,
	"revoked_at" timestamp,
	"last_validated_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "token_vault_oauth_config" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"client_id" text NOT NULL,
	"client_secret" text NOT NULL,
	"scopes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tv_oauth_config_org_provider_uniq" UNIQUE("organization_id","provider_id")
);--> statement-breakpoint
CREATE TABLE "token_vault_nonce" (
	"id" text PRIMARY KEY NOT NULL,
	"nonce" text NOT NULL UNIQUE,
	"user_id" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "token_vault_credential" ADD CONSTRAINT "token_vault_credential_provider_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."token_vault_provider"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "token_vault_oauth_config" ADD CONSTRAINT "token_vault_oauth_config_provider_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."token_vault_provider"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tv_credential_userId_idx" ON "token_vault_credential" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "tv_credential_organizationId_idx" ON "token_vault_credential" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "tv_credential_userId_providerId_idx" ON "token_vault_credential" USING btree ("user_id","provider_id");--> statement-breakpoint
CREATE INDEX "tv_oauth_config_organizationId_idx" ON "token_vault_oauth_config" USING btree ("organization_id");
