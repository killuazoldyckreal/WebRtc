'use strict';

function showToast(msg, type = '', duration = 3000) {
  let c = document.getElementById('toast-container');
  if (!c) { c = document.createElement('div'); c.id = 'toast-container'; document.body.appendChild(c); }
  const t = document.createElement('div');
  t.className = 'toast' + (type ? ' ' + type : '');
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity 0.3s'; setTimeout(() => t.remove(), 300); }, duration);
}

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

function formatDuration(secs) {
  const s = Math.floor(secs || 0);
  const m = Math.floor(s / 60);
  return m + ':' + String(s % 60).padStart(2, '0');
}

function formatTime(date) {
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

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
  ov.offsetHeight;
  ov.querySelector('img').src = src;
  ov.classList.add('active');
}

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
  audio.className = 'webrtc-audio-el';

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
    if (audio.duration) seekEl.value = (audio.currentTime / audio.duration) * 100;
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

  div.appendChild(audio);
  return div;
}

function buildImageCollage(blobs, metas) {
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
    if (n > 4 && i >= 4) cell.style.display = 'none';
    cell.addEventListener('click', () => openLightbox(url));
    wrap.appendChild(cell);
  });
  return wrap;
}

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
  inner.style.cssText = 'display:flex;flex-direction:column;gap:4px;align-items:' + (isSent ? 'flex-end' : 'flex-start');

  if (images && images.length > 0) {
    inner.appendChild(buildImageCollage(images.map(i => i.blob), images.map(i => i.meta)));
  }
  if (audios && audios.length > 0) {
    audios.forEach(a => inner.appendChild(buildAudioPlayer(a.blob, a.meta, isSent)));
  }
  if (text && text.trim()) {
    const bubble = document.createElement('div');
    bubble.className = 'msg-bubble';
    bubble.textContent = text;
    inner.appendChild(bubble);
  }

  const meta = document.createElement('div');
  meta.className = 'msg-meta';
  meta.innerHTML = formatTime(ts || Date.now()) + (isSent
    ? `<span class="msg-ticks">
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
  }
  if (file.type.startsWith('audio/')) {
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
