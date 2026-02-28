-- 1. Enable the pgvector extension to work with embedding vectors
create extension if not exists vector;

-- 2. Create the memory embeddings table
create table if not exists public.memory_embeddings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  session_id uuid references public.sessions on delete cascade,
  content text not null, -- The summary text or coaching insight
  embedding vector(1536), -- 1536 is standard for OpenAI / some Groq embedding models
  metadata jsonb default '{}'::jsonb, -- e.g., feeling, tag, date
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Set up Row Level Security (RLS)
alter table public.memory_embeddings enable row level security;

create policy "Users can insert their own memories."
  on public.memory_embeddings for insert
  with check ( auth.uid() = user_id );

create policy "Users can select their own memories."
  on public.memory_embeddings for select
  using ( auth.uid() = user_id );

create policy "Users can update their own memories."
  on public.memory_embeddings for update
  using ( auth.uid() = user_id );

create policy "Users can delete their own memories."
  on public.memory_embeddings for delete
  using ( auth.uid() = user_id );

-- 4. Create a function to search for memories (Cosine Similarity)
-- This is the core of Retrieval-Augmented Generation (RAG)
create or replace function match_memories (
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  p_user_id uuid
)
returns table (
  id uuid,
  content text,
  metadata jsonb,
  similarity float
)
language sql stable
as $$
  select
    memory_embeddings.id,
    memory_embeddings.content,
    memory_embeddings.metadata,
    1 - (memory_embeddings.embedding <=> query_embedding) as similarity
  from memory_embeddings
  where memory_embeddings.user_id = p_user_id
    and 1 - (memory_embeddings.embedding <=> query_embedding) > match_threshold
  order by similarity desc
  limit match_count;
$$;
