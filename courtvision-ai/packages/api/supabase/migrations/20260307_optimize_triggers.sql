-- Database Optimization for CourtVision-AI
-- Purpose: Add unified update triggers and vector indexes

-- 1. Create a unified function to automatically update 'updated_at' 
--    or 'last_updated' columns if they exist.
CREATE OR REPLACE FUNCTION public.update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.update_last_updated_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_updated = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Dynamically apply this trigger to all tables that have 'updated_at'
DO $$ 
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND column_name = 'updated_at'
    LOOP
        EXECUTE format('
            DROP TRIGGER IF EXISTS update_%I_modtime ON public.%I;
            CREATE TRIGGER update_%I_modtime 
            BEFORE UPDATE ON public.%I 
            FOR EACH ROW 
            EXECUTE FUNCTION public.update_modified_column();', 
        t, t, t, t);
    END LOOP;
END;
$$;

-- 3. Dynamically apply this trigger to all tables that have 'last_updated'
DO $$ 
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND column_name = 'last_updated'
    LOOP
        EXECUTE format('
            DROP TRIGGER IF EXISTS update_%I_lastupdtime ON public.%I;
            CREATE TRIGGER update_%I_lastupdtime 
            BEFORE UPDATE ON public.%I 
            FOR EACH ROW 
            EXECUTE FUNCTION public.update_last_updated_column();', 
        t, t, t, t);
    END LOOP;
END;
$$;

-- 4. Create an HNSW index on the pgvector column to dramatically 
-- speed up cosine similarity searches (e.g., in match_memories)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_extension WHERE extname = 'vector'
    ) THEN
        IF EXISTS (
            SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'memory_embeddings'
        ) THEN
            EXECUTE 'CREATE INDEX IF NOT EXISTS memory_embeddings_embedding_hnsw_idx ON public.memory_embeddings USING hnsw (embedding vector_cosine_ops);';
        END IF;
    END IF;
END;
$$;
