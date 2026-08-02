/**
 * LOGIK APPLIKASI HALAMAN HOME (CUSTOMER INVOICE & WHATSAPP SUBMISSION)
 */

document.addEventListener('DOMContentLoaded', () => {
    const invoiceInput = document.getElementById('invoiceInput');
    const whatsappInput = document.getElementById('whatsappInput');

    if (invoiceInput) {
        invoiceInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.toUpperCase().trim();
            if (document.getElementById('invoiceError').style.display === 'block') {
                validateInvoiceFormat(e.target.value);
            }
        });
    }

    if (whatsappInput) {
        whatsappInput.addEventListener('input', (e) => {
            // Bersihkan dari karakter non-angka kecuali tanda +
            e.target.value = e.target.value.replace(/[^0-9+]/g, '');
            if (document.getElementById('whatsappError').style.display === 'block') {
                validateWhatsappFormat(e.target.value);
            }
        });
    }
});

/**
 * Validasi Format Invoice menggunakan Regex
 * Format wajib: INV + 12 digit angka + INV (Contoh: INV165312062543INV)
 */
function validateInvoiceFormat(invoiceVal) {
    const invoiceRegex = /^INV\d{12}INV$/;
    const isValid = invoiceRegex.test(invoiceVal);
    const invoiceError = document.getElementById('invoiceError');

    if (!isValid) {
        invoiceError.style.display = 'block';
    } else {
        invoiceError.style.display = 'none';
    }
    return isValid;
}

/**
 * Validasi Format Nomor WhatsApp Customer
 * Minimal 10 digit angka (Contoh: 081234567890 atau 6281234567890)
 */
function validateWhatsappFormat(waVal) {
    const cleanNum = waVal.replace(/\D/g, '');
    const isValid = cleanNum.length >= 10 && cleanNum.length <= 15;
    const whatsappError = document.getElementById('whatsappError');

    if (!isValid) {
        whatsappError.style.display = 'block';
    } else {
        whatsappError.style.display = 'none';
    }
    return isValid;
}

/**
 * Format Nomor Telepon ke Standar WhatsApp (628xxx)
 */
function formatToIndonesianPhone(phone) {
    let clean = phone.replace(/\D/g, '');
    if (clean.startsWith('0')) {
        clean = '62' + clean.slice(1);
    }
    return clean;
}

/**
 * Handle Submit Form Invoice & WA
 */
async function handleInvoiceSubmit(event) {
    event.preventDefault();
    const invoiceInput = document.getElementById('invoiceInput');
    const whatsappInput = document.getElementById('whatsappInput');
    const btnSubmit = document.getElementById('btnSubmit');

    const invoiceVal = invoiceInput.value.trim().toUpperCase();
    const rawWaVal = whatsappInput.value.trim();

    // 1. Validasi Input Format
    const isInvValid = validateInvoiceFormat(invoiceVal);
    const isWaValid = validateWhatsappFormat(rawWaVal);

    if (!isInvValid || !isWaValid) {
        Swal.fire({
            icon: 'error',
            title: 'Input Tidak Valid',
            text: 'Pastikan format Invoice (INV + 12 digit + INV) dan Nomor WhatsApp (min 10 digit) sudah benar.',
            confirmColor: '#2563eb'
        });
        return;
    }

    const normalizedWa = formatToIndonesianPhone(rawWaVal);

    try {
        // Matikan tombol submit & tampilkan indikator loading
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Memproses...';

        // 2. Cek apakah invoice sudah pernah terdaftar di Supabase Database
        const existingInvoice = await DB.getInvoiceByNumber(invoiceVal);

        if (existingInvoice) {
            Swal.fire({
                icon: 'warning',
                title: 'Invoice Sudah Terdaftar',
                text: `Nomor Invoice ${invoiceVal} sudah pernah dikirim sebelumnya. Status saat ini: ${existingInvoice.status}`,
                confirmColor: '#2563eb'
            });
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Kirim Invoice';
            return;
        }

        // 3. Simpan ke Supabase Database dengan Status "Menunggu Verifikasi" & No WA Customer
        await DB.createInvoice(invoiceVal, normalizedWa);
        await DB.addLog(invoiceVal, `Invoice baru dikirim oleh customer (WA: ${normalizedWa})`);

        // 4. Kirim WhatsApp Notifikasi ke Admin via Fonnte API
        sendWhatsAppAdminNotification(invoiceVal, normalizedWa);

        // 5. Tampilkan Notifikasi & Halaman Sukses
        Swal.fire({
            icon: 'success',
            title: 'Invoice Berhasil Dikirim!',
            text: 'Silakan tunggu Admin melakukan verifikasi dan mengirimkan Kode Tiket ke WhatsApp Anda.',
            confirmColor: '#2563eb'
        });

        // Sembunyikan form dan tampilkan kartu sukses
        document.getElementById('formInvoice').style.display = 'none';
        document.getElementById('successCard').style.display = 'block';

    } catch (error) {
        console.error("Error pada submit invoice:", error);
        Swal.fire({
            icon: 'error',
            title: 'Gagal Mengirim',
            text: 'Terjadi kesalahan pada sistem atau database. Silakan coba beberapa saat lagi.',
            confirmColor: '#2563eb'
        });
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Kirim Invoice';
    }
}
