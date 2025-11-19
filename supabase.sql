-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.furniture (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  name character varying,
  image text,
  CONSTRAINT furniture_pkey PRIMARY KEY (id)
);
CREATE TABLE public.pets (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  name character varying DEFAULT ''::character varying,
  image character varying DEFAULT ''::character varying,
  bg text,
  bg_overlay text,
  profile text,
  in_sack text,
  CONSTRAINT pets_pkey PRIMARY KEY (id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  updated_at timestamp with time zone,
  username text UNIQUE CHECK (char_length(username) >= 3),
  full_name text,
  avatar_url text,
  email text,
  last_step_update timestamp without time zone,
  step_source text,
  step_goal integer DEFAULT 1000,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.users_pets (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  user_id uuid,
  pet_id bigint,
  custom_name text,
  position_x real,
  position_y real,
  CONSTRAINT users_pets_pkey PRIMARY KEY (id),
  CONSTRAINT users_pets_pet_id_fkey FOREIGN KEY (pet_id) REFERENCES public.pets(id),
  CONSTRAINT users_pets_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);

CREATE TABLE public.daily_steps (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_id uuid NOT NULL,
  date date NOT NULL,
  step_count integer NOT NULL DEFAULT 0,
  goal_reached boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT daily_steps_pkey PRIMARY KEY (id),
  CONSTRAINT daily_steps_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT daily_steps_user_date_unique UNIQUE (user_id, date)
);