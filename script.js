/* ================================================================
   THR GACHA — script.js
   ----------------------------------------------------------------
   Struktur file:
     1. PRIZE POOL         — daftar hadiah + weighted random
     2. WHEEL SEGMENTS     — konfigurasi visual roda (14 segmen)
     3. CANVAS DRAW        — fungsi render roda ke <canvas>
     4. SPIN               — logika putar + angle math
     5. RESULT UI          — tampilkan badge + history
     6. CONFETTI           — efek hujan confetti (jackpot/saham)
     7. DECORATIONS        — bintang & lentera background
================================================================ */


/* ================================================================
   1. PRIZE POOL
   ----------------------------------------------------------------
   Total weight = 100.
   Efektif = weight × 50% (Tier-1: 50% chance menang).

   Label           Weight   Efektif
   Rp 2.000          46      23%
   Rp 5.000          20      10%
   1 Lot DADA        14       7%    (diminta ~10% raw)
   Rp 10.000         10       5%
   Rp 20.000          6       3%
   1 Lot BUMI         3      1.5%   (diminta ~2% efektif)
   Rp 50.000          1      0.5%
   ──────────────────────────────
   TOTAL            100      50%   (50% sisanya = ZONK)
================================================================ */
const PRIZES = [
  { label: 'Rp 2.000',   value: '2k',   weight: 46, type: 'cash',  emoji: '💚' },
  { label: 'Rp 5.000',   value: '5k',   weight: 20, type: 'cash',  emoji: '💛' },
  { label: '1 Lot DADA', value: 'dada', weight: 14, type: 'stock', emoji: '📈', ticker: 'DADA' },
  { label: 'Rp 10.000',  value: '10k',  weight: 10, type: 'cash',  emoji: '🧡' },
  { label: 'Rp 20.000',  value: '20k',  weight: 6,  type: 'cash',  emoji: '❤️'  },
  { label: '1 Lot BUMI', value: 'bumi', weight: 3,  type: 'stock', emoji: '⛏️', ticker: 'BUMI' },
  { label: 'Rp 50.000',  value: '50k',  weight: 1,  type: 'cash',  emoji: '💎' },
];

const TOTAL_W = PRIZES.reduce((sum, p) => sum + p.weight, 0); // = 100

/**
 * Pilih hadiah menggunakan weighted random (cumulative threshold).
 * Roll r ∈ [0, 100):
 *   [0 , 46) → Rp 2.000     46%
 *   [46, 66) → Rp 5.000     20%
 *   [66, 80) → 1 Lot DADA   14%
 *   [80, 90) → Rp 10.000    10%
 *   [90, 96) → Rp 20.000     6%
 *   [96, 99) → 1 Lot BUMI    3%
 *   [99,100) → Rp 50.000     1%
 */
function weightedPrize() {
  const r = Math.random() * TOTAL_W;
  let cumulative = 0;
  for (const prize of PRIZES) {
    cumulative += prize.weight;
    if (r < cumulative) return prize;
  }
  return PRIZES[0]; // fallback
}


/* ================================================================
   2. WHEEL SEGMENTS
   ----------------------------------------------------------------
   14 segmen total: 7 prize (hadiah) + 7 ZONK, selang-seling.
   Urutan menyebar hadiah secara merata di roda.

   Idx   Label          Type
    0    Rp 2.000       prize
    1    ZONK           zonk
    2    1 Lot DADA     prize
    3    ZONK           zonk
    4    Rp 5.000       prize
    5    ZONK           zonk
    6    Rp 10.000      prize
    7    ZONK           zonk
    8    Rp 20.000      prize
    9    ZONK           zonk
   10    1 Lot BUMI     prize
   11    ZONK           zonk
   12    Rp 50.000      prize
   13    ZONK           zonk
================================================================ */
const SEGMENTS = [
  /* 0  */ { label: 'Rp 2.000',   prize: true,  ca: '#145228', cb: '#1e7a3c', line1: 'Rp 2.000',  line2: ''     },
  /* 1  */ { label: 'ZONK',       prize: false, ca: '#161628', cb: '#202040', line1: 'ZONK',      line2: ''     },
  /* 2  */ { label: '1 Lot DADA', prize: true,  ca: '#7a3a00', cb: '#b85a00', line1: '1 Lot',     line2: 'DADA' },
  /* 3  */ { label: 'ZONK',       prize: false, ca: '#161628', cb: '#202040', line1: 'ZONK',      line2: ''     },
  /* 4  */ { label: 'Rp 5.000',   prize: true,  ca: '#8a5008', cb: '#c07010', line1: 'Rp 5.000',  line2: ''     },
  /* 5  */ { label: 'ZONK',       prize: false, ca: '#161628', cb: '#202040', line1: 'ZONK',      line2: ''     },
  /* 6  */ { label: 'Rp 10.000',  prize: true,  ca: '#0e3870', cb: '#1858a8', line1: 'Rp 10.000', line2: ''     },
  /* 7  */ { label: 'ZONK',       prize: false, ca: '#161628', cb: '#202040', line1: 'ZONK',      line2: ''     },
  /* 8  */ { label: 'Rp 20.000',  prize: true,  ca: '#501470', cb: '#7822a0', line1: 'Rp 20.000', line2: ''     },
  /* 9  */ { label: 'ZONK',       prize: false, ca: '#161628', cb: '#202040', line1: 'ZONK',      line2: ''     },
  /* 10 */ { label: '1 Lot BUMI', prize: true,  ca: '#5a1010', cb: '#902020', line1: '1 Lot',     line2: 'BUMI' },
  /* 11 */ { label: 'ZONK',       prize: false, ca: '#161628', cb: '#202040', line1: 'ZONK',      line2: ''     },
  /* 12 */ { label: 'Rp 50.000',  prize: true,  ca: '#6e0c10', cb: '#aa1418', line1: 'Rp 50.000', line2: ''     },
  /* 13 */ { label: 'ZONK',       prize: false, ca: '#161628', cb: '#202040', line1: 'ZONK',      line2: ''     },
];

// Peta: label → array indeks segmen (untuk targeting spin)
const LABEL_TO_IDX = {};
SEGMENTS.forEach((seg, i) => {
  if (!LABEL_TO_IDX[seg.label]) LABEL_TO_IDX[seg.label] = [];
  LABEL_TO_IDX[seg.label].push(i);
});

const N   = SEGMENTS.length;       // 14 segmen
const ARC = (2 * Math.PI) / N;    // ~25.7° per segmen (dalam radian)


/* ================================================================
   3. CANVAS DRAW
================================================================ */
const canvas = document.getElementById('wheel');
const ctx    = canvas.getContext('2d');
let wheelAngle = 0; // total rotasi roda (radian, akumulatif)

/** Sesuaikan ukuran canvas dengan DPR layar, lalu gambar ulang */
function resize() {
  const dpr  = window.devicePixelRatio || 1;
  const size = canvas.offsetWidth * dpr;
  canvas.width = canvas.height = size;
  drawWheel(wheelAngle);
}

/**
 * Gambar seluruh roda pada sudut rotasi `angle` (radian).
 * Dipanggil setiap frame selama animasi spin.
 */
function drawWheel(angle) {
  const W  = canvas.width;
  const cx = W / 2, cy = W / 2, R = W / 2 - 2;
  ctx.clearRect(0, 0, W, W);

  for (let i = 0; i < N; i++) {
    const seg = SEGMENTS[i];
    // Sudut awal & akhir segmen ke-i (digeser oleh angle rotasi roda)
    const a0 = angle + i * ARC - Math.PI / 2;
    const a1 = a0 + ARC;

    // --- Isi segmen (radial gradient) ---
    const grd = ctx.createRadialGradient(cx, cy, R * 0.12, cx, cy, R);
    grd.addColorStop(0, seg.cb + 'ee');
    grd.addColorStop(1, seg.ca);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, R, a0, a1);
    ctx.closePath();
    ctx.fillStyle = grd;
    ctx.fill();

    // --- Garis pembatas antar segmen ---
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, R, a0, a1);
    ctx.closePath();
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth   = W * 0.004;
    ctx.stroke();

    // --- Label teks (dirotasi ke tengah segmen) ---
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(a0 + ARC / 2);
    ctx.textAlign   = 'right';
    ctx.shadowColor = 'rgba(0,0,0,0.85)';
    ctx.shadowBlur  = W * 0.015;

    if (seg.prize) {
      ctx.fillStyle = '#FFE08A';
      const fs = W * (seg.line2 ? 0.038 : 0.042);
      ctx.font = `bold ${fs}px Nunito,sans-serif`;

      if (seg.line2) {
        // Saham: dua baris — "1 Lot" di atas, nama ticker di bawah
        ctx.fillText(seg.line1, R * 0.87, -W * 0.01);
        ctx.fillStyle = '#fff';
        ctx.font = `900 ${W * 0.045}px Nunito,sans-serif`;
        ctx.fillText(seg.line2, R * 0.87,  W * 0.035);
      } else {
        ctx.fillText(seg.line1, R * 0.87, W * 0.018);
      }

      // Titik emas dekat rim
      ctx.beginPath();
      ctx.arc(R * 0.93, 0, W * 0.012, 0, Math.PI * 2);
      ctx.fillStyle   = 'rgba(255,215,60,0.55)';
      ctx.shadowColor = '#F0C040';
      ctx.shadowBlur  = W * 0.02;
      ctx.fill();

    } else {
      // ZONK — teks redup & miring
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      ctx.font = `italic ${W * 0.036}px Nunito,sans-serif`;
      ctx.fillText('ZONK', R * 0.87, W * 0.018);
    }
    ctx.restore();
  }

  // --- Rim emas luar ---
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(240,192,64,0.5)';
  ctx.lineWidth   = W * 0.018;
  ctx.stroke();

  // --- Lingkaran tengah (hub menutupinya via DOM) ---
  ctx.beginPath();
  ctx.arc(cx, cy, R * 0.17, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fill();
}


/* ================================================================
   4. SPIN
   ----------------------------------------------------------------
   Algoritma (dijamin sinkron antara visual & hasil gacha):

   1. Resolve gacha → isWin + prize
   2. Cari indeks segmen yang labelnya cocok (prize atau ZONK)
   3. Hitung rotasi TEPAT agar segmen itu berhenti di bawah pointer
   4. Animasi roda dengan easeOut cubic → visual = hasil

   Matematika sudut:
     Pointer tetap di atas (sudut layar = 0, alias -π/2 dari canvas).
     Pusat segmen ke-i dalam roda (sebelum rotasi): i*ARC + ARC/2
     Setelah rotasi wheelAngle, segmen berada di:
       (wheelAngle + segCenter) mod 2π
     Supaya = 0 (atas):
       needed = (-(segCenter) - wheelAngle) mod 2π
================================================================ */
let spinning = false;

function spin() {
  if (spinning) return;
  spinning = true;
  document.getElementById('btn').disabled = true;
  document.getElementById('glow').classList.add('on');
  document.getElementById('badge').classList.remove('show');

  /* Step 1 — Resolve gacha */
  const isWin = Math.random() < 0.5;
  const prize  = isWin ? weightedPrize() : null;

  /* Step 2 — Pilih segmen target */
  const targetLabel = isWin ? prize.label : 'ZONK';
  const candidates  = LABEL_TO_IDX[targetLabel];
  const targetIdx   = candidates[Math.floor(Math.random() * candidates.length)];

  /* Step 3 — Hitung sudut akhir yang tepat */
  const segCenter  = targetIdx * ARC + ARC / 2;
  // Variasi kecil agar tidak selalu berhenti di tengah-tengah segmen
  const nudge      = (Math.random() - 0.5) * ARC * 0.75;
  const currentMod = ((wheelAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  const needed     = ((-(segCenter + nudge) - currentMod) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
  const fullSpins  = (5 + Math.floor(Math.random() * 4)) * Math.PI * 2; // 5–8 putaran penuh
  const endAngle   = wheelAngle + fullSpins + needed;

  /* Step 4 — Animasi roda */
  const DURATION = 4400; // ms
  const t0 = performance.now();
  const a0 = wheelAngle;

  /** Fungsi easing: deselerasi alami seperti roda sungguhan */
  function easeOut(t) { return 1 - Math.pow(1 - t, 3.8); }

  (function frame(now) {
    const progress  = Math.min((now - t0) / DURATION, 1);
    wheelAngle = a0 + (endAngle - a0) * easeOut(progress);
    drawWheel(wheelAngle);

    if (progress < 1) {
      requestAnimationFrame(frame);
      return;
    }

    // Selesai — aktifkan kembali UI dan tampilkan hasil
    spinning = false;
    document.getElementById('glow').classList.remove('on');
    document.getElementById('btn').disabled = false;
    showResult(isWin, prize);
  })(t0);
}


/* ================================================================
   5. RESULT UI
================================================================ */

/** Tampilkan badge hasil dan tambahkan ke riwayat */
function showResult(isWin, prize) {
  const bval = document.getElementById('bval');
  const bmsg = document.getElementById('bmsg');

  if (isWin) {
    bval.textContent = prize.label;
    bval.className   = 'badge-val' + (prize.type === 'stock' ? ' saham' : '');

    if (prize.type === 'stock') {
      const stockMessages = {
        'DADA': '📈 Selamat! 1 lot saham DADA siap dikoleksi!',
        'BUMI': '⛏️ Wahh dapat saham BUMI! Lumayan buat portofolio!',
      };
      bmsg.textContent = stockMessages[prize.ticker] || 'Selamat, dapat saham!';
    } else if (prize.value === '50k') {
      bmsg.textContent = '🎊 JACKPOT! Alhamdulillah rezeki nomplok!';
    } else {
      bmsg.textContent = 'Alhamdulillah, bersyukur ✨';
    }
  } else {
    bval.textContent = 'ZONK 😅';
    bval.className   = 'badge-val z';
    bmsg.textContent = 'Sabar ya, coba lagi lebaran tahun depan! 🤲';
  }

  // Animasi masuk badge dengan sedikit delay
  setTimeout(() => document.getElementById('badge').classList.add('show'), 60);
  addHistory(isWin, prize);

  // Confetti untuk jackpot 50K dan semua hadiah saham
  if (isWin && (prize.value === '50k' || prize.type === 'stock')) {
    launchConfetti();
  }
}

/** Tambahkan chip kecil ke bagian riwayat putaran */
function addHistory(isWin, prize) {
  const hist    = document.getElementById('hist');
  const chip    = document.createElement('div');
  const isStock = isWin && prize.type === 'stock';

  chip.className   = 'hc ' + (isWin ? (isStock ? 'sb' : 'w') : 'z');
  chip.textContent = isWin ? prize.label : 'Zonk';

  hist.prepend(chip);
  // Batasi maksimal 16 chip
  while (hist.children.length > 16) hist.removeChild(hist.lastChild);
}


/* ================================================================
   6. CONFETTI (jackpot & saham)
================================================================ */
const cfx   = document.getElementById('cfx');
const cfxCtx = cfx.getContext('2d');
let cfxRaf, cfxParticles = [];

function launchConfetti() {
  cfx.style.display = 'block';
  cfx.width  = window.innerWidth;
  cfx.height = window.innerHeight;

  cfxParticles = [];
  const colors = ['#F0C040','#FFE08A','#1B7A45','#25A05C','#fff','#38bdf8','#C0181E','#8A28A0'];

  for (let i = 0; i < 220; i++) {
    cfxParticles.push({
      x:   Math.random() * cfx.width,
      y:   -20,
      w:   Math.random() * 12 + 4,
      h:   Math.random() * 5  + 3,
      col: colors[i % colors.length],
      vx:  (Math.random() - .5) * 5,
      vy:  Math.random() * 4 + 2,
      rot: Math.random() * 360,
      vr:  (Math.random() - .5) * 9,
    });
  }

  cancelAnimationFrame(cfxRaf);

  (function frame() {
    cfxCtx.clearRect(0, 0, cfx.width, cfx.height);

    cfxParticles.forEach(p => {
      p.x   += p.vx;
      p.vy  += 0.06; // gravitasi
      p.y   += p.vy;
      p.rot += p.vr;

      cfxCtx.save();
      cfxCtx.translate(p.x, p.y);
      cfxCtx.rotate(p.rot * Math.PI / 180);
      cfxCtx.fillStyle = p.col;
      cfxCtx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      cfxCtx.restore();
    });

    // Hapus partikel yang sudah keluar layar
    cfxParticles = cfxParticles.filter(p => p.y < cfx.height + 50);

    if (cfxParticles.length) {
      cfxRaf = requestAnimationFrame(frame);
    } else {
      cfx.style.display = 'none';
    }
  })();
}


/* ================================================================
   7. DECORATIONS — bintang & lentera
================================================================ */

/** Buat bintang-bintang berkedip di background */
(function mkStars() {
  const bg = document.getElementById('stars');
  for (let i = 0; i < 90; i++) {
    const el = document.createElement('div');
    el.className = 's';
    const sz = Math.random() * 2.5 + 0.5;
    el.style.cssText = [
      `width:${sz}px`,
      `height:${sz}px`,
      `top:${Math.random() * 100}%`,
      `left:${Math.random() * 100}%`,
      `--d:${(Math.random() * 3 + 2).toFixed(1)}s`,
      `--dl:${(Math.random() * 4).toFixed(1)}s`,
    ].join(';');
    bg.appendChild(el);
  }
})();

/** Buat lentera-lentera berayun di bagian atas */
(function mkLanterns() {
  const row    = document.getElementById('lanterns');
  const colors = ['#F0C040','#E74C3C','#2ECC71','#3498DB','#E91E8C','#FF9800','#9C27B0','#00BCD4'];

  for (let i = 0; i < 8; i++) {
    const c = colors[i % colors.length];
    const d = document.createElement('div');
    d.className = 'lan';
    d.style.cssText = `--sw:${(3.5 + i * 0.3).toFixed(1)}s;--sd:${(i * 0.35).toFixed(1)}s`;
    d.innerHTML = `
      <div class="lan-line"></div>
      <div class="lan-body" style="background:radial-gradient(circle at 40% 35%,${c}cc,${c}55);--c:${c}"></div>
      <div class="lan-tip" style="background:${c};--c:${c}"></div>`;
    row.appendChild(d);
  }
})();


/* ================================================================
   INIT
================================================================ */
window.addEventListener('resize', resize);
resize();