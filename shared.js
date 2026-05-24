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

/* ── Resolve the best MIME for a file ── */
function resolveMime(file) {
  var type = (file && file.type) ? file.type : '';
  if (type && type !== 'application/octet-stream') return type;
  var ext = (file && file.name ? file.name : '').split('.').pop().toLowerCase();
  return MIME_MAP[ext] || type || 'application/octet-stream';
}

/* ── Resolve MIME from a plain type string + filename ── */
function resolveMimeFromStrings(type, filename) {
  var t = type || '';
  if (t && t !== 'application/octet-stream') return t;
  var ext = (filename || '').split('.').pop().toLowerCase();
  return MIME_MAP[ext] || t || 'application/octet-stream';
}

/* ── Detect if MIME type or filename is audio ── */
function isAudioType(type, filename) {
  if (type && type.startsWith('audio/')) return true;
  var ext = (filename || '').split('.').pop().toLowerCase();
  return ['mp3','wav','ogg','aac','m4a','flac','opus','weba','wma','aiff','aif'].indexOf(ext) !== -1;
}

/* ── Detect if MIME type or filename is image ── */
function isImageType(type, filename) {
  if (type && type.startsWith('image/')) return true;
  var ext = (filename || '').split('.').pop().toLowerCase();
  return ['jpg','jpeg','png','gif','webp','bmp','svg','ico','avif'].indexOf(ext) !== -1;
}

/* ── Extract album art from audio file using jsmediatags (if available) ── */
function extractAlbumArt(file) {
  return new Promise(function(resolve) {
    // Resolve immediately with null if library not loaded
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

/* ════════════════════════════════════════════════════════════
   appendAudioMessage
   Accepts either a Blob or a dataURL string as `blobOrDataURL`.
   meta may be a string (filename) or object { name, artist, thumbnail }.
   ════════════════════════════════════════════════════════════ */
function appendAudioMessage(blobOrDataURL, meta, side, senderName, container, albumArt) {
  // Normalise meta
  if (typeof meta === 'string') {
    meta = { name: meta, artist: '', thumbnail: albumArt || null };
  } else {
    meta = meta || {};
    if (albumArt) meta.thumbnail = albumArt;
  }

  // Build audio element
  var audio = document.createElement('audio');
  audio.className = 'tc-audio-engine';
  audio.preload = 'metadata';

  if (typeof blobOrDataURL === 'string') {
    // dataURL path (received via chunked transfer)
    audio.src = blobOrDataURL;
  } else {
    // Blob path (local file)
    audio.src = URL.createObjectURL(blobOrDataURL);
  }

  // Build bubble
  var bubble = document.createElement('div');
  var isSent = side === 'sent';
  bubble.className = 'bubble audio-bubble ' + (isSent ? 'sent' : 'received');

  // Thumbnail HTML
  var thumbInner = meta.thumbnail
    ? '<img src="' + meta.thumbnail + '" alt="art">'
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
        '<div class="ab-title">' + sanitizeHTML(meta.name || 'Audio') + '</div>' +
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

  // Seek by clicking the track
  track.addEventListener('click', function(e) {
    if (!audio.duration) return;
    var rect = track.getBoundingClientRect();
    var pct  = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audio.currentTime = pct * audio.duration;
  });

  // Drag the dot
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

  // Timestamp row below bubble
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
   CHUNKED TRANSFER over RTCDataChannel
   ════════════════════════════════════════════════════════════ */
var CHUNK_SIZE = 16 * 1024; // 16 KB

function getMediaKind(type, filename) {
  if (isAudioType(type, filename)) return 'audio';
  if (isImageType(type, filename)) return 'image';
  return 'file';
}

async function sendFileChunked(channel, file) {
  var id = Date.now() + '_' + Math.random().toString(36).slice(2);
  var dataURL = await fileToDataURL(file);
  var mimeType = resolveMime(file);
  var mediaKind = getMediaKind(mimeType, file.name);

  var b64 = dataURL.split(',')[1];

  var chunks = [];
  for (var i = 0; i < b64.length; i += CHUNK_SIZE) {
    chunks.push(b64.slice(i, i + CHUNK_SIZE));
  }

  channel.send(JSON.stringify({
    __tc_chunk_start: true,
    id: id,
    type: mimeType,
    kind: mediaKind,
    name: file.name,
    totalChunks: chunks.length
  }));

  for (var j = 0; j < chunks.length; j++) {
    while (channel.bufferedAmount > 1024 * 1024) {
      await new Promise(function (r) { setTimeout(r, 20); });
    }
    channel.send(JSON.stringify({ __tc_chunk: true, id: id, index: j, data: chunks[j] }));
  }

  channel.send(JSON.stringify({ __tc_chunk_end: true, id: id }));
  return { id: id, type: mimeType, kind: mediaKind, name: file.name, dataURL: dataURL };
}

function ChunkedReceiver(onComplete) {
  this._onComplete = onComplete;
  this._pending = {};
}
ChunkedReceiver.prototype.feed = function (raw) {
  var obj;
  try { obj = JSON.parse(raw); } catch (_) { return false; }
  if (obj.__tc_chunk_start) {
    this._pending[obj.id] = {
      type: obj.type, kind: obj.kind, name: obj.name,
      totalChunks: obj.totalChunks, chunks: new Array(obj.totalChunks)
    };
    return true;
  }
  if (obj.__tc_chunk) {
    var p = this._pending[obj.id];
    if (p) p.chunks[obj.index] = obj.data;
    return true;
  }
  if (obj.__tc_chunk_end) {
    var p2 = this._pending[obj.id];
    if (!p2) return true;
    var b64 = p2.chunks.join('');
    var resolvedType = resolveMimeFromStrings(p2.type, p2.name);
    var dataURL = 'data:' + resolvedType + ';base64,' + b64;
    delete this._pending[obj.id];
    this._onComplete({ id: obj.id, type: resolvedType, kind: p2.kind, name: p2.name, dataURL: dataURL });
    return true;
  }
  return false;
};

/* ── Build a DOM node for a received media item ── */
function buildMediaNode(type, dataURL, filename) {
  var resolvedType = resolveMimeFromStrings(type, filename);

  if (isImageType(resolvedType, filename)) {
    var img = document.createElement('img');
    img.src = dataURL;
    img.className = (resolvedType === 'image/gif' || filename.toLowerCase().endsWith('.gif')) ? 'chat-gif' : 'chat-img';
    img.alt = filename;
    img.addEventListener('click', function () { openLightbox(dataURL); });
    return img;
  }

  var a = document.createElement('a');
  a.href = dataURL; a.download = filename;
  a.textContent = '📎 ' + filename;
  a.style.color = '#64b5f6';
  return a;
}

/* ── Parse incoming wire message (legacy inline media) ── */
function parseIncoming(raw) {
  try {
    var obj = JSON.parse(raw);
    if (obj && obj.__tc_media) {
      var resolvedType = resolveMimeFromStrings(obj.type, obj.name);
      var node = buildMediaNode(resolvedType, obj.data, obj.name);
      return { isMedia: true, node: node };
    }
  } catch (_) {}
  return { isMedia: false };
}

/* ── Build a message row (text / image) ── */
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

/* ── Media message builder ── */
async function prepareMediaPayload(file) {
  var dataURL = await fileToDataURL(file);
  var type = resolveMime(file);
  var kind = getMediaKind(type, file.name);
  return { type: type, kind: kind, name: file.name, dataURL: dataURL };
}
