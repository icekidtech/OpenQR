CREATE TABLE users (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email      text UNIQUE,
    name       text,
    avatar_url text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE user_identities (
    user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider     text NOT NULL,
    provider_sub text NOT NULL,
    created_at   timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (provider, provider_sub)
);
CREATE INDEX idx_user_identities_user_id ON user_identities(user_id);

CREATE TABLE batches (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name       text,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_batches_user_id ON batches(user_id);

CREATE TABLE qr_codes (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    label      text,
    url        text NOT NULL,
    settings   jsonb NOT NULL DEFAULT '{}'::jsonb,
    format     text NOT NULL DEFAULT 'png',
    batch_id   uuid REFERENCES batches(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_qr_codes_user_id ON qr_codes(user_id);
CREATE INDEX idx_qr_codes_batch_id ON qr_codes(batch_id);

CREATE TABLE refresh_tokens (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash text NOT NULL UNIQUE,
    expires_at timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
