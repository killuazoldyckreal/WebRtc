/* ===== script.js — Shared WebRTC + UI logic ===== */

// ─── Toast ───────────────────────────────────────────────────────
function showToast(msg, type = '', duration = 3000) {
  let c = document.getElementById('toast-container');
  if (!c) { c = document.createElement('div'); c.id = 'toast-container'; document.body.appendChild(c); }
  const t = document.createElement('div');
  t.className = 'toast' + (type ? ' ' + type : '');
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity 0.3s'; setTimeout(() => t.remove(), 300); }, duration);
}

// ─── Copy to clipboard ───────────────────────────────────────────
function copyText(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => showToast('Copied!', 'success'));
  } else {
    const el = document.createElement('textarea');
    el.value = text;
    el.style.position = 'fixed'; el.style.left = '-9999px';
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    el.remove();
    showToast('Copied!', 'success');
  }
}

// ─── Time helpers ────────────────────────────────────────────────
function formatTime(date) {
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
function formatDuration(secs) {
  const s = Math.floor(secs || 0);
  const m = Math.floor(s / 60);
  return m + ':' + String(s % 60).padStart(2, '0');
}

// ─── CHUNK SIZE ──────────────────────────────────────────────────
const CHUNK_SIZE = 100 * 1024; // 100 KB

// ─── WebRTC Manager ──────────────────────────────────────────────
class WebRTCManager {
  constructor(opts) {
    this.opts = Object.assign({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
      ],
      onStateChange: null,
      onMessage: null,
      onFileProgress: null
    }, opts);

    this.pc = null;
    this.dc = null;
    this.sendQueue = [];
    this.isSending = false;
    this.incomingFiles = {};
    this.isConnected = false;
  }

  createPC() {
    this.pc = new RTCPeerConnection({ iceServers: this.opts.iceServers });
    this.pc.oniceconnectionstatechange = () => {
      const s = this.pc.iceConnectionState;
      this.opts.onStateChange && this.opts.onStateChange(s);
      if (s === 'connected' || s === 'completed') {
        this.isConnected = true;
      } else if (s === 'disconnected' || s === 'closed' || s === 'failed') {
        this.isConnected = false;
      }
    };
    return this.pc;
  }

  async createOffer() {
    this.createPC();
    this.dc = this.pc.createDataChannel('chat', { ordered: true });
    this._setupDC(this.dc);
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    return new Promise(resolve => {
      this.pc.onicecandidate = e => {
        if (!e.candidate) resolve(JSON.stringify(this.pc.localDescription));
      };
      setTimeout(() => resolve(JSON.stringify(this.pc.localDescription)), 6000);
    });
  }

  async receiveAnswer(answerStr) {
    const answer = JSON.parse(answerStr);
    await this.pc.setRemoteDescription(new RTCSessionDescription(answer));
  }

  async createAnswer(offerStr) {
    this.createPC();
    this.pc.ondatachannel = ev => {
      this.dc = ev.channel;
      this._setupDC(this.dc);
    };
    const offer = JSON.parse(offerStr);
    await this.pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
    return new Promise(resolve => {
      this.pc.onicecandidate = e => {
        if (!e.candidate) resolve(JSON.stringify(this.pc.localDescription));
      };
      setTimeout(() => resolve(JSON.stringify(this.pc.localDescription)), 6000);
    });
  }

  _setupDC(dc) {
    dc.binaryType = 'arraybuffer';
    dc.onopen = () => {
      this.isConnected = true;
      this.opts.onStateChange && this.opts.onStateChange('connected');
      this._drainQueue();
    };
    dc.onclose = () => {
      this.isConnected = false;
      this.opts.onStateChange && this.opts.onStateChange('disconnected');
    };
    dc.onmessage = ev => this._onDCMessage(ev.data);
    dc.onerror = err => console.error('DC error:', err);
  }

  _onDCMessage(data) {
    if (typeof data === 'string') {
      let msg;
      try { msg = JSON.parse(data); } catch { return; }
      if (msg.type === 'file-meta') {
        this.incomingFiles[msg.id] = { meta: msg, chunks: [], received: 0 };
        return;
      }
      if (msg.type === 'file-done') {
        const inf = this.incomingFiles[msg.id];
        if (!inf) return;
        const blob = new Blob(inf.chunks, { type: inf.meta.mime });
        delete this.incomingFiles[msg.id];
        this.opts.onMessage && this.opts.onMessage({ type: 'file', meta: inf.meta, blob });
        return;
      }
      if (msg.type === 'chat') {
        this.opts.onMessage && this.opts.onMessage({ type: 'chat', text: msg.text, ts: msg.ts });
        return;
      }
      if (msg.type === 'message') {
        this.opts.onMessage && this.opts.onMessage(msg);
        return;
      }
    } else {
      const dv = new DataView(data, 0, 40);
      const idBytes = new Uint8Array(data, 0, 36);
      const id = new TextDecoder().decode(idBytes).replace(/\0/g, '');
      const chunkIdx = dv.getUint32(36, true);
      const payload = data.slice(40);
      const inf = this.incomingFiles[id];
      if (inf) {
        inf.chunks[chunkIdx] = payload;
        inf.received += payload.byteLength;
        this.opts.onFileProgress && this.opts.onFileProgress({
          id, name: inf.meta.name,
          received: inf.received, total: inf.meta.size,
          direction: 'recv'
        });
      }
    }
  }

  sendText(text) {
    if (!this.dc || this.dc.readyState !== 'open') return false;
    this.dc.send(JSON.stringify({ type: 'chat', text, ts: Date.now() }));
    return true;
  }

  sendMessageEnvelope(envelope) {
    if (!this.dc || this.dc.readyState !== 'open') return;
    this.dc.send(JSON.stringify(envelope));
  }

  queueFile(file, fileId, meta) {
    this.sendQueue.push({ file, fileId, meta });
    if (!this.isSending && this.dc && this.dc.readyState === 'open') {
      this._drainQueue();
    }
  }

  _drainQueue() {
    if (this.isSending || this.sendQueue.length === 0) return;
    this.isSending = true;
    this._sendNextFile();
  }

  async _sendNextFile() {
    if (this.sendQueue.length === 0) { this.isSending = false; return; }
    const { file, fileId, meta } = this.sendQueue.shift();
    this.dc.send(JSON.stringify({ type: 'file-meta', id: fileId, ...meta }));
    const buf = await file.arrayBuffer();
    const total = buf.byteLength;
    let offset = 0, chunkIdx = 0;
    const sendChunk = () => {
      if (offset >= total) {
        this.dc.send(JSON.stringify({ type: 'file-done', id: fileId }));
        this.opts.onFileProgress && this.opts.onFileProgress({
          id: fileId, name: file.name, received: total, total, direction: 'send'
        });
        this._sendNextFile();
        return;
      }
      if (this.dc.bufferedAmount > 4 * 1024 * 1024) {
        setTimeout(sendChunk, 50);
        return;
      }
      const slice = buf.slice(offset, offset + CHUNK_SIZE);
      const header = new ArrayBuffer(40);
      const dv = new DataView(header);
      const idBytes = new TextEncoder().encode(fileId.padEnd(36, '\0'));
      new Uint8Array(header).set(idBytes.slice(0, 36), 0);
      dv.setUint32(36, chunkIdx, true);
      const pkt = new Uint8Array(40 + slice.byteLength);
      pkt.set(new Uint8Array(header), 0);
      pkt.set(new Uint8Array(slice), 40);
      this.dc.send(pkt.buffer);
      this.opts.onFileProgress && this.opts.onFileProgress({
        id: fileId, name: file.name,
        received: Math.min(offset + CHUNK_SIZE, total), total, direction: 'send'
      });
      offset += CHUNK_SIZE;
      chunkIdx++;
      requestAnimationFrame ? requestAnimationFrame(sendChunk) : setTimeout(sendChunk, 0);
    };
    sendChunk();
  }

  close() {
    if (this.dc) { try { this.dc.close(); } catch(e){} }
    if (this.pc) { try { this.pc.close(); } catch(e){} }
    this.dc = null; this.pc = null;
    this.isConnected = false;
  }
}

// ─── Generate UUID v4 ────────────────────────────────────────────
function generateId() {
  if (crypto && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

// ─── Audio Player Builder ─────────────────────────────────────────
function buildAudioPlayer(blob, meta, isSent) {
  const url = URL.createObjectURL(blob);
  const div = document.createElement('div');
  div.className = 'audio-player';

  const thumbHtml = meta.thumbnail
    ? `<div class="audio-thumb"><img src="${meta.thumbnail}" alt="thumb"></div>`
    : `<div class="audio-thumb-default">
         <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" color="#fff">
           <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="21" cy="16" r="3"/>
         </svg>
       </div>`;

  div.innerHTML = `
    <div class="audio-top">
      ${thumbHtml}
      <div class="audio-info">
        <div class="audio-title">${meta.name || 'Audio'}</div>
        <div class="audio-artist">${meta.artist || ''}</div>
      </div>
    </div>
    <div class="audio-controls">
      <button class="audio-play-btn" aria-label="Play/Pause" type="button">
        <svg class="play-icon" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
          <path d="M11.596 8.697l-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.697l6.363 3.692a.802.802 0 0 1 0 1.394z"/>
        </svg>
        <svg class="pause-icon hidden" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
          <path d="M5.5 3.5A1.5 1.5 0 0 1 7 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5zm5 0A1.5 1.5 0 0 1 12 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5z"/>
        </svg>
      </button>
      <div class="audio-seek-area">
        <input type="range" class="audio-seek" min="0" max="100" value="0" step="0.1">
        <div class="audio-time-row">
          <span class="audio-current">0:00</span>
          <span class="audio-duration">-:--</span>
        </div>
      </div>
    </div>
  `;

  const audio = document.createElement('audio');
  audio.src = url;
  audio.preload = 'metadata';

  const playBtn = div.querySelector('.audio-play-btn');
  const playIcon = div.querySelector('.play-icon');
  const pauseIcon = div.querySelector('.pause-icon');
  const seekEl = div.querySelector('.audio-seek');
  const curEl = div.querySelector('.audio-current');
  const durEl = div.querySelector('.audio-duration');

  audio.addEventListener('loadedmetadata', () => {
    durEl.textContent = formatDuration(audio.duration);
  });
  audio.addEventListener('timeupdate', () => {
    if (audio.duration) {
      seekEl.value = (audio.currentTime / audio.duration) * 100;
    }
    curEl.textContent = formatDuration(audio.currentTime);
  });
  audio.addEventListener('play', () => {
    playIcon.classList.add('hidden');
    pauseIcon.classList.remove('hidden');
  });
  audio.addEventListener('pause', () => {
    playIcon.classList.remove('hidden');
    pauseIcon.classList.add('hidden');
  });
  audio.addEventListener('ended', () => {
    audio.currentTime = 0;
    seekEl.value = 0;
    curEl.textContent = '0:00';
    playIcon.classList.remove('hidden');
    pauseIcon.classList.add('hidden');
  });

  playBtn.addEventListener('click', () => {
    document.querySelectorAll('.webrtc-audio-el').forEach(a => {
      if (a !== audio && !a.paused) a.pause();
    });
    if (audio.paused) audio.play().catch(() => {});
    else audio.pause();
  });

  seekEl.addEventListener('input', () => {
    if (audio.duration) audio.currentTime = (seekEl.value / 100) * audio.duration;
  });

  audio.className = 'webrtc-audio-el';
  div.appendChild(audio);
  return div;
}

// ─── Image Collage Builder ────────────────────────────────────────
function buildImageCollage(blobs, metas, isSent) {
  const wrap = document.createElement('div');
  const n = blobs.length;
  wrap.className = 'img-collage ' + (n <= 4 ? `count-${n}` : 'count-many');

  blobs.forEach((blob, i) => {
    const url = URL.createObjectURL(blob);
    const cell = document.createElement('div');
    cell.className = 'collage-img';
    const img = document.createElement('img');
    img.src = url;
    img.alt = metas[i] ? metas[i].name : 'Image';
    img.loading = 'lazy';
    cell.appendChild(img);
    if (n > 4 && i === 3) {
      const ov = document.createElement('div');
      ov.className = 'img-overlay';
      ov.textContent = '+' + (n - 3);
      cell.appendChild(ov);
    }
    if (n > 4 && i >= 4) { cell.style.display = 'none'; }
    cell.addEventListener('click', () => openLightbox(url));
    wrap.appendChild(cell);
  });
  return wrap;
}

// ─── Lightbox ────────────────────────────────────────────────────
function openLightbox(src) {
  let ov = document.getElementById('lightbox-overlay');
  if (!ov) {
    ov = document.createElement('div');
    ov.className = 'modal-overlay';
    ov.id = 'lightbox-overlay';
    const img = document.createElement('img');
    const close = document.createElement('button');
    close.className = 'modal-close';
    close.innerHTML = '&times;';
    close.onclick = () => { ov.classList.remove('active'); };
    ov.onclick = (e) => { if (e.target === ov || e.target === close) ov.classList.remove('active'); };
    ov.appendChild(img);
    ov.appendChild(close);
    document.body.appendChild(ov);
  }
  ov.style.display = 'flex';
  // Force reflow before adding active class for transition
  ov.offsetHeight;
  ov.querySelector('img').src = src;
  ov.classList.add('active');
}

// ─── Chat message renderer ────────────────────────────────────────
function renderChatMessage(chatEl, payload) {
  const { isSent, text, images, audios, ts } = payload;
  const group = document.createElement('div');
  group.className = 'msg-group ' + (isSent ? 'sent' : 'recv');

  const wrapper = document.createElement('div');
  wrapper.className = 'msg-wrapper';

  if (!isSent) {
    const av = document.createElement('div');
    av.className = 'msg-avatar';
    av.textContent = 'P';
    wrapper.appendChild(av);
  }

  const inner = document.createElement('div');
  inner.style.display = 'flex';
  inner.style.flexDirection = 'column';
  inner.style.gap = '4px';
  inner.style.alignItems = isSent ? 'flex-end' : 'flex-start';

  if (images && images.length > 0) {
    const collage = buildImageCollage(images.map(i => i.blob), images.map(i => i.meta), isSent);
    inner.appendChild(collage);
  }

  if (audios && audios.length > 0) {
    audios.forEach(a => {
      const player = buildAudioPlayer(a.blob, a.meta, isSent);
      inner.appendChild(player);
    });
  }

  if (text && text.trim()) {
    const bubble = document.createElement('div');
    bubble.className = 'msg-bubble';
    bubble.textContent = text;
    inner.appendChild(bubble);
  }

  const meta = document.createElement('div');
  meta.className = 'msg-meta';
  meta.innerHTML = formatTime(ts || Date.now()) + (isSent ? `
    <span class="msg-ticks">
      <svg class="msg-tick delivered" viewBox="0 0 16 16" fill="currentColor" width="11" height="11">
        <path d="M12.354 4.354a.5.5 0 0 0-.708-.708L5 11.293 1.854 8.146a.5.5 0 1 0-.708.708l3.5 3.5a.5.5 0 0 0 .708 0l7-7z"/>
      </svg>
    </span>` : '');
  inner.appendChild(meta);

  wrapper.appendChild(inner);
  group.appendChild(wrapper);
  chatEl.appendChild(group);
  chatEl.scrollTop = chatEl.scrollHeight;
  return group;
}

// ─── Date separator ──────────────────────────────────────────────
function maybeInsertDateSeparator(chatEl, date) {
  const d = date instanceof Date ? date : new Date(date);
  const key = d.toDateString();
  const last = chatEl.getAttribute('data-last-date');
  if (last === key) return;
  chatEl.setAttribute('data-last-date', key);
  const sep = document.createElement('div');
  sep.className = 'date-separator';
  const opts = { month: 'long', day: 'numeric' };
  if (d.getFullYear() !== new Date().getFullYear()) opts.year = 'numeric';
  sep.innerHTML = `<span>${d.toLocaleDateString([], opts)}</span>`;
  chatEl.appendChild(sep);
}

// ─── Attachment preview builder ───────────────────────────────────
function buildAttachPreview(file, onRemove) {
  if (file.type.startsWith('image/')) {
    const div = document.createElement('div');
    div.className = 'attach-thumb';
    const img = document.createElement('img');
    img.src = URL.createObjectURL(file);
    div.appendChild(img);
    const rm = document.createElement('button');
    rm.className = 'attach-remove';
    rm.type = 'button';
    rm.innerHTML = '&times;';
    rm.onclick = onRemove;
    div.appendChild(rm);
    return div;
  } else if (file.type.startsWith('audio/')) {
    const div = document.createElement('div');
    div.className = 'attach-thumb-audio';
    div.innerHTML = `<svg width="18" height="18" fill="none" stroke="#fff" stroke-width="2" viewBox="0 0 24 24">
      <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="21" cy="16" r="3"/>
    </svg><span>${file.name}</span>`;
    const rm = document.createElement('button');
    rm.className = 'attach-remove';
    rm.type = 'button';
    rm.innerHTML = '&times;';
    rm.onclick = onRemove;
    div.appendChild(rm);
    return div;
  }
  return null;
}

// ─── Connection state UI ──────────────────────────────────────────
function setConnectionUI(state) {
  const dot = document.getElementById('conn-status-dot');
  const label = document.getElementById('conn-status-label');
  if (!dot || !label) return;
  dot.className = 'status-dot';
  if (state === 'connected') {
    dot.classList.add('online');
    label.textContent = 'Connected';
  } else if (state === 'connecting' || state === 'checking') {
    dot.classList.add('connecting');
    label.textContent = 'Connecting…';
  } else if (state === 'disconnected' || state === 'closed') {
    dot.classList.add('offline');
    label.textContent = 'Disconnected';
  } else if (state === 'failed') {
    dot.classList.add('offline');
    label.textContent = 'Failed';
    showToast('Connection failed. Try again.', 'error');
  }
}
