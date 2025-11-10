-- Create likes table
CREATE TABLE IF NOT EXISTS public.likes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(post_id, user_id)
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS likes_post_id_idx ON public.likes(post_id);
CREATE INDEX IF NOT EXISTS likes_user_id_idx ON public.likes(user_id);
CREATE INDEX IF NOT EXISTS likes_created_at_idx ON public.likes(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;

-- Create policies for likes
-- Allow anyone to read likes
CREATE POLICY "Likes are viewable by everyone" ON public.likes
    FOR SELECT USING (true);

-- Allow authenticated users to insert their own likes
CREATE POLICY "Users can insert their own likes" ON public.likes
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- Allow users to delete their own likes
CREATE POLICY "Users can delete their own likes" ON public.likes
    FOR DELETE USING (auth.uid()::text = user_id);
