CREATE TABLE entry_history (
    id           SERIAL PRIMARY KEY,
    entry_id     INTEGER      NOT NULL,
    name         VARCHAR(100) NOT NULL,
    quadrant     VARCHAR(30)  NOT NULL,
    ring         VARCHAR(10)  NOT NULL,
    description  TEXT         NOT NULL,
    is_new       BOOLEAN      NOT NULL,
    change_type  VARCHAR(10)  NOT NULL CHECK (change_type IN ('CREATED', 'UPDATED', 'DELETED')),
    changed_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_entry_history_entry_changed ON entry_history (entry_id, changed_at DESC);
