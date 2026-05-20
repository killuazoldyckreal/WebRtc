/* =========================================================
   TeleChat — Shared Utilities (shared.js)
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
function formatDuration(secs) {
  if (!isFinite(secs) || secs < 0) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s < 10 ? '0' + s : s}`;
}

/* ── Build audio message node ── */
function buildAudioNode(dataURL, filename, side) {
  const wrapper = document.createElement('div');
  wrapper.className = 'audio-msg';

  const audio = document.createElement('audio');
  audio.src = dataURL;
  audio.preload = 'metadata';

  // Play/pause button
  const playBtn = document.createElement('button');
  playBtn.className = 'audio-play-btn';
  playBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path d="M8 5v14l11-7z"/></svg>`;

  // Waveform / seek track
  const trackWrap = document.createElement('div');
  trackWrap.className = 'audio-track-wrap';

  const track = document.createElement('div');
  track.className = 'audio-track';

  const progress = document.createElement('div');
  progress.className = 'audio-progress';

  const thumb = document.createElement('div');
  thumb.className = 'audio-thumb';

  track.appendChild(progress);
  track.appendChild(thumb);
  trackWrap.appendChild(track);

  // Time display
  const timeEl = document.createElement('span');
  timeEl.className = 'audio-time';
  timeEl.textContent = '0:00';

  // Duration display (shown after metadata loads)
  const durEl = document.createElement('span');
  durEl.className = 'audio-dur';
  durEl.textContent = '';

  audio.addEventListener('loadedmetadata', () => {
    durEl.textContent = formatDuration(audio.duration);
    timeEl.textContent = '0:00';
  });

  // Play/pause toggle
  let playing = false;
  playBtn.addEventListener('click', () => {
    if (playing) {
      audio.pause();
    } else {
      // pause all other audios on page
      document.querySelectorAll('.audio-msg audio').forEach(a => {
        if (a !== audio) { a.pause(); a.dispatchEvent(new Event('_tc_pause')); }
      });
      audio.play();
    }
  });

  audio.addEventListener('play', () => {
    playing = true;
    playBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`;
  });
  audio.addEventListener('pause', () => {
    playing = false;
    playBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path d="M8 5v14l11-7z"/></svg>`;
  });
  audio.addEventListener('ended', () => {
    playing = false;
    playBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path d="M8 5v14l11-7z"/></svg>`;
    progress.style.width = '0%';
    thumb.style.left = '0%';
    timeEl.textContent = '0:00';
  });
  audio.addEventListener('_tc_pause', () => {
    playing = false;
    playBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path d="M8 5v14l11-7z"/></svg>`;
  });

  // Progress update
  audio.addEventListener('timeupdate', () => {
    const pct = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
    progress.style.width = pct + '%';
    thumb.style.left = pct + '%';
    timeEl.textContent = formatDuration(audio.currentTime);
  });

  // Seek on click
  track.addEventListener('click', (e) => {
    const rect = track.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, x / rect.width));
    if (audio.duration) audio.currentTime = pct * audio.duration;
  });

  // Drag seek
  let dragging = false;
  thumb.addEventListener('mousedown', (e) => { dragging = true; e.preventDefault(); });
  thumb.addEventListener('touchstart', (e) => { dragging = true; }, { passive: true });
  document.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    const rect = track.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, x / rect.width));
    if (audio.duration) audio.currentTime = pct * audio.duration;
  });
  document.addEventListener('touchmove', (e) => {
    if (!dragging) return;
    const rect = track.getBoundingClientRect();
    const x = e.touches[0].clientX - rect.left;
    const pct = Math.max(0, Math.min(1, x / rect.width));
    if (audio.duration) audio.currentTime = pct * audio.duration;
  }, { passive: true });
  document.addEventListener('mouseup', () => { dragging = false; });
  document.addEventListener('touchend', () => { dragging = false; });

  const infoRow = document.createElement('div');
  infoRow.className = 'audio-info-row';
  infoRow.appendChild(timeEl);
  infoRow.appendChild(durEl);

  const bodyCol = document.createElement('div');
  bodyCol.className = 'audio-body-col';
  bodyCol.appendChild(trackWrap);
  bodyCol.appendChild(infoRow);

  wrapper.appendChild(audio);
  wrapper.appendChild(playBtn);
  wrapper.appendChild(bodyCol);

  return wrapper;
}

/* ── Build a message row ── */
function buildMessageRow(content, side, senderName, isHTML = false) {
  const ch    = (senderName || '?')[0].toUpperCase();
  const color = getAvatarColor(senderName);
  const row   = document.createElement('div');
  row.className = `msg-row ${side === 'sent' ? 'sent' : ''} msg-appear`;

  const isMedia = content instanceof Node;

  const bubble = document.createElement('div');
  bubble.className = `bubble ${side}${isMedia ? ' media-bubble' : ''}`;

  if (isMedia) {
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

  if (!isMedia) {
    const timeEl = document.createElement('div');
    timeEl.className = 'bubble-time';
    timeEl.innerHTML = getTime() + (side === 'sent'
      ? ` <svg style="display:inline;vertical-align:-1px" width="12" height="12" viewBox="0 0 24 24" fill="rgba(255,255,255,0.6)"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>`
      : '');
    bubble.appendChild(timeEl);
  } else {
    const timeEl = document.createElement('div');
    timeEl.style.cssText = 'font-size:10px;color:rgba(170,197,217,0.6);margin-top:2px;' +
      (side === 'sent' ? 'text-align:right;padding-right:4px;' : 'padding-left:4px;');
    timeEl.innerHTML = getTime() + (side === 'sent'
      ? ` <svg style="display:inline;vertical-align:-1px" width="12" height="12" viewBox="0 0 24 24" fill="rgba(255,255,255,0.5)"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>`
      : '');
    bubble._timeEl = timeEl;
  }

  const col = document.createElement('div');

  if (side === 'received') {
    const nameEl = document.createElement('div');
    nameEl.className = 'bubble-name';
    nameEl.style.color = color;
    nameEl.textContent = senderName;

    const avatarEl = document.createElement('div');
    avatarEl.className = 'avatar';
    avatarEl.style.background = color;
    avatarEl.textContent = ch;

    col.appendChild(nameEl);
    col.appendChild(bubble);
    if (bubble._timeEl) col.appendChild(bubble._timeEl);

    row.appendChild(avatarEl);
    row.appendChild(col);
  } else {
    col.appendChild(bubble);
    if (bubble._timeEl) col.appendChild(bubble._timeEl);
    row.appendChild(col);
  }

  return row;
}

/* ── Lightbox for images ── */
function openLightbox(src) {
  let lb = document.getElementById('lightbox');
  if (!lb) {
    lb = document.createElement('div');
    lb.id = 'lightbox';
    lb.innerHTML = `<img src=""/>`;
    lb.addEventListener('click', () => lb.remove());
    document.body.appendChild(lb);
  }
  lb.querySelector('img').src = src;
  lb.style.display = 'flex';
}

/* ── Grow textarea with content ── */
function autoGrow(el) {
  el.style.height = 'auto';
  el.style.height = el.scrollHeight + 'px';
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

/* ════════════════════════════════════
   CHUNKED TRANSFER over RTCDataChannel
   ════════════════════════════════════ */
const CHUNK_SIZE = 16 * 1024; // 16 KB

/**
 * Send a file over an RTCDataChannel using 16 KB chunks.
 * Wire format:
 *   - header frame: JSON  { __tc_chunk_start: true, id, type, name, totalChunks }
 *   - data frames:  JSON  { __tc_chunk: true, id, index, data: <base64 string> }
 *   - end frame:    JSON  { __tc_chunk_end: true, id }
 */
async function sendFileChunked(channel, file) {
  const id = Date.now() + '_' + Math.random().toString(36).slice(2);
  const dataURL = await fileToDataURL(file);
  // Strip data URL prefix to get raw base64
  const b64 = dataURL.split(',')[1];
  const mimeType = dataURL.split(';')[0].split(':')[1];

  // Split into chunks
  const chunks = [];
  for (let i = 0; i < b64.length; i += CHUNK_SIZE) {
    chunks.push(b64.slice(i, i + CHUNK_SIZE));
  }

  // Header
  channel.send(JSON.stringify({
    __tc_chunk_start: true,
    id, type: mimeType, name: file.name, totalChunks: chunks.length
  }));

  // Data chunks — throttled to avoid overflowing the buffer
  for (let i = 0; i < chunks.length; i++) {
    // Wait if buffer is getting full
    while (channel.bufferedAmount > 1024 * 1024) {
      await new Promise(r => setTimeout(r, 20));
    }
    channel.send(JSON.stringify({ __tc_chunk: true, id, index: i, data: chunks[i] }));
  }

  // End
  channel.send(JSON.stringify({ __tc_chunk_end: true, id }));

  return { id, type: mimeType, name: file.name, dataURL };
}

/**
 * ChunkedReceiver — handles incoming frames and reassembles files.
 * Usage:
 *   const recv = new ChunkedReceiver(onComplete);
 *   recv.feed(rawString);   // call from channel.onmessage
 *   onComplete({ id, type, name, dataURL }) fires when a file is ready.
 */
class ChunkedReceiver {
  constructor(onComplete) {
    this._onComplete = onComplete;
    this._pending = {}; // id → { type, name, totalChunks, chunks[] }
  }

  feed(raw) {
    let obj;
    try { obj = JSON.parse(raw); } catch(_) { return false; }

    if (obj.__tc_chunk_start) {
      this._pending[obj.id] = {
        type: obj.type, name: obj.name,
        totalChunks: obj.totalChunks, chunks: new Array(obj.totalChunks)
      };
      return true;
    }

    if (obj.__tc_chunk) {
      const p = this._pending[obj.id];
      if (p) p.chunks[obj.index] = obj.data;
      return true;
    }

    if (obj.__tc_chunk_end) {
      const p = this._pending[obj.id];
      if (!p) return true;
      const b64 = p.chunks.join('');
      const dataURL = `data:${p.type};base64,${b64}`;
      delete this._pending[obj.id];
      this._onComplete({ id: obj.id, type: p.type, name: p.name, dataURL });
      return true;
    }

    return false; // not a chunk frame
  }
}

/* ── Media message builder (images / audio) ── */
async function prepareMediaPayload(file) {
  const dataURL = await fileToDataURL(file);
  const type = file.type;
  return { type, name: file.name, dataURL };
}

function buildMediaNode(type, dataURL, filename, side) {
  if (type.startsWith('audio/')) {
    return buildAudioNode(dataURL, filename, side);
  }
  if (type.startsWith('image/')) {
    const img = document.createElement('img');
    img.src = dataURL;
    img.className = type === 'image/gif' ? 'chat-gif' : 'chat-img';
    img.alt = filename;
    img.addEventListener('click', () => openLightbox(dataURL));
    return img;
  }
  // fallback: file download link
  const a = document.createElement('a');
  a.href = dataURL; a.download = filename;
  a.textContent = `📎 ${filename}`;
  a.style.color = '#64b5f6';
  return a;
}

/* ── Parse incoming wire message (legacy small messages) ── */
function parseIncoming(raw) {
  try {
    const obj = JSON.parse(raw);
    if (obj && obj.__tc_media) {
      const node = buildMediaNode(obj.type, obj.data, obj.name);
      return { isMedia: true, node };
    }
  } catch(_) {}
  return { isMedia: false };
}
