-- ============================================================
-- SCRIPT DATABASE SUPABASE UNTUK WEBSITE SPIN UNDIAN
-- Copy & Paste seluruh query ini ke Supabase SQL Editor lalu jalankan
-- ============================================================

-- 1. TABEL invoices (Diperbarui dengan kolom whatsapp)
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice VARCHAR(50) UNIQUE NOT NULL,
    whatsapp VARCHAR(20), -- Kolom Nomor WhatsApp Customer
    ticket_code VARCHAR(20) UNIQUE,
    status VARCHAR(20) DEFAULT 'Menunggu Verifikasi', -- 'Menunggu Verifikasi', 'ACC', 'Tolak', 'Sudah Spin'
    hasil_spin VARCHAR(100),
    hadiah_manual VARCHAR(100), -- Digunakan untuk Mode Manual / Rigged Prize khusus per invoice
    sudah_spin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tambahkan kolom whatsapp jika tabel invoices sudah pernah dibuat sebelumnya
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='whatsapp') THEN
        ALTER TABLE public.invoices ADD COLUMN whatsapp VARCHAR(20);
    END IF;
END $$;

-- 2. TABEL hadiah
CREATE TABLE IF NOT EXISTS public.hadiah (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama_hadiah VARCHAR(100) NOT NULL,
    persentase NUMERIC(5,2) DEFAULT 0.00, -- Persentase kemunculan (misal 90.00 = 90%)
    aktif BOOLEAN DEFAULT TRUE,
    warna VARCHAR(10) DEFAULT '#2563eb', -- Warna sektor di roda spin
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. TABEL settings
CREATE TABLE IF NOT EXISTS public.settings (
    id INT PRIMARY KEY DEFAULT 1,
    spin_mode VARCHAR(30) DEFAULT 'normal', -- 'normal', 'zonk_terus', 'hadiah_kecil', 'custom'
    whatsapp_admin VARCHAR(20) DEFAULT '6281234567890',
    custom_prizes JSONB DEFAULT '[]'::jsonb, -- Array ID/Nama hadiah yang diizinkan pada Mode Custom
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. TABEL logs
CREATE TABLE IF NOT EXISTS public.logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice VARCHAR(50),
    aktivitas TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================================
-- DATA AWAL (SEED DATA)
-- ============================================================

-- Seed Data Hadiah Default
INSERT INTO public.hadiah (nama_hadiah, persentase, aktif, warna) VALUES
('Zonk', 90.00, true, '#ef4444'),
('Voucher Rp5.000', 5.00, true, '#3b82f6'),
('Voucher Rp10.000', 3.00, true, '#10b981'),
('Voucher Rp20.000', 1.00, true, '#f59e0b'),
('Voucher Rp50.000', 0.80, true, '#8b5cf6'),
('Bonus Produk', 0.10, true, '#ec4899'),
('Hadiah Utama', 0.10, true, '#eab308')
ON CONFLICT DO NOTHING;

-- Seed Data Settings Default
INSERT INTO public.settings (id, spin_mode, whatsapp_admin) VALUES
(1, 'normal', '6281234567890')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- KEAMANAN & AKSES (Row Level Security / RLS)
-- Mengizinkan akses baca/tulis anonim untuk website frontend
-- ============================================================

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hadiah ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logs ENABLE ROW LEVEL SECURITY;

-- Kebijakan akses penuh (Select, Insert, Update, Delete) untuk anonim & authenticated
CREATE POLICY "Public Read/Write Invoices" ON public.invoices FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read/Write Hadiah" ON public.hadiah FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read/Write Settings" ON public.settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read/Write Logs" ON public.logs FOR ALL USING (true) WITH CHECK (true);
