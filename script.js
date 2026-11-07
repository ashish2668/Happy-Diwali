(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  let reducedMotion = motionPreference.matches;
  const deviceThreads = Number(navigator.hardwareConcurrency) || 8;
  const deviceMemory = Number(navigator.deviceMemory) || 8;
  const lowPowerDevice = deviceThreads <= 4 || deviceMemory <= 4;
  if (motionPreference.addEventListener) motionPreference.addEventListener('change', event => { reducedMotion = event.matches; });
  else if (motionPreference.addListener) motionPreference.addListener(event => { reducedMotion = event.matches; });
  const toast = $('#toast');
  let toastTimer;
  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
  }
  function readStorage(key, fallback) {
    try { return localStorage.getItem(key) ?? fallback; }
    catch (error) { return fallback; }
  }
  function writeStorage(key, value) {
    try { localStorage.setItem(key, value); }
    catch (error) { showToast('Browser storage is unavailable; this progress may not be saved.'); }
  }

  const shareUrl = () => window.location.href.split('#')[0];
  const shareText = (message) => `${message} ${shareUrl()}`;
  async function copyText(text, success = 'Copied!') {
    try {
      if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(text);
      else {
        const area = document.createElement('textarea');
        area.value = text;
        area.style.position = 'fixed';
        area.style.opacity = '0';
        document.body.append(area);
        area.select();
        const copied = document.execCommand('copy');
        area.remove();
        if (!copied) throw new Error('Clipboard access is unavailable.');
      }
      showToast(success);
    } catch (error) {
      showToast('Could not copy automatically. Please select and copy the text.');
    }
  }
  function whatsapp(message) {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText(message))}`, '_blank', 'noopener,noreferrer');
  }
  async function nativeShare(message, files) {
    if (navigator.share && (!files || !navigator.canShare || navigator.canShare({ files }))) {
      try { await navigator.share({ title: 'Diwali Blast', text: message, url: shareUrl(), ...(files ? { files } : {}) }); return true; }
      catch (error) { if (error.name === 'AbortError') return true; }
    }
    return false;
  }
  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url; anchor.download = filename; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1200);
  }
  function roundedRect(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r); ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r); ctx.closePath();
  }
  function fitText(ctx, text, maxWidth, initialSize, fontFamily) {
    let size = initialSize;
    do { ctx.font = `${size}px ${fontFamily}`; size -= 1; } while (ctx.measureText(text).width > maxWidth && size > 12);
    return ctx.font;
  }
  function addCanvasFireworks(ctx, width, height, seed = 0) {
    let value = seed + 12345;
    const random = () => { value = (value * 9301 + 49297) % 233280; return value / 233280; };
    for (let burst = 0; burst < 8; burst++) {
      const x = width * (.12 + random() * .76), y = height * (.08 + random() * .42);
      const color = ['#ffd27a', '#ff9b62', '#d999ff', '#fff0b0'][burst % 4];
      for (let i = 0; i < 17; i++) {
        const angle = Math.PI * 2 * i / 17, radius = 8 + random() * 25;
        ctx.beginPath(); ctx.arc(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius, 1 + random() * 1.7, 0, Math.PI * 2);
        ctx.fillStyle = color; ctx.globalAlpha = .45 + random() * .5; ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  // Lightweight canvas fireworks; the loop pauses when the tab is hidden.
  const sky = $('#sky'), skyCtx = sky.getContext('2d');
  let skyWidth = 0, skyHeight = 0, fireworks = [], lastFirework = 0, lastSkyFrame = 0, skyFrame = null;
  const skyFrameInterval = lowPowerDevice ? 1000 / 30 : 1000 / 45;
  const skyParticleLimit = lowPowerDevice ? 110 : 190;
  function resizeSky() {
    const dpr = Math.min(window.devicePixelRatio || 1, lowPowerDevice ? 1.25 : 1.6);
    skyWidth = window.innerWidth; skyHeight = window.innerHeight;
    sky.width = Math.floor(skyWidth * dpr); sky.height = Math.floor(skyHeight * dpr);
    skyCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function burst(x, y, amount = 38) {
    const color = ['#ffd27a', '#ff9b62', '#d999ff', '#fff0b0'][Math.floor(Math.random() * 4)];
    for (let i = 0; i < amount; i++) {
      const angle = Math.random() * Math.PI * 2, speed = 1 + Math.random() * 3.2;
      fireworks.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 45 + Math.random() * 35, max: 80, color, size: 1 + Math.random() * 2 });
    }
  }
  function drawSky(now) {
    skyFrame = null;
    if (now - lastSkyFrame < skyFrameInterval) {
      skyFrame = requestAnimationFrame(drawSky);
      return;
    }
    lastSkyFrame = now;
    skyCtx.clearRect(0, 0, skyWidth, skyHeight);
    if (!reducedMotion && now - lastFirework > (lowPowerDevice ? 3200 : 2200) && fireworks.length < skyParticleLimit) {
      burst(skyWidth * (.14 + Math.random() * .72), skyHeight * (.08 + Math.random() * .4), lowPowerDevice ? 14 : 25);
      lastFirework = now;
    }
    fireworks = fireworks.filter(p => p.life > 0);
    for (const p of fireworks) {
      p.x += p.vx; p.y += p.vy; p.vy += .025; p.vx *= .994; p.life--;
      skyCtx.globalAlpha = Math.min(1, p.life / 18) * .75;
      skyCtx.fillStyle = p.color; skyCtx.beginPath(); skyCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2); skyCtx.fill();
    }
    skyCtx.globalAlpha = 1;
    if (!document.hidden) skyFrame = requestAnimationFrame(drawSky);
  }
  resizeSky(); skyFrame = requestAnimationFrame(drawSky);
  window.addEventListener('resize', resizeSky);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && skyFrame !== null) { cancelAnimationFrame(skyFrame); skyFrame = null; }
    else if (!document.hidden && skyFrame === null) skyFrame = requestAnimationFrame(drawSky);
  });

  // Sound effects use locally bundled recordings; nothing plays before interaction.
  const soundClips = {
    boom: { file: 'fireworks-crackle.ogg', seconds: 2.2, start: 43.3, jitter: .4, rate: .94, volume: 1, gain: 6 },
    rocket: { file: 'fireworks-nearby.ogg', seconds: 2.8, start: 1.8, jitter: .7, rate: .9, volume: .9, gain: 2 },
    sparkle: { file: 'fireworks-crackle.ogg', seconds: 2.2, start: 43, jitter: 1, rate: 1.08, volume: .8, gain: 2 },
    celebration: { file: 'celebration.ogg', seconds: 3.2, start: 9, jitter: 1.5, rate: 1, volume: .85, gain: 1.1 },
    magic: { file: 'fireworks-distant.ogg', seconds: 2.5, start: 7, jitter: 1, rate: 1, volume: .85, gain: 2 },
    count: { file: 'fireworks-crackle.ogg', seconds: .45, start: 43.5, jitter: .5, rate: 1.2, volume: .7, gain: 2 },
    ignite: { file: 'fireworks-nearby.ogg', seconds: 1.5, start: 42, jitter: 1, rate: 1.15, volume: .8, gain: 2 }
  };
  const audioPlayers = new Map();
  let effectsOn = false, musicOn = false, volume = .65, ambience = null, ambiencePlayer = null, ambienceLoad = null, audioContext = null, compressor = null;
  function getAudio(name, file) {
    if (!audioPlayers.has(name)) {
      const audio = new Audio(`assets/sounds/${file}`);
      audio.preload = 'none';
      audioPlayers.set(name, { audio, loading: null, stopTimer: null, source: null, gain: null });
    }
    return audioPlayers.get(name);
  }
  function normalizePlayer(player, gainValue) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    try {
      if (!audioContext) {
        audioContext = new AudioContextClass();
        compressor = audioContext.createDynamicsCompressor();
        compressor.threshold.value = -18;
        compressor.knee.value = 20;
        compressor.ratio.value = 8;
        compressor.attack.value = .004;
        compressor.release.value = .16;
        compressor.connect(audioContext.destination);
      }
      if (!player.source) {
        player.source = audioContext.createMediaElementSource(player.audio);
        player.gain = audioContext.createGain();
        player.source.connect(player.gain);
        player.gain.connect(compressor);
      }
      player.gain.gain.value = gainValue;
      if (audioContext.state === 'suspended') audioContext.resume().catch(() => showToast('Your browser could not start audio processing.'));
    } catch (error) {
      showToast('Audio normalization is unavailable; trying the original recording volume.');
    }
  }
  function waitForAudioMetadata(player) {
    if (Number.isFinite(player.audio.duration)) return Promise.resolve();
    if (player.loading) return player.loading;
    player.loading = new Promise((resolve, reject) => {
      const audio = player.audio;
      const clean = () => {
        audio.removeEventListener('loadedmetadata', loaded);
        audio.removeEventListener('error', failed);
      };
      const loaded = () => { clean(); resolve(); };
      const failed = () => { clean(); reject(new Error('Audio file could not be loaded.')); };
      audio.addEventListener('loadedmetadata', loaded, { once: true });
      audio.addEventListener('error', failed, { once: true });
      audio.load();
    }).finally(() => { player.loading = null; });
    return player.loading;
  }
  async function sound(kind) {
    if (!effectsOn) return;
    const clip = soundClips[kind];
    if (!clip) return;
    const player = getAudio(kind, clip.file);
    try {
      normalizePlayer(player, clip.gain);
      await waitForAudioMetadata(player);
      if (!effectsOn) return;
      const audio = player.audio;
      audio.pause();
      clearTimeout(player.stopTimer);
      audio.currentTime = Math.min(Math.max(0, audio.duration - clip.seconds), clip.start + Math.random() * clip.jitter);
      audio.playbackRate = clip.rate;
      audio.volume = Math.min(1, volume * clip.volume);
      await audio.play();
      player.stopTimer = setTimeout(() => audio.pause(), clip.seconds / clip.rate * 1000);
    } catch (error) {
      showToast('Could not play the firework recording. Check that the sound files are available.');
    }
  }
  function stopAmbience() {
    musicOn = false;
    if (ambience) { ambience.pause(); ambience.currentTime = 0; }
  }
  async function setMusic(enabled) {
    musicOn = enabled;
    if (!enabled) { stopAmbience(); return; }
    if (!ambience) {
      ambience = new Audio('assets/sounds/fireworks-ambience.ogg');
      ambience.preload = 'none';
      ambience.loop = true;
      ambience.volume = volume * .3;
      ambiencePlayer = { audio: ambience, source: null, gain: null };
      normalizePlayer(ambiencePlayer, 2);
    }
    if (ambienceLoad) return ambienceLoad;
    ambienceLoad = ambience.play().then(() => {
      if (!musicOn) ambience.pause();
    }).catch(error => {
      musicOn = false; $('#musicToggle').checked = false;
      showToast('Could not play the fireworks ambience. Check that the sound file is available.');
    }).finally(() => { ambienceLoad = null; });
    return ambienceLoad;
  }
  function setAudioVolume() {
    for (const [name, player] of audioPlayers) player.audio.volume = Math.min(1, volume * soundClips[name].volume);
    if (ambience) ambience.volume = volume * .3;
  }
  $('#soundToggle').addEventListener('click', () => {
    effectsOn = !effectsOn;
    if (!effectsOn) {
      for (const player of audioPlayers.values()) { player.audio.pause(); clearTimeout(player.stopTimer); }
    }
    $('#soundLabel').textContent = effectsOn ? 'Sound on' : 'Sound off';
    $('#soundToggle').setAttribute('aria-label', effectsOn ? 'Turn sound effects off' : 'Turn sound effects on');
    if (effectsOn) showToast('Sound effects are on.');
  });
  $('#musicToggle').addEventListener('change', event => {
    if (event.target.checked) setMusic(true);
    else stopAmbience();
  });
  $('#volumeRange').addEventListener('input', event => { volume = Number(event.target.value); setAudioVolume(); });
  $$('[data-sound]').forEach(button => button.addEventListener('click', () => {
    if (!effectsOn) {
      effectsOn = true; $('#soundLabel').textContent = 'Sound on';
      $('#soundToggle').setAttribute('aria-label', 'Turn sound effects off');
    }
    sound(button.dataset.sound);
    burst(window.innerWidth * (.3 + Math.random() * .4), window.innerHeight * .25, 20);
  }));

  // Photo decoding, cropping and blast-card export all remain on-device.
  const photoInput = $('#photoInput'), photoPreview = $('#photoPreview');
  const characterPhoto = $('#characterPhoto'), finalPhoto = $('#finalPhoto');
  let sourceImage = null, photoUrl = null;
  function drawCroppedPhoto(ctx, image, x, y, size) {
    const zoom = Number($('#zoomRange').value), offsetX = Number($('#moveXRange').value) / 100, offsetY = Number($('#moveYRange').value) / 100;
    const base = Math.max(size / image.naturalWidth, size / image.naturalHeight);
    const width = image.naturalWidth * base * zoom, height = image.naturalHeight * base * zoom;
    const maxX = Math.max(0, (width - size) / 2), maxY = Math.max(0, (height - size) / 2);
    const sx = (width - size) / 2 + offsetX * maxX, sy = (height - size) / 2 + offsetY * maxY;
    ctx.save(); ctx.beginPath(); ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2); ctx.clip();
    ctx.drawImage(image, -sx + x, -sy + y, width, height); ctx.restore();
  }
  function drawPortraitCrop(ctx, image, width, height) {
    const zoom = Number($('#zoomRange').value), offsetX = Number($('#moveXRange').value) / 100, offsetY = Number($('#moveYRange').value) / 100;
    const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight) * zoom;
    const drawWidth = image.naturalWidth * scale, drawHeight = image.naturalHeight * scale;
    const maxX = Math.max(0, (drawWidth - width) / 2), maxY = Math.max(0, (drawHeight - height) / 2);
    const sx = (drawWidth - width) / 2 + offsetX * maxX, sy = (drawHeight - height) / 2 + offsetY * maxY;
    ctx.drawImage(image, -sx, -sy, drawWidth, drawHeight);
  }
  function updateCharacterCrop() {
    if (!sourceImage) return;
    const canvas = document.createElement('canvas'); canvas.width = 180; canvas.height = 280;
    drawPortraitCrop(canvas.getContext('2d'), sourceImage, canvas.width, canvas.height);
    characterPhoto.src = canvas.toDataURL('image/png'); characterPhoto.hidden = false; $('#characterEmoji').hidden = true;
    $('#character').classList.add('has-photo');
  }
  photoInput.addEventListener('change', () => {
    const file = photoInput.files && photoInput.files[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { showToast('Choose a JPG, PNG or WebP image.'); photoInput.value = ''; return; }
    if (file.size > 12 * 1024 * 1024) { showToast('Please choose a photo smaller than 12 MB.'); photoInput.value = ''; return; }
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    photoUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      sourceImage = image; photoPreview.src = photoUrl; photoPreview.hidden = false;
      $('#uploadZone').classList.add('has-photo');
      $('#uploadTitle').textContent = 'PHOTO READY — TAP TO CHANGE';
      $('#uploadHint').textContent = 'Adjust the crop below';
      $('#cropControls').hidden = false; updateCharacterCrop();
      finalPhoto.src = photoUrl; finalPhoto.hidden = false; $('#finalEmoji').hidden = true;
      showToast('Your photo is ready — and stays on this device.');
    };
    image.onerror = () => { showToast('That photo could not be opened. Try another image.'); URL.revokeObjectURL(photoUrl); photoUrl = null; };
    image.src = photoUrl;
  });
  ['zoomRange', 'moveXRange', 'moveYRange'].forEach(id => $(`#${id}`).addEventListener('input', updateCharacterCrop));
  $('#removePhoto').addEventListener('click', () => {
    sourceImage = null; photoInput.value = ''; photoPreview.removeAttribute('src'); photoPreview.hidden = true;
    characterPhoto.removeAttribute('src'); characterPhoto.hidden = true; $('#characterEmoji').hidden = false;
    $('#character').classList.remove('has-photo'); $('#uploadZone').classList.remove('has-photo');
    finalPhoto.removeAttribute('src'); finalPhoto.hidden = true; $('#finalEmoji').hidden = false;
    $('#cropControls').hidden = true; $('#uploadTitle').textContent = 'DROP IN YOUR PHOTO'; $('#uploadHint').textContent = 'Tap to choose JPG, PNG or WebP';
    if (photoUrl) URL.revokeObjectURL(photoUrl); photoUrl = null; showToast('Photo removed from this experience.');
  });
  $('#celebrateBtn').addEventListener('click', () => { document.querySelector('#blast').scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' }); });

  let blastRunning = false, blastDone = false;
  function wait(ms) { return new Promise(resolve => setTimeout(resolve, reducedMotion ? Math.min(ms, 180) : ms)); }
  async function runBlast() {
    if (blastRunning) return;
    blastRunning = true; blastDone = false;
    $('#finalBlast').hidden = true; $('#startBlast').disabled = true; $('#replayBlast').hidden = true;
    $('#blastMessage').classList.remove('show'); $('#character').classList.remove('reacting');
    $('#character').classList.add('walking'); $('#character').style.left = '53%';
    $('#stageCaption').textContent = 'WALKING INTO YOUR MAIN CHARACTER MOMENT…';
    sound('rocket');
    await wait(1100);
    $('#character').classList.remove('walking'); $('#anar').classList.add('spark');
    $('#stageCaption').textContent = 'THAT ANAR LOOKS A LITTLE TOO SPARKLY…';
    sound('ignite');
    for (let count = 3; count > 0; count--) {
      const countdown = $('#countdown'); countdown.textContent = String(count); countdown.classList.remove('pop'); void countdown.offsetWidth; countdown.classList.add('pop');
      sound('count'); await wait(780);
    }
    $('#character').classList.add('reacting'); $('#character').style.left = '70%';
    $('#stageCaption').textContent = 'AND… MAKE A LITTLE ROOM!';
    await wait(500);
    const stage = $('#blastStage'); stage.classList.add('blast-shake', 'blast-flash');
    $('#blastMessage').textContent = 'BOOOOOOM!!!'; $('#blastMessage').classList.add('show');
    const rect = stage.getBoundingClientRect();
    for (let i = 0; i < 4; i++) burst(rect.left + rect.width * (.3 + Math.random() * .4), rect.top + rect.height * (.25 + Math.random() * .38), 45);
    sound('boom'); await wait(1600);
    stage.classList.remove('blast-shake', 'blast-flash'); $('#blastMessage').classList.remove('show');
    $('#character').classList.remove('reacting'); $('#character').style.left = '70%';
    $('#stageCaption').textContent = 'HAPPY DIWALI — THE VIRTUAL KIND OF BOOM!';
    $('#finalBlast').hidden = false; $('#replayBlast').hidden = false; $('#startBlast').disabled = false;
    blastRunning = false; blastDone = true;
    $('#finalBlast').scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'center' });
  }
  $('#startBlast').addEventListener('click', runBlast);
  $('#replayBlast').addEventListener('click', runBlast);
  $('#anotherBlast').addEventListener('click', () => { $('#finalBlast').hidden = true; $('#character').style.left = '23%'; $('#stageCaption').textContent = 'YOUR MAIN CHARACTER ENERGY STARTS HERE'; $('#blast').scrollIntoView({ behavior: 'smooth' }); });

  function makeBlastCard() {
    const canvas = document.createElement('canvas'); canvas.width = 1000; canvas.height = 650;
    const ctx = canvas.getContext('2d');
    const bg = ctx.createLinearGradient(0, 0, 1000, 650); bg.addColorStop(0, '#100c1b'); bg.addColorStop(.55, '#351735'); bg.addColorStop(1, '#10101d');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, 1000, 650);
    const glow = ctx.createRadialGradient(500, 380, 20, 500, 380, 370); glow.addColorStop(0, 'rgba(255,151,64,.28)'); glow.addColorStop(1, 'rgba(255,151,64,0)');
    ctx.fillStyle = glow; ctx.fillRect(0, 0, 1000, 650); addCanvasFireworks(ctx, 1000, 650, Date.now());
    ctx.strokeStyle = 'rgba(255,210,122,.48)'; ctx.lineWidth = 2; roundedRect(ctx, 22, 22, 956, 606, 18); ctx.stroke();
    if (sourceImage) {
      ctx.save(); ctx.beginPath(); ctx.arc(500, 232, 95, 0, Math.PI * 2); ctx.clip(); drawCroppedPhoto(ctx, sourceImage, 405, 137, 190); ctx.restore();
      ctx.strokeStyle = '#ffd27a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(500, 232, 97, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.textAlign = 'center'; ctx.fillStyle = '#ffd27a'; ctx.font = '500 15px sans-serif'; ctx.fillText('YOUR FACE. YOUR BLAST. YOUR DIWALI.', 500, sourceImage ? 365 : 230);
    ctx.fillStyle = '#fff3da'; ctx.font = '700 58px Georgia, serif'; ctx.fillText('BOOOOOOM!', 500, sourceImage ? 440 : 330);
    ctx.fillStyle = '#ffd27a'; ctx.font = '600 37px Georgia, serif'; ctx.fillText('HAPPY DIWALI', 500, sourceImage ? 495 : 382);
    ctx.fillStyle = '#eee0cf'; ctx.font = '20px Georgia, serif'; ctx.fillText('May your life shine brighter than a million fireworks!', 500, sourceImage ? 540 : 428);
    ctx.fillStyle = 'rgba(255,255,255,.65)'; ctx.font = '13px sans-serif'; ctx.fillText('diwali-blast • A virtual celebration', 500, 590);
    return canvas;
  }
  $('#downloadBlast').addEventListener('click', () => makeBlastCard().toBlob(blob => { if (blob) downloadBlob(blob, 'my-diwali-blast.png'); else showToast('Could not create the image.'); }, 'image/png'));
  $('#shareBlast').addEventListener('click', async () => {
    const message = 'I just created my own Diwali Blast! 💥🔥 Now it’s your turn! Create yours here:';
    const canvas = makeBlastCard();
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    if (blob) {
      const file = new File([blob], 'my-diwali-blast.png', { type: 'image/png' });
      if (await nativeShare(message, [file])) return;
    }
    whatsapp(message);
  });

  // Game 1: basket position follows mouse, touch and pointer events.
  const catchArena = $('#catchArena'), basket = $('#basket');
  let catchState = null;
  function moveBasket(event) {
    if (!catchState) return;
    const rect = catchArena.getBoundingClientRect();
    const x = Math.max(20, Math.min(rect.width - 20, event.clientX - rect.left));
    basket.style.left = `${x}px`;
  }
  catchArena.addEventListener('pointermove', moveBasket);
  catchArena.addEventListener('pointerdown', event => { catchArena.setPointerCapture(event.pointerId); moveBasket(event); });
  function finishCatch() {
    if (!catchState) return;
    clearInterval(catchState.timer); clearInterval(catchState.spawn); clearInterval(catchState.frame); catchState.items.forEach(item => item.element.remove());
    const score = catchState.score; catchState = null; $('#catchOverlay').hidden = false; $('#catchOverlay').textContent = `Time! You caught ${score} ${score === 1 ? 'diya' : 'diyas'}!`;
    const button = $('.game-start[data-game="catch"]'); button.textContent = 'Play again';
    $('.game-share[data-game="catch"]').hidden = false; sound('celebration');
  }
  function startCatch() {
    if (catchState) finishCatch();
    $('#catchOverlay').hidden = true; $('#catchOverlay').textContent = 'Ready?';
    let time = 30, score = 0;
    $('#catchTime').textContent = time; $('#catchScore').textContent = score;
    catchState = { score, items: [], timer: null, spawn: null };
    function tick() {
      if (!catchState) return;
      const rect = catchArena.getBoundingClientRect(), basketRect = basket.getBoundingClientRect();
      catchState.items = catchState.items.filter(item => {
        item.y += 3.1; item.element.style.top = `${item.y}px`;
        const bx = basketRect.left - rect.left, basketY = rect.height - 43;
        if (item.y > basketY - 5 && item.y < basketY + 24 && item.x > bx - 4 && item.x < bx + basketRect.width + 4) {
          score++; catchState.score = score; $('#catchScore').textContent = score; item.element.remove(); sound('sparkle'); return false;
        }
        if (item.y > rect.height) { item.element.remove(); return false; }
        return true;
      });
    }
    catchState.spawn = setInterval(() => {
      if (!catchState) return;
      const item = document.createElement('span'); item.className = 'falling-diya'; item.textContent = '🪔';
      const x = 10 + Math.random() * (catchArena.clientWidth - 35); item.style.left = `${x}px`; item.style.top = '-25px';
      catchArena.append(item); catchState.items.push({ element: item, x, y: -25 });
    }, 750);
    catchState.timer = setInterval(() => { if (!catchState) return; time--; $('#catchTime').textContent = time; if (time <= 0) finishCatch(); }, 1000);
    catchState.frame = setInterval(tick, 35);
  }
  $('.game-start[data-game="catch"]').addEventListener('click', startCatch);

  // Game 2: one visible target at a time; the session high score is stored locally.
  let tapState = null;
  const bestKey = 'diwaliBlast.tapBest';
  let tapBest = Number(readStorage(bestKey, '0')) || 0;
  $('#tapBest').textContent = tapBest;
  function endTap() {
    if (!tapState) return;
    clearInterval(tapState.timer); clearTimeout(tapState.targetTimer);
    const score = tapState.score; tapState = null;
    $('#tapOverlay').hidden = false; $('#tapOverlay').textContent = `Time! ${score} ${score === 1 ? 'hit' : 'hits'}!`;
    $('.game-start[data-game="tap"]').textContent = 'Play again'; $('.game-share[data-game="tap"]').hidden = false; sound('celebration');
  }
  function showTapTarget() {
    if (!tapState) return;
    $$('.tap-target', $('#tapArena')).forEach(target => target.remove());
    const target = document.createElement('button'); target.type = 'button'; target.className = 'tap-target'; target.setAttribute('aria-label', 'Tap firework target');
    const area = $('#tapArena'); target.style.left = `${7 + Math.random() * Math.max(1, area.clientWidth - 50)}px`;
    target.style.top = `${38 + Math.random() * Math.max(1, area.clientHeight - 88)}px`;
    target.addEventListener('click', () => {
      if (!tapState) return;
      tapState.score++; $('#tapScore').textContent = tapState.score;
      const pop = document.createElement('span'); pop.className = 'tap-pop'; pop.textContent = '✦ +1'; pop.style.left = target.style.left; pop.style.top = target.style.top; area.append(pop); setTimeout(() => pop.remove(), 600);
      target.remove(); sound('sparkle'); showTapTarget();
    });
    area.append(target); tapState.targetTimer = setTimeout(() => { if (target.isConnected) showTapTarget(); }, 1100);
  }
  function startTap() {
    if (tapState) endTap();
    $('#tapOverlay').hidden = true; $('#tapOverlay').textContent = 'Ready?'; $('#tapScore').textContent = '0';
    let time = 10; tapState = { score: 0, timer: null, targetTimer: null }; $('#tapTime').textContent = time;
    showTapTarget();
    tapState.timer = setInterval(() => {
      if (!tapState) return;
      time--; $('#tapTime').textContent = time;
      if (time <= 0) {
        if (tapState.score > tapBest) { tapBest = tapState.score; writeStorage(bestKey, String(tapBest)); $('#tapBest').textContent = tapBest; }
        endTap();
      }
    }, 1000);
  }
  $('.game-start[data-game="tap"]').addEventListener('click', startTap);

  function gameChallenge(kind) {
    const scores = { catch: Number($('#catchScore').textContent), tap: Number($('#tapScore').textContent) };
    if (kind === 'light') return 'I lit all 9 diyas in Diwali Blast! ✨ Come spread some light:';
    return `I scored ${scores[kind]} points in Diwali Blast! 🎆 Can you beat my score? Play here:`;
  }
  $$('.game-share').forEach(button => button.addEventListener('click', () => whatsapp(gameChallenge(button.dataset.game))));
  const litGames = new Set();
  function renderMiniDiyas() {
    const container = $('#miniDiyas'); container.replaceChildren(); litGames.clear();
    for (let i = 0; i < 9; i++) {
      const diya = document.createElement('button'); diya.type = 'button'; diya.className = 'mini-diya'; diya.textContent = '🪔'; diya.setAttribute('aria-label', `Light diya ${i + 1}`);
      diya.addEventListener('click', () => {
        if (litGames.has(i)) return;
        litGames.add(i); diya.classList.add('lit'); diya.setAttribute('aria-pressed', 'true'); $('#lightCount').textContent = litGames.size; sound('sparkle');
        if (litGames.size === 9) { $('#lightMessage').textContent = 'You brought the whole night to life! ✨'; $('#lightShare').hidden = false; sound('celebration'); }
      });
      container.append(diya);
    }
    $('#lightCount').textContent = '0'; $('#lightMessage').textContent = ''; $('#lightShare').hidden = true;
  }
  $('#resetLight').addEventListener('click', renderMiniDiyas);
  $('#lightShare').addEventListener('click', () => whatsapp(gameChallenge('light')));
  renderMiniDiyas();

  // Greeting card preview and export are generated without sending form data anywhere.
  function updateGreeting() {
    const name = $('#senderName').value.trim(), friend = $('#friendName').value.trim(), wish = $('#wishInput').value.trim();
    $('#previewFrom').textContent = `WITH LOVE, ${name || 'A FRIEND'}`.toUpperCase();
    $('#previewTo').textContent = friend ? `DEAR ${friend}`.toUpperCase() : 'DEAR FRIEND';
    $('#previewWish').textContent = wish || 'May your home shine with happiness and prosperity!';
  }
  $('#greetingForm').addEventListener('input', updateGreeting);
  $('#greetingForm').addEventListener('submit', event => { event.preventDefault(); updateGreeting(); showToast('Your Diwali wish card is ready!'); $('#greetingPreview').scrollIntoView({ behavior: 'smooth', block: 'center' }); });
  function makeGreetingCard() {
    const canvas = document.createElement('canvas'); canvas.width = 1000; canvas.height = 850; const ctx = canvas.getContext('2d');
    const bg = ctx.createLinearGradient(0, 0, 850, 1000); bg.addColorStop(0, '#171020'); bg.addColorStop(.5, '#3a1c3e'); bg.addColorStop(1, '#100e1a'); ctx.fillStyle = bg; ctx.fillRect(0, 0, 1000, 850);
    const glow = ctx.createRadialGradient(500, 430, 10, 500, 430, 440); glow.addColorStop(0, 'rgba(255,164,68,.2)'); glow.addColorStop(1, 'rgba(255,164,68,0)'); ctx.fillStyle = glow; ctx.fillRect(0, 0, 1000, 850);
    addCanvasFireworks(ctx, 1000, 850, 37); ctx.strokeStyle = 'rgba(255,210,122,.56)'; ctx.lineWidth = 3; roundedRect(ctx, 25, 25, 950, 800, 22); ctx.stroke();
    ctx.textAlign = 'center'; ctx.fillStyle = '#e4bd76'; ctx.font = '500 20px sans-serif'; ctx.fillText('A LITTLE LIGHT FOR YOU', 500, 105);
    if (sourceImage) { drawCroppedPhoto(ctx, sourceImage, 430, 137, 140); ctx.strokeStyle = '#ffd27a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(500, 207, 72, 0, Math.PI * 2); ctx.stroke(); }
    const friend = $('#friendName').value.trim(), from = $('#senderName').value.trim() || 'A friend';
    ctx.fillStyle = '#e8bd73'; ctx.font = '500 15px sans-serif'; ctx.fillText(friend ? `DEAR ${friend.toUpperCase()}` : 'DEAR FRIEND', 500, sourceImage ? 325 : 235);
    ctx.fillStyle = '#fff5e0'; ctx.font = '600 74px Georgia, serif'; ctx.fillText('Happy', 500, sourceImage ? 408 : 325);
    ctx.fillStyle = '#ffd27a'; ctx.font = 'italic 700 88px Georgia, serif'; ctx.fillText('Diwali', 500, sourceImage ? 495 : 412);
    const wish = $('#wishInput').value.trim() || 'May your home shine with happiness and prosperity!';
    ctx.fillStyle = '#f2e6d5'; ctx.font = '27px Georgia, serif';
    const words = wish.split(/\s+/); let line = '', lines = [];
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (ctx.measureText(candidate).width > 650 && line) { lines.push(line); line = word; } else line = candidate;
    }
    if (line) lines.push(line);
    const startY = sourceImage ? 555 : 472;
    lines.slice(0, 3).forEach((text, index) => ctx.fillText(text, 500, startY + index * 36));
    ctx.fillStyle = '#d8bd94'; ctx.font = '500 16px sans-serif'; ctx.fillText(`WITH LOVE, ${from.toUpperCase()}`, 500, startY + Math.min(lines.length, 3) * 36 + 45);
    ctx.font = '13px sans-serif'; ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillText('DIWALI BLAST • MADE WITH A LITTLE PIXEL MAGIC', 500, 785);
    return canvas;
  }
  $('#downloadGreeting').addEventListener('click', () => makeGreetingCard().toBlob(blob => { if (blob) downloadBlob(blob, 'my-diwali-greeting.png'); else showToast('Could not create the image.'); }, 'image/png'));
  $('#shareGreeting').addEventListener('click', async () => {
    const canvas = makeGreetingCard(), blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    if (blob) {
      const file = new File([blob], 'my-diwali-greeting.png', { type: 'image/png' });
      if (await nativeShare('Happy Diwali! I made this special greeting for you. ✨', [file])) return;
      downloadBlob(blob, 'my-diwali-greeting.png');
      showToast('Card downloaded. You can now attach it to your message.');
    }
    whatsapp('Happy Diwali! I made this special greeting for you. Now create one too!');
  });

  const wishes = [
    'May your home shine with happiness and prosperity!',
    'Let this Diwali bring endless smiles and beautiful memories!',
    'May your life sparkle brighter than the stars!',
    'Wishing you a festival full of light, laughter and ladoos!',
    'May every diya bring a little more joy into your world.',
    'Here’s to new beginnings and brighter days ahead!'
  ];
  function nextWish() {
    let next = wishes[Math.floor(Math.random() * wishes.length)];
    if (wishes.length > 1 && next === $('#randomWish').textContent) next = wishes[(wishes.indexOf(next) + 1) % wishes.length];
    $('#randomWish').textContent = next;
  }
  $('#newWish').addEventListener('click', nextWish);
  $('#copyWish').addEventListener('click', () => copyText($('#randomWish').textContent, 'Wish copied!'));
  $('#shareWish').addEventListener('click', () => whatsapp(`${$('#randomWish').textContent} ✨`));

  // Diya wall progress is intentionally local to this browser.
  const wallWishes = ['May joy find its way to you.', 'Keep shining, exactly as you are.', 'Good things are growing.', 'You bring light to someone’s world.', 'A little kindness goes a long way.', 'May your heart feel at home.', 'New beginnings look good on you.', 'More laughter, less worry.', 'May peace find you tonight.', 'Your light matters.', 'Make room for wonder.', 'Sending warmth your way.', 'May love fill your home.', 'One bright moment at a time.', 'You are someone’s happy place.', 'Let good things glow.', 'May your days feel golden.', 'Here’s to hope and fresh starts.', 'Choose joy when you can.', 'You deserve a little magic.', 'May your dreams find light.', 'Keep the good energy close.', 'Share a smile today.', 'The brightest days are ahead.'];
  const wallKey = 'diwaliBlast.litDiyas';
  let wallLit = new Set();
  try { const saved = JSON.parse(readStorage(wallKey, '[]')); if (Array.isArray(saved)) wallLit = new Set(saved.filter(i => Number.isInteger(i) && i >= 0 && i < wallWishes.length)); } catch (error) { wallLit = new Set(); }
  function renderWall() {
    const grid = $('#diyaWallGrid'); grid.replaceChildren();
    wallWishes.forEach((wish, index) => {
      const button = document.createElement('button'); button.type = 'button'; button.className = `wall-diya${wallLit.has(index) ? ' lit' : ''}`; button.textContent = '🪔';
      button.setAttribute('aria-label', wallLit.has(index) ? `Diya ${index + 1} lit` : `Light diya ${index + 1}`);
      button.setAttribute('aria-pressed', wallLit.has(index) ? 'true' : 'false');
      button.addEventListener('click', () => {
        if (wallLit.has(index)) { $('#wallStatus').textContent = wish; return; }
        wallLit.add(index); button.classList.add('lit'); button.setAttribute('aria-pressed', 'true'); button.setAttribute('aria-label', `Diya ${index + 1} lit`);
        writeStorage(wallKey, JSON.stringify([...wallLit])); $('#wallStatus').textContent = wish; sound('sparkle');
        if (wallLit.size === wallWishes.length) { $('#wallStatus').textContent = 'The whole wall is glowing — you made this festival brighter! ✨'; burst(window.innerWidth / 2, window.innerHeight / 2, 65); sound('celebration'); }
      });
      grid.append(button);
    });
    if (wallLit.size === wallWishes.length) $('#wallStatus').textContent = 'The whole wall is glowing — you made this festival brighter! ✨';
  }
  renderWall();

  const surpriseMessages = ['OYE HOYE! KYA BLAST HAI!', 'DIWALI MODE ACTIVATED!', 'BOOM! KHUSHIYAN HI KHUSHIYAN!', 'AREY BHAI! FULL POWER BLAST!'];
  $('#surpriseBtn').addEventListener('click', () => {
    const message = surpriseMessages[Math.floor(Math.random() * surpriseMessages.length)];
    const spot = { x: window.innerWidth * (.2 + Math.random() * .6), y: window.innerHeight * (.18 + Math.random() * .45) };
    burst(spot.x, spot.y, 70); sound(['boom', 'celebration', 'magic'][Math.floor(Math.random() * 3)]);
    if (typeof $('#surpriseBtn').animate === 'function') {
      $('#surpriseBtn').animate([{ transform: 'scale(1)' }, { transform: 'scale(1.15) rotate(10deg)' }, { transform: 'scale(1)' }], { duration: reducedMotion ? 1 : 500 });
    }
    showToast(message);
  });
  $('#closingBlast').addEventListener('click', () => { $('#anotherBlast').click(); window.scrollTo({ top: $('#blast').offsetTop - 60, behavior: 'smooth' }); });
  $('#inviteFriends').addEventListener('click', async () => {
    const message = 'Your Diwali Blast is waiting! Upload your photo and watch the BOOM! 🎆';
    if (!await nativeShare(message)) whatsapp(message);
  });
  $('#copyLink').addEventListener('click', () => copyText(shareUrl(), 'Website link copied!'));

  // Native sharing of a card is best-effort; WhatsApp remains the reliable link fallback.
  $('#shareGreeting').setAttribute('aria-label', 'Share or download your greeting card');
})();
