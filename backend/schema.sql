-- =========================================================
-- NEXUS — Data Intelligence Workspace
-- PostgreSQL Database Schema
-- =========================================================

-- =========================
-- EXTENSIONS
-- =========================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- =========================
-- USERS
-- =========================

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    email VARCHAR(255) NOT NULL,
    password_hash TEXT NOT NULL,
    full_name VARCHAR(150) NOT NULL,

    role VARCHAR(30) NOT NULL DEFAULT 'USER'
        CHECK (role IN ('USER', 'ADMIN')),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT users_email_unique UNIQUE (email)
);

CREATE INDEX IF NOT EXISTS idx_users_email
    ON users(email);


-- =========================
-- DATASETS
-- =========================

CREATE TABLE IF NOT EXISTS datasets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    owner_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    name VARCHAR(255) NOT NULL,
    description TEXT,

    original_filename VARCHAR(255),
    storage_key TEXT,

    row_count BIGINT NOT NULL DEFAULT 0,
    column_count INTEGER NOT NULL DEFAULT 0,

    status VARCHAR(30) NOT NULL DEFAULT 'PROCESSING'
        CHECK (
            status IN (
                'PROCESSING',
                'READY',
                'FAILED'
            )
        ),

    error_message TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT datasets_name_not_empty
        CHECK (length(trim(name)) > 0),

    CONSTRAINT datasets_row_count_valid
        CHECK (row_count >= 0),

    CONSTRAINT datasets_column_count_valid
        CHECK (column_count >= 0)
);

CREATE INDEX IF NOT EXISTS idx_datasets_owner
    ON datasets(owner_id);

CREATE INDEX IF NOT EXISTS idx_datasets_owner_created
    ON datasets(owner_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_datasets_status
    ON datasets(status);


-- =========================
-- DATASET COLUMNS
-- =========================

CREATE TABLE IF NOT EXISTS dataset_columns (
    id BIGSERIAL PRIMARY KEY,

    dataset_id UUID NOT NULL
        REFERENCES datasets(id)
        ON DELETE CASCADE,

    column_name VARCHAR(255) NOT NULL,
    display_name VARCHAR(255) NOT NULL,

    data_type VARCHAR(30) NOT NULL
        CHECK (
            data_type IN (
                'TEXT',
                'NUMBER',
                'DATE',
                'BOOLEAN',
                'CATEGORY'
            )
        ),

    ordinal_position INTEGER NOT NULL,

    nullable_count BIGINT NOT NULL DEFAULT 0,
    distinct_count BIGINT NOT NULL DEFAULT 0,

    min_value NUMERIC,
    max_value NUMERIC,
    mean_value NUMERIC,

    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT dataset_columns_unique
        UNIQUE (dataset_id, column_name),

    CONSTRAINT dataset_columns_position_valid
        CHECK (ordinal_position >= 0),

    CONSTRAINT dataset_columns_nullable_valid
        CHECK (nullable_count >= 0),

    CONSTRAINT dataset_columns_distinct_valid
        CHECK (distinct_count >= 0)
);

CREATE INDEX IF NOT EXISTS idx_dataset_columns_dataset
    ON dataset_columns(dataset_id);

CREATE INDEX IF NOT EXISTS idx_dataset_columns_type
    ON dataset_columns(dataset_id, data_type);


-- =========================
-- DATASET ROWS
-- =========================

CREATE TABLE IF NOT EXISTS dataset_rows (
    id BIGSERIAL PRIMARY KEY,

    dataset_id UUID NOT NULL
        REFERENCES datasets(id)
        ON DELETE CASCADE,

    row_number BIGINT NOT NULL,

    data JSONB NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT dataset_rows_row_number_valid
        CHECK (row_number > 0),

    CONSTRAINT dataset_rows_unique
        UNIQUE (dataset_id, row_number)
);

CREATE INDEX IF NOT EXISTS idx_dataset_rows_dataset
    ON dataset_rows(dataset_id);

CREATE INDEX IF NOT EXISTS idx_dataset_rows_dataset_row
    ON dataset_rows(dataset_id, row_number);

CREATE INDEX IF NOT EXISTS idx_dataset_rows_data
    ON dataset_rows
    USING GIN(data);


-- =========================
-- FILTER PRESETS
-- =========================

CREATE TABLE IF NOT EXISTS filter_presets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    dataset_id UUID NOT NULL
        REFERENCES datasets(id)
        ON DELETE CASCADE,

    user_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    name VARCHAR(150) NOT NULL,

    filters JSONB NOT NULL DEFAULT '{}'::jsonb,

    sort_config JSONB NOT NULL DEFAULT '{}'::jsonb,

    visible_columns JSONB NOT NULL DEFAULT '[]'::jsonb,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT filter_presets_name_not_empty
        CHECK (length(trim(name)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_filter_presets_dataset
    ON filter_presets(dataset_id);

CREATE INDEX IF NOT EXISTS idx_filter_presets_user_dataset
    ON filter_presets(user_id, dataset_id);

CREATE INDEX IF NOT EXISTS idx_filter_presets_filters
    ON filter_presets
    USING GIN(filters);


-- =========================
-- UPDATED_AT TRIGGER
-- =========================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


DROP TRIGGER IF EXISTS trg_users_updated_at
ON users;

CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();


DROP TRIGGER IF EXISTS trg_datasets_updated_at
ON datasets;

CREATE TRIGGER trg_datasets_updated_at
BEFORE UPDATE ON datasets
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();


DROP TRIGGER IF EXISTS trg_filter_presets_updated_at
ON filter_presets;

CREATE TRIGGER trg_filter_presets_updated_at
BEFORE UPDATE ON filter_presets
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();