/**
 * RPGS SIMULATION CHART ENGINE (LIGHT THEME)
 * High-performance 2D Canvas chart renderer with light mode styling.
 */

class SimChartEngine {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.history = [];
    this.maxPoints = 40;
    this.dpr = window.devicePixelRatio || 1;
    this.colors = {
      bg: '#ffffff',
      grid: '#f1f5f9',
      border: '#e2e8f0',
      text: '#475569',
      textMuted: '#94a3b8',
      title: '#0f172a'
    };

    if (this.canvas) {
      this.updateCanvasDPI();
      window.addEventListener('resize', () => this.updateCanvasDPI());
    }
  }

  updateCanvasDPI() {
    if (!this.canvas || !this.ctx) return;
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    this.canvas.width = rect.width * this.dpr;
    this.canvas.height = rect.height * this.dpr;
    this.ctx.scale(this.dpr, this.dpr);
    this.width = rect.width;
    this.height = rect.height;
  }

  clear() {
    this.history = [];
    if (this.ctx && this.width) {
      this.ctx.clearRect(0, 0, this.width, this.height);
    }
  }

  addTelemetryPoint(dataPoint) {
    this.history.push({
      timestamp: Date.now(),
      ...dataPoint
    });
    if (this.history.length > this.maxPoints) {
      this.history.shift();
    }
  }

  /**
   * Render rolling telemetry chart (e.g. Generation vs Load vs Balance)
   */
  renderTelemetry(config) {
    if (!this.ctx) return;
    this.updateCanvasDPI();
    const { ctx, width, height } = this;
    if (!width || !height) return;

    ctx.clearRect(0, 0, width, height);

    const pad = { top: 28, right: 20, bottom: 26, left: 48 };
    const chartW = width - pad.left - pad.right;
    const chartH = height - pad.top - pad.bottom;

    // Title
    ctx.fillStyle = this.colors.title;
    ctx.font = '600 11px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(config.title || 'REAL-TIME TELEMETRY', pad.left, 16);

    // Compute dynamic Y min and max
    let minY = 0;
    let maxY = 1;

    config.series.forEach(s => {
      this.history.forEach(pt => {
        const val = pt[s.key] !== undefined ? pt[s.key] : 0;
        if (val > maxY) maxY = val;
        if (val < minY) minY = val;
      });
    });

    maxY = maxY * 1.15;
    if (minY < 0) minY = minY * 1.15;
    const rangeY = (maxY - minY) || 1;

    // Draw Grid Lines & Y Ticks
    const gridSteps = 4;
    ctx.strokeStyle = this.colors.grid;
    ctx.lineWidth = 1;
    ctx.fillStyle = this.colors.textMuted;
    ctx.font = '10px "Fira Code", monospace';
    ctx.textAlign = 'right';

    for (let i = 0; i <= gridSteps; i++) {
      const yVal = minY + (rangeY * (i / gridSteps));
      const yPos = pad.top + chartH - (i / gridSteps) * chartH;

      ctx.beginPath();
      ctx.moveTo(pad.left, yPos);
      ctx.lineTo(width - pad.right, yPos);
      ctx.stroke();

      ctx.fillText(yVal >= 1000 ? (yVal / 1000).toFixed(1) + 'k' : yVal.toFixed(1), pad.left - 6, yPos + 3);
    }

    // Zero balance line if range crosses zero
    if (minY < 0 && maxY > 0) {
      const zeroY = pad.top + chartH - ((0 - minY) / rangeY) * chartH;
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(pad.left, zeroY);
      ctx.lineTo(width - pad.right, zeroY);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw Chart Boundary
    ctx.strokeStyle = this.colors.border;
    ctx.strokeRect(pad.left, pad.top, chartW, chartH);

    // Render each series line
    if (this.history.length > 1) {
      config.series.forEach(s => {
        ctx.strokeStyle = s.color;
        ctx.lineWidth = 2;
        ctx.beginPath();

        this.history.forEach((pt, idx) => {
          const val = pt[s.key] !== undefined ? pt[s.key] : 0;
          const x = pad.left + (idx / (this.maxPoints - 1)) * chartW;
          const y = pad.top + chartH - ((val - minY) / rangeY) * chartH;

          if (idx === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();

        // Draw latest value dot
        const lastIdx = this.history.length - 1;
        const lastVal = this.history[lastIdx][s.key] !== undefined ? this.history[lastIdx][s.key] : 0;
        const dotX = pad.left + (lastIdx / (this.maxPoints - 1)) * chartW;
        const dotY = pad.top + chartH - ((lastVal - minY) / rangeY) * chartH;

        ctx.fillStyle = s.color;
        ctx.beginPath();
        ctx.arc(dotX, dotY, 3.5, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // Legend
    let legX = width - pad.right;
    ctx.textAlign = 'right';
    ctx.font = '500 10px Inter, sans-serif';

    [...config.series].reverse().forEach(s => {
      const txt = s.name;
      const metrics = ctx.measureText(txt);
      
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(legX - metrics.width - 5, 14, 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = this.colors.text;
      ctx.fillText(txt, legX, 17);

      legX -= (metrics.width + 20);
    });
  }

  /**
   * Render Stage-by-Stage Power Breakdown Bar Chart
   */
  renderStagePowerFlow(config) {
    if (!this.ctx) return;
    this.updateCanvasDPI();
    const { ctx, width, height } = this;
    if (!width || !height) return;

    ctx.clearRect(0, 0, width, height);

    const pad = { top: 28, right: 20, bottom: 38, left: 52 };
    const chartW = width - pad.left - pad.right;
    const chartH = height - pad.top - pad.bottom;

    // Title
    ctx.fillStyle = this.colors.title;
    ctx.font = '600 11px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(config.title || 'STAGE-BY-STAGE POWER FLOW', pad.left, 16);

    const stages = config.stages || [];
    if (stages.length === 0) return;

    const maxPower = Math.max(...stages.map(s => Math.max(0, s.power)), 1) * 1.15;

    // Grid lines
    ctx.strokeStyle = this.colors.grid;
    ctx.lineWidth = 1;
    ctx.fillStyle = this.colors.textMuted;
    ctx.font = '10px "Fira Code", monospace';
    ctx.textAlign = 'right';

    for (let i = 0; i <= 4; i++) {
      const yVal = (maxPower * (i / 4));
      const yPos = pad.top + chartH - (i / 4) * chartH;

      ctx.beginPath();
      ctx.moveTo(pad.left, yPos);
      ctx.lineTo(width - pad.right, yPos);
      ctx.stroke();

      ctx.fillText(yVal >= 1000 ? (yVal / 1000).toFixed(1) + 'k' : yVal.toFixed(1), pad.left - 6, yPos + 3);
    }

    ctx.strokeStyle = this.colors.border;
    ctx.strokeRect(pad.left, pad.top, chartW, chartH);

    // Draw Column Bars
    const barWidth = Math.min(46, (chartW / stages.length) * 0.55);
    const colSpacing = chartW / stages.length;

    stages.forEach((stage, idx) => {
      const p = Math.max(0, stage.power || 0);
      const barH = (p / maxPower) * chartH;
      const x = pad.left + (idx * colSpacing) + (colSpacing - barWidth) / 2;
      const y = pad.top + chartH - barH;

      // Bar with subtle gradient
      const grad = ctx.createLinearGradient(0, y, 0, pad.top + chartH);
      grad.addColorStop(0, stage.color || '#0284c7');
      grad.addColorStop(1, '#93c5fd');

      ctx.fillStyle = grad;
      ctx.fillRect(x, y, barWidth, barH);
      ctx.strokeStyle = stage.color || '#0284c7';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, barWidth, barH);

      // Value label on top of bar
      ctx.fillStyle = this.colors.title;
      ctx.font = '600 9.5px "Fira Code", monospace';
      ctx.textAlign = 'center';
      const valText = p >= 1000 ? (p / 1000).toFixed(1) + 'k' : p.toFixed(1);
      ctx.fillText(valText, x + barWidth / 2, Math.max(pad.top + 10, y - 5));

      // Stage label underneath
      ctx.fillStyle = this.colors.text;
      ctx.font = '500 9.5px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(stage.name, x + barWidth / 2, pad.top + chartH + 15);
    });
  }

  /**
   * Render Mathematical Function Curve (e.g. I-V curve, Power vs Wind V^3)
   */
  renderFunctionCurve(config) {
    if (!this.ctx) return;
    this.updateCanvasDPI();
    const { ctx, width, height } = this;
    if (!width || !height) return;

    ctx.clearRect(0, 0, width, height);

    const pad = { top: 28, right: 20, bottom: 28, left: 48 };
    const chartW = width - pad.left - pad.right;
    const chartH = height - pad.top - pad.bottom;

    // Title
    ctx.fillStyle = this.colors.title;
    ctx.font = '600 11px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(config.title || 'CHARACTERISTIC CURVE', pad.left, 16);

    const { xMin, xMax, yMin, yMax, curves = [], markers = [] } = config;
    const rangeX = (xMax - xMin) || 1;
    const rangeY = (yMax - yMin) || 1;

    // Grid
    ctx.strokeStyle = this.colors.grid;
    ctx.lineWidth = 1;
    ctx.fillStyle = this.colors.textMuted;
    ctx.font = '10px "Fira Code", monospace';

    // Y grid
    ctx.textAlign = 'right';
    for (let i = 0; i <= 4; i++) {
      const yVal = yMin + (rangeY * (i / 4));
      const yPos = pad.top + chartH - (i / 4) * chartH;
      ctx.beginPath();
      ctx.moveTo(pad.left, yPos);
      ctx.lineTo(width - pad.right, yPos);
      ctx.stroke();
      ctx.fillText(yVal.toFixed(1), pad.left - 6, yPos + 3);
    }

    // X grid
    ctx.textAlign = 'center';
    for (let i = 0; i <= 4; i++) {
      const xVal = xMin + (rangeX * (i / 4));
      const xPos = pad.left + (i / 4) * chartW;
      ctx.beginPath();
      ctx.moveTo(xPos, pad.top);
      ctx.lineTo(xPos, pad.top + chartH);
      ctx.stroke();
      ctx.fillText(xVal.toFixed(1), xPos, pad.top + chartH + 14);
    }

    ctx.strokeStyle = this.colors.border;
    ctx.strokeRect(pad.left, pad.top, chartW, chartH);

    // Plot curves
    curves.forEach(curve => {
      ctx.strokeStyle = curve.color || '#0284c7';
      ctx.lineWidth = 2;
      ctx.beginPath();

      const samples = 100;
      let first = true;

      for (let i = 0; i <= samples; i++) {
        const xVal = xMin + (rangeX * (i / samples));
        const yVal = curve.fn(xVal);

        const xPx = pad.left + ((xVal - xMin) / rangeX) * chartW;
        const yPx = pad.top + chartH - ((yVal - yMin) / rangeY) * chartH;

        if (first) {
          ctx.moveTo(xPx, yPx);
          first = false;
        } else {
          ctx.lineTo(xPx, yPx);
        }
      }
      ctx.stroke();

      if (curve.fill) {
        ctx.lineTo(pad.left + chartW, pad.top + chartH);
        ctx.lineTo(pad.left, pad.top + chartH);
        ctx.closePath();
        ctx.fillStyle = curve.fillColor || 'rgba(2, 132, 199, 0.08)';
        ctx.fill();
      }
    });

    // Operating Markers
    markers.forEach(m => {
      const xPx = pad.left + ((m.x - xMin) / rangeX) * chartW;
      const yPx = pad.top + chartH - ((m.y - yMin) / rangeY) * chartH;

      ctx.fillStyle = m.color || '#d97706';
      ctx.beginPath();
      ctx.arc(xPx, yPx, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      if (m.label) {
        ctx.fillStyle = this.colors.title;
        ctx.font = '600 9.5px "Fira Code", monospace';
        ctx.textAlign = 'left';
        ctx.fillText(m.label, xPx + 7, yPx - 4);
      }
    });
  }
}
