/**
 * WINNER TICKER / MARQUEE GENERATOR
 * 
 * Menampilkan daftar "pemenang" acak yang berubah setiap hari.
 * Invoice dan hadiah di-generate secara pseudorandom berdasarkan seed tanggal hari ini,
 * sehingga setiap hari menampilkan set yang berbeda tapi konsisten sepanjang hari.
 */

// ============================================================
// Daftar Hadiah yang Muncul di Ticker (Tanpa Zonk)
// ============================================================
const TICKER_PRIZES = [
    "💎 5 Diamond ML",
    "💎 12 Diamond ML",
    "💎 28 Diamond ML",
    "💎 56 Diamond ML",
    "💰 Saldo Rp10.000",
    "💰 Saldo Rp20.000",
    "💎 Weekly Diamond",
    "💎 172 Diamond ML",
];

// ============================================================
// Pseudorandom Number Generator berbasis Seed Tanggal
// Hasil acak konsisten SEPANJANG HARI, berubah setiap hari.
// ============================================================
function seededRandom(seed) {
    let s = seed;
    return function () {
        s = (s * 1664525 + 1013904223) & 0xffffffff;
        return ((s >>> 0) / 0xffffffff);
    };
}

function getDailySeed() {
    const today = new Date();
    return today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
}

// ============================================================
// Generate Nomor Invoice Format INV + 12 Digit + INV
// ============================================================
function generateFakeInvoice(rng) {
    let digits = '';
    for (let i = 0; i < 12; i++) {
        digits += Math.floor(rng() * 10).toString();
    }
    return `INV${digits}INV`;
}

// ============================================================
// Hitung Relatif Waktu ("2 jam lalu", "45 menit lalu", dsb)
// ============================================================
function generateRelativeTime(rng) {
    const options = [
        "baru saja",
        "2 mnt lalu",
        "5 mnt lalu",
        "11 mnt lalu",
        "23 mnt lalu",
        "35 mnt lalu",
        "48 mnt lalu",
        "1 jam lalu",
        "2 jam lalu",
        "3 jam lalu",
        "4 jam lalu",
    ];
    return options[Math.floor(rng() * options.length)];
}

// ============================================================
// Generate Array Pemenang Harian (Jumlah 12 pemenang)
// ============================================================
function generateDailyWinners() {
    const seed = getDailySeed();
    const rng = seededRandom(seed);
    const winners = [];
    const COUNT = 12;

    for (let i = 0; i < COUNT; i++) {
        winners.push({
            invoice: generateFakeInvoice(rng),
            prize: TICKER_PRIZES[Math.floor(rng() * TICKER_PRIZES.length)],
            time: generateRelativeTime(rng),
        });
    }

    return winners;
}

// ============================================================
// Render Ticker HTML ke dalam elemen #winnerTickerScroll
// ============================================================
function renderWinnerTicker() {
    const container = document.getElementById('winnerTickerScroll');
    if (!container) return;

    const winners = generateDailyWinners();

    // Duplikasi 2x agar scrolling seamless tanpa jeda
    const allWinners = [...winners, ...winners];

    const html = allWinners.map((w) => `
        <span class="winner-item">
            <span class="winner-trophy-icon">🏆</span>
            <span class="winner-invoice">${w.invoice}</span>
            <span class="winner-mid-text">mendapatkan</span>
            <span class="winner-prize">${w.prize}</span>
            <span class="winner-time">${w.time}</span>
        </span>
        <span class="winner-sep">❯</span>
    `).join('');

    container.innerHTML = html;
}

// Jalankan saat DOM siap
document.addEventListener('DOMContentLoaded', renderWinnerTicker);

