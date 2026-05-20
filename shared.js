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

  // Timestamp (not shown separately for media — it goes inside the bubble below the image)
  if (!isMedia) {
    const timeEl = document.createElement('div');
    timeEl.className = 'bubble-time';
    timeEl.innerHTML = getTime() + (side === 'sent'
      ? ` <svg style="display:inline;vertical-align:-1px" width="12" height="12" viewBox="0 0 24 24" fill="rgba(255,255,255,0.6)"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>`
      : '');
    bubble.appendChild(timeEl);
  } else {
    // For media, add a small time label underneath outside the bubble
    const timeEl = document.createElement('div');
    timeEl.style.cssText = 'font-size:10px;color:rgba(170,197,217,0.6);margin-top:2px;' +
      (side === 'sent' ? 'text-align:right;padding-right:4px;' : 'padding-left:4px;');
    timeEl.innerHTML = getTime() + (side === 'sent'
      ? ` <svg style="display:inline;vertical-align:-1px" width="12" height="12" viewBox="0 0 24 24" fill="rgba(255,255,255,0.5)"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>`
      : '');
    // Will be appended to col below
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

/* ── Media message builder (images only) ── */
async function prepareMediaPayload(file) {
  const dataURL = await fileToDataURL(file);
  const type = file.type;
  const wire = JSON.stringify({ __tc_media: true, type, name: file.name, data: dataURL });
  return { wire, type, name: file.name, dataURL };
}

function buildMediaNode(type, dataURL, filename) {
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

/* ── Parse incoming wire message ── */
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
