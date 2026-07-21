(() => {
  'use strict';

  const canvas = document.getElementById('arena');
  const ctx = canvas.getContext('2d');
  const startButton = document.getElementById('startButton');
  const resetButton = document.getElementById('resetButton');
  const overlay = document.getElementById('startOverlay');
  const resultsPanel = document.getElementById('resultsPanel');
  const statusText = document.getElementById('statusText');
  const scoreValue = document.getElementById('scoreValue');
  const accuracyValue = document.getElementById('accuracyValue');
  const smoothValue = document.getElementById('smoothValue');
  const timeValue = document.getElementById('timeValue');
  const resultSummary = document.getElementById('resultSummary');
  const coachTip = document.getElementById('coachTip');
  const rankBadge = document.getElementById('rankBadge');
  const dpiInput = document.getElementById('dpiInput');
  const sensInput = document.getElementById('sensInput');
  const modeSelect = document.getElementById('modeSelect');
  const difficultyInput = document.getElementById('difficultyInput');
  const difficultyLabel = document.getElementById('difficultyLabel');
  const durationSelect = document.getElementById('durationSelect');
  const sizeSelect = document.getElementById('sizeSelect');
  const edpiValue = document.getElementById('edpiValue');
  const heroEdpi = document.getElementById('heroEdpi');
  const drillTitle = document.getElementById('drillTitle');

  const modeNames = {
    smooth: 'Smooth Tracking',
    strafe: 'Valorant Strafes',
    micro: 'Micro-Corrections',
    chaos: 'Unpredictable Movement'
  };

  const state = {
    running: false,
    duration: 60,
    remaining: 60,
    lastFrame: 0,
    crosshair: { x: 640, y: 360 },
    target: { x: 850, y: 360, vx: 170, vy: 75, radius: 42 },
    onTargetTime: 0,
    totalTime: 0,
    score: 0,
    aimDistanceTotal: 0,
    aimSamples: 0,
    movementJitter: 0,
    previousMovement: { x: 0, y: 0 },
    previousOnTarget: false,
    lostTargetCount: 0,
    directionTimer: 0,
    phase: 0,
    animationId: null
  };

  const colors = {
    background: '#071019',
    grid: '#29404e',
    target: '#ff4655',
    targetSecondary: '#792e39',
    crosshair: '#ece8e1',
    glow: 'rgba(255, 70, 85, .28)'
  };

  function numericValue(input, fallback) {
    const value = Number(input.value);
    return Number.isFinite(value) ? value : fallback;
  }

  function updateSettings() {
    const dpi = Math.max(100, numericValue(dpiInput, 800));
    const sensitivity = Math.max(0.01, numericValue(sensInput, 0.35));
    const edpi = Math.round(dpi * sensitivity);
    edpiValue.textContent = edpi;
    heroEdpi.textContent = edpi;
    difficultyLabel.textContent = difficultyInput.value;
    drillTitle.textContent = modeNames[modeSelect.value];
  }

  function sensitivityGain() {
    const dpi = Math.max(100, numericValue(dpiInput, 800));
    const sensitivity = Math.max(0.01, numericValue(sensInput, 0.35));
    return Math.max(0.18, Math.min(3.2, (dpi * sensitivity) / 280));
  }

  function difficulty() {
    return numericValue(difficultyInput, 5);
  }

  function targetSizeMultiplier() {
    return { large: 1.35, normal: 1, small: 0.78, head: 0.58 }[sizeSelect.value] || 1;
  }

  function configureTarget() {
    const level = difficulty();
    const mode = modeSelect.value;
    const baseRadius = mode === 'micro' ? Math.max(20, 38 - level) : Math.max(26, 52 - level * 1.6);
    state.target.radius = Math.max(14, baseRadius * targetSizeMultiplier());

    const speed = 105 + level * 28;
    state.target.vx = speed * (Math.random() > 0.5 ? 1 : -1);
    state.target.vy = mode === 'strafe' ? 0 : speed * 0.45 * (Math.random() > 0.5 ? 1 : -1);
    state.directionTimer = 0.45 + Math.random() * 0.8;
  }

  function resetState() {
    state.running = false;
    state.duration = numericValue(durationSelect, 60);
    state.remaining = state.duration;
    state.lastFrame = 0;
    state.crosshair.x = canvas.width / 2;
    state.crosshair.y = canvas.height / 2;
    state.target.x = canvas.width * 0.68;
    state.target.y = canvas.height / 2;
    state.onTargetTime = 0;
    state.totalTime = 0;
    state.score = 0;
    state.aimDistanceTotal = 0;
    state.aimSamples = 0;
    state.movementJitter = 0;
    state.previousMovement.x = 0;
    state.previousMovement.y = 0;
    state.previousOnTarget = false;
    state.lostTargetCount = 0;
    state.phase = 0;
    configureTarget();

    scoreValue.textContent = '0';
    accuracyValue.textContent = '0%';
    smoothValue.textContent = '—';
    timeValue.textContent = state.duration.toFixed(1);
    resultsPanel.classList.add('hidden');
    overlay.classList.remove('hidden');
    startButton.textContent = 'START ROUND';
    statusText.textContent = 'Press Start, then move your mouse inside the arena.';

    if (state.animationId) {
      cancelAnimationFrame(state.animationId);
      state.animationId = null;
    }
    draw();
  }

  function startRound() {
    resetState();
    state.running = true;
    overlay.classList.add('hidden');
    resultsPanel.classList.add('hidden');
    startButton.textContent = 'RESTART ROUND';
    statusText.textContent = 'Tracking active — keep the crosshair inside the target.';
    state.lastFrame = performance.now();

    if (canvas.requestPointerLock) {
      canvas.requestPointerLock();
    }
    state.animationId = requestAnimationFrame(loop);
  }

  function rankFor(accuracy, smoothness) {
    const combined = accuracy * 70 + smoothness * 0.3;
    if (combined >= 80) return 'RADIANT CONTROL';
    if (combined >= 70) return 'IMMORTAL CONTROL';
    if (combined >= 60) return 'ASCENDANT CONTROL';
    if (combined >= 50) return 'DIAMOND CONTROL';
    if (combined >= 40) return 'PLATINUM CONTROL';
    if (combined >= 30) return 'GOLD CONTROL';
    return 'FOUNDATION';
  }

  function finishRound() {
    state.running = false;
    state.animationId = null;

    if (document.pointerLockElement === canvas && document.exitPointerLock) {
      document.exitPointerLock();
    }

    const accuracyRatio = state.totalTime > 0 ? state.onTargetTime / state.totalTime : 0;
    const accuracy = Math.round(accuracyRatio * 100);
    const averageDistance = state.aimSamples ? state.aimDistanceTotal / state.aimSamples : 0;
    const smoothness = Math.round(Math.max(0, Math.min(100, 100 - state.movementJitter * 0.9 - averageDistance * 0.055)));
    const finalScore = Math.round(accuracyRatio * 7000 + smoothness * 25 - state.lostTargetCount * 8);
    state.score = Math.max(0, finalScore);

    scoreValue.textContent = state.score.toLocaleString();
    accuracyValue.textContent = `${accuracy}%`;
    smoothValue.textContent = `${smoothness}%`;
    timeValue.textContent = '0.0';
    rankBadge.textContent = rankFor(accuracy, smoothness);
    resultSummary.textContent = `You stayed on target for ${accuracy}% of the round with ${smoothness}% movement smoothness and ${state.lostTargetCount} major target losses.`;

    if (accuracy < 35) {
      coachTip.textContent = 'Lower difficulty by two levels. Focus on reaching the target without flicking past it, then match its speed.';
    } else if (smoothness < 55) {
      coachTip.textContent = 'Relax your grip and reduce repeated left-right corrections. Let your arm lead larger motion and use your wrist only for final adjustments.';
    } else if (state.lostTargetCount > 18) {
      coachTip.textContent = 'Use Valorant Strafes next. Watch the target body and react to direction changes instead of predicting too early.';
    } else if (accuracy > 72) {
      coachTip.textContent = 'Strong control. Increase difficulty by one level or choose a smaller target for your next round.';
    } else {
      coachTip.textContent = 'Repeat this drill until you exceed 65% on-target time in three consecutive rounds, then increase difficulty.';
    }

    resultsPanel.classList.remove('hidden');
    statusText.textContent = 'Round complete. Review your coach report below.';
    startButton.textContent = 'START ANOTHER ROUND';
    resultsPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    draw();
  }

  function updateTarget(dt) {
    const target = state.target;
    const level = difficulty();
    const mode = modeSelect.value;
    state.phase += dt;
    state.directionTimer -= dt;

    if (mode === 'smooth') {
      const speed = 100 + level * 23;
      target.x += target.vx * dt;
      target.y += Math.sin(state.phase * (1.4 + level * 0.06)) * speed * 0.48 * dt;
    } else if (mode === 'strafe') {
      target.x += target.vx * dt;
      target.y = canvas.height * 0.5 + Math.sin(state.phase * 0.8) * canvas.height * 0.18;
      if (state.directionTimer <= 0) {
        target.vx *= -1;
        if (Math.random() > 0.72) target.vx *= 1.16;
        state.directionTimer = Math.max(0.28, 1.15 - level * 0.07) + Math.random() * 0.55;
      }
    } else if (mode === 'micro') {
      target.x += target.vx * dt;
      target.y += target.vy * dt;
      if (state.directionTimer <= 0) {
        const speed = 85 + level * 20;
        const angle = Math.random() * Math.PI * 2;
        target.vx = Math.cos(angle) * speed;
        target.vy = Math.sin(angle) * speed;
        state.directionTimer = 0.35 + Math.random() * 0.7;
      }
    } else {
      target.x += target.vx * dt;
      target.y += target.vy * dt;
      if (state.directionTimer <= 0) {
        const speed = 120 + level * 29;
        const angle = Math.random() * Math.PI * 2;
        target.vx = Math.cos(angle) * speed;
        target.vy = Math.sin(angle) * speed;
        state.directionTimer = Math.max(0.22, 0.9 - level * 0.055) + Math.random() * 0.45;
      }
    }

    const margin = target.radius + 12;
    if (target.x < margin) { target.x = margin; target.vx = Math.abs(target.vx); }
    if (target.x > canvas.width - margin) { target.x = canvas.width - margin; target.vx = -Math.abs(target.vx); }
    if (target.y < margin) { target.y = margin; target.vy = Math.abs(target.vy || 95); }
    if (target.y > canvas.height - margin) { target.y = canvas.height - margin; target.vy = -Math.abs(target.vy || 95); }
  }

  function measureAim(dt) {
    const dx = state.crosshair.x - state.target.x;
    const dy = state.crosshair.y - state.target.y;
    const distance = Math.hypot(dx, dy);
    const onTarget = distance <= state.target.radius;

    state.totalTime += dt;
    state.aimDistanceTotal += distance;
    state.aimSamples += 1;
    if (onTarget) state.onTargetTime += dt;
    if (state.previousOnTarget && !onTarget && distance > state.target.radius * 1.7) state.lostTargetCount += 1;
    state.previousOnTarget = onTarget;

    const accuracy = state.totalTime ? state.onTargetTime / state.totalTime : 0;
    const smoothness = Math.max(0, Math.min(100, 100 - state.movementJitter * 0.9));
    state.score = Math.round(state.onTargetTime * 100 + accuracy * 1200 + smoothness * 4);
    scoreValue.textContent = state.score.toLocaleString();
    accuracyValue.textContent = `${Math.round(accuracy * 100)}%`;
    smoothValue.textContent = `${Math.round(smoothness)}%`;
  }

  function loop(now) {
    if (!state.running) return;

    const dt = Math.min(0.033, Math.max(0, (now - state.lastFrame) / 1000));
    state.lastFrame = now;
    state.remaining -= dt;
    updateTarget(dt);
    measureAim(dt);
    timeValue.textContent = Math.max(0, state.remaining).toFixed(1);
    draw();

    if (state.remaining <= 0) {
      finishRound();
      return;
    }
    state.animationId = requestAnimationFrame(loop);
  }

  function drawGrid() {
    ctx.save();
    ctx.strokeStyle = colors.grid;
    ctx.globalAlpha = 0.34;
    ctx.lineWidth = 1;

    for (let x = 0; x <= canvas.width; x += 80) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y <= canvas.height; y += 80) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    ctx.globalAlpha = 0.12;
    ctx.strokeStyle = colors.target;
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.moveTo(0, canvas.height / 2);
    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();
    ctx.restore();
  }

  function drawTarget() {
    const target = state.target;
    const dx = state.crosshair.x - target.x;
    const dy = state.crosshair.y - target.y;
    const onTarget = Math.hypot(dx, dy) <= target.radius;

    ctx.save();
    ctx.beginPath();
    ctx.arc(target.x, target.y, target.radius + 12, 0, Math.PI * 2);
    ctx.strokeStyle = colors.glow;
    ctx.lineWidth = 12;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(target.x, target.y, target.radius, 0, Math.PI * 2);
    ctx.fillStyle = onTarget ? colors.target : colors.targetSecondary;
    ctx.fill();
    ctx.strokeStyle = colors.target;
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.globalAlpha = 0.75;
    ctx.beginPath();
    ctx.arc(target.x, target.y, target.radius * 0.58, 0, Math.PI * 2);
    ctx.strokeStyle = colors.crosshair;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.arc(target.x, target.y, Math.max(4, target.radius * 0.14), 0, Math.PI * 2);
    ctx.fillStyle = colors.crosshair;
    ctx.fill();
    ctx.restore();
  }

  function drawCrosshair() {
    const crosshair = state.crosshair;
    const gap = 8;
    const length = 18;

    ctx.save();
    ctx.strokeStyle = colors.crosshair;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(crosshair.x - gap - length, crosshair.y);
    ctx.lineTo(crosshair.x - gap, crosshair.y);
    ctx.moveTo(crosshair.x + gap, crosshair.y);
    ctx.lineTo(crosshair.x + gap + length, crosshair.y);
    ctx.moveTo(crosshair.x, crosshair.y - gap - length);
    ctx.lineTo(crosshair.x, crosshair.y - gap);
    ctx.moveTo(crosshair.x, crosshair.y + gap);
    ctx.lineTo(crosshair.x, crosshair.y + gap + length);
    ctx.stroke();
    ctx.fillStyle = colors.crosshair;
    ctx.fillRect(crosshair.x - 1.5, crosshair.y - 1.5, 3, 3);
    ctx.restore();
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = colors.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawGrid();
    drawTarget();
    drawCrosshair();
  }

  function applyMovement(dx, dy) {
    if (!state.running) return;

    const scale = 1.1 * sensitivityGain();
    state.crosshair.x = Math.max(0, Math.min(canvas.width, state.crosshair.x + dx * scale));
    state.crosshair.y = Math.max(0, Math.min(canvas.height, state.crosshair.y + dy * scale));

    const movementDelta = Math.hypot(dx - state.previousMovement.x, dy - state.previousMovement.y);
    state.movementJitter = state.movementJitter * 0.94 + movementDelta * 0.06;
    state.previousMovement.x = dx;
    state.previousMovement.y = dy;
  }

  document.addEventListener('mousemove', (event) => {
    if (document.pointerLockElement === canvas) {
      applyMovement(event.movementX, event.movementY);
    }
  });

  canvas.addEventListener('mousemove', (event) => {
    if (!state.running || document.pointerLockElement === canvas) return;
    const rect = canvas.getBoundingClientRect();
    state.crosshair.x = (event.clientX - rect.left) * canvas.width / rect.width;
    state.crosshair.y = (event.clientY - rect.top) * canvas.height / rect.height;
  });

  canvas.addEventListener('click', () => {
    if (state.running && document.pointerLockElement !== canvas && canvas.requestPointerLock) {
      canvas.requestPointerLock();
    }
  });

  document.addEventListener('pointerlockchange', () => {
    canvas.classList.toggle('cursor-locked', document.pointerLockElement === canvas);
  });

  startButton.addEventListener('click', startRound);
  resetButton.addEventListener('click', resetState);
  dpiInput.addEventListener('input', updateSettings);
  sensInput.addEventListener('input', updateSettings);
  difficultyInput.addEventListener('input', () => { updateSettings(); configureTarget(); });
  modeSelect.addEventListener('change', () => { updateSettings(); configureTarget(); });
  durationSelect.addEventListener('change', resetState);
  sizeSelect.addEventListener('change', configureTarget);

  updateSettings();
  resetState();
})();
