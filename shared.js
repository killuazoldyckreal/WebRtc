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
  return h + ':' + (m < 10 ? '0' + m : m) + ' ' + ap;
}
function getFullDate() {
  return new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

/* ── Date stamp ── */
function addDateStamp(container) {
  const el = document.createElement('div');
  el.className = 'datestamp';
  el.innerHTML = '<span>' + getFullDate() + '</span>';
  container.appendChild(el);
}

/* ── Status badge ── */
function setStatus(el, type, label) {
  const dot = type === 'connected'
    ? '<div class="online-dot"></div>'
    : type === 'disconnected'
    ? '<div class="offline-dot"></div>'
    : '<div class="waiting-dot"></div>';
  el.className = 'status-badge status-' + type + ' w-fit';
  el.innerHTML = dot + '<span>' + label + '</span>';
}

/* ═══════════════════════════════════════════════════════════
   MIME MAP — extension → MIME type
   Used ONLY at SEND time to resolve a file's MIME before
   transmitting it. Never used on the receiver side.
   ═══════════════════════════════════════════════════════════ */
var MIME_MAP = {
  /* audio */
  mp3:'audio/mpeg', wav:'audio/wav', ogg:'audio/ogg', flac:'audio/flac',
  aac:'audio/aac', m4a:'audio/mp4', opus:'audio/opus', weba:'audio/webm',
  wma:'audio/x-ms-wma', aiff:'audio/aiff', aif:'audio/aiff',
  /* image */
  jpg:'image/jpeg', jpeg:'image/jpeg', png:'image/png', gif:'image/gif',
  webp:'image/webp', bmp:'image/bmp', svg:'image/svg+xml',
  ico:'image/x-icon', avif:'image/avif'
};

/**
 * Resolve the best MIME for a File object at send time.
 * Falls back to extension map, then 'application/octet-stream'.
 * This is the ONLY place MIME guessing is allowed.
 */
function resolveMime(file) {
  var type = (file && file.type) ? file.type : '';
  if (type && type !== 'application/octet-stream') return type;
  var ext = (file && file.name ? file.name : '').split('.').pop().toLowerCase();
  return MIME_MAP[ext] || type || 'application/octet-stream';
}

/**
 * Classify a file into an explicit media kind at SEND time only.
 * Returns: 'audio' | 'image' | 'file'
 * The returned kind is embedded in the chunk-start header so the
 * receiver never needs to re-detect it.
 */
function classifyKind(mimeType) {
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.startsWith('image/')) return 'image';
  return 'file';
}

/* ── Grow textarea with content ── */
function autoGrow(el) {
  el.style.height = 'auto';
  el.style.height = el.scrollHeight + 'px';
}

/* ── Encode a File to base64 data-URL ── */
function fileToDataURL(file) {
  return new Promise(function (res, rej) {
    var r = new FileReader();
    r.onload  = function () { res(r.result); };
    r.onerror = function () { rej(new Error('Read failed')); };
    r.readAsDataURL(file);
  });
}

/* ── Lightbox for images ── */
function openLightbox(src) {
  var lb = document.getElementById('lightbox');
  if (!lb) {
    lb = document.createElement('div');
    lb.id = 'lightbox';
    lb.innerHTML = '<img src=""/>';
    lb.addEventListener('click', function () { lb.remove(); });
    document.body.appendChild(lb);
  }
  lb.querySelector('img').src = src;
  lb.style.display = 'flex';
}

/* ── Format seconds → m:ss ── */
function formatDuration(secs) {
  if (!isFinite(secs) || secs < 0) return '0:00';
  const s = Math.floor(secs || 0);
  const m = Math.floor(s / 60);
  return m + ':' + String(s % 60).padStart(2, '0');
}

/* ── Extract album art from audio file using jsmediatags (if available) ── */
function extractAlbumArt(file) {
  return new Promise(function(resolve) {
    if (typeof jsmediatags === 'undefined') { resolve(null); return; }
    jsmediatags.read(file, {
      onSuccess: function(tag) {
        try {
          var pic = tag.tags.picture;
          if (!pic) { resolve(null); return; }
          var bytes = new Uint8Array(pic.data);
          var blob = new Blob([bytes], { type: pic.format });
          resolve(URL.createObjectURL(blob));
        } catch(e) { resolve(null); }
      },
      onError: function() { resolve(null); }
    });
  });
}

/* ════════════════════════════════════════════════════════════
   appendAudioMessage
   Renders a Telegram-style audio player bubble.

   Parameters
   ----------
   blob       : Blob  — raw audio data
   name       : string — filename / display title
   side       : 'sent' | 'received'
   senderName : string
   container  : HTMLElement — #messages
   albumArt   : string | null — object URL for thumbnail
   ════════════════════════════════════════════════════════════ */
function appendAudioMessage(blob, name, side, senderName, container, albumArt) {
  var url = URL.createObjectURL(blob);

  // Build audio engine (hidden)
  var audio = document.createElement('audio');
  audio.className = 'tc-audio-engine';
  audio.preload = 'metadata';
  audio.src = url;

  var isSent = side === 'sent';

  // Build bubble
  var bubble = document.createElement('div');
  bubble.className = 'bubble audio-bubble ' + (isSent ? 'sent' : 'received');

  var thumbInner = albumArt
    ? '<img src="' + albumArt + '" alt="art">'
    : '<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="21" cy="16" r="3"/></svg>';

  bubble.innerHTML =
    '<div class="ab-row">' +
      '<div class="ab-thumb-wrap">' +
        '<div class="ab-thumb">' + thumbInner + '</div>' +
        '<button class="ab-play" aria-label="Play/Pause">' +
          '<svg class="ab-play-icon" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M11.596 8.697l-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.697l6.363 3.692a.802.802 0 0 1 0 1.394z"/></svg>' +
          '<svg class="ab-pause-icon" style="display:none" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M5.5 3.5A1.5 1.5 0 0 1 7 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5zm5 0A1.5 1.5 0 0 1 12 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5z"/></svg>' +
        '</button>' +
      '</div>' +
      '<div class="ab-col">' +
        '<div class="ab-title">' + sanitizeHTML(name || 'Audio') + '</div>' +
        '<div class="ab-track-wrap">' +
          '<div class="ab-track">' +
            '<div class="ab-progress"></div>' +
            '<div class="ab-dot"></div>' +
          '</div>' +
        '</div>' +
        '<div class="ab-times"><span class="ab-cur">0:00</span><span class="ab-dur">-:--</span></div>' +
      '</div>' +
    '</div>';

  bubble.appendChild(audio);

  // Wire controls
  var playBtn   = bubble.querySelector('.ab-play');
  var playIcon  = bubble.querySelector('.ab-play-icon');
  var pauseIcon = bubble.querySelector('.ab-pause-icon');
  var track     = bubble.querySelector('.ab-track');
  var progress  = bubble.querySelector('.ab-progress');
  var dot       = bubble.querySelector('.ab-dot');
  var curEl     = bubble.querySelector('.ab-cur');
  var durEl     = bubble.querySelector('.ab-dur');

  audio.addEventListener('loadedmetadata', function() {
    durEl.textContent = formatDuration(audio.duration);
  });
  audio.addEventListener('timeupdate', function() {
    if (!audio.duration) return;
    var pct = (audio.currentTime / audio.duration) * 100;
    progress.style.width = pct + '%';
    dot.style.left = pct + '%';
    curEl.textContent = formatDuration(audio.currentTime);
  });
  audio.addEventListener('play', function() {
    playIcon.style.display = 'none';
    pauseIcon.style.display = '';
  });
  audio.addEventListener('pause', function() {
    playIcon.style.display = '';
    pauseIcon.style.display = 'none';
  });
  audio.addEventListener('ended', function() {
    audio.currentTime = 0;
    progress.style.width = '0%';
    dot.style.left = '0%';
    curEl.textContent = '0:00';
    playIcon.style.display = '';
    pauseIcon.style.display = 'none';
  });

  playBtn.addEventListener('click', function() {
    document.querySelectorAll('audio.tc-audio-engine').forEach(function(a) {
      if (a !== audio && !a.paused) a.pause();
    });
    if (audio.paused) audio.play().catch(function(){});
    else audio.pause();
  });

  track.addEventListener('click', function(e) {
    if (!audio.duration) return;
    var rect = track.getBoundingClientRect();
    var pct  = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audio.currentTime = pct * audio.duration;
  });

  (function() {
    var dragging = false;
    dot.addEventListener('mousedown', function(e) { dragging = true; e.preventDefault(); });
    dot.addEventListener('touchstart', function(e) { dragging = true; }, { passive: true });
    document.addEventListener('mousemove', function(e) {
      if (!dragging || !audio.duration) return;
      var rect = track.getBoundingClientRect();
      var pct  = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      audio.currentTime = pct * audio.duration;
    });
    document.addEventListener('touchmove', function(e) {
      if (!dragging || !audio.duration) return;
      var rect = track.getBoundingClientRect();
      var pct  = Math.max(0, Math.min(1, (e.touches[0].clientX - rect.left) / rect.width));
      audio.currentTime = pct * audio.duration;
    }, { passive: true });
    document.addEventListener('mouseup',  function() { dragging = false; });
    document.addEventListener('touchend', function() { dragging = false; });
  })();

  // Build message row
  var msgRow = document.createElement('div');
  msgRow.className = 'msg-row ' + (isSent ? 'sent' : '') + ' msg-appear';

  var col = document.createElement('div');

  var timeEl = document.createElement('div');
  timeEl.style.cssText = 'font-size:10px;color:rgba(170,197,217,0.6);margin-top:2px;' +
    (isSent ? 'text-align:right;padding-right:4px;' : 'padding-left:4px;');
  timeEl.innerHTML = getTime() + (isSent
    ? ' <svg style="display:inline;vertical-align:-1px" width="12" height="12" viewBox="0 0 24 24" fill="rgba(255,255,255,0.5)"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>'
    : '');

  if (!isSent) {
    var color = getAvatarColor(senderName);
    var ch = (senderName || '?')[0].toUpperCase();

    var nameEl = document.createElement('div');
    nameEl.className = 'bubble-name';
    nameEl.style.color = color;
    nameEl.textContent = senderName;

    var avatarEl = document.createElement('div');
    avatarEl.className = 'avatar';
    avatarEl.style.background = color;
    avatarEl.textContent = ch;

    col.appendChild(nameEl);
    col.appendChild(bubble);
    col.appendChild(timeEl);
    msgRow.appendChild(avatarEl);
    msgRow.appendChild(col);
  } else {
    col.appendChild(bubble);
    col.appendChild(timeEl);
    msgRow.appendChild(col);
  }

  container.appendChild(msgRow);
  container.scrollTop = container.scrollHeight;
}

/* ════════════════════════════════════════════════════════════
   CHUNKED TRANSFER — explicit kind protocol
   ════════════════════════════════════════════════════════════

   Wire format
   ───────────
   1. JSON  { __tc_chunk_start: true, id, type, kind, name, size, totalChunks }
              kind is one of: 'audio' | 'image' | 'file'
              type is the fully-resolved MIME string (e.g. 'audio/mpeg')
              Both are resolved ONCE at the sender and carried verbatim.

   2. Binary frames: [36-byte UTF-8 id] + [payload slice]

   3. JSON  { __tc_chunk_end: true, id }

   The receiver stores kind/type from the start header and uses them
   directly in onComplete — no MIME re-detection, no fallback guessing.
   ════════════════════════════════════════════════════════════ */
var CHUNK_SIZE = 16 * 1024; // 16 KB

/**
 * Send a File over an RTCDataChannel using chunked transfer.
 * Resolves MIME and kind ONCE here; embeds both in the start header.
 *
 * @param {RTCDataChannel} channel
 * @param {File} file
 * @returns {Promise<{ id, type, kind, name }>}
 */
async function sendFileChunked(channel, file) {
  var id = Date.now() + '_' + Math.random().toString(36).slice(2);

  // ── Resolve MIME and kind exactly once, at the sender ──
  var mimeType  = resolveMime(file);       // authoritative MIME
  var mediaKind = classifyKind(mimeType);  // 'audio' | 'image' | 'file'

  var buf = await file.arrayBuffer();
  var totalChunks = Math.ceil(buf.byteLength / CHUNK_SIZE) || 1;

  // Header carries the authoritative type AND kind
  channel.send(JSON.stringify({
    __tc_chunk_start: true,
    id:          id,
    type:        mimeType,   // fully resolved — receiver uses as-is
    kind:        mediaKind,  // explicit group — receiver uses as-is
    name:        file.name,
    size:        buf.byteLength,
    totalChunks: totalChunks
  }));

  // Binary chunk frames: 36-byte id prefix + payload
  for (var j = 0; j < totalChunks; j++) {
    while (channel.bufferedAmount > 4 * 1024 * 1024) {
      await new Promise(function (r) { setTimeout(r, 20); });
    }
    var slice  = buf.slice(j * CHUNK_SIZE, (j + 1) * CHUNK_SIZE);
    var header = new ArrayBuffer(36);
    var idBytes = new TextEncoder().encode(id.padEnd(36, '\0'));
    new Uint8Array(header).set(idBytes.slice(0, 36));
    var pkt = new Uint8Array(36 + slice.byteLength);
    pkt.set(new Uint8Array(header), 0);
    pkt.set(new Uint8Array(slice), 36);
    channel.send(pkt.buffer);
  }

  channel.send(JSON.stringify({ __tc_chunk_end: true, id: id }));
  return { id: id, type: mimeType, kind: mediaKind, name: file.name };
}

/**
 * ChunkedReceiver
 * Reassembles chunked binary transfers.
 *
 * onComplete callback receives:
 *   { id, type, kind, name, blob }
 *
 *   kind  — exactly as sent: 'audio' | 'image' | 'file'
 *   type  — exactly as sent: fully-resolved MIME string
 *   blob  — reassembled Blob with the sender's MIME already applied
 *
 * Callers MUST branch on `kind` directly. Do NOT re-detect from blob.type
 * or filename. The sender is the single source of truth for both.
 */
function ChunkedReceiver(onComplete) {
  this._onComplete = onComplete;
  this._pending    = {};
}

ChunkedReceiver.prototype.feed = function (raw) {
  // ── Binary frame: [36-byte id][payload] ──
  if (raw instanceof ArrayBuffer) {
    if (raw.byteLength < 36) return true;
    var id = new TextDecoder().decode(new Uint8Array(raw, 0, 36)).replace(/\0/g, '');
    var p  = this._pending[id];
    if (p) {
      p.chunks.push(raw.slice(36));
      p.received += raw.byteLength - 36;
    }
    return true;
  }

  // ── JSON control frames ──
  var obj;
  try { obj = JSON.parse(raw); } catch (_) { return false; }

  if (obj.__tc_chunk_start) {
    // Store kind and type verbatim from the sender — no local re-classification
    this._pending[obj.id] = {
      type:     obj.type,   // sender's authoritative MIME
      kind:     obj.kind,   // sender's authoritative kind: 'audio'|'image'|'file'
      name:     obj.name,
      size:     obj.size,
      chunks:   [],
      received: 0
    };
    return true;
  }

  if (obj.__tc_chunk_end) {
    var p2 = this._pending[obj.id];
    if (!p2) return true;

    // Build blob with the sender's MIME — no guessing needed
    var blob = new Blob(p2.chunks, { type: p2.type });
    delete this._pending[obj.id];

    // Deliver with explicit kind and type; callers branch on kind
    this._onComplete({
      id:   obj.id,
      type: p2.type,   // sender's MIME, verbatim
      kind: p2.kind,   // sender's kind, verbatim
      name: p2.name,
      blob: blob
    });
    return true;
  }

  return false;
};

/* ════════════════════════════════════════════════════════════
   buildImageNode
   Build a DOM node for a received image blob.
   Called only when kind === 'image' (guaranteed by caller).
   No MIME re-detection needed — type comes from the sender.
   ════════════════════════════════════════════════════════════ */
function buildImageNode(blob, filename, mimeType) {
  var url = URL.createObjectURL(blob);
  var img = document.createElement('img');
  img.src = url;
  img.className = (mimeType === 'image/gif' || (filename || '').toLowerCase().endsWith('.gif'))
    ? 'chat-gif'
    : 'chat-img';
  img.alt = filename || 'image';
  img.addEventListener('click', function () { openLightbox(url); });
  return img;
}

/**
 * buildFileNode — generic download link for kind === 'file'
 */
function buildFileNode(blob, filename) {
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = filename || 'file';
  a.textContent = '📎 ' + (filename || 'file');
  a.style.color = '#64b5f6';
  return a;
}

/* ── Build a message row (text / image / file node) ── */
function buildMessageRow(content, side, senderName, isHTML) {
  isHTML = isHTML || false;
  var ch    = (senderName || '?')[0].toUpperCase();
  var color = getAvatarColor(senderName);
  var row   = document.createElement('div');
  row.className = 'msg-row ' + (side === 'sent' ? 'sent' : '') + ' msg-appear';

  var isMedia = content && typeof content === 'object' && typeof content.nodeType === 'number';

  var bubble = document.createElement('div');
  bubble.className = 'bubble ' + side + (isMedia ? ' media-bubble' : '');

  if (isMedia) {
    bubble.appendChild(content);
  } else {
    if (isHTML) {
      bubble.innerHTML = content;
    } else {
      var span = document.createElement('span');
      span.textContent = content;
      bubble.appendChild(span);
    }
  }

  if (!isMedia) {
    var timeEl = document.createElement('div');
    timeEl.className = 'bubble-time';
    timeEl.innerHTML = getTime() + (side === 'sent'
      ? ' <svg style="display:inline;vertical-align:-1px" width="12" height="12" viewBox="0 0 24 24" fill="rgba(255,255,255,0.6)"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>'
      : '');
    bubble.appendChild(timeEl);
  } else {
    var timeEl2 = document.createElement('div');
    timeEl2.style.cssText = 'font-size:10px;color:rgba(170,197,217,0.6);margin-top:2px;' +
      (side === 'sent' ? 'text-align:right;padding-right:4px;' : 'padding-left:4px;');
    timeEl2.innerHTML = getTime() + (side === 'sent'
      ? ' <svg style="display:inline;vertical-align:-1px" width="12" height="12" viewBox="0 0 24 24" fill="rgba(255,255,255,0.5)"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>'
      : '');
    bubble._timeEl = timeEl2;
  }

  var col = document.createElement('div');

  if (side === 'received') {
    var nameEl = document.createElement('div');
    nameEl.className = 'bubble-name';
    nameEl.style.color = color;
    nameEl.textContent = senderName;

    var avatarEl = document.createElement('div');
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

/* ════════════════════════════════════════════════════════════
   prepareMediaPayload
   Called at SEND time to resolve MIME + kind for a local File.
   Returns an object ready for both local preview and wire transfer.

   { type, kind, name, blob }   — for audio  (kind === 'audio')
   { type, kind, name, blob }   — for images (kind === 'image')
   { type, kind, name, blob }   — for other  (kind === 'file')

   Callers MUST branch on kind, never re-detect from type/name.
   ════════════════════════════════════════════════════════════ */
async function prepareMediaPayload(file) {
  var type = resolveMime(file);
  var kind = classifyKind(type);
  var blob = new Blob([await file.arrayBuffer()], { type: type });
  return { type: type, kind: kind, name: file.name, blob: blob };
}
