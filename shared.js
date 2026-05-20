/* =========================================================
   TeleChat — Shared Utilities (shared.js)  v2
   ========================================================= */

'use strict';

/* ── Avatar colour map ── */
const AVATAR_COLORS = {
  'A':'#e74c3c','B':'#e67e22','C':'#2ecc71','D':'#3498db','E':'#9b59b6',
  'F':'#1abc9c','G':'#e91e63','H':'#ff5722','I':'#00bcd4','J':'#8bc34a',
  'K':'#ff9800','L':'#607d8b','M':'#795548','N':'#cddc39','O':'#03a9f4',
  'P':'#673ab7','Q':'#4caf50','R':'#f44336','S':'#2196f3','T':'#ff4081',
  'U':'#26a69a','V':'#7c4dff','W':'#66bb6a','X':'#ab47bc','Y':'#26c6da',
  'Z':'#d4e157'
};

function getAvatarColor(name) {
  const ch = (name || '?')[0].toUpperCase();
  return AVATAR_COLORS[ch] || '#2196f3';
}

/* ── Sanitise ── */
function sanitizeHTML(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

/* ── Encode / Decode ── */
function safeDecode(b64) {
  try { return atob(b64); }
  catch(e) { alert('Invalid code.'); throw e; }
}
function safeEncode(json) { return btoa(JSON.stringify(json)); }

/* ── Time helpers ── */
function getTime() {
  const n = new Date();
  let h = n.getHours(), m = n.getMinutes();
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m < 10 ? '0'+m : m} ${ap}`;
}
function getFullDate() {
  return new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

/* ── Date stamp ── */
function addDateStamp(container) {
  const el = document.createElement('div');
  el.className = 'datestamp';
  el.innerHTML = `<span>${getFullDate()}</span>`;
  container.appendChild(el);
}

/* ── Status badge ── */
function setStatus(el, type, label) {
  const dot = type === 'connected'
    ? '<div class="online-dot"></div>'
    : type === 'disconnected'
    ? '<div class="offline-dot"></div>'
    : '<div class="waiting-dot"></div>';
  el.className = `status-badge status-${type} w-fit`;
  el.innerHTML = `${dot}<span>${label}</span>`;
}

/* ── Format seconds → m:ss ── */
function fmtTime(s) {
  if (!isFinite(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec < 10 ? '0' : ''}${sec}`;
}

/* ── Build Telegram-style audio player widget ── */
function buildAudioPlayer(src, filename) {
  const wrap = document.createElement('div');
  wrap.className = 'audio-player-card';

  const audio = new Audio(src);

  // Strip extension for display
  const displayName = filename.replace(/\.[^/.]+$/, '');

  wrap.innerHTML = `
    <button class="audio-play-btn" title="Play / Pause">
      <svg class="icon-play" width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
      <svg class="icon-pause hidden" width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
    </button>
    <div class="audio-info">
      <div class="audio-title" title="${sanitizeHTML(filename)}">${sanitizeHTML(displayName)}</div>
      <div class="audio-artist">${sanitizeHTML(filename)}</div>
      <div class="audio-progress-row">
        <input class="audio-seek" type="range" min="0" max="100" value="0" step="0.1"/>
      </div>
      <div class="audio-time-row">
        <span class="a-cur">0:00</span>
        <span class="a-dur">0:00</span>
      </div>
    </div>
  `;

  const playBtn   = wrap.querySelector('.audio-play-btn');
  const iconPlay  = wrap.querySelector('.icon-play');
  const iconPause = wrap.querySelector('.icon-pause');
  const seekEl    = wrap.querySelector('.audio-seek');
  const curEl     = wrap.querySelector('.a-cur');
  const durEl     = wrap.querySelector('.a-dur');

  audio.addEventListener('loadedmetadata', () => { durEl.textContent = fmtTime(audio.duration); });
  audio.addEventListener('timeupdate', () => {
    curEl.textContent = fmtTime(audio.currentTime);
    if (audio.duration) seekEl.value = (audio.currentTime / audio.duration) * 100;
  });
  audio.addEventListener('ended', () => {
    playBtn.classList.remove('playing');
    iconPlay.classList.remove('hidden');
    iconPause.classList.add('hidden');
    seekEl.value = 0;
    curEl.textContent = '0:00';
  });

  playBtn.addEventListener('click', () => {
    if (audio.paused) {
      // Pause all other audio players
      document.querySelectorAll('.audio-player-card').forEach(card => {
        if (card !== wrap) {
          const otherPlay = card.querySelector('.audio-play-btn');
          const otherAudio = card._audio;
          if (otherAudio && !otherAudio.paused) {
            otherAudio.pause();
            otherPlay.classList.remove('playing');
            card.querySelector('.icon-play').classList.remove('hidden');
            card.querySelector('.icon-pause').classList.add('hidden');
          }
        }
      });
      audio.play();
      playBtn.classList.add('playing');
      iconPlay.classList.add('hidden');
      iconPause.classList.remove('hidden');
    } else {
      audio.pause();
      playBtn.classList.remove('playing');
      iconPlay.classList.remove('hidden');
      iconPause.classList.add('hidden');
    }
  });

  seekEl.addEventListener('input', () => {
    if (audio.duration) audio.currentTime = (seekEl.value / 100) * audio.duration;
  });

  wrap._audio = audio;
  return wrap;
}

/* ── Build image collage node ── */
function buildImageCollage(images) {
  // images: array of { dataURL, filename }
  if (images.length === 1) {
    return buildSingleImage(images[0].dataURL, images[0].filename);
  }

  const collage = document.createElement('div');
  collage.className = 'img-collage';
  collage.dataset.count = images.length;

  const visibleCount = Math.min(images.length, 4);
  const hasMore = images.length > 4;

  images.slice(0, visibleCount).forEach((img, idx) => {
    const cell = document.createElement('div');
    cell.className = 'collage-cell';

    const imgEl = document.createElement('img');
    imgEl.src = img.dataURL;
    imgEl.alt = img.filename;
    imgEl.className = 'collage-img';

    // Last visible cell: show "+N more" overlay if needed
    if (hasMore && idx === visibleCount - 1) {
      const overlay = document.createElement('div');
      overlay.className = 'collage-more-overlay';
      overlay.textContent = `+${images.length - visibleCount + 1}`;
      cell.appendChild(imgEl);
      cell.appendChild(overlay);
    } else {
      cell.appendChild(imgEl);
    }

    cell.addEventListener('click', () => openLightboxGallery(images, idx));
    collage.appendChild(cell);
  });

  return collage;
}

function buildSingleImage(dataURL, filename) {
  const wrap = document.createElement('div');
  wrap.className = 'single-img-wrap';
  const img = document.createElement('img');
  img.src = dataURL;
  img.alt = filename;
  img.className = 'chat-img';
  img.addEventListener('click', () => openLightboxGallery([{dataURL, filename}], 0));
  wrap.appendChild(img);
  return wrap;
}

/* ── Lightbox gallery ── */
function openLightboxGallery(images, startIdx) {
  let current = startIdx;

  let lb = document.getElementById('lightbox');
  if (lb) lb.remove();

  lb = document.createElement('div');
  lb.id = 'lightbox';

  lb.innerHTML = `
    <div class="lb-backdrop"></div>
    <div class="lb-content">
      <img class="lb-img" src="${images[current].dataURL}" alt=""/>
      <div class="lb-counter">${current + 1} / ${images.length}</div>
      ${images.length > 1 ? `
        <button class="lb-nav lb-prev">‹</button>
        <button class="lb-nav lb-next">›</button>
      ` : ''}
      <button class="lb-close">✕</button>
    </div>
  `;

  function update() {
    lb.querySelector('.lb-img').src = images[current].dataURL;
    lb.querySelector('.lb-counter').textContent = `${current + 1} / ${images.length}`;
  }

  lb.querySelector('.lb-backdrop').addEventListener('click', () => lb.remove());
  lb.querySelector('.lb-close').addEventListener('click', () => lb.remove());

  if (images.length > 1) {
    lb.querySelector('.lb-prev').addEventListener('click', (e) => {
      e.stopPropagation();
      current = (current - 1 + images.length) % images.length;
      update();
    });
    lb.querySelector('.lb-next').addEventListener('click', (e) => {
      e.stopPropagation();
      current = (current + 1) % images.length;
      update();
    });
  }

  // Swipe support
  let startX = 0;
  lb.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; });
  lb.addEventListener('touchend', (e) => {
    const diff = startX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) current = (current + 1) % images.length;
      else current = (current - 1 + images.length) % images.length;
      update();
    }
  });

  document.body.appendChild(lb);
}

/* ── Grow textarea with content ── */
function autoGrow(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, window.innerHeight * 0.35) + 'px';
}

/* ── Encode a File to base64 data-URL ── */
function fileToDataURL(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload  = () => res(r.result);
    r.onerror = () => rej(new Error('Read failed'));
    r.readAsDataURL(file);
  });
}

/* ═══════════════════════════════════════════════════════
   CHUNKED TRANSFER — fixes disconnect on large audio files
   ═══════════════════════════════════════════════════════ */
const CHUNK_SIZE = 16 * 1024; // 16 KB per chunk
const _incomingChunks = {};   // keyed by transfer id

function sendInChunks(channel, type, name, dataURL) {
  const id = Math.random().toString(36).slice(2);
  const totalChunks = Math.ceil(dataURL.length / CHUNK_SIZE);

  // Send header
  channel.send(JSON.stringify({ __tc_chunk_start: true, id, type, name, totalChunks }));

  let i = 0;
  function sendNext() {
    if (i >= totalChunks) {
      channel.send(JSON.stringify({ __tc_chunk_end: true, id }));
      return;
    }
    const slice = dataURL.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
    channel.send(JSON.stringify({ __tc_chunk: true, id, index: i, data: slice }));
    i++;
    // Small delay to avoid overwhelming the channel buffer
    setTimeout(sendNext, 10);
  }
  sendNext();
}

/* ── Prepare + send a media file ── */
async function prepareMediaPayload(file) {
  const dataURL = await fileToDataURL(file);
  const type = file.type;
  const wire = JSON.stringify({ __tc_media: true, type, name: file.name, data: dataURL });
  return { wire, type, name: file.name, dataURL };
}

/* ── Build a display node from type + dataURL ── */
function buildMediaNode(type, dataURL, filename) {
  if (type.startsWith('image/')) {
    return buildSingleImage(dataURL, filename);
  }
  if (type.startsWith('audio/')) {
    return buildAudioPlayer(dataURL, filename);
  }
  const a = document.createElement('a');
  a.href = dataURL; a.download = filename;
  a.textContent = `📎 ${filename}`;
  a.style.color = '#64b5f6';
  return a;
}

/* ── Parse incoming wire message ── */
// Returns { isMedia, node, isChunk, chunkDone, id, chunkData }
function parseIncoming(raw) {
  try {
    const obj = JSON.parse(raw);

    // Chunk start
    if (obj && obj.__tc_chunk_start) {
      _incomingChunks[obj.id] = { type: obj.type, name: obj.name, totalChunks: obj.totalChunks, chunks: [] };
      return { isChunk: true };
    }

    // Chunk piece
    if (obj && obj.__tc_chunk) {
      const rec = _incomingChunks[obj.id];
      if (rec) rec.chunks[obj.index] = obj.data;
      return { isChunk: true };
    }

    // Chunk end → reassemble
    if (obj && obj.__tc_chunk_end) {
      const rec = _incomingChunks[obj.id];
      delete _incomingChunks[obj.id];
      if (rec) {
        const dataURL = rec.chunks.join('');
        const node = buildMediaNode(rec.type, dataURL, rec.name);
        return { isMedia: true, node };
      }
      return { isChunk: true };
    }

    // Legacy single-shot media
    if (obj && obj.__tc_media) {
      const node = buildMediaNode(obj.type, obj.data, obj.name);
      return { isMedia: true, node };
    }
  } catch(_) {}
  return { isMedia: false };
}

/* ── Build a message row ── */
function buildMessageRow(content, side, senderName, isHTML = false) {
  const ch    = (senderName || '?')[0].toUpperCase();
  const color = getAvatarColor(senderName);
  const row   = document.createElement('div');
  row.className = `msg-row ${side === 'sent' ? 'sent' : ''} msg-appear`;

  const bubble = document.createElement('div');
  bubble.className = `bubble ${side}`;

  if (content instanceof Node) {
    bubble.appendChild(content);
  } else {
    if (isHTML) {
      bubble.innerHTML = content;
    } else {
      const span = document.createElement('span');
      span.textContent = content;
      bubble.appendChild(span);
    }
  }

  // Timestamp
  const timeEl = document.createElement('div');
  timeEl.className = 'bubble-time';
  timeEl.innerHTML = getTime() + (side === 'sent'
    ? ` <svg style="display:inline;vertical-align:-1px" width="12" height="12" viewBox="0 0 24 24" fill="rgba(255,255,255,0.6)"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>`
    : '');
  bubble.appendChild(timeEl);

  if (side === 'received') {
    const nameEl = document.createElement('div');
    nameEl.className = 'bubble-name';
    nameEl.style.color = color;
    nameEl.textContent = senderName;

    const avatarEl = document.createElement('div');
    avatarEl.className = 'avatar';
    avatarEl.style.background = color;
    avatarEl.textContent = ch;

    const col = document.createElement('div');
    col.appendChild(nameEl);
    col.appendChild(bubble);

    row.appendChild(avatarEl);
    row.appendChild(col);
  } else {
    const col = document.createElement('div');
    col.appendChild(bubble);
    row.appendChild(col);
  }

  return row;
}
