-- 0001_initial.sql — public_data schema: politicians + integrity_scores

CREATE TABLE IF NOT EXISTS public_data.politicians (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id     VARCHAR(100) NOT NULL UNIQUE,
  source          VARCHAR(20) NOT NULL,
  name            VARCHAR(255) NOT NULL,
  slug            VARCHAR(255) NOT NULL UNIQUE,
  state           VARCHAR(2) NOT NULL,
  party           VARCHAR(50) NOT NULL,
  role            VARCHAR(20) NOT NULL,
  photo_url       VARCHAR(500),
  active          BOOLEAN NOT NULL DEFAULT TRUE,
  bio_summary     TEXT,
  tenure_start_date DATE,
  exclusion_flag  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public_data.integrity_scores (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  politician_id         UUID NOT NULL REFERENCES public_data.politicians(id),
  overall_score         SMALLINT NOT NULL CHECK (overall_score BETWEEN 0 AND 100),
  transparency_score    SMALLINT NOT NULL CHECK (transparency_score BETWEEN 0 AND 25),
  legislative_score     SMALLINT NOT NULL CHECK (legislative_score BETWEEN 0 AND 25),
  financial_score       SMALLINT NOT NULL CHECK (financial_score BETWEEN 0 AND 25),
  anticorruption_score  SMALLINT NOT NULL CHECK (anticorruption_score IN (0, 25)),
  exclusion_flag        BOOLEAN NOT NULL DEFAULT FALSE,
  methodology_version   VARCHAR(20) NOT NULL,
  calculated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for listing and cursor pagination
CREATE INDEX IF NOT EXISTS idx_politicians_slug   ON public_data.politicians(slug);
CREATE INDEX IF NOT EXISTS idx_politicians_state  ON public_data.politicians(state);
CREATE INDEX IF NOT EXISTS idx_politicians_role   ON public_data.politicians(role);
CREATE INDEX IF NOT EXISTS idx_politicians_active ON public_data.politicians(active) WHERE active = TRUE;
CREATE INDEX IF NOT EXISTS idx_scores_politician  ON public_data.integrity_scores(politician_id);
-- Composite index for stable DESC cursor pagination (overallScore DESC, politicianId DESC)
CREATE INDEX IF NOT EXISTS idx_scores_overall_cursor
  ON public_data.integrity_scores(overall_score DESC, politician_id DESC);
