/**
 * RPGS SIMULATION SUITE - HIGH-PRECISION CANVAS CHARTING ENGINE (REFACTORED)
 * Features: Multi-series Telemetry, Stage-by-Stage Power Flow Bar/Step Chart, Physics Curves
 */

class SimChartEngine {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.history = [];
    this.maxHistory = 60; // 60 data points rolling window
    this.resizeObserver = null;
    this.setupResizeHandler();
  }

  setupResizeHandler() {
    if (window.ResizeObserver && this.canvas) {
      this.resizeObserver = new ResizeObserver(() => {
        this.updateCanvasDPI();
      });
      this.resizeObserver.observe(this.canvas.parentElement || this.canvas);
    } else {
      window.addEventListener('resize', () => this.updateCanvasDPI());
    }
    this.updateCanvasDPI();
  }

  updateCanvasDPI() {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.width = rect.width || 400;
    this.height = rect.height || 260;
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.ctx.scale(dpr, dpr);
  }

  clear() {
    this.history = [];
  }

  addTelemetryPoint(point) {
    this.history.push({ ...point, timestamp: Date.now() });
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }
  }

  // Draw Rolling Telemetry Chart (e.g. Generation vs Load Demand & Balance)
  renderTelemetry(config) {
    if (!this.ctx || !this.width || !this.height) return;
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const pad = { top: 35, right: 25, bottom: 35, left: 55 };
    const chartW = w - pad.left - pad.right;
    const chartH = h - pad.top - pad.bottom;

    ctx.clearRect(0, 0, w, h);

    // Background Grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    const gridRows = 4;
    const gridCols = 6;
    for (let r = 0; r <= gridRows; r++) {
      const y = pad.top + (chartH / gridRows) * r;
      ctx.moveTo(pad.left, y);
      ctx.lineTo(w - pad.right, y);
    }
    for (let c = 0; c <= gridCols; c++) {
      const x = pad.left + (chartW / gridCols) * c;
      ctx.moveTo(x, pad.top);
      ctx.lineTo(x, h - pad.bottom);
    }
    ctx.stroke();

    // Chart Title & Legend
    ctx.font = '600 11px Inter, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'left';
    ctx.fillText(config.title || 'REAL-TIME SYSTEM TELEMETRY', pad.left, 20);

    let legendX = w - pad.right;
    ctx.textAlign = 'right';
    for (let i = config.series.length - 1; i >= 0; i--) {
      const s = config.series[i];
      const latestVal = this.history.length > 0 ? (this.history[this.history.length - 1][s.key] ?? 0) : 0;
      const text = `${s.name}: ${Number(latestVal).toFixed(1)} ${s.unit}`;
      ctx.fillStyle = s.color;
      ctx.fillText(text, legendX, 20);
      legendX -= ctx.measureText(text).width + 16;
    }

    if (this.history.length < 2) {
      ctx.fillStyle = '#64748b';
      ctx.font = '12px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Collecting Telemetry Data...', w / 2, h / 2);
      return;
    }

    // Determine Global Auto Scale
    let globalMax = -Infinity;
    let globalMin = Infinity;

    config.series.forEach(s => {
      this.history.forEach(pt => {
        const val = pt[s.key] ?? 0;
        if (val > globalMax) globalMax = val;
        if (val < globalMin) globalMin = val;
      });
    });

    if (!isFinite(globalMax) || globalMax === globalMin) {
      globalMax = 100;
      globalMin = 0;
    }

    const range = globalMax - globalMin || 1;
    const yMax = globalMax + range * 0.1;
    const yMin = Math.min(0, globalMin - range * 0.05);

    // Y Axis Labels
    ctx.font = '10px "Fira Code", monospace';
    ctx.fillStyle = '#64748b';
    ctx.textAlign = 'right';
    for (let r = 0; r <= gridRows; r++) {
      const val = yMax - ((yMax - yMin) / gridRows) * r;
      const y = pad.top + (chartH / gridRows) * r;
      ctx.fillText(Math.abs(val) >= 1000 ? (val / 1000).toFixed(1) + 'k' : val.toFixed(1), pad.left - 8, y + 3);
    }

    // X Axis Labels (Time)
    ctx.textAlign = 'center';
    ctx.fillText('-30s', pad.left, h - pad.bottom + 18);
    ctx.fillText('-15s', pad.left + chartW / 2, h - pad.bottom + 18);
    ctx.fillText('Now', w - pad.right, h - pad.bottom + 18);

    // Draw Data Series
    config.series.forEach(s => {
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 2.2;
      ctx.shadowColor = s.color;
      ctx.shadowBlur = 6;
      ctx.beginPath();

      const totalPts = this.history.length;
      for (let i = 0; i < totalPts; i++) {
        const pt = this.history[i];
        const val = pt[s.key] ?? 0;
        const x = pad.left + (chartW / (this.maxHistory - 1)) * (this.maxHistory - totalPts + i);
        const normY = (val - yMin) / (yMax - yMin || 1);
        const clampedY = Math.max(0, Math.min(1, normY));
        const y = h - pad.bottom - clampedY * chartH;

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
    });
  }

  // Draw Stage-by-Stage Power Flow Breakdown Bar/Column Chart
  renderStagePowerFlow(config) {
    /*
      config: {
        title: string,
        stages: [
          { name: 'Source', power: number, unit: string, color: string },
          { name: 'Converter', power: number, unit: string, color: string },
          ...
        ]
      }
    */
    if (!this.ctx || !this.width || !this.height) return;
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const pad = { top: 40, right: 25, bottom: 45, left: 55 };
    const chartW = w - pad.left - pad.right;
    const chartH = h - pad.top - pad.bottom;

    ctx.clearRect(0, 0, w, h);

    // Title
    ctx.font = '600 11px Inter, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'left';
    ctx.fillText(config.title || 'STAGE-BY-STAGE POWER CONVERSION PIPELINE', pad.left, 20);

    const maxPower = Math.max(...config.stages.map(s => s.power || 0), 10);
    const yMax = maxPower * 1.15;

    // Background Grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    const gridRows = 4;
    for (let r = 0; r <= gridRows; r++) {
      const y = pad.top + (chartH / gridRows) * r;
      ctx.moveTo(pad.left, y);
      ctx.lineTo(w - pad.right, y);
    }
    ctx.stroke();

    // Y Axis Labels
    ctx.font = '10px "Fira Code", monospace';
    ctx.fillStyle = '#64748b';
    ctx.textAlign = 'right';
    for (let r = 0; r <= gridRows; r++) {
      const val = yMax - (yMax / gridRows) * r;
      const y = pad.top + (chartH / gridRows) * r;
      ctx.fillText(val >= 1000 ? (val / 1000).toFixed(1) + 'k' : val.toFixed(1), pad.left - 8, y + 3);
    }

    // Draw Bars
    const barCount = config.stages.length;
    const barWidth = Math.min(45, (chartW / barCount) * 0.55);
    const stepX = chartW / barCount;

    config.stages.forEach((stg, i) => {
      const cx = pad.left + stepX * i + stepX / 2;
      const normH = Math.max(0, Math.min(1, stg.power / yMax));
      const barH = normH * chartH;
      const barY = h - pad.bottom - barH;

      // Bar gradient
      const barGrad = ctx.createLinearGradient(0, barY, 0, h - pad.bottom);
      barGrad.addColorStop(0, stg.color || '#38bdf8');
      barGrad.addColorStop(1, 'rgba(15, 23, 42, 0.6)');

      ctx.fillStyle = barGrad;
      ctx.beginPath();
      ctx.roundRect(cx - barWidth / 2, barY, barWidth, barH, [4, 4, 0, 0]);
      ctx.fill();

      ctx.strokeStyle = stg.color || '#38bdf8';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Top Value Label
      ctx.font = '700 9px "Fira Code", monospace';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      const valText = stg.power >= 1000 ? `${(stg.power / 1000).toFixed(1)}k` : stg.power.toFixed(1);
      ctx.fillText(`${valText} ${stg.unit || 'W'}`, cx, barY - 6);

      // Bottom Category Label
      ctx.font = '500 8.5px Inter, sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(stg.name, cx, h - pad.bottom + 16);
    });
  }

  // Generic Function / Physical Curve Renderer
  renderFunctionCurve(config) {
    if (!this.ctx || !this.width || !this.height) return;
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const pad = { top: 35, right: 25, bottom: 40, left: 60 };
    const chartW = w - pad.left - pad.right;
    const chartH = h - pad.top - pad.bottom;

    ctx.clearRect(0, 0, w, h);

    // Background Grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    const gridRows = 5;
    const gridCols = 6;
    for (let r = 0; r <= gridRows; r++) {
      const y = pad.top + (chartH / gridRows) * r;
      ctx.moveTo(pad.left, y);
      ctx.lineTo(w - pad.right, y);
    }
    for (let c = 0; c <= gridCols; c++) {
      const x = pad.left + (chartW / gridCols) * c;
      ctx.moveTo(x, pad.top);
      ctx.lineTo(x, h - pad.bottom);
    }
    ctx.stroke();

    // Title
    ctx.font = '600 11px Inter, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'left';
    ctx.fillText(config.title, pad.left, 20);

    // Y Axis Labels
    ctx.font = '10px "Fira Code", monospace';
    ctx.fillStyle = '#64748b';
    ctx.textAlign = 'right';
    for (let r = 0; r <= gridRows; r++) {
      const val = config.yMax - ((config.yMax - config.yMin) / gridRows) * r;
      const y = pad.top + (chartH / gridRows) * r;
      ctx.fillText(Math.abs(val) >= 1000 ? (val / 1000).toFixed(1) + 'k' : val.toFixed(1), pad.left - 8, y + 3);
    }

    // X Axis Labels
    ctx.textAlign = 'center';
    for (let c = 0; c <= gridCols; c++) {
      const val = config.xMin + ((config.xMax - config.xMin) / gridCols) * c;
      const x = pad.left + (chartW / gridCols) * c;
      ctx.fillText(val.toFixed(0), x, h - pad.bottom + 16);
    }

    // Axis Units & Labels
    ctx.fillStyle = '#38bdf8';
    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(config.yLabel, pad.left - 8, pad.top - 12);
    ctx.textAlign = 'right';
    ctx.fillText(config.xLabel, w - pad.right, h - pad.bottom + 32);

    // Render Curves
    config.curves.forEach(c => {
      const samples = 100;
      const pts = [];
      for (let i = 0; i <= samples; i++) {
        const xVal = config.xMin + (i / samples) * (config.xMax - config.xMin);
        const yVal = c.fn(xVal);
        const x = pad.left + ((xVal - config.xMin) / (config.xMax - config.xMin)) * chartW;
        const normY = (yVal - config.yMin) / (config.yMax - config.yMin || 1);
        const y = h - pad.bottom - Math.max(0, Math.min(1, normY)) * chartH;
        pts.push({ x, y });
      }

      if (c.fill) {
        ctx.fillStyle = c.fillColor || 'rgba(56, 189, 248, 0.1)';
        ctx.beginPath();
        ctx.moveTo(pad.left, h - pad.bottom);
        pts.forEach(p => ctx.lineTo(p.x, p.y));
        ctx.lineTo(pts[pts.length - 1].x, h - pad.bottom);
        ctx.closePath();
        ctx.fill();
      }

      ctx.strokeStyle = c.color;
      ctx.lineWidth = 2.5;
      ctx.shadowColor = c.color;
      ctx.shadowBlur = 5;
      ctx.beginPath();
      pts.forEach((p, idx) => {
        if (idx === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();
      ctx.shadowBlur = 0;
    });

    // Render Markers
    if (config.markers) {
      config.markers.forEach(m => {
        const x = pad.left + ((m.x - config.xMin) / (config.xMax - config.xMin)) * chartW;
        const normY = (m.y - config.yMin) / (config.yMax - config.yMin || 1);
        const y = h - pad.bottom - Math.max(0, Math.min(1, normY)) * chartH;

        ctx.fillStyle = m.color || '#f59e0b';
        ctx.shadowColor = m.color || '#f59e0b';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        if (m.label) {
          ctx.font = '600 10px "Fira Code", monospace';
          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'left';
          ctx.fillText(m.label, x + 8, y - 8);
        }
      });
    }
  }
}
