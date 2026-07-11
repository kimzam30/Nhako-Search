-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" 
ON public.profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);


-- Table: level_progress
CREATE TABLE IF NOT EXISTS public.level_progress (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  level_id text not null,
  stars integer not null default 0 check (stars >= 0 and stars <= 3),
  best_time_seconds integer,
  completed_at timestamp with time zone default timezone('utc'::text, now()) not null,
  UNIQUE(user_id, level_id)
);

ALTER TABLE public.level_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own level progress" 
ON public.level_progress FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own level progress" 
ON public.level_progress FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own level progress" 
ON public.level_progress FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own level progress" 
ON public.level_progress FOR DELETE USING (auth.uid() = user_id);


-- Table: daily_challenge_log
CREATE TABLE IF NOT EXISTS public.daily_challenge_log (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  challenge_date date not null,
  completed_at timestamp with time zone default timezone('utc'::text, now()) not null,
  streak_count integer not null default 1,
  UNIQUE(user_id, challenge_date)
);

ALTER TABLE public.daily_challenge_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own daily challenge log" 
ON public.daily_challenge_log FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own daily challenge log" 
ON public.daily_challenge_log FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own daily challenge log" 
ON public.daily_challenge_log FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own daily challenge log" 
ON public.daily_challenge_log FOR DELETE USING (auth.uid() = user_id);


-- Table: butterfly_collection
CREATE TABLE IF NOT EXISTS public.butterfly_collection (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  butterfly_style_id text not null,
  earned_from text not null,
  earned_at timestamp with time zone default timezone('utc'::text, now()) not null
);

ALTER TABLE public.butterfly_collection ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own butterfly collection" 
ON public.butterfly_collection FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own butterfly collection" 
ON public.butterfly_collection FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own butterfly collection" 
ON public.butterfly_collection FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own butterfly collection" 
ON public.butterfly_collection FOR DELETE USING (auth.uid() = user_id);


-- Table: race_history
CREATE TABLE IF NOT EXISTS public.race_history (
  id uuid default uuid_generate_v4() primary key,
  player_a uuid references auth.users on delete cascade not null,
  player_b uuid references auth.users on delete cascade,
  winner uuid references auth.users on delete cascade,
  difficulty_a text,
  difficulty_b text,
  played_at timestamp with time zone default timezone('utc'::text, now()) not null
);

ALTER TABLE public.race_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view race history they are part of" 
ON public.race_history FOR SELECT USING (auth.uid() = player_a OR auth.uid() = player_b);

CREATE POLICY "Users can insert race history they are part of" 
ON public.race_history FOR INSERT WITH CHECK (auth.uid() = player_a OR auth.uid() = player_b);

CREATE POLICY "Users can update race history they are part of" 
ON public.race_history FOR UPDATE USING (auth.uid() = player_a OR auth.uid() = player_b);

CREATE POLICY "Users can delete race history they are part of" 
ON public.race_history FOR DELETE USING (auth.uid() = player_a OR auth.uid() = player_b);
