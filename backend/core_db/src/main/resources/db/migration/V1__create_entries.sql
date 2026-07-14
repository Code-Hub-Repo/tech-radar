CREATE TABLE entries (
    id           SERIAL PRIMARY KEY,
    name         VARCHAR(100) NOT NULL,
    quadrant     VARCHAR(30)  NOT NULL CHECK (quadrant IN ('LANGUAGES_FRAMEWORKS', 'TOOLS', 'PLATFORMS', 'TECHNIQUES')),
    ring         VARCHAR(10)  NOT NULL CHECK (ring IN ('ADOPT', 'TRIAL', 'ASSESS', 'HOLD')),
    description  TEXT         NOT NULL,
    is_new       BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_entries_name_lower ON entries (LOWER(name));
