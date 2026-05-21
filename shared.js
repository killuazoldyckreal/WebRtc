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

/* ── Music note SVG (default thumbnail) ── */
const MUSIC_ICON_SVG = `<svg viewBox="0 0 24 24" fill="rgba(255,255,255,0.7)" width="22" height="22"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>`;

/* ── Extract album art from audio file using jsmediatags ── */
function extractAlbumArt(file) {
  return new Promise(resolve => {
    // Try to load jsmediatags if not already loaded
    function tryExtract() {
      if (typeof window.jsmediatags === 'undefined') {
        resolve(null);
        return;
      }
      window.jsmediatags.read(file, {
        onSuccess: tag => {
          try {
            const pic = tag.tags.picture;
            if (pic) {
              let base64 = '';
              const data = pic.data;
              for (let i = 0; i < data.length; i++) {
                base64 += String.fromCharCode(data[i]);
              }
              resolve(`data:${pic.format};base64,${btoa(base64)}`);
            } else {
              resolve(null);
            }
          } catch(_) { resolve(null); }
        },
        onError: () => resolve(null)
      });
    }

    if (typeof window.jsmediatags === 'undefined') {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jsmediatags/3.9.7/jsmediatags.min.js';
      s.onload = tryExtract;
      s.onerror = () => resolve(null);
      document.head.appendChild(s);
    } else {
      tryExtract();
    }
  });
}

/* ═══════════════════════════════════════════════
   buildAudioBubble — returns a full .bubble div
   side: 'sent' | 'received'
   ═══════════════════════════════════════════════ */
function buildAudioBubble(dataURL, filename, side, albumArtURL) {
  const isSent = side === 'sent';

  /* ── outer bubble ── */
  const bubble = document.createElement('div');
  bubble.className = `bubble ${side} audio-bubble`;

  /* ── hidden <audio> ── */
  const audio = new Audio();
  audio.src = dataURL;
  audio.preload = 'metadata';
  audio.controls = false;
  audio.style.display = 'none';
  audio.setAttribute('playsinline', '');
  bubble.appendChild(audio);

  /* ── layout row ── */
  const row = document.createElement('div');
  row.className = 'ab-row';

  /* ── thumbnail circle ── */
  const thumb = document.createElement('div');
  thumb.className = 'ab-thumb';
  if (albumArtURL) {
    const img = document.createElement('img');
    img.src = albumArtURL;
    img.alt = '';
    thumb.appendChild(img);
  } else {
    thumb.innerHTML = MUSIC_ICON_SVG;
  }

  /* ── play/pause button (sits on top of thumb) ── */
  const playBtn = document.createElement('button');
  playBtn.className = 'ab-play';
  playBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M8 5v14l11-7z"/></svg>`;

  const thumbWrap = document.createElement('div');
  thumbWrap.className = 'ab-thumb-wrap';
  thumbWrap.appendChild(thumb);
  thumbWrap.appendChild(playBtn);

  /* ── right column: title + seek + times ── */
  const col = document.createElement('div');
  col.className = 'ab-col';

  /* title */
  const title = document.createElement('div');
  title.className = 'ab-title';
  title.textContent = filename.replace(/\.[^.]+$/, '') || 'Audio';
  title.title = filename;

  /* seek track */
  const trackWrap = document.createElement('div');
  trackWrap.className = 'ab-track-wrap';

  const track = document.createElement('div');
  track.className = 'ab-track';

  const prog = document.createElement('div');
  prog.className = 'ab-progress';
  prog.style.width = '0%';

  const dot = document.createElement('div');
  dot.className = 'ab-dot';
  dot.style.left = '0%';

  track.appendChild(prog);
  track.appendChild(dot);
  trackWrap.appendChild(track);

  /* times row */
  const timesRow = document.createElement('div');
  timesRow.className = 'ab-times';

  const elapsed = document.createElement('span');
  elapsed.textContent = '0:00';

  const duration = document.createElement('span');
  duration.textContent = '0:00';

  timesRow.appendChild(elapsed);
  timesRow.appendChild(duration);

  col.appendChild(title);
  col.appendChild(trackWrap);
  col.appendChild(timesRow);

  row.appendChild(thumbWrap);
  row.appendChild(col);
  bubble.appendChild(row);

  /* ── timestamp row ── */
  const timeEl = document.createElement('div');
  timeEl.className = 'bubble-time';
  const checkSVG = `<svg style="display:inline;vertical-align:-1px" width="12" height="12" viewBox="0 0 24 24" fill="rgba(255,255,255,0.6)"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>`;
  timeEl.innerHTML = getTime() + (isSent ? ' ' + checkSVG : '');
  bubble.appendChild(timeEl);

  /* ── audio events ── */
  audio.addEventListener('loadedmetadata', () => {
  if (isFinite(audio.duration)) {
    duration.textContent = formatDuration(audio.duration);
  }
});

audio.addEventListener('canplaythrough', () => {
  if (isFinite(audio.duration)) {
    duration.textContent = formatDuration(audio.duration);
  }
});

  let playing = false;

  function setPlaying(val) {
    playing = val;
    playBtn.innerHTML = val
      ? `<svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`
      : `<svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M8 5v14l11-7z"/></svg>`;
  }

  playBtn.addEventListener('click', () => {
    if (playing) {
      audio.pause();
    } else {
      document.querySelectorAll('audio[data-tc]').forEach(a => { if (a !== audio) a.pause(); });
      audio.play().catch(() => {});
    }
  });

  audio.dataset.tc = '1';
  audio.addEventListener('play',  () => setPlaying(true));
  audio.addEventListener('pause', () => setPlaying(false));
  audio.addEventListener('ended', () => {
    setPlaying(false);
    prog.style.width = '0%';
    dot.style.left = '0%';
    elapsed.textContent = '0:00';
  });

  audio.addEventListener('timeupdate', () => {
    const pct = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
    prog.style.width = pct + '%';
    dot.style.left = pct + '%';
    elapsed.textContent = formatDuration(audio.currentTime);
  });

  /* seek click */
  track.addEventListener('click', e => {
    const rect = track.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    if (audio.duration) audio.currentTime = pct * audio.duration;
  });

  /* seek drag */
  let dragging = false;
  dot.addEventListener('mousedown',  e => { dragging = true; e.preventDefault(); });
  dot.addEventListener('touchstart', () => { dragging = true; }, { passive: true });
  const onMove = (clientX) => {
    if (!dragging) return;
    const rect = track.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    if (audio.duration) audio.currentTime = pct * audio.duration;
  };
  document.addEventListener('mousemove',  e => onMove(e.clientX));
  document.addEventListener('touchmove',  e => onMove(e.touches[0].clientX), { passive: true });
  document.addEventListener('mouseup',    () => { dragging = false; });
  document.addEventListener('touchend',   () => { dragging = false; });

  return bubble;
}

/* ════════════════════════════════════
   appendAudioMessage — builds the full
   msg-row and appends to container
   ════════════════════════════════════ */
function appendAudioMessage(dataURL, filename, side, senderName, container, albumArtURL) {
  const bubble = buildAudioBubble(dataURL, filename, side, albumArtURL);

  const msgRow = document.createElement('div');
  msgRow.className = `msg-row ${side === 'sent' ? 'sent' : ''} msg-appear`;

  const col = document.createElement('div');

  if (side === 'received') {
    const color = getAvatarColor(senderName);
    const ch = (senderName || '?')[0].toUpperCase();

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
    msgRow.appendChild(avatarEl);
    msgRow.appendChild(col);
  } else {
    col.style.alignItems = 'flex-end';
    col.appendChild(bubble);
    msgRow.appendChild(col);
  }

  container.appendChild(msgRow);
  container.scrollTop = container.scrollHeight;
}

/* ── Build a message row (text / image) ── */
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

async function sendFileChunked(channel, file) {
  const id = Date.now() + '_' + Math.random().toString(36).slice(2);
  const dataURL = await fileToDataURL(file);
  const b64 = dataURL.split(',')[1];
  const mimeType = dataURL.split(';')[0].split(':')[1];

  const chunks = [];
  for (let i = 0; i < b64.length; i += CHUNK_SIZE) {
    chunks.push(b64.slice(i, i + CHUNK_SIZE));
  }

  channel.send(JSON.stringify({
    __tc_chunk_start: true,
    id, type: mimeType, name: file.name, totalChunks: chunks.length
  }));

  for (let i = 0; i < chunks.length; i++) {
    while (channel.bufferedAmount > 1024 * 1024) {
      await new Promise(r => setTimeout(r, 20));
    }
    channel.send(JSON.stringify({ __tc_chunk: true, id, index: i, data: chunks[i] }));
  }

  channel.send(JSON.stringify({ __tc_chunk_end: true, id }));
  return { id, type: mimeType, name: file.name, dataURL };
}

class ChunkedReceiver {
  constructor(onComplete) {
    this._onComplete = onComplete;
    this._pending = {};
  }
  feed(raw) {
    let obj;
    try { obj = JSON.parse(raw); } catch(_) { return false; }
    if (obj.__tc_chunk_start) {
      this._pending[obj.id] = { type: obj.type, name: obj.name, totalChunks: obj.totalChunks, chunks: new Array(obj.totalChunks) };
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
    return false;
  }
}

/* ── Detect if MIME type is audio ── */
function isAudioType(type, filename) {
  if (type && type.startsWith('audio/')) return true;
  // Fallback: check file extension for when browser returns empty type
  const ext = (filename || '').split('.').pop().toLowerCase();
  return ['mp3','wav','ogg','flac','aac','m4a','opus','weba','wma','aiff'].includes(ext);
}

/* ── Detect if MIME type is image ── */
function isImageType(type, filename) {
  if (type && type.startsWith('image/')) return true;
  const ext = (filename || '').split('.').pop().toLowerCase();
  return ['jpg','jpeg','png','gif','webp','bmp','svg','ico','avif'].includes(ext);
}

/* ── Media message builder (images) ── */
async function prepareMediaPayload(file) {
  const dataURL = await fileToDataURL(file);
  // Use dataURL mime if file.type is empty
  const type = file.type || dataURL.split(';')[0].split(':')[1] || '';
  return { type, name: file.name, dataURL };
}

function buildMediaNode(type, dataURL, filename) {
  if (isImageType(type, filename)) {
    const img = document.createElement('img');
    img.src = dataURL;
    img.className = (type === 'image/gif' || filename.toLowerCase().endsWith('.gif')) ? 'chat-gif' : 'chat-img';
    img.alt = filename;
    img.addEventListener('click', () => openLightbox(dataURL));
    return img;
  }
  const a = document.createElement('a');
  a.href = dataURL; a.download = filename;
  a.textContent = `📎 ${filename}`;
  a.style.color = '#64b5f6';
  return a;
}

/* ── Parse incoming wire message (legacy) ── */
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
