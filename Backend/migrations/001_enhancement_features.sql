-- Migration: Enable image enhancement + voice language
-- Requires: products table already created by supabase_schema.sql
-- Safe to run repeatedly (IF NOT EXISTS) — never destroys existing data.

ALTER TABLE public.products
    ADD COLUMN IF NOT EXISTS voice_language TEXT,
    ADD COLUMN IF NOT EXISTS original_image_url TEXT,
    ADD COLUMN IF NOT EXISTS enhanced_image_url TEXT;