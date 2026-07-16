CREATE TABLE proposals (
    id             SERIAL PRIMARY KEY,
    name           VARCHAR(100) NOT NULL,
    quadrant       VARCHAR(30)  NOT NULL CHECK (quadrant IN ('LANGUAGES_FRAMEWORKS', 'TOOLS', 'PLATFORMS', 'TECHNIQUES')),
    ring           VARCHAR(10)  NOT NULL CHECK (ring IN ('ADOPT', 'TRIAL', 'ASSESS', 'HOLD')),
    description    TEXT         NOT NULL,
    submitter_name VARCHAR(100),
    status         VARCHAR(10)  NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    entry_id       INTEGER,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    reviewed_at    TIMESTAMPTZ
);

CREATE INDEX idx_proposals_status_created ON proposals (status, created_at DESC);
