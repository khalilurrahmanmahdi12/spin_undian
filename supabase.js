/**
 * SUPABASE CLIENT & HELPER UTILITIES
 * 
 * Mengatur koneksi ke Supabase Database & integrasi API Fonnte WhatsApp.
 * Menyediakan fungsi helper async untuk kemudahan operasi CRUD di seluruh aplikasi.
 */

// Inisialisasi Supabase Client dari CDN
let supabaseClient = null;

function initSupabase() {
    if (typeof supabase !== 'undefined' && supabase.createClient) {
        supabaseClient = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
    } else {
        console.warn("Supabase SDK belum dimuat. Pastikan script Supabase CDN telah terpasang di HTML.");
    }
}

// Panggil inisialisasi saat script dimuat
initSupabase();

/**
 * UTILITY DATABASE SUPABASE
 */

const DB = {
    // ---------------- INVOICES ----------------
    async getInvoiceByNumber(invoiceNum) {
        if (!supabaseClient) initSupabase();
        const { data, error } = await supabaseClient
            .from('invoices')
            .select('*')
            .eq('invoice', invoiceNum)
            .maybeSingle();
        if (error) throw error;
        return data;
    },

    async getInvoiceByTicketCode(ticketCode) {
        if (!supabaseClient) initSupabase();
        const { data, error } = await supabaseClient
            .from('invoices')
            .select('*')
            .eq('ticket_code', ticketCode)
            .maybeSingle();
        if (error) throw error;
        return data;
    },

    async getAllInvoices() {
        if (!supabaseClient) initSupabase();
        const { data, error } = await supabaseClient
            .from('invoices')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
    },

    async createInvoice(invoiceNum, whatsappNum) {
        if (!supabaseClient) initSupabase();
        const { data, error } = await supabaseClient
            .from('invoices')
            .insert([
                {
                    invoice: invoiceNum,
                    whatsapp: whatsappNum,
                    status: 'Menunggu Verifikasi',
                    sudah_spin: false
                }
            ])
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async updateInvoiceStatus(id, status, ticketCode = null) {
        if (!supabaseClient) initSupabase();
        const payload = { status };
        if (ticketCode) payload.ticket_code = ticketCode;

        const { data, error } = await supabaseClient
            .from('invoices')
            .update(payload)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async updateInvoiceRiggedPrize(id, hadiahManual) {
        if (!supabaseClient) initSupabase();
        const { data, error } = await supabaseClient
            .from('invoices')
            .update({ hadiah_manual: hadiahManual })
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async recordSpinResult(id, hasilSpin) {
        if (!supabaseClient) initSupabase();
        const { data, error } = await supabaseClient
            .from('invoices')
            .update({
                sudah_spin: true,
                hasil_spin: hasilSpin,
                status: 'Sudah Spin'
            })
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async deleteInvoice(id) {
        if (!supabaseClient) initSupabase();
        const { error } = await supabaseClient
            .from('invoices')
            .delete()
            .eq('id', id);
        if (error) throw error;
        return true;
    },

    // ---------------- HADIAH ----------------
    async getAllHadiah() {
        if (!supabaseClient) initSupabase();
        const { data, error } = await supabaseClient
            .from('hadiah')
            .select('*')
            .order('created_at', { ascending: true });
        if (error) throw error;
        return data || [];
    },

    async getActiveHadiah() {
        if (!supabaseClient) initSupabase();
        const { data, error } = await supabaseClient
            .from('hadiah')
            .select('*')
            .eq('aktif', true)
            .order('created_at', { ascending: true });
        if (error) throw error;
        return data || [];
    },

    async createHadiah(namaHadiah, persentase, warna = '#2563eb') {
        if (!supabaseClient) initSupabase();
        const { data, error } = await supabaseClient
            .from('hadiah')
            .insert([{ nama_hadiah: namaHadiah, persentase: parseFloat(persentase), aktif: true, warna }])
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async updateHadiah(id, payload) {
        if (!supabaseClient) initSupabase();
        const { data, error } = await supabaseClient
            .from('hadiah')
            .update(payload)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async deleteHadiah(id) {
        if (!supabaseClient) initSupabase();
        const { error } = await supabaseClient
            .from('hadiah')
            .delete()
            .eq('id', id);
        if (error) throw error;
        return true;
    },

    // ---------------- SETTINGS ----------------
    async getSettings() {
        if (!supabaseClient) initSupabase();
        const { data, error } = await supabaseClient
            .from('settings')
            .select('*')
            .eq('id', 1)
            .maybeSingle();
        if (error) throw error;
        return data || { spin_mode: 'normal', whatsapp_admin: CONFIG.ADMIN_WA_NUMBER, custom_prizes: [] };
    },

    async updateSettings(spinMode, customPrizes = []) {
        if (!supabaseClient) initSupabase();
        const { data, error } = await supabaseClient
            .from('settings')
            .upsert({
                id: 1,
                spin_mode: spinMode,
                custom_prizes: customPrizes,
                whatsapp_admin: CONFIG.ADMIN_WA_NUMBER,
                updated_at: new Date().toISOString()
            })
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    // ---------------- LOGS ----------------
    async addLog(invoice, aktivitas) {
        if (!supabaseClient) initSupabase();
        try {
            await supabaseClient.from('logs').insert([{ invoice, aktivitas }]);
        } catch (e) {
            console.error("Gagal menambahkan log:", e);
        }
    }
};

/**
 * INTEGRASI FONNTE API WHATSAPP
 * Mengirim notifikasi otomatis ke nomor WA Admin saat ada invoice baru (Termasuk No WA Customer).
 */
async function sendWhatsAppAdminNotification(invoiceNumber, customerWhatsapp) {
    if (!CONFIG.FONNTE_TOKEN || CONFIG.FONNTE_TOKEN === "your-fonnte-api-token") {
        console.warn("Fonnte Token belum dikonfigurasi di config.js. Notifikasi WA disimulasikan.");
        return { status: true, simulated: true };
    }

    const messageContent = `==================================
Invoice Baru Terdaftar!

Invoice:
${invoiceNumber}

No. WhatsApp Customer:
${customerWhatsapp || '-'}

Silakan login ke Panel Admin untuk melakukan verifikasi dan mengirimkan Kode Tiket Spin.
==================================`;

    try {
        const formData = new FormData();
        formData.append('target', CONFIG.ADMIN_WA_NUMBER);
        formData.append('message', messageContent);

        const response = await fetch('https://api.fonnte.com/send', {
            method: 'POST',
            headers: {
                'Authorization': CONFIG.FONNTE_TOKEN
            },
            body: formData
        });

        const resData = await response.json();
        console.log("Response Fonnte API:", resData);
        return resData;
    } catch (err) {
        console.error("Gagal mengirim WhatsApp via Fonnte API:", err);
        return { status: false, error: err.message };
    }
}
