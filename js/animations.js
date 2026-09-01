/**
 * RPGS SIMULATION 60 FPS CANVAS ANIMATION ENGINES (LIGHT THEME)
 * High-performance 2D Canvas rendering for complete renewable power generation systems.
 */

class SimAnimationEngine {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.particles = [];
    this.flowOffset = 0;
    this.time = 0;
    this.dpr = window.devicePixelRatio || 1;

    if (this.canvas) {
      this.setupDPI();
      window.addEventListener('resize', () => this.setupDPI());
    }
  }

  setupDPI() {
    if (!this.canvas || !this.ctx) return;
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    this.canvas.width = rect.width * this.dpr;
    this.canvas.height = rect.height * this.dpr;
    this.ctx.scale(this.dpr, this.dpr);
    this.width = rect.width;
    this.height = rect.height;
  }

  /* =========================================================================
   * 1. SOLAR PV SYSTEM ANIMATION (LIGHT THEME)
   * Pipeline: Sun (Photons) -> PV Panel -> MPPT DC-DC -> DC Link -> Inverter -> House Load
   * ========================================================================= */
  renderSolarScene(state) {
    if (!this.ctx) return;
    this.setupDPI();
    const { ctx, width, height } = this;
    if (!width || !height) return;

    ctx.clearRect(0, 0, width, height);
    if (!state.isPaused) this.time += 0.02;

    // 1. Sky & Ground Background (Daylight)
    const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
    const cloudDarken = (state.cloudDensity || 0) * 0.4;
    skyGrad.addColorStop(0, `rgb(${210 - cloudDarken}, ${235 - cloudDarken}, 255)`);
    skyGrad.addColorStop(0.7, `rgb(${235 - cloudDarken}, ${245 - cloudDarken}, 255)`);
    skyGrad.addColorStop(1, '#f1f5f9');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, width, height);

    // Ground grass line
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(0, height - 35, width, 35);
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height - 35);
    ctx.lineTo(width, height - 35);
    ctx.stroke();

    // 2. Stage Hardware Layout Coordinates
    const sunX = width * 0.15;
    const sunY = 55;
    const pvX = width * 0.22;
    const pvY = height - 90;
    const mpptX = width * 0.44;
    const mpptY = height - 85;
    const dcLinkX = width * 0.60;
    const dcLinkY = height - 85;
    const invX = width * 0.76;
    const invY = height - 85;
    const houseX = width * 0.90;
    const houseY = height - 95;

    // 3. Render Sun
    const sunRadius = 24;
    const sunGlow = ctx.createRadialGradient(sunX, sunY, 5, sunX, sunY, sunRadius + 20);
    sunGlow.addColorStop(0, 'rgba(251, 191, 36, 0.9)');
    sunGlow.addColorStop(0.5, 'rgba(251, 191, 36, 0.25)');
    sunGlow.addColorStop(1, 'rgba(251, 191, 36, 0)');
    ctx.fillStyle = sunGlow;
    ctx.beginPath();
    ctx.arc(sunX, sunY, sunRadius + 20, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(sunX, sunY, sunRadius, 0, Math.PI * 2);
    ctx.fill();

    // 4. Photons Streaming from Sun to PV
    if (state.irradiance > 10 && !state.isPaused) {
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.45)';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 4; i++) {
        const offset = (this.time * 25 + i * 25) % 100;
        const progress = offset / 100;
        const px = sunX + (pvX - sunX) * progress + Math.sin(this.time * 5 + i) * 3;
        const py = sunY + (pvY - sunY) * progress;

        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(px, py, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 5. Render PV Panel
    ctx.save();
    ctx.translate(pvX, pvY);
    const tiltRad = ((state.tilt || 35) - 90) * (Math.PI / 180);
    ctx.rotate(tiltRad);

    // Frame
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-35, -4, 70, 8);
    // Cells
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(-33, -3, 66, 6);
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 0.5;
    for (let c = -25; c < 30; c += 10) {
      ctx.beginPath();
      ctx.moveTo(c, -3);
      ctx.lineTo(c, 3);
      ctx.stroke();
    }
    ctx.restore();

    // PV Mounting Stand
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(pvX, pvY);
    ctx.lineTo(pvX, height - 35);
    ctx.stroke();

    // 6. Connective Cables & Conduits
    this.drawConduit(pvX, pvY + 10, mpptX, mpptY + 15, state.pvPower > 5, '#0284c7');
    this.drawConduit(mpptX + 25, mpptY + 15, dcLinkX - 20, dcLinkY + 15, state.mpptPower > 5, '#0284c7');
    this.drawConduit(dcLinkX + 20, dcLinkY + 15, invX - 25, invY + 15, state.mpptPower > 5, '#4f46e5');
    this.drawConduit(invX + 25, invY + 15, houseX - 20, houseY + 30, state.acPower > 5, '#10b981');

    // 7. MPPT Unit Box
    this.drawHardwareBox(mpptX, mpptY, 50, 32, 'MPPT DC', '#0284c7', state.mpptPower > 5);

    // 8. DC Link Capacitor Bus
    this.drawHardwareBox(dcLinkX, dcLinkY, 42, 32, '48V DC', '#2563eb', state.pvPower > 5);

    // 9. Inverter Unit Box
    this.drawHardwareBox(invX, invY, 50, 32, 'INVERTER', '#4f46e5', state.acPower > 5);

    // 10. Consumer Residential House
    this.drawHouse(houseX, houseY, state.acPower >= state.loadDemand && state.acPower > 5);
  }

  /* =========================================================================
   * 2. WIND TURBINE ANIMATION (LIGHT THEME)
   * Pipeline: Wind Airflow -> Rotor Blades -> Gearbox/Gen -> Rectifier -> Inverter -> Industrial Load
   * ========================================================================= */
  renderWindScene(state) {
    if (!this.ctx) return;
    this.setupDPI();
    const { ctx, width, height } = this;
    if (!width || !height) return;

    ctx.clearRect(0, 0, width, height);
    if (!state.isPaused) this.time += (state.rpm || 0) * 0.008 + (state.windSpeed * 0.004);

    // Sky gradient
    const sky = ctx.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, '#e0f2fe');
    sky.addColorStop(0.7, '#f0f9ff');
    sky.addColorStop(1, '#f1f5f9');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);

    // Ground
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(0, height - 35, width, 35);
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height - 35);
    ctx.lineTo(width, height - 35);
    ctx.stroke();

    // Coordinates
    const turbX = width * 0.25;
    const hubY = height * 0.38;
    const baseTowerY = height - 35;
    const rectX = width * 0.52;
    const rectY = height - 85;
    const invX = width * 0.72;
    const invY = height - 85;
    const factoryX = width * 0.90;
    const factoryY = height - 95;

    // Wind Streamlines
    if (state.windSpeed > 0.5) {
      ctx.strokeStyle = 'rgba(2, 132, 199, 0.25)';
      ctx.lineWidth = 1.5;
      for (let w = 0; w < 5; w++) {
        const streamY = 35 + w * 35;
        const waveShift = Math.sin(this.time * 2 + w) * 8;
        ctx.beginPath();
        const startX = ((this.time * 80 + w * 60) % (width * 0.5)) - 30;
        ctx.moveTo(startX, streamY + waveShift);
        ctx.lineTo(startX + 60, streamY + waveShift);
        ctx.stroke();
      }
    }

    // Tower
    ctx.fillStyle = '#94a3b8';
    ctx.beginPath();
    ctx.moveTo(turbX - 10, baseTowerY);
    ctx.lineTo(turbX - 5, hubY);
    ctx.lineTo(turbX + 5, hubY);
    ctx.lineTo(turbX + 10, baseTowerY);
    ctx.closePath();
    ctx.fill();

    // Nacelle
    ctx.fillStyle = '#334155';
    ctx.fillRect(turbX - 12, hubY - 7, 26, 14);

    // Rotor Blades (3 blades at 120°)
    ctx.save();
    ctx.translate(turbX, hubY);
    const bladeLen = 58;
    const angle = this.time * 3;

    for (let b = 0; b < 3; b++) {
      ctx.save();
      ctx.rotate(angle + (b * Math.PI * 2 / 3));

      // Aerofoil blade
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-4, -bladeLen * 0.4);
      ctx.lineTo(0, -bladeLen);
      ctx.lineTo(3, -bladeLen * 0.4);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    }

    // Hub cap
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Conduits
    this.drawConduit(turbX, baseTowerY - 10, rectX - 25, rectY + 15, state.genPower > 0.05, '#0284c7');
    this.drawConduit(rectX + 25, rectY + 15, invX - 25, invY + 15, state.acPower > 0.05, '#4f46e5');
    this.drawConduit(invX + 25, invY + 15, factoryX - 25, factoryY + 30, state.acPower > 0.05, '#10b981');

    // Hardware Boxes
    this.drawHardwareBox(rectX, rectY, 52, 32, 'RECTIFIER', '#0284c7', state.genPower > 0.05);
    this.drawHardwareBox(invX, invY, 52, 32, 'GRID INV', '#4f46e5', state.acPower > 0.05);

    // Factory/Industrial Load
    this.drawFactory(factoryX, factoryY, state.acPower >= state.loadDemand && state.acPower > 0.05);
  }

  /* =========================================================================
   * 3. HYDROELECTRIC DAM ANIMATION (LIGHT THEME)
   * Pipeline: Reservoir -> Penstock -> Francis Runner -> Synchronous Alternator -> Substation -> City Grid
   * ========================================================================= */
  renderHydroScene(state) {
    if (!this.ctx) return;
    this.setupDPI();
    const { ctx, width, height } = this;
    if (!width || !height) return;

    ctx.clearRect(0, 0, width, height);
    if (!state.isPaused) this.time += 0.03;

    // Sky
    const sky = ctx.createLinearGradient(0, 0, 0, height * 0.6);
    sky.addColorStop(0, '#e0f2fe');
    sky.addColorStop(1, '#f8fafc');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);

    // Reservoir Water (Left Top)
    const damTopX = width * 0.32;
    const damBottomX = width * 0.44;
    const waterLevelY = Math.max(30, 110 - (state.head || 80) * 0.5);

    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.moveTo(0, waterLevelY);
    ctx.lineTo(damTopX, waterLevelY);
    ctx.lineTo(damTopX, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fill();

    // Concrete Dam Wall
    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.moveTo(damTopX, 25);
    ctx.lineTo(damTopX + 25, 25);
    ctx.lineTo(damBottomX + 25, height - 35);
    ctx.lineTo(damTopX - 10, height - 35);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Penstock Conduit
    const penstockStartX = damTopX + 5;
    const penstockStartY = waterLevelY + 15;
    const turbX = width * 0.52;
    const turbY = height - 70;

    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(penstockStartX, penstockStartY);
    ctx.lineTo(turbX, turbY);
    ctx.stroke();

    // Water Flow in Penstock
    if (state.flow > 0.5) {
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(penstockStartX, penstockStartY);
      ctx.lineTo(turbX, turbY);
      ctx.stroke();

      // Flow pulses
      const pulses = 5;
      for (let p = 0; p < pulses; p++) {
        const offset = (this.time * 25 + p * 20) % 100;
        const progress = offset / 100;
        const px = penstockStartX + (turbX - penstockStartX) * progress;
        const py = penstockStartY + (turbY - penstockStartY) * progress;

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(px, py, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Ground line
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(damBottomX + 15, height - 35, width - damBottomX, 35);

    // Francis Runner & Alternator Box
    this.drawHardwareBox(turbX, turbY - 15, 48, 30, 'FRANCIS', '#0891b2', state.flow > 0.5);

    // Substation Box
    const subX = width * 0.72;
    const subY = height - 85;
    this.drawHardwareBox(subX, subY, 52, 32, '13.8kV SUB', '#0284c7', state.acPower > 0.5);

    // City Grid Load
    const cityX = width * 0.90;
    const cityY = height - 95;
    this.drawCity(cityX, cityY, state.acPower >= state.loadDemand && state.acPower > 0.5);

    // Conduits
    this.drawConduit(turbX + 24, turbY - 5, subX - 26, subY + 15, state.acPower > 0.5, '#0284c7');
    this.drawConduit(subX + 26, subY + 15, cityX - 25, cityY + 30, state.acPower > 0.5, '#10b981');
  }

  /* =========================================================================
   * 4. TIDAL STREAM & WAVE ANIMATION (LIGHT THEME)
   * Pipeline: Tidal Current -> Subsea Rotor -> Generator -> Seabed Umbilical -> Shore Inverter -> Coastal Load
   * ========================================================================= */
  renderTidalScene(state) {
    if (!this.ctx) return;
    this.setupDPI();
    const { ctx, width, height } = this;
    if (!width || !height) return;

    ctx.clearRect(0, 0, width, height);
    if (!state.isPaused) this.time += 0.03;

    // Sky
    ctx.fillStyle = '#f0f9ff';
    ctx.fillRect(0, 0, width, height);

    // Surface Waves & Ocean Water
    const seaLevelY = 65;
    ctx.fillStyle = '#bae6fd';
    ctx.beginPath();
    ctx.moveTo(0, height);
    ctx.lineTo(0, seaLevelY);

    const waveH = (state.waveHeight || 2.5) * 4;
    const waveFreq = 0.025;
    for (let x = 0; x <= width * 0.65; x += 10) {
      const y = seaLevelY + Math.sin(x * waveFreq + this.time * 3) * waveH;
      ctx.lineTo(x, y);
    }
    // Coast Shore Slope
    ctx.lineTo(width * 0.68, height - 35);
    ctx.lineTo(width, height - 35);
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fill();

    // Seabed Bedrock
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(0, height - 35, width, 35);
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height - 35);
    ctx.lineTo(width, height - 35);
    ctx.stroke();

    // Subsea Turbine Base & Rotor
    const turbX = width * 0.28;
    const hubY = height - 100;

    // Gravity Foundation Mount
    ctx.fillStyle = '#475569';
    ctx.fillRect(turbX - 16, height - 42, 32, 8);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(turbX, height - 42);
    ctx.lineTo(turbX, hubY);
    ctx.stroke();

    // Subsea Rotor Blades
    ctx.save();
    ctx.translate(turbX, hubY);
    const angle = this.time * (state.tidalSpeed || 2.2) * 2;
    const bLen = 34;

    for (let b = 0; b < 2; b++) {
      ctx.save();
      ctx.rotate(angle + b * Math.PI);
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.ellipse(0, -bLen / 2, 4.5, bLen / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Hub
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(0, 0, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Seabed Umbilical Cable
    const invX = width * 0.74;
    const invY = height - 85;
    const loadX = width * 0.90;
    const loadY = height - 95;

    // Seabed cable route
    ctx.strokeStyle = state.acPower > 1 ? '#0284c7' : '#94a3b8';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(turbX, height - 40);
    ctx.lineTo(width * 0.65, height - 40);
    ctx.lineTo(invX - 25, invY + 15);
    ctx.stroke();

    // Cable pulses
    if (state.acPower > 1 && !state.isPaused) {
      const pulses = 4;
      for (let p = 0; p < pulses; p++) {
        const offset = (this.time * 25 + p * 25) % 100;
        const progress = offset / 100;
        const px = turbX + (invX - 25 - turbX) * progress;
        const py = height - 40 + (invY + 15 - (height - 40)) * Math.max(0, (progress - 0.7) / 0.3);

        ctx.fillStyle = '#0284c7';
        ctx.beginPath();
        ctx.arc(px, py, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Shore Inverter Box
    this.drawHardwareBox(invX, invY, 52, 32, 'SHORE INV', '#4f46e5', state.acPower > 1);

    // Coastal Village Load
    this.drawHouse(loadX, loadY, state.acPower >= state.loadDemand && state.acPower > 1);
    this.drawConduit(invX + 26, invY + 15, loadX - 20, loadY + 30, state.acPower > 1, '#10b981');
  }

  /* =========================================================================
   * HELPER RENDERERS
   * ========================================================================= */
  drawConduit(x1, y1, x2, y2, isActive, color) {
    const ctx = this.ctx;
    ctx.strokeStyle = isActive ? color : '#cbd5e1';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    if (isActive && !this.isPaused) {
      for (let i = 0; i < 3; i++) {
        const progress = ((this.time * 20 + i * 33) % 100) / 100;
        const px = x1 + (x2 - x1) * progress;
        const py = y1 + (y2 - y1) * progress;

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(px, py, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  drawHardwareBox(x, y, w, h, label, accentColor, isActive) {
    const ctx = this.ctx;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x - w / 2, y, w, h);

    ctx.strokeStyle = isActive ? accentColor : '#cbd5e1';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x - w / 2, y, w, h);

    // Indicator LED
    ctx.fillStyle = isActive ? '#10b981' : '#94a3b8';
    ctx.beginPath();
    ctx.arc(x + w / 2 - 6, y + 6, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Label
    ctx.fillStyle = '#0f172a';
    ctx.font = '700 8.5px "Fira Code", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(label, x, y + h / 2 + 3);
  }

  drawHouse(x, y, isPowered) {
    const ctx = this.ctx;
    // Walls
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x - 16, y + 14, 32, 22);
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x - 16, y + 14, 32, 22);

    // Roof
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(x - 20, y + 14);
    ctx.lineTo(x, y);
    ctx.lineTo(x + 20, y + 14);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Window (Glows when powered)
    ctx.fillStyle = isPowered ? '#fbbf24' : '#cbd5e1';
    ctx.fillRect(x - 6, y + 18, 12, 10);
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1;
    ctx.strokeRect(x - 6, y + 18, 12, 10);
  }

  drawFactory(x, y, isPowered) {
    const ctx = this.ctx;
    // Factory building
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(x - 20, y + 10, 40, 26);
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x - 20, y + 10, 40, 26);

    // Chimney
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(x - 14, y - 4, 8, 14);

    // Window lights
    ctx.fillStyle = isPowered ? '#fbbf24' : '#cbd5e1';
    ctx.fillRect(x - 4, y + 18, 16, 8);
  }

  drawCity(x, y, isPowered) {
    const ctx = this.ctx;
    // Buildings silhouette
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x - 22, y + 6, 18, 30);
    ctx.fillRect(x - 2, y, 22, 36);
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x - 22, y + 6, 18, 30);
    ctx.strokeRect(x - 2, y, 22, 36);

    // Windows
    ctx.fillStyle = isPowered ? '#fbbf24' : '#cbd5e1';
    for (let row = 0; row < 3; row++) {
      ctx.fillRect(x + 3, y + 6 + row * 8, 4, 4);
      ctx.fillRect(x + 11, y + 6 + row * 8, 4, 4);
    }
  }
}
