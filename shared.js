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

/* ── Format seconds → m:ss ── */
function formatDuration(secs) {
  if (!isFinite(secs) || secs < 0) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return m + ':' + (s < 10 ? '0' + s : s);
}

/* ── Music note SVG (default thumbnail) ── */
const MUSIC_ICON_SVG = '<svg viewBox="0 0 24 24" fill="rgba(255,255,255,0.7)" width="22" height="22"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>';

/* ═══════════════════════════════════════════════════════════
   MIME MAP — extension → MIME type
   Mirrors the same map in script.js so both files agree.
   Old Android WebViews frequently return '' or
   'application/octet-stream' even for well-known audio/image
   formats; we derive the real MIME from the file extension so
   every detection function works correctly on all browsers.
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

/* ── Resolve the best MIME for a file ──────────────────────
   If the browser already gave us a real MIME (not blank /
   octet-stream) we keep it.  Otherwise we look up the file
   extension in MIME_MAP.  This is the key fix for old Android
   WebViews where File.type is often empty.
   ─────────────────────────────────────────────────────────── */
function resolveMime(file) {
  var type = (file && file.type) ? file.type : '';
  if (type && type !== 'application/octet-stream') return type;
  var ext = (file && file.name ? file.name : '').split('.').pop().toLowerCase();
  return MIME_MAP[ext] || type || 'application/octet-stream';
}

/* ── Resolve MIME from a plain type string + filename ───────
   Used when we only have the stored type/name strings (e.g.
   inside ChunkedReceiver or parseIncoming) rather than a File
   object.
   ─────────────────────────────────────────────────────────── */
function resolveMimeFromStrings(type, filename) {
  var t = type || '';
  if (t && t !== 'application/octet-stream') return t;
  var ext = (filename || '').split('.').pop().toLowerCase();
  return MIME_MAP[ext] || t || 'application/octet-stream';
}

/* ═══════════════════════════════════════════════════════════
   OLD ANDROID DETECTION
   Targets Android <= 9 with Chrome < 70 (or no Chrome token).
   Also catches cases where the custom player APIs simply aren't
   available (no AudioContext / broken Web Audio on old WebViews).
   ═══════════════════════════════════════════════════════════ */
var _isOldAndroid = (function () {
  var ua = navigator.userAgent || '';

  var badWebView =
    !window.AudioContext ||
    !window.Promise ||
    !window.customElements;

  var oldChrome = false;
  var crMatch = ua.match(/Chrome\/(\d+)/i);

  if (crMatch) {
    oldChrome = parseInt(crMatch[1], 10) < 70;
  }

  return /Android/i.test(ua) && (badWebView || oldChrome);
})();

/* ── Extract album art from audio file using jsmediatags ── */
function extractAlbumArt(file) {
  return new Promise(function (resolve) {
    function tryExtract() {
      if (typeof window.jsmediatags === 'undefined') { resolve(null); return; }
      window.jsmediatags.read(file, {
        onSuccess: function (tag) {
          try {
            var pic = tag.tags.picture;
            if (pic) {
              var base64 = '';
              var data = pic.data;
              for (var i = 0; i < data.length; i++) { base64 += String.fromCharCode(data[i]); }
              resolve('data:' + pic.format + ';base64,' + btoa(base64));
            } else { resolve(null); }
          } catch (_) { resolve(null); }
        },
        onError: function () { resolve(null); }
      });
    }
    if (typeof window.jsmediatags === 'undefined') {
      var s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jsmediatags/3.9.7/jsmediatags.min.js';
      s.onload = tryExtract;
      s.onerror = function () { resolve(null); };
      document.head.appendChild(s);
    } else { tryExtract(); }
  });
}

/* ═══════════════════════════════════════════════════════════
   buildAudioBubble
   On OLD Android  → native <audio controls> inside the bubble
   On modern       → custom player (unchanged behaviour)
   side: 'sent' | 'received'
   ═══════════════════════════════════════════════════════════ */
function buildAudioBubble(dataURL, filename, side, albumArtURL) {
  var isSent = side === 'sent';

  /* ── outer bubble ── */
  var bubble = document.createElement('div');
  bubble.className = 'bubble ' + side + ' audio-bubble';

  /* ══════════════════════════════════════════
     OLD ANDROID PATH — native <audio controls>
     ══════════════════════════════════════════ */
  if (_isOldAndroid) {
    /* Title */
    var nativeTitle = document.createElement('div');
    nativeTitle.className = 'ab-title';
    nativeTitle.textContent = filename.replace(/\.[^.]+$/, '') || 'Audio';
    nativeTitle.title = filename;

    /* Native audio element */
    var nativeAudio = document.createElement('audio');
    nativeAudio.className = 'tc-audio-native';
    nativeAudio.controls = true;
    nativeAudio.preload = 'metadata';
    nativeAudio.src = dataURL;

    /* Timestamp */
    var nativeTime = document.createElement('div');
    nativeTime.className = 'bubble-time';
    var checkSVG = '<svg style="display:inline;vertical-align:-1px" width="12" height="12" viewBox="0 0 24 24" fill="rgba(255,255,255,0.6)"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>';
    nativeTime.innerHTML = getTime() + (isSent ? ' ' + checkSVG : '');

    bubble.appendChild(nativeTitle);
    bubble.appendChild(nativeAudio);
    bubble.appendChild(nativeTime);
    return bubble;
  }

  /* ══════════════════════════════════════════
     MODERN PATH — custom player
     ══════════════════════════════════════════ */

  /* hidden <audio> engine */
  var audio = document.createElement('audio');
  audio.className = 'tc-audio-engine';
  audio.src = dataURL;
  audio.preload = 'metadata';
  bubble.appendChild(audio);

  /* layout row */
  var row = document.createElement('div');
  row.className = 'ab-row';

  /* thumbnail circle */
  var thumb = document.createElement('div');
  thumb.className = 'ab-thumb';
  if (albumArtURL) {
    var img = document.createElement('img');
    img.src = albumArtURL;
    img.alt = '';
    thumb.appendChild(img);
  } else {
    thumb.innerHTML = MUSIC_ICON_SVG;
  }

  /* play/pause button (sits on top of thumb) */
  var playBtn = document.createElement('button');
  playBtn.className = 'ab-play';
  playBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M8 5v14l11-7z"/></svg>';

  var thumbWrap = document.createElement('div');
  thumbWrap.className = 'ab-thumb-wrap';
  thumbWrap.appendChild(thumb);
  thumbWrap.appendChild(playBtn);

  /* right column: title + seek + times */
  var col = document.createElement('div');
  col.className = 'ab-col';

  /* title */
  var title = document.createElement('div');
  title.className = 'ab-title';
  title.textContent = filename.replace(/\.[^.]+$/, '') || 'Audio';
  title.title = filename;

  /* seek track */
  var trackWrap = document.createElement('div');
  trackWrap.className = 'ab-track-wrap';

  var track = document.createElement('div');
  track.className = 'ab-track';

  var prog = document.createElement('div');
  prog.className = 'ab-progress';
  prog.style.width = '0%';

  var dot = document.createElement('div');
  dot.className = 'ab-dot';
  dot.style.left = '0%';

  track.appendChild(prog);
  track.appendChild(dot);
  trackWrap.appendChild(track);

  /* times row */
  var timesRow = document.createElement('div');
  timesRow.className = 'ab-times';

  var elapsed = document.createElement('span');
  elapsed.textContent = '0:00';

  var duration = document.createElement('span');
  duration.textContent = '0:00';

  timesRow.appendChild(elapsed);
  timesRow.appendChild(duration);

  col.appendChild(title);
  col.appendChild(trackWrap);
  col.appendChild(timesRow);

  row.appendChild(thumbWrap);
  row.appendChild(col);
  bubble.appendChild(row);

  /* timestamp row */
  var timeEl = document.createElement('div');
  timeEl.className = 'bubble-time';
  var checkSVG2 = '<svg style="display:inline;vertical-align:-1px" width="12" height="12" viewBox="0 0 24 24" fill="rgba(255,255,255,0.6)"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>';
  timeEl.innerHTML = getTime() + (isSent ? ' ' + checkSVG2 : '');
  bubble.appendChild(timeEl);

  /* audio events */
  audio.addEventListener('loadedmetadata', function () {
    duration.textContent = formatDuration(audio.duration);
  });

  var playing = false;

  function setPlaying(val) {
    playing = val;
    playBtn.innerHTML = val
      ? '<svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M8 5v14l11-7z"/></svg>';
  }

  playBtn.addEventListener('click', function () {
    if (playing) {
      audio.pause();
    } else {
      document.querySelectorAll('audio[data-tc]').forEach(function (a) { if (a !== audio) a.pause(); });
      audio.play();
    }
  });

  audio.dataset.tc = '1';
  audio.addEventListener('play',  function () { setPlaying(true); });
  audio.addEventListener('pause', function () { setPlaying(false); });
  audio.addEventListener('ended', function () {
    setPlaying(false);
    prog.style.width = '0%';
    dot.style.left = '0%';
    elapsed.textContent = '0:00';
  });

  audio.addEventListener('timeupdate', function () {
    var pct = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
    prog.style.width = pct + '%';
    dot.style.left = pct + '%';
    elapsed.textContent = formatDuration(audio.currentTime);
  });

  /* seek click */
  track.addEventListener('click', function (e) {
    var rect = track.getBoundingClientRect();
    var pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    if (audio.duration) audio.currentTime = pct * audio.duration;
  });

  /* seek drag */
  var dragging = false;
  dot.addEventListener('mousedown',  function (e) { dragging = true; e.preventDefault(); });
  dot.addEventListener('touchstart', function ()  { dragging = true; }, { passive: true });
  var onMove = function (clientX) {
    if (!dragging) return;
    var rect = track.getBoundingClientRect();
    var pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    if (audio.duration) audio.currentTime = pct * audio.duration;
  };
  document.addEventListener('mousemove',  function (e) { onMove(e.clientX); });
  document.addEventListener('touchmove',  function (e) { onMove(e.touches[0].clientX); }, { passive: true });
  document.addEventListener('mouseup',    function () { dragging = false; });
  document.addEventListener('touchend',   function () { dragging = false; });

  return bubble;
}

/* ════════════════════════════════════
   appendAudioMessage — builds the full
   msg-row and appends to container
   ════════════════════════════════════ */
function appendAudioMessage(dataURL, filename, side, senderName, container, albumArtURL) {
  var bubble = buildAudioBubble(dataURL, filename, side, albumArtURL);

  var msgRow = document.createElement('div');
  msgRow.className = 'msg-row ' + (side === 'sent' ? 'sent' : '') + ' msg-appear';

  var col = document.createElement('div');

  if (side === 'received') {
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
    msgRow.appendChild(avatarEl);
    msgRow.appendChild(col);
  } else {
    col.style.cssText = '-webkit-align-items:flex-end;align-items:flex-end;';
    col.appendChild(bubble);
    msgRow.appendChild(col);
  }

  container.appendChild(msgRow);
  container.scrollTop = container.scrollHeight;
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

/* ════════════════════════════════════
   CHUNKED TRANSFER over RTCDataChannel
   ════════════════════════════════════ */
var CHUNK_SIZE = 16 * 1024; // 16 KB

function getMediaKind(type, filename) {
  if (isAudioType(type, filename)) return 'audio';
  if (isImageType(type, filename)) return 'image';
  return 'file';
}

async function sendFileChunked(channel, file) {
  var id = Date.now() + '_' + Math.random().toString(36).slice(2);
  var dataURL = await fileToDataURL(file);
  /* ── Use resolveMime() so old Android WebViews that return a blank
        or generic File.type still get the correct MIME string on the
        wire, which lets the receiver render it as audio/image properly. ── */
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

    /* ── Resolve MIME from the stored type + filename so that any
          file whose type arrived as blank / octet-stream (old Android
          sender) is still correctly identified on the receiver side. ── */
    var resolvedType = resolveMimeFromStrings(p2.type, p2.name);

    var dataURL = 'data:' + resolvedType + ';base64,' + b64;
    delete this._pending[obj.id];
    this._onComplete({ id: obj.id, type: resolvedType, kind: p2.kind, name: p2.name, dataURL: dataURL });
    return true;
  }
  return false;
};

/* ── Detect if MIME type or filename is audio ───────────────
   Checks the MIME string first, then falls back to the file
   extension — matching the same dual-check used in script.js.
   ─────────────────────────────────────────────────────────── */
function isAudioType(type, filename) {
  if (type && type.startsWith('audio/')) return true;
  /* Also catch audio/mpeg and similar that may come through
     as a generic MIME on some browsers */
  if (type && MIME_MAP) {
    var vals = Object.values ? Object.values(MIME_MAP) : Object.keys(MIME_MAP).map(function(k){ return MIME_MAP[k]; });
    /* Only check audio entries — those whose value starts with audio/ */
    for (var k in MIME_MAP) {
      if (MIME_MAP[k] === type && MIME_MAP[k].startsWith('audio/')) return true;
    }
  }
  var ext = (filename || '').split('.').pop().toLowerCase();
  return ['mp3','wav','ogg','flac','aac','m4a','opus','weba','wma','aiff','aif'].indexOf(ext) !== -1;
}

/* ── Detect if MIME type or filename is image ── */
function isImageType(type, filename) {
  if (type && type.startsWith('image/')) return true;
  var ext = (filename || '').split('.').pop().toLowerCase();
  return ['jpg','jpeg','png','gif','webp','bmp','svg','ico','avif'].indexOf(ext) !== -1;
}

/* ── Media message builder (images / unknown files) ── */
async function prepareMediaPayload(file) {
  var dataURL = await fileToDataURL(file);
  /* Use resolveMime() so we always send the real MIME type,
     not an empty string from an old Android WebView. */
  var type = resolveMime(file);
  return { type: type, name: file.name, dataURL: dataURL };
}

/* ── Build a DOM node for a received media item ─────────────
   OLD behaviour: checked `type` string first — if the browser
   had reported '' or 'application/octet-stream' for an audio
   file, neither isAudioType nor isImageType would match via
   the MIME branch, and the file fell through to the 📎 link.

   NEW behaviour: resolve the true MIME via resolveMimeFromStrings()
   before the type checks, so extension-based detection always
   runs even when the stored type string is blank/generic.
   ─────────────────────────────────────────────────────────── */
function buildMediaNode(type, dataURL, filename) {
  /* Always resolve to the best available MIME before branching */
  var resolvedType = resolveMimeFromStrings(type, filename);

  if (isAudioType(resolvedType, filename)) {
    /* On old Android WebViews use a native <audio> element;
       everywhere else use the custom bubble player via
       appendAudioMessage / buildAudioBubble.
       Here we return a lightweight native player as a safe
       fallback for callers that only want a DOM node. */
    if (_isOldAndroid) {
      var audioNative = document.createElement('audio');
      audioNative.controls = true;
      audioNative.preload = 'metadata';
      audioNative.src = dataURL;
      audioNative.style.cssText = 'width:100%;border-radius:8px;outline:none;';
      return audioNative;
    }
    /* Modern browsers: return a styled native player as the
       node-only fallback (callers that want the full custom
       bubble should call appendAudioMessage instead). */
    var audioModern = document.createElement('audio');
    audioModern.controls = true;
    audioModern.preload = 'metadata';
    audioModern.src = dataURL;
    audioModern.dataset.tc = '1';
    audioModern.style.cssText = 'width:100%;border-radius:8px;outline:none;';
    return audioModern;
  }

  if (isImageType(resolvedType, filename)) {
    var img = document.createElement('img');
    img.src = dataURL;
    img.className = (resolvedType === 'image/gif' || filename.toLowerCase().endsWith('.gif')) ? 'chat-gif' : 'chat-img';
    img.alt = filename;
    img.addEventListener('click', function () { openLightbox(dataURL); });
    return img;
  }

  /* Generic download link for truly unknown file types */
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
      /* Resolve the MIME before building the node so audio files
         sent from old Android browsers (where File.type was '')
         are correctly identified on the receiving end. */
      var resolvedType = resolveMimeFromStrings(obj.type, obj.name);
      var node = buildMediaNode(resolvedType, obj.data, obj.name);
      return { isMedia: true, node: node };
    }
  } catch (_) {}
  return { isMedia: false };
}
