import { createClient } from '@supabase/supabase-js'

// We are putting these here directly to ensure the app can "see" them 
const supabaseUrl = 'https://oatcjvxsinqrvwuidhgp.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9hdGNqdnhzaW5xcnZ3dWlkaGdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0MjUwMTQsImV4cCI6MjA4MjAwMTAxNH0.4RF9wwAsyDl0wU-XggnLBBKmL6RuJ9Om8UC6Vx3t4xE';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
