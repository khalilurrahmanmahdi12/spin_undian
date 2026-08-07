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

    // 1. Validasi Input
    const isInvValid = validateInvoiceFormat(invoiceVal);
    const isWaValid = validateWhatsappFormat(rawWaVal);

    if (!isInvValid || !isWaValid) {
        Swal.fire({
            icon: 'error',
            title: 'Input Tidak Valid',
            text: 'Pastikan format Invoice (INV + 12 digit + INV) dan Nomor WhatsApp (min 10 digit) sudah benar.',
            confirmButtonColor: '#2563eb'
        });
        return;
    }

    const normalizedWa = formatToIndonesianPhone(rawWaVal);

    try {

        btnSubmit.disabled = true;
        btnSubmit.innerHTML = 'Memproses...';

        // Cek invoice sudah ada atau belum
        const existingInvoice = await DB.getInvoiceByNumber(invoiceVal);

        if (existingInvoice) {

            Swal.fire({
                icon: 'warning',
                title: 'Invoice Sudah Terdaftar',
                html: `
                    <p>Invoice <b>${invoiceVal}</b> sudah pernah digunakan.</p>

                    <br>

                    <div style="
                        background:#f8fafc;
                        padding:15px;
                        border-radius:10px;
                    ">
                        <b>Kode Tiket Spin</b>

                        <h2 style="
                            margin-top:10px;
                            color:#2563eb;
                            letter-spacing:3px;
                        ">
                            ${existingInvoice.ticket_code}
                        </h2>

                        <small>Status : ${existingInvoice.status}</small>
                    </div>
                `,
                confirmButtonColor: '#2563eb'
            });

            btnSubmit.disabled = false;
            btnSubmit.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Kirim Invoice';
            return;
        }

        // Simpan invoice
        const invoice = await DB.createInvoice(invoiceVal, normalizedWa);

        await DB.addLog(
            invoiceVal,
            `Invoice baru dikirim oleh customer (WA: ${normalizedWa})`
        );

        // Kirim WA Admin
        sendWhatsAppAdminNotification(invoiceVal, normalizedWa);

        // Popup sukses + tampilkan kode tiket
        Swal.fire({
            icon: 'success',
            title: 'Invoice Berhasil!',
            html: `
                <p>Invoice berhasil dikirim.</p>

                <br>

                <div style="
                    background:#f8fafc;
                    padding:20px;
                    border-radius:12px;
                    border:1px solid #e5e7eb;
                ">

                    <div style="font-size:15px;margin-bottom:10px;">
                        Kode Tiket Spin
                    </div>

                    <div style="
                        font-size:32px;
                        font-weight:bold;
                        color:#2563eb;
                        letter-spacing:4px;
                    ">
                        ${invoice.ticket_code}
                    </div>

                    <div style="
                        margin-top:10px;
                        font-size:13px;
                        color:#666;
                    ">
                        Simpan kode ini untuk digunakan saat Spin.
                    </div>

                </div>
            `,
            confirmButtonColor: '#2563eb'
        });

        document.getElementById('formInvoice').style.display = 'none';
        document.getElementById('successCard').style.display = 'block';

    } catch (error) {

        console.error(error);

        Swal.fire({
            icon: 'error',
            title: 'Gagal Mengirim',
            text: 'Terjadi kesalahan pada sistem atau database.',
            confirmButtonColor: '#2563eb'
        });

    } finally {

        btnSubmit.disabled = false;
        btnSubmit.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Kirim Invoice';

    }
}

