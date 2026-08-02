/**
 * KONFIGURASI UTAMA APLIKASI SPIN UNDIAN
 * 
 * Silakan ganti nilai di bawah ini sesuai dengan akun Supabase dan Fonnte Anda.
 * File ini dirancang agar mudah diubah tanpa mengedit file Javascript lainnya.
 */

const CONFIG = {
    // 1. Supabase Credentials
    SUPABASE_URL: "https://axceahnqbraicjknzazw.supabase.co", // Ganti dengan URL Supabase Anda
    SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF4Y2VhaG5xYnJhaWNqa256YXp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU2NjQ3NjMsImV4cCI6MjEwMTI0MDc2M30.r2M_RhnVsIJYapBl-W46dvQeaj-AjeTT8Q30ZQBU64w",             // Ganti dengan Anon Key Supabase Anda

    // 2. Fonnte WhatsApp API Token
    FONNTE_TOKEN: "your-fonnte-api-token",                   // Ganti dengan Token API Fonnte Anda

    // 3. Nomor WhatsApp Admin (Gunakan format 62xxx tanpa tanda +)
    ADMIN_WA_NUMBER: "628990909555",

    // 4. Kredensial Default Panel Admin (Dapat diubah sesuai kebutuhan)
    ADMIN_USERNAME: "admin",
    ADMIN_PASSWORD: "admin123"
};

// Mencegah perubahan langsung pada konfigurasi
Object.freeze(CONFIG);
