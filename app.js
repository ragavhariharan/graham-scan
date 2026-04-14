/* =====================================================
   App Controller — UI Logic & State Management
   ===================================================== */

(function () {
  'use strict';

  // ============ State ============
  let points = [];
  let nextPointId = 0;
  let steps = [];
  let currentStepIndex = -1;
  let isRunning = false;
  let isPlaying = false;
  let playInterval = null;
  let mode = 'add'; // 'add' or 'drag'
  let dragPoint = null;
  let dragOffset = { x: 0, y: 0 };

  // ============ DOM Elements ============
  const canvas = document.getElementById('main-canvas');
  const canvasContainer = document.getElementById('canvas-container');
  const canvasOverlay = document.getElementById('canvas-overlay');

  // Toolbar
  const btnAddMode = document.getElementById('btn-add-mode');
  const btnDragMode = document.getElementById('btn-drag-mode');
  const btnRandom = document.getElementById('btn-random');
  const btnClear = document.getElementById('btn-clear');
  const inputPointCount = document.getElementById('input-point-count');

  // Playback
  const btnStart = document.getElementById('btn-start');
  const btnReset = document.getElementById('btn-reset');
  const btnPrev = document.getElementById('btn-prev');
  const btnNext = document.getElementById('btn-next');
  const btnPlayPause = document.getElementById('btn-play-pause');
  const speedSlider = document.getElementById('speed-slider');
  const speedLabel = document.getElementById('speed-label');

  // Progress
  const stepProgressBar = document.getElementById('step-progress-bar');
  const stepCounter = document.getElementById('step-counter');

  // Side panel
  const panelTabs = document.querySelectorAll('.panel-tab');
  const tabContents = document.querySelectorAll('.tab-content');
  const stepTitle = document.getElementById('step-title');
  const stepDescription = document.getElementById('step-description');
  const stepStatus = document.getElementById('step-status');
  const stepDetails = document.getElementById('step-details');
  const orientationDisplay = document.getElementById('orientation-display');
  const orientationArrow = document.getElementById('orientation-arrow');
  const orientationLabel = document.getElementById('orientation-label');
  const crossProductValue = document.getElementById('cross-product-value');
  const stackDisplay = document.getElementById('stack-display');
  const stackItems = document.getElementById('stack-items');

  // Theme
  const btnThemeToggle = document.getElementById('btn-theme-toggle');

  // ============ Renderer ============
  const renderer = new CanvasRenderer(canvas);

  // ============ Init ============
  function init() {
    // Load theme preference
    const savedTheme = localStorage.getItem('gs-theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);

    setupEventListeners();
    updateUI();
    renderer.clear();

    // Update speed label
    updateSpeedLabel();
  }

  // ============ Event Listeners ============
  function setupEventListeners() {
    // Canvas interactions
    canvasContainer.addEventListener('mousedown', handleCanvasMouseDown);
    canvasContainer.addEventListener('mousemove', handleCanvasMouseMove);
    canvasContainer.addEventListener('mouseup', handleCanvasMouseUp);
    canvasContainer.addEventListener('mouseleave', handleCanvasMouseUp);

    // Touch support
    canvasContainer.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvasContainer.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvasContainer.addEventListener('touchend', handleTouchEnd);

    // Toolbar
    btnAddMode.addEventListener('click', () => setMode('add'));
    btnDragMode.addEventListener('click', () => setMode('drag'));
    btnRandom.addEventListener('click', generateRandomPoints);
    btnClear.addEventListener('click', clearAll);

    // Playback
    btnStart.addEventListener('click', startSimulation);
    btnReset.addEventListener('click', resetSimulation);
    btnPrev.addEventListener('click', prevStep);
    btnNext.addEventListener('click', nextStep);
    btnPlayPause.addEventListener('click', toggleAutoPlay);
    speedSlider.addEventListener('input', updateSpeedLabel);

    // Panel tabs
    panelTabs.forEach(tab => {
      tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });

    // Theme toggle
    btnThemeToggle.addEventListener('click', toggleTheme);

    // Window resize
    window.addEventListener('resize', () => {
      renderer.resize();
      renderCurrentState();
    });
  }

  // ============ Canvas Interactions ============
  function handleCanvasMouseDown(e) {
    if (isRunning) return;

    const coords = renderer.getCanvasCoords(e);

    if (mode === 'drag') {
      const found = renderer.findPointAt(points, coords.x, coords.y);
      if (found) {
        dragPoint = found;
        dragOffset = { x: coords.x - found.x, y: coords.y - found.y };
        canvasContainer.classList.add('dragging');
      }
    } else {
      addPoint(coords.x, coords.y);
    }
  }

  function handleCanvasMouseMove(e) {
    if (!dragPoint) return;

    const coords = renderer.getCanvasCoords(e);
    dragPoint.x = coords.x - dragOffset.x;
    dragPoint.y = coords.y - dragOffset.y;

    // Clamp to canvas bounds
    dragPoint.x = Math.max(20, Math.min(renderer.width - 20, dragPoint.x));
    dragPoint.y = Math.max(20, Math.min(renderer.height - 20, dragPoint.y));

    renderer.renderPoints(points);
  }

  function handleCanvasMouseUp() {
    if (dragPoint) {
      dragPoint = null;
      canvasContainer.classList.remove('dragging');
    }
  }

  // Touch handlers
  function handleTouchStart(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousedown', {
      clientX: touch.clientX,
      clientY: touch.clientY,
    });
    handleCanvasMouseDown(mouseEvent);
  }

  function handleTouchMove(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousemove', {
      clientX: touch.clientX,
      clientY: touch.clientY,
    });
    handleCanvasMouseMove(mouseEvent);
  }

  function handleTouchEnd() {
    handleCanvasMouseUp();
  }

  // ============ Point Management ============
  function addPoint(x, y) {
    // Don't add points too close to each other
    for (const p of points) {
      if (Math.sqrt((p.x - x) ** 2 + (p.y - y) ** 2) < 15) return;
    }

    points.push({ x, y, id: nextPointId++ });
    updateOverlay();
    renderer.renderPoints(points);
    updateUI();
  }

  function generateRandomPoints() {
    if (isRunning) return;

    const count = parseInt(inputPointCount.value) || 15;
    const padding = 50;
    const w = renderer.width - padding * 2;
    const h = renderer.height - padding * 2;

    points = [];
    nextPointId = 0;

    for (let i = 0; i < count; i++) {
      let x, y;
      let attempts = 0;

      // Avoid overlapping points
      do {
        x = padding + Math.random() * w;
        y = padding + Math.random() * h;
        attempts++;
      } while (attempts < 100 && points.some(p => Math.sqrt((p.x - x) ** 2 + (p.y - y) ** 2) < 20));

      points.push({ x, y, id: nextPointId++ });
    }

    updateOverlay();
    renderer.renderPoints(points);
    updateUI();
  }

  function clearAll() {
    stopAutoPlay();
    points = [];
    nextPointId = 0;
    steps = [];
    currentStepIndex = -1;
    isRunning = false;
    isPlaying = false;

    updateOverlay();
    renderer.clear();
    updateUI();
    resetSidePanel();
  }

  // ============ Simulation ============
  function startSimulation() {
    if (points.length < 3) {
      showToast('Add at least 3 points to start');
      return;
    }

    steps = GrahamScan.generateSteps(points);
    currentStepIndex = 0;
    isRunning = true;

    renderStep(currentStepIndex);
    updateUI();
  }

  function resetSimulation() {
    stopAutoPlay();
    steps = [];
    currentStepIndex = -1;
    isRunning = false;
    isPlaying = false;

    renderer.renderPoints(points);
    updateUI();
    resetSidePanel();
  }

  function nextStep() {
    if (currentStepIndex < steps.length - 1) {
      currentStepIndex++;
      renderStep(currentStepIndex);
      updateUI();
    } else {
      stopAutoPlay();
    }
  }

  function prevStep() {
    if (currentStepIndex > 0) {
      currentStepIndex--;
      renderStep(currentStepIndex);
      updateUI();
    }
  }

  function toggleAutoPlay() {
    if (isPlaying) {
      stopAutoPlay();
    } else {
      startAutoPlay();
    }
  }

  function startAutoPlay() {
    if (currentStepIndex >= steps.length - 1) return;

    isPlaying = true;
    btnPlayPause.classList.add('playing');
    updateUI();

    playInterval = setInterval(() => {
      if (currentStepIndex < steps.length - 1) {
        currentStepIndex++;
        renderStep(currentStepIndex);
        updateUI();
      } else {
        stopAutoPlay();
      }
    }, getPlaybackDelay());
  }

  function stopAutoPlay() {
    isPlaying = false;
    btnPlayPause.classList.remove('playing');
    if (playInterval) {
      clearInterval(playInterval);
      playInterval = null;
    }
    updateUI();
  }

  function getPlaybackDelay() {
    const speed = parseInt(speedSlider.value);
    // Map 1-10 to 2000ms-100ms
    return Math.round(2000 / speed);
  }

  function updateSpeedLabel() {
    const speed = parseInt(speedSlider.value);
    const speeds = ['0.2×', '0.3×', '0.5×', '0.7×', '1×', '1.5×', '2×', '3×', '4×', '5×'];
    speedLabel.textContent = speeds[speed - 1] || '1×';

    // If playing, restart with new speed
    if (isPlaying) {
      stopAutoPlay();
      startAutoPlay();
    }
  }

  // ============ Rendering ============
  function renderStep(index) {
    const step = steps[index];
    if (!step) return;

    renderer.render(step);
    updateSidePanel(step);
    updateProgress();
    highlightPseudocode(step.pseudocodeLine);
  }

  function renderCurrentState() {
    if (isRunning && currentStepIndex >= 0 && currentStepIndex < steps.length) {
      renderStep(currentStepIndex);
    } else if (points.length > 0) {
      renderer.renderPoints(points);
    } else {
      renderer.clear();
    }
  }

  // ============ UI Updates ============
  function updateUI() {
    const hasPoints = points.length >= 3;
    const atStart = currentStepIndex <= 0;
    const atEnd = currentStepIndex >= steps.length - 1;

    // Toolbar - disable during simulation
    btnAddMode.disabled = isRunning;
    btnDragMode.disabled = isRunning;
    btnRandom.disabled = isRunning;
    btnClear.disabled = false;

    // Start button
    btnStart.disabled = !hasPoints || isRunning;
    btnStart.style.display = isRunning ? 'none' : 'flex';

    // Reset button
    btnReset.disabled = !isRunning;
    btnReset.style.display = isRunning ? 'flex' : 'flex';

    // Step controls
    btnPrev.disabled = !isRunning || atStart;
    btnNext.disabled = !isRunning || atEnd;
    btnPlayPause.disabled = !isRunning || atEnd;

    // Canvas cursor
    canvasContainer.classList.toggle('running', isRunning);
    canvasContainer.classList.toggle('drag-mode', mode === 'drag' && !isRunning);
  }

  function updateOverlay() {
    if (points.length > 0) {
      canvasOverlay.classList.remove('empty-state');
    } else {
      canvasOverlay.classList.add('empty-state');
    }
  }

  function updateProgress() {
    if (steps.length === 0) {
      stepProgressBar.style.setProperty('--progress', '0%');
      stepCounter.textContent = 'Step 0 / 0';
    } else {
      const progress = ((currentStepIndex + 1) / steps.length) * 100;
      stepProgressBar.style.setProperty('--progress', `${progress}%`);
      stepCounter.textContent = `Step ${currentStepIndex + 1} / ${steps.length}`;
    }
  }

  function updateSidePanel(step) {
    // Status badge
    const badge = stepStatus.querySelector('.status-badge');
    badge.className = `status-badge ${step.badge || 'running'}`;
    badge.textContent = step.badge === 'finished' ? 'Complete'
      : step.badge === 'pop' ? 'Popping'
      : 'Running';

    // Title & description
    stepTitle.textContent = step.title;
    stepDescription.innerHTML = step.description;

    // Orientation display
    if (step.checkPoints && step.crossProductValue != null) {
      orientationDisplay.style.display = 'block';
      const cp = step.crossProductValue;
      orientationArrow.className = '';
      orientationArrow.classList.add(cp > 0 ? 'left-turn' : cp < 0 ? 'right-turn' : 'collinear');
      orientationArrow.textContent = cp > 0 ? '↺' : cp < 0 ? '↻' : '—';
      orientationLabel.textContent = step.turnLabel || '';
      orientationLabel.style.color = cp > 0 ? 'var(--accent-green)' : cp < 0 ? 'var(--accent-red)' : 'var(--accent-yellow)';
      crossProductValue.textContent = Math.round(cp * 100) / 100;
    } else {
      orientationDisplay.style.display = 'none';
    }

    // Stack display
    if (step.stack && step.stack.length > 0) {
      stackDisplay.style.display = 'block';
      stackItems.innerHTML = '';

      step.stack.forEach((p, i) => {
        const item = document.createElement('div');
        item.className = 'stack-item';
        if (step.type === 'pop_stack' && step.poppedPoint && p.id === step.poppedPoint.id) {
          item.classList.add('popping');
        }
        item.innerHTML = `
          <span class="si-index">${i}</span>
          <span class="si-coords">P${p.id} (${Math.round(p.x)}, ${Math.round(p.y)})</span>
        `;
        stackItems.appendChild(item);
      });
    } else {
      stackDisplay.style.display = 'none';
    }

    // Hide initial details card during simulation
    if (isRunning) {
      stepDetails.style.display = 'none';
    }
  }

  function resetSidePanel() {
    const badge = stepStatus.querySelector('.status-badge');
    badge.className = 'status-badge idle';
    badge.textContent = 'Ready';

    stepTitle.textContent = 'Welcome!';
    stepDescription.innerHTML = 'Add at least 3 points to the canvas, then click <strong>Start</strong> to begin the Graham Scan algorithm visualization.';

    orientationDisplay.style.display = 'none';
    stackDisplay.style.display = 'none';
    stepDetails.style.display = 'block';

    // Clear pseudocode highlights
    highlightPseudocode(null);

    updateProgress();
  }

  function highlightPseudocode(lineNums) {
    document.querySelectorAll('.pc-line').forEach(el => el.classList.remove('active'));

    if (lineNums) {
      lineNums.forEach(num => {
        const el = document.querySelector(`.pc-line[data-line="${num}"]`);
        if (el) el.classList.add('active');
      });
    }
  }

  // ============ Tabs ============
  function switchTab(tabId) {
    panelTabs.forEach(tab => tab.classList.toggle('active', tab.dataset.tab === tabId));
    tabContents.forEach(content => {
      content.classList.toggle('active', content.id === `tab-${tabId}`);
    });
  }

  // ============ Mode ============
  function setMode(newMode) {
    mode = newMode;
    btnAddMode.classList.toggle('active', mode === 'add');
    btnDragMode.classList.toggle('active', mode === 'drag');
    canvasContainer.classList.toggle('drag-mode', mode === 'drag');
  }

  // ============ Theme ============
  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('gs-theme', next);
    renderCurrentState();
  }

  // ============ Toast ============
  function showToast(message) {
    // Simple inline toast
    let toast = document.getElementById('toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'toast';
      toast.style.cssText = `
        position: fixed;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%) translateY(100px);
        padding: 0.6rem 1.2rem;
        background: var(--bg-card);
        border: 1px solid var(--border-active);
        border-radius: var(--radius-md);
        color: var(--text-primary);
        font-size: 0.85rem;
        font-weight: 500;
        z-index: 1000;
        box-shadow: var(--shadow-lg);
        transition: transform 0.3s ease;
        pointer-events: none;
      `;
      document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.style.transform = 'translateX(-50%) translateY(0)';

    setTimeout(() => {
      toast.style.transform = 'translateX(-50%) translateY(100px)';
    }, 2500);
  }

  // ============ Start ============
  init();

})();
