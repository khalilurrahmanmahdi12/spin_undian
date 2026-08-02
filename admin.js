/**
 * LOGIK PANEL ADMIN - SPIN UNDIAN
 * Kelola dashboard, verifikasi invoice, pembuatan kode tiket, pengaturan hadiah & mode spin.
 */

let allInvoices = [];
let allPrizes = [];
let currentSettings = { spin_mode: 'normal', custom_prizes: [] };

// 1. Cek Sesi Login Admin
document.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('spin_admin_logged_in') !== 'true') {
        window.location.href = 'admin-login.html';
        return;
    }

    // Load data awal
    loadDashboardData();
    loadInvoicesData();
    loadPrizesData();
    loadSettingsData();
});

// Logout Admin
function handleAdminLogout() {
    Swal.fire({
        title: 'Konfirmasi Logout',
        text: 'Apakah Anda yakin ingin keluar dari Panel Admin?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#2563eb',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Ya, Logout',
        cancelButtonText: 'Batal'
    }).then((result) => {
        if (result.isConfirmed) {
            localStorage.removeItem('spin_admin_logged_in');
            window.location.href = 'admin-login.html';
        }
    });
}

// Switching Tab Sidebar
function switchTab(tabId, el) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.sidebar-link').forEach(link => link.classList.remove('active'));

    const targetTab = document.getElementById(tabId);
    if (targetTab) targetTab.classList.add('active');
    if (el) el.classList.add('active');
}

/**
 * 2. DASHBOARD DATA LOADER & STATISTIK
 */
async function loadDashboardData() {
    try {
        allInvoices = await DB.getAllInvoices();
        
        const totalInvoices = allInvoices.length;
        const pendingCount = allInvoices.filter(i => i.status === 'Menunggu Verifikasi').length;
        const accCount = allInvoices.filter(i => i.status === 'ACC').length;
        const spunCount = allInvoices.filter(i => i.sudah_spin).length;

        let totalPrizesWon = 0;
        let totalZonkCount = 0;

        allInvoices.forEach(i => {
            if (i.sudah_spin && i.hasil_spin) {
                if (i.hasil_spin.toLowerCase().includes('zonk')) {
                    totalZonkCount++;
                } else {
                    totalPrizesWon++;
                }
            }
        });

        // Update Kartu Statistik UI
        document.getElementById('statTotalInvoices').innerText = totalInvoices;
        document.getElementById('statPendingInvoices').innerText = pendingCount;
        document.getElementById('statAccInvoices').innerText = accCount;
        document.getElementById('statSpunInvoices').innerText = spunCount;
        document.getElementById('statTotalPrizes').innerText = totalPrizesWon;
        document.getElementById('statTotalZonk').innerText = totalZonkCount;

    } catch (err) {
        console.error("Gagal memuat data dashboard:", err);
    }
}

/**
 * 3. DATA INVOICE & PROSES VERIFIKASI / ACC / TIKET KODE
 */
async function loadInvoicesData() {
    const tbody = document.getElementById('invoicesTableBody');
    if (!tbody) return;

    try {
        allInvoices = await DB.getAllInvoices();
        renderInvoiceTable(allInvoices);
    } catch (err) {
        console.error("Gagal memuat tabel invoice:", err);
        tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: red;">Gagal memuat data invoice.</td></tr>`;
    }
}

function renderInvoiceTable(invoices) {
    const tbody = document.getElementById('invoicesTableBody');
    if (!tbody) return;

    if (invoices.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 2rem; color: var(--dark-muted);">Belum ada data invoice terdaftar.</td></tr>`;
        return;
    }

    tbody.innerHTML = invoices.map((inv, idx) => {
        const dateStr = inv.created_at ? new Date(inv.created_at).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';
        
        // Badge Status
        let badgeClass = 'badge-pending';
        if (inv.status === 'ACC') badgeClass = 'badge-acc';
        if (inv.status === 'Tolak') badgeClass = 'badge-rejected';
        if (inv.sudah_spin || inv.status === 'Sudah Spin') badgeClass = 'badge-spun';

        const whatsappDisplay = inv.whatsapp ? `
            <a href="https://wa.me/${inv.whatsapp}" target="_blank" style="color: #25D366; font-weight: 600; text-decoration: underline;" title="Chat WhatsApp Customer">
                <i class="fa-brands fa-whatsapp"></i> ${inv.whatsapp}
            </a>
        ` : `<span style="color: #94A3B8; font-size: 0.85rem;">-</span>`;

        const ticketCodeHtml = inv.ticket_code ? `
            <div style="display: flex; align-items: center; gap: 6px;">
                <strong style="color: var(--primary); font-family: monospace; font-size: 1rem;">${inv.ticket_code}</strong>
                <button class="btn btn-secondary btn-sm" style="padding: 2px 6px;" title="Copy Kode" onclick="copyTicketCode('${inv.ticket_code}')">
                    <i class="fa-regular fa-copy"></i>
                </button>
            </div>
        ` : `<span style="color: #94A3B8; font-size: 0.85rem;">Belum ada</span>`;

        const manualPrizeHtml = inv.hadiah_manual ? `
            <span class="badge" style="background: #F3E8FF; color: #7E22CE; font-weight: 600;">
                <i class="fa-solid fa-wand-magic-sparkles"></i> ${inv.hadiah_manual}
            </span>
        ` : `<span style="color: #94A3B8; font-size: 0.85rem;">Default Mode</span>`;

        const hasilSpinHtml = inv.hasil_spin ? `<strong>${inv.hasil_spin}</strong>` : `-`;

        // Pesan WA yang dipre-fill untuk dikirim ke Customer
        const waMsg = inv.ticket_code ? encodeURIComponent(`Halo Kak, Invoice Anda ${inv.invoice} telah BERHASIL DIVERIFIKASI! 🎉

Kode Tiket Spin Anda:
*${inv.ticket_code}*

Silakan buka Halaman Spin:
${window.location.origin}/spin.html?inv=${inv.invoice}&ticket=${inv.ticket_code}

Masukkan Nomor Invoice dan Kode Tiket di atas untuk melakukan Spin. Selamat mencoba!`) : '';

        const targetWaUrl = inv.whatsapp ? `https://wa.me/${inv.whatsapp}?text=${waMsg}` : `https://wa.me/?text=${waMsg}`;

        // Tombol Aksi
        let actionsHtml = '';
        if (inv.status === 'Menunggu Verifikasi') {
            actionsHtml = `
                <button class="btn btn-success btn-sm" onclick="handleACCInvoice('${inv.id}', '${inv.invoice}', '${inv.whatsapp || ''}')">
                    <i class="fa-solid fa-check"></i> ACC
                </button>
                <button class="btn btn-warning btn-sm" onclick="handleRejectInvoice('${inv.id}')">
                    <i class="fa-solid fa-xmark"></i> Tolak
                </button>
            `;
        } else if (inv.status === 'ACC') {
            actionsHtml = `
                <button class="btn btn-primary btn-sm" onclick="handleSetRiggedPrize('${inv.id}', '${inv.invoice}', '${inv.hadiah_manual || ''}')">
                    <i class="fa-solid fa-wand-magic-sparkles"></i> Hadiah Manual
                </button>
                <a href="${targetWaUrl}" target="_blank" class="btn btn-whatsapp btn-sm" title="Kirim Kode Tiket ke WA Customer">
                    <i class="fa-brands fa-whatsapp"></i> Kirim WA
                </a>
            `;
        }

        actionsHtml += `
            <button class="btn btn-danger btn-sm" onclick="handleDeleteInvoice('${inv.id}')" title="Hapus">
                <i class="fa-solid fa-trash"></i>
            </button>
        `;

        return `
            <tr>
                <td>${idx + 1}</td>
                <td><strong>${inv.invoice}</strong></td>
                <td>${whatsappDisplay}</td>
                <td style="font-size: 0.85rem; color: var(--dark-muted);">${dateStr}</td>
                <td><span class="badge ${badgeClass}">${inv.status}</span></td>
                <td>${ticketCodeHtml}</td>
                <td>${manualPrizeHtml}</td>
                <td>${hasilSpinHtml}</td>
                <td><div style="display: flex; gap: 4px; flex-wrap: wrap;">${actionsHtml}</div></td>
            </tr>
        `;
    }).join('');
}

/**
 * GENERATE KODE TIKET SPIN UNIK AUTOMATIS
 * Format contoh: SPIN-8F4K2Q
 */
function generateUniqueTicketCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let randomPart = '';
    for (let i = 0; i < 6; i++) {
        randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `SPIN-${randomPart}`;
}

/**
 * ACC INVOICE & OTO-GENERATE KODE TIKET SPIN
 */
async function handleACCInvoice(id, invoiceNum, customerWa) {
    try {
        const uniqueTicket = generateUniqueTicketCode();

        // Update database Supabase
        await DB.updateInvoiceStatus(id, 'ACC', uniqueTicket);
        await DB.addLog(invoiceNum, `Invoice di-ACC oleh Admin. Kode Tiket: ${uniqueTicket}`);

        // Template Pesan Manual WhatsApp untuk Admin ke Customer
        const waText = `Halo Kak, Invoice Anda ${invoiceNum} telah BERHASIL DIVERIFIKASI! 🎉

Kode Tiket Spin Anda:
*${uniqueTicket}*

Silakan buka Halaman Spin:
${window.location.origin}/spin.html?inv=${invoiceNum}&ticket=${uniqueTicket}

Masukkan Nomor Invoice dan Kode Tiket di atas untuk melakukan Spin. Selamat mencoba!`;

        const encodedWa = encodeURIComponent(waText);
        const waUrl = customerWa ? `https://wa.me/${customerWa}?text=${encodedWa}` : `https://wa.me/?text=${encodedWa}`;

        Swal.fire({
            icon: 'success',
            title: 'Invoice Berhasil di-ACC!',
            html: `
                <div style="text-align: left; font-size: 0.95rem;">
                    <p>Kode Tiket Spin Unik telah dibuat secara otomatis:</p>
                    <div style="background: #EFF6FF; border: 2px dashed #2563eb; padding: 12px; border-radius: 10px; text-align: center; margin: 12px 0;">
                        <strong style="font-size: 1.5rem; color: #2563eb; letter-spacing: 2px;">${uniqueTicket}</strong>
                    </div>
                    <p style="font-size: 0.85rem; color: #64748b;">
                        WhatsApp Customer: <strong>${customerWa ? customerWa : 'Tidak diisi'}</strong>
                    </p>
                </div>
            `,
            showCancelButton: true,
            confirmButtonColor: '#25D366',
            cancelButtonColor: '#2563eb',
            confirmButtonText: '<i class="fa-brands fa-whatsapp"></i> Chat & Kirim Tiket ke WA',
            cancelButtonText: '<i class="fa-solid fa-copy"></i> Copy Kode Tiket'
        }).then((result) => {
            if (result.isConfirmed) {
                window.open(waUrl, '_blank');
            } else {
                copyTicketCode(uniqueTicket);
            }
            loadInvoicesData();
            loadDashboardData();
        });

    } catch (err) {
        console.error("Gagal ACC invoice:", err);
        Swal.fire({ icon: 'error', title: 'Gagal ACC', text: 'Terjadi kesalahan saat memproses status ACC.', confirmColor: '#2563eb' });
    }
}

function copyTicketCode(ticketCode) {
    navigator.clipboard.writeText(ticketCode).then(() => {
        Swal.fire({ icon: 'success', title: 'Tercopy!', text: `Kode Tiket ${ticketCode} berhasil disalin ke clipboard.`, timer: 1200, showConfirmButton: false });
    });
}

/**
 * MODE MANUAL (RIGGED) PER INVOICE
 */
async function handleSetRiggedPrize(id, invoiceNum, currentRigged) {
    // Fetch daftar hadiah aktif
    const activePrizes = await DB.getActiveHadiah();
    
    let optionsHtml = `<option value="">-- Gunakan Mode Spin Aktif (Default) --</option>`;
    activePrizes.forEach(p => {
        const selected = p.nama_hadiah === currentRigged ? 'selected' : '';
        optionsHtml += `<option value="${p.nama_hadiah}" ${selected}>${p.nama_hadiah}</option>`;
    });

    Swal.fire({
        title: 'Pengaturan Hadiah Manual (Rigged)',
        html: `
            <div style="text-align: left;">
                <p style="font-size: 0.85rem; color: #64748b; margin-bottom: 1rem;">
                    Invoice: <strong>${invoiceNum}</strong><br>
                    Tentukan hasil spin spesifik untuk invoice ini saat customer melakukan spin nanti. Customer tidak akan tahu bahwa hasil ini sudah ditentukan sebelumnya.
                </p>
                <select id="riggedSelect" class="form-input">
                    ${optionsHtml}
                </select>
            </div>
        `,
        showCancelButton: true,
        confirmButtonColor: '#2563eb',
        confirmButtonText: 'Simpan Hadiah Manual',
        cancelButtonText: 'Batal'
    }).then(async (result) => {
        if (result.isConfirmed) {
            const selectedPrize = document.getElementById('riggedSelect').value;
            await DB.updateInvoiceRiggedPrize(id, selectedPrize || null);
            await DB.addLog(invoiceNum, `Admin mengatur hadiah manual per invoice: ${selectedPrize || 'Default'}`);

            Swal.fire({ icon: 'success', title: 'Berhasil Disimpan', text: selectedPrize ? `Hadiah manual diset ke: ${selectedPrize}` : 'Hadiah manual dihapus (menggunakan mode default).', timer: 1500, showConfirmButton: false });
            loadInvoicesData();
        }
    });
}

// Reject Invoice
async function handleRejectInvoice(id) {
    try {
        await DB.updateInvoiceStatus(id, 'Tolak');
        Swal.fire({ icon: 'info', title: 'Invoice Ditolak', timer: 1200, showConfirmButton: false });
        loadInvoicesData();
        loadDashboardData();
    } catch (err) {
        console.error(err);
    }
}

// Delete Invoice
async function handleDeleteInvoice(id) {
    Swal.fire({
        title: 'Hapus Invoice?',
        text: 'Data invoice yang dihapus tidak dapat dikembalikan!',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#EF4444',
        confirmButtonText: 'Ya, Hapus'
    }).then(async (res) => {
        if (res.isConfirmed) {
            await DB.deleteInvoice(id);
            Swal.fire({ icon: 'success', title: 'Terhapus', timer: 1200, showConfirmButton: false });
            loadInvoicesData();
            loadDashboardData();
        }
    });
}

// Filter Invoice Table Input Search & Status
function filterInvoiceTable() {
    const searchVal = document.getElementById('searchInvoiceInput').value.toLowerCase().trim();
    const statusVal = document.getElementById('filterStatusSelect').value;

    const filtered = allInvoices.filter(inv => {
        const matchSearch = inv.invoice.toLowerCase().includes(searchVal) || 
                            (inv.whatsapp && inv.whatsapp.includes(searchVal)) ||
                            (inv.ticket_code && inv.ticket_code.toLowerCase().includes(searchVal));
        const matchStatus = statusVal ? inv.status === statusVal : true;
        return matchSearch && matchStatus;
    });

    renderInvoiceTable(filtered);
}


/**
 * 4. PENGATURAN HADIAH RODA (CRUD HADIAH)
 */
async function loadPrizesData() {
    const tbody = document.getElementById('prizesTableBody');
    if (!tbody) return;

    try {
        allPrizes = await DB.getAllHadiah();

        if (allPrizes.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 2rem;">Belum ada data hadiah terdaftar.</td></tr>`;
            return;
        }

        tbody.innerHTML = allPrizes.map((p, idx) => {
            const statusBadge = p.aktif 
                ? `<span class="badge badge-acc">Aktif</span>` 
                : `<span class="badge badge-rejected">Nonaktif</span>`;

            return `
                <tr>
                    <td>${idx + 1}</td>
                    <td><strong>${p.nama_hadiah}</strong></td>
                    <td>${p.persentase}%</td>
                    <td>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <div style="width: 20px; height: 20px; border-radius: 4px; background: ${p.warna || '#2563eb'}; border: 1px solid #ccc;"></div>
                            <span style="font-size: 0.85rem; font-family: monospace;">${p.warna || '#2563eb'}</span>
                        </div>
                    </td>
                    <td>${statusBadge}</td>
                    <td>
                        <button class="btn btn-secondary btn-sm" onclick="openEditPrizeModal('${p.id}', '${p.nama_hadiah}', ${p.persentase}, '${p.warna}')">
                            <i class="fa-solid fa-pen"></i>
                        </button>
                        <button class="btn ${p.aktif ? 'btn-warning' : 'btn-success'} btn-sm" onclick="togglePrizeActive('${p.id}', ${p.aktif})">
                            ${p.aktif ? 'Nonaktifkan' : 'Aktifkan'}
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="handleDeletePrize('${p.id}')">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        // Juga update daftar checkbox mode custom di tab Settings
        renderCustomPrizesCheckboxes();

    } catch (err) {
        console.error("Gagal memuat hadiah:", err);
    }
}

// Tambah Hadiah Baru Modal
function openAddPrizeModal() {
    Swal.fire({
        title: 'Tambah Hadiah Baru',
        html: `
            <div style="text-align: left;">
                <div class="form-group">
                    <label class="form-label">Nama Hadiah</label>
                    <input type="text" id="prizeNameInput" class="form-input" placeholder="Contoh: Voucher Rp10.000">
                </div>
                <div class="form-group">
                    <label class="form-label">Persentase Kemunculan (%)</label>
                    <input type="number" step="0.01" id="prizePercentInput" class="form-input" placeholder="Contoh: 5.00">
                </div>
                <div class="form-group">
                    <label class="form-label">Warna Sektor Roda</label>
                    <input type="color" id="prizeColorInput" value="#2563eb" style="width: 100%; height: 42px; cursor: pointer; border-radius: 8px; border: 1px solid #ccc;">
                </div>
            </div>
        `,
        showCancelButton: true,
        confirmButtonColor: '#2563eb',
        confirmButtonText: 'Simpan Hadiah',
        cancelButtonText: 'Batal'
    }).then(async (res) => {
        if (res.isConfirmed) {
            const name = document.getElementById('prizeNameInput').value.trim();
            const percent = document.getElementById('prizePercentInput').value.trim();
            const color = document.getElementById('prizeColorInput').value;

            if (!name || !percent) {
                Swal.fire({ icon: 'warning', title: 'Input Belum Lengkap', confirmColor: '#2563eb' });
                return;
            }

            await DB.createHadiah(name, percent, color);
            Swal.fire({ icon: 'success', title: 'Hadiah Ditambahkan', timer: 1200, showConfirmButton: false });
            loadPrizesData();
        }
    });
}

// Edit Hadiah Modal
function openEditPrizeModal(id, currentName, currentPercent, currentColor) {
    Swal.fire({
        title: 'Edit Hadiah',
        html: `
            <div style="text-align: left;">
                <div class="form-group">
                    <label class="form-label">Nama Hadiah</label>
                    <input type="text" id="editPrizeName" class="form-input" value="${currentName}">
                </div>
                <div class="form-group">
                    <label class="form-label">Persentase (%)</label>
                    <input type="number" step="0.01" id="editPrizePercent" class="form-input" value="${currentPercent}">
                </div>
                <div class="form-group">
                    <label class="form-label">Warna Sektor</label>
                    <input type="color" id="editPrizeColor" value="${currentColor || '#2563eb'}" style="width: 100%; height: 42px;">
                </div>
            </div>
        `,
        showCancelButton: true,
        confirmButtonColor: '#2563eb',
        confirmButtonText: 'Update'
    }).then(async (res) => {
        if (res.isConfirmed) {
            const name = document.getElementById('editPrizeName').value.trim();
            const percent = document.getElementById('editPrizePercent').value;
            const color = document.getElementById('editPrizeColor').value;

            await DB.updateHadiah(id, { nama_hadiah: name, persentase: parseFloat(percent), warna: color });
            Swal.fire({ icon: 'success', title: 'Hadiah Diperbarui', timer: 1200, showConfirmButton: false });
            loadPrizesData();
        }
    });
}

// Toggle Hadiah Aktif/Nonaktif
async function togglePrizeActive(id, currentStatus) {
    await DB.updateHadiah(id, { aktif: !currentStatus });
    loadPrizesData();
}

// Delete Hadiah
async function handleDeletePrize(id) {
    Swal.fire({
        title: 'Hapus Hadiah?',
        text: 'Hadiah ini akan dihapus permanen dari daftar roda.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#EF4444'
    }).then(async (res) => {
        if (res.isConfirmed) {
            await DB.deleteHadiah(id);
            loadPrizesData();
        }
    });
}


/**
 * 5. PENGATURAN MODE SPIN (FITUR UTAMA ADMIN)
 */
async function loadSettingsData() {
    try {
        currentSettings = await DB.getSettings();
        
        // Update Radio Button & Badge UI
        const mode = currentSettings.spin_mode || 'normal';
        const radioEl = document.querySelector(`input[name="spinModeRadio"][value="${mode}"]`);
        if (radioEl) radioEl.checked = true;

        updateModeUI();
    } catch (err) {
        console.error("Gagal memuat pengaturan spin:", err);
    }
}

function updateModeUI() {
    const selectedMode = document.querySelector('input[name="spinModeRadio"]:checked')?.value || 'normal';

    // Highlight Radio Card UI
    document.querySelectorAll('.radio-card').forEach(card => card.classList.remove('active'));
    
    if (selectedMode === 'normal') document.getElementById('cardModeNormal').classList.add('active');
    if (selectedMode === 'zonk_terus') document.getElementById('cardModeZonk').classList.add('active');
    if (selectedMode === 'hadiah_kecil') document.getElementById('cardModeKecil').classList.add('active');
    if (selectedMode === 'custom') document.getElementById('cardModeCustom').classList.add('active');

    // Update Badge Status di Dashboard
    const badgeEl = document.getElementById('currentSpinModeBadge');
    if (badgeEl) {
        badgeEl.innerText = selectedMode.toUpperCase().replace('_', ' ');
    }

    // Toggle Box Custom Prizes Panel
    const customBox = document.getElementById('customPrizesBox');
    if (customBox) {
        customBox.style.opacity = selectedMode === 'custom' ? '1' : '0.4';
        customBox.style.pointerEvents = selectedMode === 'custom' ? 'auto' : 'none';
    }
}

function renderCustomPrizesCheckboxes() {
    const container = document.getElementById('customCheckboxesList');
    if (!container) return;

    if (allPrizes.length === 0) {
        container.innerHTML = `<p style="font-size: 0.85rem; color: var(--dark-muted);">Belum ada hadiah terdaftar.</p>`;
        return;
    }

    const savedCustoms = currentSettings.custom_prizes || [];

    container.innerHTML = allPrizes.map(p => {
        const isChecked = savedCustoms.includes(p.nama_hadiah) ? 'checked' : '';
        return `
            <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; font-size: 0.95rem;">
                <input type="checkbox" class="custom-prize-chk" value="${p.nama_hadiah}" ${isChecked}>
                <span>${p.nama_hadiah}</span>
            </label>
        `;
    }).join('');
}

// Simpan Pengaturan Spin ke Database
async function saveSpinSettings() {
    try {
        const selectedMode = document.querySelector('input[name="spinModeRadio"]:checked')?.value || 'normal';

        // Ambil array hadiah yang dicentang jika mode custom
        const customPrizes = [];
        document.querySelectorAll('.custom-prize-chk:checked').forEach(chk => {
            customPrizes.push(chk.value);
        });

        await DB.updateSettings(selectedMode, customPrizes);
        await DB.addLog('SYSTEM', `Admin memperbarui Pengaturan Spin Mode ke: ${selectedMode}`);

        Swal.fire({
            icon: 'success',
            title: 'Pengaturan Disimpan!',
            text: `Mode spin aktif saat ini: ${selectedMode.toUpperCase().replace('_', ' ')}`,
            timer: 1800,
            showConfirmButton: false
        });

        loadSettingsData();

    } catch (err) {
        console.error("Gagal menyimpan pengaturan spin:", err);
        Swal.fire({ icon: 'error', title: 'Gagal Menyimpan', text: 'Terjadi kesalahan saat menyimpan pengaturan.', confirmColor: '#2563eb' });
    }
}
