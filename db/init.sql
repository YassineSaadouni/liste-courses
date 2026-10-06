-- Exécuté par l'image postgres uniquement au premier démarrage (volume vide)
CREATE TABLE IF NOT EXISTS items (
  id         SERIAL PRIMARY KEY,
  name       TEXT        NOT NULL,
  quantity   INTEGER     NOT NULL DEFAULT 1,
  done       BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
