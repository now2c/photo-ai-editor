/* ============================================================
   Panda Camera 印相自助站 — app.js
   ============================================================ */

'use strict';

/* ------------------------------------------------
   CONFIG — 價目表、分店、AI 功能
   ------------------------------------------------ */
const CONFIG = {
  currency: 'HK$',

  stores: [
    { id: 'kwun-tong', name: '觀塘分店', addr: '觀塘開源道 68 號觀塘廣場 1 樓', icon: '📍' },
    { id: 'causeway-bay', name: '銅鑼灣分店', addr: '銅鑼灣軒尼詩道 500 號銅鑼灣廣場 G/F', icon: '📍' },
  ],

  aiFeatures: [
    { id: 'cutout',  name: 'AI 去背',   desc: '一鍵去背，精準摳圖', icon: '✂️',  price: 18, fallback: true },
    { id: 'restore', name: 'AI 修復',   desc: '修復舊相瑕疵・增強畫質', icon: '✨',  price: 28, fallback: true },
    { id: 'portrait',name: 'AI 形象照', desc: '專業形象照・自由換背景', icon: '👔',  price: 48, fallback: true },
    { id: 'avatar',  name: 'AI 頭像',   desc: 'AI 生成證件／社交頭像', icon: '🖼️',  price: 38, fallback: true },
  ],

  photoTypes: [
    { id: 'normal',  label: '一般照片' },
    { id: 'id',      label: '證件照' },
    { id: 'portrait',label: '形象照' },
  ],

  papers: [
    { id: '4r',  label: '4R',   size: '4×6"',  prices: { normal: 12, id: 15, portrait: 18 } },
    { id: '5r',  label: '5R',   size: '5×7"',  prices: { normal: 15, id: 18, portrait: 22 } },
    { id: '6r',  label: '6R',   size: '6×8"',  prices: { normal: 18, id: 22, portrait: 26 } },
    { id: '8r',  label: '8R',   size: '8×10"', prices: { normal: 25, id: 30, portrait: 35 } },
    { id: 'a4',  label: 'A4',   size: 'A4',    prices: { normal: 35, id: 40, portrait: 48 } },
  ],

  finishes: [
    { id: 'glossy', label: '光面',   delta: 0 },
    { id: 'matte',  label: '霧面',   delta: 2 },
    { id: 'pearl',  label: '珍珠面', delta: 5 },
  ],

  demoImg: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjYwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iODAwIiBoZWlnaHQ9IjYwMCIgZmlsbD0iI2QzZDNkMyIvPjx0ZXh0IHg9IjQwMCIgeT0iMzAwIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIzMiIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zNWVtIj7nkIblj7fkuIvkvKDlh7vnlKjlpKflsYzmlbTkvZPov57mjqXjgII8L3RleHQ+PC9zdmc+',
};

/* ------------------------------------------------
   STATE
   ------------------------------------------------ */
const state = {
  photo: null,     // { dataUrl, name, size, file }
  selectedAI: new Set(),
  aiResults: {},   // id -> { dataUrl, blob? }
  photoType: 'normal',
  paper: '4r',
  finish: 'glossy',
  store: null,
  order: null,     // { id, ... }
  processing: false,
};

/* ------------------------------------------------
   DOM refs
   ------------------------------------------------ */
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

/* ------------------------------------------------
   INIT
   ------------------------------------------------ */
document.addEventListener('DOMContentLoaded', () => {
  // 1. Build AI cards
  renderAICards();
  // 2. Build paper/type/finish chips
  renderPaperChips();
  renderTypeChips();
  renderFinishChips();
  // 3. Build store cards
  renderStores();
  // 4. Build price table
  renderPriceTable();
  // 5. Wire upload
  wireUpload();
  // 6. Wire AI grid
  wireAIGrid();
  // 7. Wire order
  wireOrder();
  // 8. Wire modal
  wireModal();
  // 9. Wire reset
  wireReset();
  // 10. Update order
  updateOrder();
});

/* ------------------------------------------------
   RENDER: AI Cards
   ------------------------------------------------ */
function renderAICards() {
  const grid = $('#aiGrid');
  grid.innerHTML = CONFIG.aiFeatures.map(f => `
    <div class="ai-card" data-ai="${f.id}">
      <span class="ai-check">✓</span>
      <div class="ai-icon">${f.icon}</div>
      <div class="ai-name">${f.name}</div>
      <div class="ai-desc">${f.desc}</div>
      <div class="ai-price">+${CONFIG.currency}${f.price}</div>
      <div class="ai-badge">運算於本地瀏覽器</div>
    </div>
  `).join('');
}

/* ------------------------------------------------
   RENDER: Paper Chips
   ------------------------------------------------ */
function renderPaperChips() {
  const grid = $('#paperGrid');
  grid.innerHTML = CONFIG.papers.map(p => `
    <button class="opt-chip chip-paper" data-paper="${p.id}">
      ${p.label} <span class="opt-size">${p.size}</span>
    </button>
  `).join('');
  grid.querySelector(`[data-paper="${state.paper}"]`)?.classList.add('selected');
  grid.addEventListener('click', e => {
    const chip = e.target.closest('.chip-paper');
    if (!chip) return;
    grid.querySelectorAll('.chip-paper').forEach(c => c.classList.remove('selected'));
    chip.classList.add('selected');
    state.paper = chip.dataset.paper;
    updatePrintQuote();
    updateOrder();
  });
}

/* ------------------------------------------------
   RENDER: Type Chips
   ------------------------------------------------ */
function renderTypeChips() {
  const grid = $('#typeGrid');
  grid.innerHTML = CONFIG.photoTypes.map(t => `
    <button class="opt-chip chip-type" data-type="${t.id}">
      ${t.label}
    </button>
  `).join('');
  grid.querySelector(`[data-type="${state.photoType}"]`)?.classList.add('selected');
  grid.addEventListener('click', e => {
    const chip = e.target.closest('.chip-type');
    if (!chip) return;
    grid.querySelectorAll('.chip-type').forEach(c => c.classList.remove('selected'));
    chip.classList.add('selected');
    state.photoType = chip.dataset.type;
    updatePrintQuote();
    updateOrder();
  });
}

/* ------------------------------------------------
   RENDER: Finish Chips
   ------------------------------------------------ */
function renderFinishChips() {
  const grid = $('#finishGrid');
  grid.innerHTML = CONFIG.finishes.map(f => `
    <button class="opt-chip chip-finish" data-finish="${f.id}">
      ${f.label}${f.delta > 0 ? ` <span class="opt-delta">+${CONFIG.currency}${f.delta}</span>` : ''}
    </button>
  `).join('');
  grid.querySelector(`[data-finish="${state.finish}"]`)?.classList.add('selected');
  grid.addEventListener('click', e => {
    const chip = e.target.closest('.chip-finish');
    if (!chip) return;
    grid.querySelectorAll('.chip-finish').forEach(c => c.classList.remove('selected'));
    chip.classList.add('selected');
    state.finish = chip.dataset.finish;
    updatePrintQuote();
    updateOrder();
  });
}

/* ------------------------------------------------
   RENDER: Stores
   ------------------------------------------------ */
function renderStores() {
  const grid = $('#storeGrid');
  grid.innerHTML = CONFIG.stores.map(s => `
    <div class="store-card" data-store="${s.id}">
      <div class="store-icon">${s.icon}</div>
      <div class="store-name">${s.name}</div>
      <div class="store-addr">${s.addr}</div>
    </div>
  `).join('');
  if (state.store) {
    grid.querySelector(`[data-store="${state.store}"]`)?.classList.add('selected');
  }
  grid.addEventListener('click', e => {
    const card = e.target.closest('.store-card');
    if (!card) return;
    grid.querySelectorAll('.store-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    state.store = card.dataset.store;
    updateOrder();
  });
}

/* ------------------------------------------------
   RENDER: Price Table
   ------------------------------------------------ */
function renderPriceTable() {
  const tbody = $('#priceTable tbody');
  tbody.innerHTML = CONFIG.papers.map(p => `
    <tr>
      <td>${p.label} (${p.size})</td>
      <td>${CONFIG.currency}${p.prices.normal}</td>
      <td>${CONFIG.currency}${p.prices.id}</td>
      <td>${CONFIG.currency}${p.prices.portrait}</td>
    </tr>
  `).join('');
}

/* ------------------------------------------------
   UPLOAD
   ------------------------------------------------ */
function wireUpload() {
  const zone = $('#uploadZone');
  const input = $('#fileInput');
  const pickBtn = $('#pickBtn');
  const replaceBtn = $('#replaceBtn');
  const removeBtn = $('#removeBtn');
  const demoBtn = $('#demoBtn');
  const inner = $('#uploadInner');
  const preview = $('#previewBox');
  const img = $('#previewImg');
  const nameEl = $('#previewName');
  const sizeEl = $('#previewSize');

  pickBtn.addEventListener('click', () => input.click());
  replaceBtn.addEventListener('click', () => input.click());

  input.addEventListener('change', () => {
    if (input.files?.[0]) loadFile(input.files[0]);
    input.value = '';
  });

  // Drag & Drop
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('dragover'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('dragover');
    if (e.dataTransfer.files?.[0]) loadFile(e.dataTransfer.files[0]);
  });

  // Demo
  demoBtn.addEventListener('click', () => {
    // Generate a demo image (colorful gradient)
    const canvas = document.createElement('canvas');
    canvas.width = 800; canvas.height = 600;
    const ctx = canvas.getContext('2d');
    const g = ctx.createLinearGradient(0,0,800,600);
    g.addColorStop(0,'#f97316'); g.addColorStop(.5,'#ec4899'); g.addColorStop(1,'#8b5cf6');
    ctx.fillStyle = g; ctx.fillRect(0,0,800,600);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('示範照片', 400, 280);
    ctx.font = '20px sans-serif';
    ctx.fillText('拖曳或點擊上傳你的照片', 400, 340);
    canvas.toBlob(blob => {
      const file = new File([blob], 'demo-photo.jpg', { type: 'image/jpeg' });
      loadFile(file);
    });
  });

  removeBtn.addEventListener('click', () => {
    state.photo = null;
    state.selectedAI.clear();
    state.aiResults = {};
    inner.classList.remove('hidden');
    preview.classList.add('hidden');
    updateOrder();
    const cards = $$('.ai-card');
    cards.forEach(c => c.classList.remove('selected'));
  });

  function loadFile(file) {
    if (!file.type.startsWith('image/')) { alert('請上傳圖片檔案'); return; }
    if (file.size > 30*1024*1024) { alert('檔案過大，請上傳 30MB 以內的圖片'); return; }
    const reader = new FileReader();
    reader.onload = e => {
      state.photo = { dataUrl: e.target.result, name: file.name, size: file.size, file };
      img.src = state.photo.dataUrl;
      nameEl.textContent = file.name;
      sizeEl.textContent = formatSize(file.size);
      inner.classList.add('hidden');
      preview.classList.remove('hidden');
      // Reset AI selections
      state.selectedAI.clear();
      state.aiResults = {};
      $$('.ai-card').forEach(c => c.classList.remove('selected'));
      updateOrder();
    };
    reader.readAsDataURL(file);
  }
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + 'B';
  if (bytes < 1024*1024) return (bytes/1024).toFixed(1) + 'KB';
  return (bytes/(1024*1024)).toFixed(1) + 'MB';
}

/* ------------------------------------------------
   AI GRID
   ------------------------------------------------ */
function wireAIGrid() {
  const grid = $('#aiGrid');
  const resultBox = $('#aiResultBox');
  const resultImg = $('#aiResultImg');
  const resultName = $('#aiResultName');
  const resultNote = $('#aiResultNote');
  const closeBtn = $('#closeResultBtn');
  const applyBtn = $('#applyResultBtn');
  const downloadBtn = $('#downloadResultBtn');

  grid.addEventListener('click', async e => {
    const card = e.target.closest('.ai-card');
    if (!card || !state.photo) { alert('請先上傳照片'); return; }
    if (state.processing) return;

    const id = card.dataset.ai;
    // If already selected — deselect
    if (state.selectedAI.has(id)) {
      state.selectedAI.delete(id);
      card.classList.remove('selected');
      delete state.aiResults[id];
      resultBox.classList.add('hidden');
      updateOrder();
      return;
    }

    // Process
    card.classList.add('selected');
    state.selectedAI.add(id);
    updateOrder();

    // Show processing
    showProcessing(getAIFeature(id).name, '正在進行 AI 運算…');

    try {
      state.processing = true;
      let resultUrl;
      switch (id) {
        case 'cutout':   resultUrl = await processCutout();  break;
        case 'restore':  resultUrl = await processRestore(); break;
        case 'portrait': resultUrl = await processPortrait(); break;
        case 'avatar':   resultUrl = await processAvatar();  break;
      }
      state.aiResults[id] = { dataUrl: resultUrl };
      resultImg.src = resultUrl;
      resultName.textContent = getAIFeature(id).name;
      resultNote.textContent = '✅ 處理完成';
      resultBox.classList.remove('hidden');
    } catch (err) {
      console.error('AI processing error:', err);
      state.selectedAI.delete(id);
      card.classList.remove('selected');
      resultNote.textContent = '⚠️ 處理失敗，請重試';
      resultBox.classList.remove('hidden');
      resultImg.src = state.photo.dataUrl;
      resultName.textContent = getAIFeature(id).name;
    } finally {
      state.processing = false;
      hideProcessing();
      updateOrder();
    }
  });

  closeBtn.addEventListener('click', () => resultBox.classList.add('hidden'));
  applyBtn.addEventListener('click', () => {
    if (state.photo) {
      state.photo.dataUrl = resultImg.src;
      $('#previewImg').src = resultImg.src;
    }
    resultBox.classList.add('hidden');
  });
  downloadBtn.addEventListener('click', () => {
    const a = document.createElement('a');
    a.href = resultImg.src;
    a.download = 'panda-ai-result.png';
    a.click();
  });
}

function getAIFeature(id) {
  return CONFIG.aiFeatures.find(f => f.id === id);
}

/* ------------------------------------------------
   AI PROCESSING
   ------------------------------------------------ */

/* --- 去背 (Background Removal) --- */
async function processCutout() {
  try {
    updateProcBar(10);
    // Dynamic import imgly background removal from CDN
    const mod = await import('https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.5.5/dist/index.mjs');
    updateProcBar(30);
    const blob = await mod.removeBackground(state.photo.dataUrl, {
      progress: (key, current, total) => {
        const pct = total > 0 ? Math.round(current/total * 60) + 30 : 30;
        updateProcBar(Math.min(pct, 90));
      }
    });
    updateProcBar(100);
    return URL.createObjectURL(blob);
  } catch (err) {
    console.warn('imgly bg-removal failed, using fallback:', err);
    return fallbackCutout(state.photo.dataUrl);
  }
}

/* Fallback: simple color-based (corner flood fill) removal */
function fallbackCutout(dataUrl) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width; canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const d = imageData.data;

      // Sample corner colors
      const corners = [
        getPixel(d, canvas.width, 0, 0),
        getPixel(d, canvas.width, canvas.width-1, 0),
        getPixel(d, canvas.width, 0, canvas.height-1),
        getPixel(d, canvas.width, canvas.width-1, canvas.height-1),
      ];
      // Average corner color
      const bg = { r:0,g:0,b:0 };
      corners.forEach(c => { bg.r += c.r; bg.g += c.g; bg.b += c.b; });
      bg.r = Math.round(bg.r/4); bg.g = Math.round(bg.g/4); bg.b = Math.round(bg.b/4);

      const threshold = 45;
      for (let i = 0; i < d.length; i += 4) {
        const dr = Math.abs(d[i] - bg.r);
        const dg = Math.abs(d[i+1] - bg.g);
        const db = Math.abs(d[i+2] - bg.b);
        if (dr < threshold && dg < threshold && db < threshold) {
          d[i+3] = 0; // transparent
        }
      }
      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.src = dataUrl;
  });
}

function getPixel(d, w, x, y) {
  const i = (y * w + x) * 4;
  return { r: d[i], g: d[i+1], b: d[i+2] };
}

/* --- 修復 (Restoration/Enhancement) --- */
async function processRestore() {
  const img = await loadImage(state.photo.dataUrl);
  const canvas = document.createElement('canvas');
  canvas.width = img.width; canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);

  updateProcBar(20);

  // 1. Contrast & brightness boost
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = imageData.data;
  const contrast = 1.15;
  const brightness = 8;
  const saturation = 1.1;
  const factor = (259 * (contrast * 255 + 255)) / (255 * (259 - contrast * 255));

  for (let i = 0; i < d.length; i += 4) {
    // Apply contrast & brightness
    d[i]   = Math.max(0, Math.min(255, factor * (d[i] - 128) + 128 + brightness));
    d[i+1] = Math.max(0, Math.min(255, factor * (d[i+1] - 128) + 128 + brightness));
    d[i+2] = Math.max(0, Math.min(255, factor * (d[i+2] - 128) + 128 + brightness));
  }

  // Saturation boost
  for (let i = 0; i < d.length; i += 4) {
    const gray = 0.299 * d[i] + 0.587 * d[i+1] + 0.114 * d[i+2];
    d[i]   = Math.max(0, Math.min(255, gray + saturation * (d[i] - gray)));
    d[i+1] = Math.max(0, Math.min(255, gray + saturation * (d[i+1] - gray)));
    d[i+2] = Math.max(0, Math.min(255, gray + saturation * (d[i+2] - gray)));
  }
  ctx.putImageData(imageData, 0, 0);
  updateProcBar(50);

  // 2. Sharpening (unsharp mask)
  const sharpened = unsharpMask(canvas, 1.5, 0.6);
  updateProcBar(80);

  // 3. Light noise reduction (simple median filter on luminance)
  const denoised = simpleDenoise(sharpened, 1);
  updateProcBar(100);

  return denoised.toDataURL('image/jpeg', 0.95);
}

function unsharpMask(srcCanvas, radius, amount) {
  const w = srcCanvas.width, h = srcCanvas.height;
  const src = srcCanvas.getContext('2d').getImageData(0,0,w,h);
  const blur = gaussianBlur(src, radius);
  const dst = new Uint8ClampedArray(src.data);
  for (let i = 0; i < dst.length; i += 4) {
    dst[i]   = Math.max(0, Math.min(255, src.data[i]   + amount * (src.data[i]   - blur.data[i])));
    dst[i+1] = Math.max(0, Math.min(255, src.data[i+1] + amount * (src.data[i+1] - blur.data[i+1])));
    dst[i+2] = Math.max(0, Math.min(255, src.data[i+2] + amount * (src.data[i+2] - blur.data[i+2])));
  }
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  c.getContext('2d').putImageData(new ImageData(dst, w, h), 0, 0);
  return c;
}

function gaussianBlur(imageData, radius) {
  const w = imageData.width, h = imageData.height;
  const src = imageData.data;
  const dst = new Uint8ClampedArray(src);
  const size = Math.ceil(radius * 3);
  const kernel = [];
  let sum = 0;
  for (let i = -size; i <= size; i++) {
    const v = Math.exp(-(i*i)/(2*radius*radius));
    kernel.push(v);
    sum += v;
  }
  for (let i = 0; i < kernel.length; i++) kernel[i] /= sum;

  // Horizontal pass
  const temp = new Uint8ClampedArray(src.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let r = 0, g = 0, b = 0;
      for (let k = 0; k < kernel.length; k++) {
        const sx = Math.max(0, Math.min(w-1, x + k - size));
        const idx = (y * w + sx) * 4;
        r += src[idx] * kernel[k];
        g += src[idx+1] * kernel[k];
        b += src[idx+2] * kernel[k];
      }
      const idx = (y * w + x) * 4;
      temp[idx] = r; temp[idx+1] = g; temp[idx+2] = b; temp[idx+3] = src[idx+3];
    }
  }
  // Vertical pass
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      let r = 0, g = 0, b = 0;
      for (let k = 0; k < kernel.length; k++) {
        const sy = Math.max(0, Math.min(h-1, y + k - size));
        const idx = (sy * w + x) * 4;
        r += temp[idx] * kernel[k];
        g += temp[idx+1] * kernel[k];
        b += temp[idx+2] * kernel[k];
      }
      const idx = (y * w + x) * 4;
      dst[idx] = r; dst[idx+1] = g; dst[idx+2] = b; dst[idx+3] = temp[idx+3];
    }
  }
  return new ImageData(dst, w, h);
}

function simpleDenoise(canvas, strength) {
  if (strength === 0) return canvas;
  const w = canvas.width, h = canvas.height;
  const ctx = canvas.getContext('2d');
  const src = ctx.getImageData(0,0,w,h);
  const d = src.data;
  const dst = new Uint8ClampedArray(d);
  for (let y = 1; y < h-1; y++) {
    for (let x = 1; x < w-1; x++) {
      const idx = (y * w + x) * 4;
      // 3x3 median on luminance
      const lum = [];
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const i = ((y+dy) * w + (x+dx)) * 4;
          lum.push(0.299 * d[i] + 0.587 * d[i+1] + 0.114 * d[i+2]);
        }
      }
      lum.sort((a,b) => a-b);
      const median = lum[4];
      const cur = 0.299 * d[idx] + 0.587 * d[idx+1] + 0.114 * d[idx+2];
      const diff = cur - median;
      if (Math.abs(diff) > 15) {
        const blend = 0.5;
        dst[idx]   = Math.round(d[idx]   * (1-blend) + (d[idx]   - diff * 0.3));
        dst[idx+1] = Math.round(d[idx+1] * (1-blend) + (d[idx+1] - diff * 0.3));
        dst[idx+2] = Math.round(d[idx+2] * (1-blend) + (d[idx+2] - diff * 0.3));
      }
    }
  }
  ctx.putImageData(new ImageData(dst, w, h), 0, 0);
  return canvas;
}

/* --- 形象照 (AI Portrait) --- */
async function processPortrait() {
  const img = await loadImage(state.photo.dataUrl);
  // Try to use cutout result if available
  let subjectSrc = state.photo.dataUrl;
  if (state.aiResults.cutout) {
    subjectSrc = state.aiResults.cutout.dataUrl;
  }
  const subject = await loadImage(subjectSrc);

  const W = 1200, H = 1600;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  updateProcBar(20);

  // Background: studio gradient
  const bgGrad = ctx.createRadialGradient(W/2, H/2, 100, W/2, H/2, 900);
  bgGrad.addColorStop(0, '#f0ece4');
  bgGrad.addColorStop(.5, '#d8d2c4');
  bgGrad.addColorStop(1, '#b8b0a0');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0,0,W,H);

  updateProcBar(40);

  // Subtle floor shadow
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(W/2, H-180, 280, 40, 0, 0, Math.PI*2);
  ctx.fillStyle = 'rgba(0,0,0,.08)';
  ctx.fill();
  ctx.restore();

  updateProcBar(60);

  // Place subject — center, best fit portrait
  const subW = subject.width, subH = subject.height;
  const targetW = W * 0.65, targetH = H * 0.7;
  const scale = Math.max(subW / targetW, subH / targetH);
  const dw = subW / scale, dh = subH / scale;
  const dx = (W - dw) / 2, dy = (H - dh) / 2 + 40;

  ctx.drawImage(subject, 0, 0, subW, subH, dx, dy, dw, dh);

  updateProcBar(80);

  // Vignette overlay
  const vig = ctx.createRadialGradient(W/2, H/2, H*0.3, W/2, H/2, H*0.75);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,.15)');
  ctx.fillStyle = vig;
  ctx.fillRect(0,0,W,H);

  updateProcBar(100);

  return canvas.toDataURL('image/jpeg', 0.92);
}

/* --- 頭像 (AI Avatar) --- */
async function processAvatar() {
  const img = await loadImage(state.photo.dataUrl);
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d');

  updateProcBar(20);

  // Center crop to square
  const minDim = Math.min(img.width, img.height);
  const sx = (img.width - minDim) / 2;
  const sy = (img.height - minDim) / 2;

  // Background gradient (light studio)
  const bg = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size*0.8);
  bg.addColorStop(0, '#f5f0e8');
  bg.addColorStop(1, '#e0d8ca');
  ctx.fillStyle = bg;
  ctx.fillRect(0,0,size,size);

  updateProcBar(40);

  // Draw subject as circle
  ctx.save();
  ctx.beginPath();
  ctx.arc(size/2, size/2, size/2 - 20, 0, Math.PI*2);
  ctx.clip();

  const scale = (size - 40) / minDim;
  const dw = img.width * scale;
  const dh = img.height * scale;
  const dx = (size - dw) / 2;
  const dy = (size - dh) / 2;
  ctx.drawImage(img, 0, 0, img.width, img.height, dx, dy, dw, dh);

  ctx.restore();

  updateProcBar(70);

  // Subtle border
  ctx.beginPath();
  ctx.arc(size/2, size/2, size/2 - 22, 0, Math.PI*2);
  ctx.strokeStyle = 'rgba(255,255,255,.4)';
  ctx.lineWidth = 3;
  ctx.stroke();

  updateProcBar(100);

  return canvas.toDataURL('image/png');
}

/* ------------------------------------------------
   HELPERS
   ------------------------------------------------ */
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/* ------------------------------------------------
   PROCESSING OVERLAY
   ------------------------------------------------ */
function showProcessing(title, sub) {
  const overlay = $('#processing');
  $('#procTitle').textContent = title;
  $('#procSub').textContent = sub;
  $('#procBar').style.width = '5%';
  overlay.classList.remove('hidden');
}
function hideProcessing() {
  $('#processing').classList.add('hidden');
}
function updateProcBar(pct) {
  $('#procBar').style.width = pct + '%';
}

/* ------------------------------------------------
   ORDER & PRICING
   ------------------------------------------------ */
function updatePrintQuote() {
  const p = CONFIG.papers.find(p => p.id === state.paper);
  const f = CONFIG.finishes.find(f => f.id === state.finish);
  const type = state.photoType;
  const base = p ? p.prices[type] || 0 : 0;
  const delta = f ? f.delta : 0;
  const total = base + delta;
  $('#printPrice').textContent = CONFIG.currency + total;
  return total;
}

function getPrintPrice() {
  const p = CONFIG.papers.find(p => p.id === state.paper);
  const f = CONFIG.finishes.find(f => f.id === state.finish);
  const type = state.photoType;
  const base = p ? p.prices[type] || 0 : 0;
  return base + (f ? f.delta : 0);
}

function getAIPriceTotal() {
  let total = 0;
  state.selectedAI.forEach(id => {
    const f = CONFIG.aiFeatures.find(f => f.id === id);
    if (f) total += f.price;
  });
  return total;
}

function getTotal() {
  const printPrice = state.photo ? getPrintPrice() : 0;
  return getAIPriceTotal() + printPrice;
}

function updateOrder() {
  const lines = $('#orderLines');
  const totalEl = $('#orderTotal');
  const checkoutBtn = $('#checkoutBtn');

  let html = '';

  if (!state.photo) {
    html = '<li class="order-empty">尚未上傳照片</li>';
    checkoutBtn.disabled = true;
    totalEl.textContent = CONFIG.currency + '0';
    lines.innerHTML = html;
    return;
  }

  // Photo line
  html += `<li><span>📷 照片上傳</span><span>${CONFIG.currency}0</span></li>`;

  // AI add-ons
  state.selectedAI.forEach(id => {
    const f = getAIFeature(id);
    if (f) html += `<li><span>${f.icon} ${f.name}</span><span>+${CONFIG.currency}${f.price}</span></li>`;
  });

  // Print
  const printPrice = getPrintPrice();
  const p = CONFIG.papers.find(p => p.id === state.paper);
  const t = CONFIG.photoTypes.find(t => t.id === state.photoType);
  const fin = CONFIG.finishes.find(f => f.id === state.finish);
  html += `<li><span>🖨️ 列印 ${p?.label} ${t?.label} ${fin?.label}</span><span>${CONFIG.currency}${printPrice}</span></li>`;

  // Store
  if (state.store) {
    const s = CONFIG.stores.find(s => s.id === state.store);
    if (s) html += `<li><span>📍 ${s.name}</span><span></span></li>`;
  }

  lines.innerHTML = html;

  const total = getTotal();
  totalEl.textContent = CONFIG.currency + total;

  // Enable checkout only if photo + store selected
  checkoutBtn.disabled = !(state.photo && state.store);
}

/* ------------------------------------------------
   ORDER (Checkout)
   ------------------------------------------------ */
function wireOrder() {
  const btn = $('#checkoutBtn');
  btn.addEventListener('click', () => {
    if (!state.photo || !state.store) return;
    if (state.processing) return;

    // Generate order
    const now = new Date();
    const dateStr = now.toISOString().slice(0,10).replace(/-/g,'');
    const rand = Math.random().toString(36).slice(2,6).toUpperCase();
    const orderId = `PC-${dateStr}-${rand}`;

    const store = CONFIG.stores.find(s => s.id === state.store);
    const paper = CONFIG.papers.find(p => p.id === state.paper);
    const type = CONFIG.photoTypes.find(t => t.id === state.photoType);
    const finish = CONFIG.finishes.find(f => f.id === state.finish);
    const aiItems = [...state.selectedAI].map(id => getAIFeature(id));
    const printPrice = getPrintPrice();
    const aiTotal = getAIPriceTotal();
    const total = getTotal();

    // Pickup time (15 mins from now)
    const pickup = new Date(now.getTime() + 15*60000);
    const timeStr = pickup.toLocaleTimeString('zh-HK', { hour: '2-digit', minute: '2-digit' });

    // Fill ticket
    $('#ticketNo').textContent = orderId;
    $('#ticketStore').textContent = store ? `${store.name} (${store.addr})` : '—';
    $('#ticketTime').textContent = `約 ${timeStr} 可取`;

    // Ticket lines
    let ticketHtml = '';
    aiItems.forEach(f => {
      ticketHtml += `<li><span>${f.icon} ${f.name}</span><span>${CONFIG.currency}${f.price}</span></li>`;
    });
    ticketHtml += `<li><span>🖨️ ${paper?.label} ${type?.label} ${finish?.label}</span><span>${CONFIG.currency}${printPrice}</span></li>`;
    $('#ticketLines').innerHTML = ticketHtml;
    $('#ticketTotal').textContent = CONFIG.currency + total;

    // Generate QR code
    const qrContainer = $('#ticketQr');
    qrContainer.innerHTML = '';
    try {
      const qr = qrcode(0, 'M');
      qr.addData(orderId);
      qr.make();
      const canvas = document.createElement('canvas');
      canvas.width = qr.getModuleCount() * 5;
      canvas.height = qr.getModuleCount() * 5;
      const ctx = canvas.getContext('2d');
      const modules = qr.getModuleCount();
      const tileSize = 5;
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#0e0d0b';
      for (let row = 0; row < modules; row++) {
        for (let col = 0; col < modules; col++) {
          if (qr.isDark(row, col)) {
            ctx.fillRect(col * tileSize, row * tileSize, tileSize, tileSize);
          }
        }
      }
      qrContainer.appendChild(canvas);
    } catch (e) {
      console.warn('QR gen failed, fallback to text:', e);
      qrContainer.innerHTML = `<p style="font-size:1.2rem;font-weight:bold;color:var(--gold)">${orderId}</p>`;
    }

    // Show modal
    $('#orderModal').classList.remove('hidden');

    state.order = { id: orderId };
  });
}

/* ------------------------------------------------
   MODAL
   ------------------------------------------------ */
function wireModal() {
  const modal = $('#orderModal');
  const backdrop = $('#modalBackdrop');
  const closeBtn = $('#closeModalBtn');
  const printBtn = $('#printTicketBtn');

  backdrop.addEventListener('click', () => modal.classList.add('hidden'));
  closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
  printBtn.addEventListener('click', () => window.print());
}

/* ------------------------------------------------
   RESET
   ------------------------------------------------ */
function wireReset() {
  const btn = $('#resetBtn');
  btn.addEventListener('click', () => {
    if (!confirm('確定要重新開始？所有已選項目將被清除。')) return;
    // Reset state
    state.photo = null;
    state.selectedAI.clear();
    state.aiResults = {};
    state.photoType = 'normal';
    state.paper = '4r';
    state.finish = 'glossy';
    state.store = null;
    state.order = null;

    // Reset UI
    // Upload
    $('#uploadInner').classList.remove('hidden');
    $('#previewBox').classList.add('hidden');
    $('#fileInput').value = '';

    // AI cards
    $$('.ai-card').forEach(c => c.classList.remove('selected'));
    $('#aiResultBox').classList.add('hidden');

    // Photo type
    $('#typeGrid').querySelectorAll('.chip-type').forEach(c => c.classList.remove('selected'));
    $('#typeGrid').querySelector('[data-type="normal"]').classList.add('selected');

    // Paper
    $('#paperGrid').querySelectorAll('.chip-paper').forEach(c => c.classList.remove('selected'));
    $('#paperGrid').querySelector('[data-paper="4r"]').classList.add('selected');

    // Finish
    $('#finishGrid').querySelectorAll('.chip-finish').forEach(c => c.classList.remove('selected'));
    $('#finishGrid').querySelector('[data-finish="glossy"]').classList.add('selected');

    // Store
    $$('.store-card').forEach(c => c.classList.remove('selected'));

    // Modal
    $('#orderModal').classList.add('hidden');

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });

    updatePrintQuote();
    updateOrder();
  });
}