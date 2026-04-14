/* =====================================================
   Canvas Renderer — Drawing logic for the visualizer
   ===================================================== */

class CanvasRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.dpr = window.devicePixelRatio || 1;
    this.animFrame = null;

    // Animation state
    this.lineProgress = new Map(); // key -> progress (0-1)
    this.pointScale = new Map(); // id -> scale (0-1)
    this.glowIntensity = 0;
    this.glowDirection = 1;

    // Colors (read from CSS vars on each render)
    this._colors = {};

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  /**
   * Resize canvas to match container with device pixel ratio support.
   */
  resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = rect.width * this.dpr;
    this.canvas.height = rect.height * this.dpr;
    this.canvas.style.width = rect.width + 'px';
    this.canvas.style.height = rect.height + 'px';
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  /**
   * Read CSS custom property values.
   */
  _readColors() {
    const cs = getComputedStyle(document.documentElement);
    this._colors = {
      unprocessed: cs.getPropertyValue('--color-unprocessed').trim(),
      pivot: cs.getPropertyValue('--color-pivot').trim(),
      current: cs.getPropertyValue('--color-current').trim(),
      hull: cs.getPropertyValue('--color-hull').trim(),
      rejected: cs.getPropertyValue('--color-rejected').trim(),
      hullLine: cs.getPropertyValue('--color-hull-line').trim(),
      checkLine: cs.getPropertyValue('--color-check-line').trim(),
      sortedLine: cs.getPropertyValue('--color-sorted-line').trim(),
      bgCanvas: cs.getPropertyValue('--bg-canvas').trim(),
      textMuted: cs.getPropertyValue('--text-muted').trim(),
      accentGreen: cs.getPropertyValue('--accent-green').trim(),
      accentPurple: cs.getPropertyValue('--accent-purple').trim(),
      accentYellow: cs.getPropertyValue('--accent-yellow').trim(),
      accentRed: cs.getPropertyValue('--accent-red').trim(),
      accentCyan: cs.getPropertyValue('--accent-cyan').trim(),
    };
  }

  /**
   * Get the color for a point based on its state.
   */
  _pointColor(state) {
    switch (state) {
      case 'pivot': return this._colors.pivot;
      case 'current': return this._colors.current;
      case 'hull': return this._colors.hull;
      case 'rejected': return this._colors.rejected;
      default: return this._colors.unprocessed;
    }
  }

  /**
   * Get glow size for a point state.
   */
  _glowSize(state) {
    switch (state) {
      case 'pivot': return 16;
      case 'current': return 14;
      case 'hull': return 10;
      case 'rejected': return 8;
      default: return 0;
    }
  }

  /**
   * Render the full canvas state.
   */
  render(state) {
    if (this.animFrame) cancelAnimationFrame(this.animFrame);

    this._readColors();
    const ctx = this.ctx;

    // Clear
    ctx.clearRect(0, 0, this.width, this.height);

    // Draw grid
    this._drawGrid(ctx);

    if (!state || !state.points || state.points.length === 0) return;

    // Update glow
    this.glowIntensity += 0.03 * this.glowDirection;
    if (this.glowIntensity > 1) { this.glowIntensity = 1; this.glowDirection = -1; }
    if (this.glowIntensity < 0.3) { this.glowIntensity = 0.3; this.glowDirection = 1; }

    // Draw lines
    if (state.lines) {
      for (const line of state.lines) {
        this._drawLine(ctx, line);
      }
    }

    // Draw hull fill (only for complete state)
    if (state.type === 'complete' && state.hull && state.hull.length >= 3) {
      this._drawHullFill(ctx, state.hull);
    }

    // Draw angle arc for sorted step
    if (state.type === 'sort_points' && state.pivotId != null) {
      const pivot = state.points.find(p => p.id === state.pivotId);
      if (pivot) {
        this._drawSortArcs(ctx, pivot, state.points.filter(p => p.id !== pivot.id));
      }
    }

    // Draw orientation arc
    if (state.checkPoints) {
      this._drawOrientationArc(ctx, state.checkPoints, state.crossProductValue);
    }

    // Draw points
    for (const point of state.points) {
      this._drawPoint(ctx, point);
    }

    // Draw sort order labels
    if (state.type === 'sort_points') {
      for (const point of state.points) {
        if (point.sortOrder != null && point.sortOrder > 0) {
          this._drawSortLabel(ctx, point);
        }
      }
    }
  }

  /**
   * Draw a subtle grid pattern.
   */
  _drawGrid(ctx) {
    const step = 40;
    ctx.strokeStyle = this._colors.textMuted || '#333';
    ctx.globalAlpha = 0.05;
    ctx.lineWidth = 1;

    for (let x = step; x < this.width; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.height);
      ctx.stroke();
    }
    for (let y = step; y < this.height; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.width, y);
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
  }

  /**
   * Draw a line between two points.
   */
  _drawLine(ctx, line) {
    ctx.beginPath();
    ctx.moveTo(line.from.x, line.from.y);
    ctx.lineTo(line.to.x, line.to.y);

    switch (line.type) {
      case 'hull-line':
        ctx.strokeStyle = this._colors.hullLine;
        ctx.lineWidth = 2.5;
        ctx.setLineDash([]);
        break;
      case 'check-line':
        ctx.strokeStyle = this._colors.checkLine;
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        break;
      case 'angle-line':
        ctx.strokeStyle = this._colors.sortedLine;
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        break;
      case 'orientation-a':
        ctx.strokeStyle = this._colors.accentYellow;
        ctx.lineWidth = 2.5;
        ctx.setLineDash([]);
        ctx.globalAlpha = 0.7;
        break;
      case 'orientation-b':
        ctx.strokeStyle = this._colors.accentCyan;
        ctx.lineWidth = 2.5;
        ctx.setLineDash([8, 4]);
        ctx.globalAlpha = 0.7;
        break;
      default:
        ctx.strokeStyle = this._colors.unprocessed;
        ctx.lineWidth = 1;
        ctx.setLineDash([]);
    }

    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }

  /**
   * Draw a filled hull polygon with transparency.
   */
  _drawHullFill(ctx, hull) {
    if (hull.length < 3) return;

    ctx.beginPath();
    ctx.moveTo(hull[0].x, hull[0].y);
    for (let i = 1; i < hull.length; i++) {
      ctx.lineTo(hull[i].x, hull[i].y);
    }
    ctx.closePath();

    // Gradient fill
    const centerX = hull.reduce((s, p) => s + p.x, 0) / hull.length;
    const centerY = hull.reduce((s, p) => s + p.y, 0) / hull.length;
    const grad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 200);
    grad.addColorStop(0, 'rgba(110, 231, 183, 0.08)');
    grad.addColorStop(1, 'rgba(167, 139, 250, 0.04)');
    ctx.fillStyle = grad;
    ctx.fill();
  }

  /**
   * Draw a point with its label.
   */
  _drawPoint(ctx, point) {
    const color = this._pointColor(point.state);
    const glow = this._glowSize(point.state);
    const radius = point.state === 'pivot' ? 8 : point.state === 'current' ? 7 : point.state === 'hull' ? 6 : point.state === 'rejected' ? 5 : 5;

    // Glow
    if (glow > 0) {
      ctx.beginPath();
      ctx.arc(point.x, point.y, glow, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.15 * this.glowIntensity;
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Outer ring
    if (point.state === 'pivot' || point.state === 'current') {
      ctx.beginPath();
      ctx.arc(point.x, point.y, radius + 3, 0, Math.PI * 2);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.4;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // Point dot
    ctx.beginPath();
    ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    // Inner highlight
    ctx.beginPath();
    ctx.arc(point.x - radius * 0.2, point.y - radius * 0.2, radius * 0.35, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fill();

    // Label
    ctx.fillStyle = color;
    ctx.font = `600 ${10}px ${getComputedStyle(document.documentElement).getPropertyValue('--font-mono').trim() || 'monospace'}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`P${point.id}`, point.x, point.y - radius - 5);

    // Rejected X mark
    if (point.state === 'rejected') {
      ctx.strokeStyle = this._colors.rejected;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.6;
      const s = radius + 2;
      ctx.beginPath();
      ctx.moveTo(point.x - s, point.y - s);
      ctx.lineTo(point.x + s, point.y + s);
      ctx.moveTo(point.x + s, point.y - s);
      ctx.lineTo(point.x - s, point.y + s);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  /**
   * Draw sort order label.
   */
  _drawSortLabel(ctx, point) {
    const label = `#${point.sortOrder}`;
    ctx.fillStyle = this._colors.accentPurple;
    ctx.font = `500 9px ${getComputedStyle(document.documentElement).getPropertyValue('--font-mono').trim() || 'monospace'}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(label, point.x, point.y + 12);
  }

  /**
   * Draw polar angle arcs from pivot to sorted points.
   */
  _drawSortArcs(ctx, pivot, points) {
    for (const p of points) {
      const angle = Math.atan2(-(p.y - pivot.y), p.x - pivot.x);
      const dist = Math.sqrt((p.x - pivot.x) ** 2 + (p.y - pivot.y) ** 2);
      const arcRadius = Math.min(30, dist * 0.3);

      ctx.beginPath();
      // Draw from 0 angle to the point's angle (counter-clockwise in screen coords)
      ctx.arc(pivot.x, pivot.y, arcRadius, 0, -angle, angle > 0);
      ctx.strokeStyle = this._colors.accentPurple;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.3;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  /**
   * Draw orientation check arc (left/right turn visualization).
   */
  _drawOrientationArc(ctx, checkPoints, crossProduct) {
    const { a, b, c } = checkPoints;

    // Draw curved arrow showing direction of turn
    const midX = (a.x + b.x + c.x) / 3;
    const midY = (a.y + b.y + c.y) / 3;

    // In screen coords (Y-down): cp < 0 = CCW (left turn), cp > 0 = CW (right turn)
    const isLeftTurn = crossProduct < 0;
    const isCollinear = Math.abs(crossProduct) < 1e-10;
    const color = isCollinear
      ? this._colors.accentYellow
      : isLeftTurn
        ? this._colors.accentGreen
        : this._colors.accentRed;

    // Draw turn indicator at midpoint
    ctx.beginPath();
    ctx.arc(midX, midY, 15, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.15;
    ctx.fill();
    ctx.globalAlpha = 1;

    // Draw turn symbol
    ctx.fillStyle = color;
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const symbol = isCollinear ? '—' : isLeftTurn ? '↺' : '↻';
    ctx.fillText(symbol, midX, midY);
  }

  /**
   * Clear the entire canvas.
   */
  clear() {
    this._readColors();
    this.ctx.clearRect(0, 0, this.width, this.height);
    this._drawGrid(this.ctx);
  }

  /**
   * Render points only (no algorithm state).
   */
  renderPoints(points) {
    this.render({
      points: points.map(p => ({ ...p, state: 'unprocessed' })),
      lines: [],
      hull: [],
    });
  }

  /**
   * Get canvas-relative coordinates from a mouse/touch event.
   */
  getCanvasCoords(event) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  /**
   * Find a point near the given coordinates (for drag/selection).
   */
  findPointAt(points, x, y, threshold = 15) {
    for (const point of points) {
      const dist = Math.sqrt((point.x - x) ** 2 + (point.y - y) ** 2);
      if (dist <= threshold) return point;
    }
    return null;
  }
}

window.CanvasRenderer = CanvasRenderer;
