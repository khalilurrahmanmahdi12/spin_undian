/**
 * SKRIP HALAMAN SPIN - RODA CANVAS DIRECT DISPLAY & ENGINE PENENTU HADIAH
 */

let currentInvoiceObj = null;
let prizesList = [];
let settingsObj = null;
let currentRotation = 0;
let isSpinning = false;
let audioCtx = null;

// Warna default sektor roda
const SECTOR_COLORS = [
    '#EF4444', '#3B82F6', '#10B981', '#F59E0B', 
    '#8B5CF6', '#EC4899', '#EAB308', '#06B6D4'
];

document.addEventListener('DOMContentLoaded', async () => {
    const spinTicketInput = document.getElementById('spinTicket');

    if (spinTicketInput) {
        spinTicketInput.addEventListener('input', e => {
            e.target.value = e.target.value.toUpperCase().trim();
        });
    }

    // 1. Dimuat awal: Ambil daftar hadiah aktif & Render Roda Spin secara LANGSUNG
    await loadInitialWheelData();

    // 2. Cek apakah ada parameter tiket di URL (misal dari link WA)
    const urlParams = new URLSearchParams(window.location.search);
    const ticketParam = urlParams.get('ticket') || urlParams.get('code');
    if (ticketParam && spinTicketInput) {
        spinTicketInput.value = ticketParam.toUpperCase();
    }
});

/**
 * AMBIL HADIAH DAN RENDER RODA SEGERA PADA SAAT HALAMAN DIBUKA
 */
async function loadInitialWheelData() {
    try {
        prizesList = await DB.getActiveHadiah();
        settingsObj = await DB.getSettings();

        if (!prizesList || prizesList.length === 0) {
            // Fallback jika database belum berisi data
            prizesList = [
                { nama_hadiah: 'Zonk', persentase: 90, warna: '#EF4444' },
                { nama_hadiah: 'Voucher Rp5.000', persentase: 5, warna: '#3B82F6' },
                { nama_hadiah: 'Voucher Rp10.000', persentase: 3, warna: '#10B981' },
                { nama_hadiah: 'Voucher Rp20.000', persentase: 1, warna: '#F59E0B' },
                { nama_hadiah: 'Voucher Rp50.000', persentase: 0.8, warna: '#8B5CF6' },
                { nama_hadiah: 'Hadiah Utama', persentase: 0.2, warna: '#EAB308' }
            ];
        }

        // Render Roda Spin Canvas Langsung
        renderWheelCanvas();

    } catch (err) {
        console.error("Gagal memuat data awal roda:", err);
    }
}

/**
 * RENDER CANVAS RODA SPIN
 */
function renderWheelCanvas() {
    const canvas = document.getElementById('spinCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = width / 2 - 15;
    const numSlices = prizesList.length;
    const sliceAngle = (2 * Math.PI) / numSlices;

    ctx.clearRect(0, 0, width, height);

    // Gambar Sektor Roda
    for (let i = 0; i < numSlices; i++) {
        const angle = i * sliceAngle + currentRotation;
        const prize = prizesList[i];
        const sliceColor = prize.warna || SECTOR_COLORS[i % SECTOR_COLORS.length];

        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, angle, angle + sliceAngle);
        ctx.closePath();

        ctx.fillStyle = sliceColor;
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#FFFFFF';
        ctx.stroke();

        // Teks Nama Hadiah
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(angle + sliceAngle / 2);
        ctx.textAlign = 'right';
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 15px Poppins, sans-serif';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
        ctx.shadowBlur = 4;
        ctx.fillText(prize.nama_hadiah, radius - 25, 6);
        ctx.restore();
    }

    // Outer Ring Rim
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.lineWidth = 10;
    ctx.strokeStyle = '#2563EB';
    ctx.stroke();
}

/**
 * HANDLE EVENT SAAT TOMBOL "SPIN SEKARANG" DITEKAN
 */
async function handleSpinSubmit(event) {
    if (event) event.preventDefault();
    if (isSpinning) return;

    const spinTicketInput = document.getElementById('spinTicket');
    const ticketVal = spinTicketInput.value.trim().toUpperCase();
    const btnSpinNow = document.getElementById('btnSpinNow');

    // 1. Validasi Input Kode Tiket
    if (!ticketVal) {
        Swal.fire({
            icon: 'warning',
            title: 'Kode Tiket Kosong',
            text: 'Silakan masukkan Kode Tiket Spin Anda terlebih dahulu.',
            confirmColor: '#2563eb'
        });
        return;
    }

    try {
        btnSpinNow.disabled = true;
        btnSpinNow.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> MEMERIKSA TIKET...';

        // 2. Verifikasi Kode Tiket ke Supabase Database
        const invoiceData = await DB.getInvoiceByTicketCode(ticketVal);

        // a. Cek apakah tiket ditemukan
        if (!invoiceData) {
            Swal.fire({
                icon: 'error',
                title: 'Tiket Tidak Ditemukan',
                text: `Kode Tiket Spin "${ticketVal}" tidak terdaftar dalam sistem.`,
                confirmColor: '#2563eb'
            });
            resetSpinBtn();
            return;
        }

        // b. Cek apakah status invoice sudah ACC
        if (invoiceData.status !== 'ACC' && !invoiceData.sudah_spin) {
            Swal.fire({
                icon: 'error',
                title: 'Tiket Belum Diverifikasi',
                text: 'Invoice untuk tiket ini belum diverifikasi oleh Admin.',
                confirmColor: '#2563eb'
            });
            resetSpinBtn();
            return;
        }

        // c. Cek apakah tiket sudah pernah digunakan untuk spin
        if (invoiceData.sudah_spin) {
            Swal.fire({
                icon: 'warning',
                title: 'Tiket Sudah Digunakan',
                text: `Kode Tiket ini sudah pernah di-spin. Hadiah yang didapatkan: ${invoiceData.hasil_spin || '-'}`,
                confirmColor: '#2563eb'
            });
            resetSpinBtn();
            return;
        }

        // Tiket Valid! Simpan data invoice yang sedang aktif
        currentInvoiceObj = invoiceData;

        // Mulai Putar Roda Spin!
        startSpinWheelAnimation();

    } catch (err) {
        console.error("Error verifikasi tiket saat spin:", err);
        Swal.fire({
            icon: 'error',
            title: 'Kesalahan Sistem',
            text: 'Gagal terhubung ke database. Silakan coba lagi.',
            confirmColor: '#2563eb'
        });
        resetSpinBtn();
    }
}

function resetSpinBtn() {
    const btnSpinNow = document.getElementById('btnSpinNow');
    btnSpinNow.disabled = false;
    btnSpinNow.innerHTML = '<i class="fa-solid fa-play"></i> SPIN SEKARANG';
}

/**
 * ENGINE STRATEGI PENENTUAN HADIAH (RIGGED PER INVOICE & MODE SPIN ADMIN)
 */
function determineWinningPrizeIndex() {
    // Priority 1: Mode Manual (Rigged khusus per invoice oleh Admin)
    if (currentInvoiceObj && currentInvoiceObj.hadiah_manual) {
        const riggedName = currentInvoiceObj.hadiah_manual;
        const foundIndex = prizesList.findIndex(p => p.nama_hadiah.toLowerCase() === riggedName.toLowerCase());
        if (foundIndex !== -1) {
            console.log(`[SPIN ENGINE] Mode Manual Rigged Aktif: ${prizesList[foundIndex].nama_hadiah}`);
            return foundIndex;
        }
    }

    const mode = settingsObj ? settingsObj.spin_mode : 'normal';
    console.log(`[SPIN ENGINE] Mode Spin Aktif: ${mode}`);

    // Priority 2: Mode Zonk Terus
    if (mode === 'zonk_terus') {
        const zonkIndex = prizesList.findIndex(p => p.nama_hadiah.toLowerCase().includes('zonk'));
        return zonkIndex !== -1 ? zonkIndex : 0;
    }

    // Priority 3: Mode Hadiah Kecil (Hanya Zonk, Voucher 5K, Voucher 10K)
    if (mode === 'hadiah_kecil') {
        const filteredIndexes = [];
        prizesList.forEach((p, idx) => {
            const nameLower = p.nama_hadiah.toLowerCase();
            if (nameLower.includes('zonk') || nameLower.includes('5.000') || nameLower.includes('5k') || nameLower.includes('10.000') || nameLower.includes('10k')) {
                filteredIndexes.push(idx);
            }
        });

        if (filteredIndexes.length > 0) {
            const randomIdx = Math.floor(Math.random() * filteredIndexes.length);
            return filteredIndexes[randomIdx];
        }
    }

    // Priority 4: Mode Custom
    if (mode === 'custom' && settingsObj.custom_prizes && settingsObj.custom_prizes.length > 0) {
        const allowedPrizes = settingsObj.custom_prizes;
        const validIndexes = [];
        prizesList.forEach((p, idx) => {
            if (allowedPrizes.includes(p.nama_hadiah)) {
                validIndexes.push(idx);
            }
        });
        if (validIndexes.length > 0) {
            const randomIdx = Math.floor(Math.random() * validIndexes.length);
            return validIndexes[randomIdx];
        }
    }

    // Priority 5: Mode Normal (Persentase bobot)
    let totalWeight = 0;
    prizesList.forEach(p => totalWeight += (parseFloat(p.persentase) || 0));

    if (totalWeight <= 0) totalWeight = prizesList.length;

    let rand = Math.random() * totalWeight;
    for (let i = 0; i < prizesList.length; i++) {
        const weight = parseFloat(prizesList[i].persentase) || (totalWeight / prizesList.length);
        if (rand < weight) {
            return i;
        }
        rand -= weight;
    }

    return 0;
}

/**
 * SOUND EFFECT SYNTHESIZER (WEB AUDIO API)
 */
function playClickSound() {
    try {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(600, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(120, audioCtx.currentTime + 0.04);
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.04);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start();
        osc.stop(audioCtx.currentTime + 0.04);
    } catch (e) {
        // Ignored if autoplay policy restricts
    }
}

/**
 * JALANKAN ANIMASI PUTARAN RODA (6.5 DETIK)
 */
function startSpinWheelAnimation() {
    isSpinning = true;

    const btnSpinNow = document.getElementById('btnSpinNow');
    const spinTicketInput = document.getElementById('spinTicket');

    btnSpinNow.disabled = true;
    spinTicketInput.disabled = true;
    btnSpinNow.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> MEMUTAR RODA...';

    // Tentukan index pemenang
    const targetIndex = determineWinningPrizeIndex();
    const winningPrize = prizesList[targetIndex];

    const numSlices = prizesList.length;
    const sliceAngle = (2 * Math.PI) / numSlices;

    // Pointer di Atas (270 derajat = 3 * Math.PI / 2)
    const targetSliceCenterAngle = (targetIndex + 0.5) * sliceAngle;
    const pointerAngle = (3 * Math.PI) / 2;

    let targetRotationMod = pointerAngle - targetSliceCenterAngle;
    while (targetRotationMod < 0) {
        targetRotationMod += 2 * Math.PI;
    }

    const durationMs = 6500; // 6.5 detik
    const fullRounds = 8;
    const totalRotationTarget = currentRotation + (fullRounds * 2 * Math.PI) + (targetRotationMod - (currentRotation % (2 * Math.PI)));

    const startTime = performance.now();
    const startRotation = currentRotation;
    let lastSliceSoundIndex = -1;

    function animate(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / durationMs, 1);

        // Ease Out Cubic Physics Curve
        const easeOut = 1 - Math.pow(1 - progress, 3);
        currentRotation = startRotation + (totalRotationTarget - startRotation) * easeOut;

        // Suara klak-klik setiap melewati sektor
        const currentSliceSoundIndex = Math.floor((currentRotation % (2 * Math.PI)) / sliceAngle);
        if (currentSliceSoundIndex !== lastSliceSoundIndex) {
            playClickSound();
            lastSliceSoundIndex = currentSliceSoundIndex;
        }

        renderWheelCanvas();

        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            isSpinning = false;
            onSpinComplete(winningPrize);
        }
    }

    requestAnimationFrame(animate);
}

/**
 * HASIL SPIN SELESAI
 */
async function onSpinComplete(winningPrize) {
    const prizeName = winningPrize.nama_hadiah;
    const isZonk = prizeName.toLowerCase().includes('zonk');

    try {
        // Update status di Supabase Database
        await DB.recordSpinResult(currentInvoiceObj.id, prizeName);
        await DB.addLog(currentInvoiceObj.invoice, `Customer spin (Tiket: ${currentInvoiceObj.ticket_code}) mendapatkan: ${prizeName}`);

        // Sembunyikan form spin & tampilkan Result Card
        document.getElementById('spinMainCard').style.display = 'none';
        const resultSection = document.getElementById('resultSection');
        resultSection.style.display = 'block';

        const resultIconBox = document.getElementById('resultIconBox');
        const resultHeader = document.getElementById('resultHeader');
        const prizeTitle = document.getElementById('prizeTitle');
        const btnWAConfirm = document.getElementById('btnWAConfirm');

        prizeTitle.innerText = prizeName;

        if (isZonk) {
            resultIconBox.innerHTML = '<i class="fa-solid fa-face-frown" style="color: #EF4444;"></i>';
            resultHeader.innerText = 'Maaf!';
        } else {
            resultIconBox.innerHTML = '<i class="fa-solid fa-trophy" style="color: #F59E0B;"></i>';
            resultHeader.innerText = 'Selamat!';
            // Efek kembang api Confetti
            if (typeof confetti === 'function') {
                confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
            }
        }

        // Format Pesan Otomatis WhatsApp ke Admin
        const waMessageText = `==================================
Halo Admin Khalil Store.

Invoice saya:
${currentInvoiceObj.invoice}

Kode Tiket Spin:
${currentInvoiceObj.ticket_code}

Saya mendapatkan:
${prizeName}

Mohon dilakukan pengecekan.

Terima kasih.
==================================`;

        const waTargetNum = (settingsObj && settingsObj.whatsapp_admin) ? settingsObj.whatsapp_admin : CONFIG.ADMIN_WA_NUMBER;
        const encodedMsg = encodeURIComponent(waMessageText);
        btnWAConfirm.href = `https://wa.me/${waTargetNum}?text=${encodedMsg}`;

    } catch (err) {
        console.error("Error update hasil spin:", err);
        Swal.fire({
            icon: 'error',
            title: 'Kesalahan Sistem',
            text: 'Spin selesai tetapi gagal memperbarui status ke database.',
            confirmColor: '#2563eb'
        });
    }
}
