-- =====================================================================
-- Novo Labvie — Migration 0003: plugin organization do Better Auth
-- Modo assistido (PRD §8): consultor↔projetos via organização/membros/convites.
-- =====================================================================
BEGIN;

-- a organização ativa da sessão (plugin organization)
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS active_organization_id uuid;

CREATE TABLE organizations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  slug        text UNIQUE,
  logo        text,
  metadata    text,                                  -- BA serializa metadata como string
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE members (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role            text NOT NULL DEFAULT 'member',
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);
CREATE INDEX idx_members_org  ON members(organization_id);
CREATE INDEX idx_members_user ON members(user_id);

CREATE TABLE invitations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email           text NOT NULL,
  role            text,
  status          text NOT NULL DEFAULT 'pending',
  expires_at      timestamptz NOT NULL,
  inviter_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_invitations_org ON invitations(organization_id);

COMMIT;
