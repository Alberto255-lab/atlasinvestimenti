// Configurazione Supabase — Atlas Investimenti
const SUPABASE_URL = 'https://ywgvgorpohfuavzuehfm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3Z3Znb3Jwb2hmdWF2enVlaGZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxMjk2NjUsImV4cCI6MjA5OTcwNTY2NX0.b3-mv_leRmBWpE3Rhys0TIm8H4RmEgc8-q6soZQaIhY';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
