/**
 * RPGS SIMULATION SUITE - ANIMATION & VISUAL RENDERING ENGINE (REFACTORED)
 * Complete End-to-End Visual Energy Conversion Pipeline
 * SOURCE -> CONVERTER -> GENERATOR -> CONDITIONING -> INVERTER -> LOAD
 */

class SimAnimationEngine {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.particles = [];
    this.time = 0;
    this.setupDPI();
    window.addEventListener('resize', () => this.setupDPI());
  }

  setupDPI() {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.width = rect.width || 800;
    this.height = rect.height || 380;
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.ctx.scale(dpr, dpr);
  }

  clear() {
    if (!this.ctx) return;
    this.ctx.clearRect(0, 0, this.width, this.height);
  }

  // ==========================================
  // 1. SOLAR ENERGY CONVERSION PIPELINE ANIMATION
  // ==========================================
  renderSolarScene(params) {
    /*
      params: {
        irradiance: number,
        tilt: number,
        cloudDensity: number,
        solarAngle: number,
        temperature: number,
        pvPower: number,
        mpptPower: number,
        acPower: number,
        loadDemand: number,
        isPaused: boolean,
        highlightStep: number (0 for none, 1-6 for step)
      }
    */
    if (!this.ctx) return;
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    if (!params.isPaused) this.time += 0.025;

    ctx.clearRect(0, 0, w, h);

    // 1. Atmospheric Sky Gradient
    const skyDarkness = Math.max(0.1, (params.irradiance / 1200) * (1 - params.cloudDensity * 0.007));
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
    skyGrad.addColorStop(0, `rgb(${Math.floor(10 + 30 * skyDarkness)}, ${Math.floor(20 + 80 * skyDarkness)}, ${Math.floor(45 + 160 * skyDarkness)})`);
    skyGrad.addColorStop(1, `rgb(${Math.floor(5 + 15 * skyDarkness)}, ${Math.floor(10 + 25 * skyDarkness)}, ${Math.floor(20 + 40 * skyDarkness)})`);
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h);

    // Ground Platform
    const groundY = h * 0.76;
    const groundGrad = ctx.createLinearGradient(0, groundY, 0, h);
    groundGrad.addColorStop(0, '#111c19');
    groundGrad.addColorStop(1, '#080d0c');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, groundY, w, h - groundY);

    ctx.strokeStyle = 'rgba(56, 189, 248, 0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(w, groundY);
    ctx.stroke();

    // ----------------------------------------------------
    // STAGE 1: SUN (SOURCE)
    // ----------------------------------------------------
    const angleRad = (params.solarAngle * Math.PI) / 180;
    const sunArcRadius = Math.min(w * 0.28, h * 0.45);
    const sunCenterX = w * 0.18 - Math.cos(angleRad) * sunArcRadius * 0.8;
    const sunCenterY = groundY - 40 - Math.sin(angleRad) * sunArcRadius;

    if (params.irradiance > 10) {
      const sunGlowRadius = 35 + (params.irradiance / 1200) * 35;
      const sunGlow = ctx.createRadialGradient(sunCenterX, sunCenterY, 4, sunCenterX, sunCenterY, sunGlowRadius);
      sunGlow.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
      sunGlow.addColorStop(0.2, 'rgba(254, 240, 138, 0.8)');
      sunGlow.addColorStop(0.5, 'rgba(245, 158, 11, 0.4)');
      sunGlow.addColorStop(1, 'rgba(245, 158, 11, 0)');

      ctx.fillStyle = sunGlow;
      ctx.beginPath();
      ctx.arc(sunCenterX, sunCenterY, sunGlowRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(sunCenterX, sunCenterY, 15, 0, Math.PI * 2);
      ctx.fill();
    }

    // Clouds
    if (params.cloudDensity > 0) {
      const cloudAlpha = (params.cloudDensity / 100) * 0.85;
      ctx.fillStyle = `rgba(148, 163, 184, ${cloudAlpha})`;
      for (let cl = 0; cl < 2; cl++) {
        const cx = ((this.time * 15 + cl * 180) % (w * 0.5 + 100)) - 50;
        const cy = 40 + cl * 30;
        ctx.beginPath();
        ctx.arc(cx, cy, 22, 0, Math.PI * 2);
        ctx.arc(cx + 18, cy - 10, 26, 0, Math.PI * 2);
        ctx.arc(cx + 42, cy - 6, 22, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // ----------------------------------------------------
    // STAGE 2: PV SOLAR PANEL (CONVERTER)
    // ----------------------------------------------------
    const panelBaseX = w * 0.28;
    const panelBaseY = groundY;

    // Post
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(panelBaseX, panelBaseY);
    ctx.lineTo(panelBaseX, panelBaseY - 40);
    ctx.stroke();

    // Pivot & Rotated Panel
    ctx.save();
    ctx.translate(panelBaseX, panelBaseY - 40);
    const tiltRad = -(params.tilt * Math.PI) / 180;
    ctx.rotate(tiltRad);

    const panelW = 95;
    const panelH = 10;
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-panelW / 2, -panelH / 2, panelW, panelH);
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-panelW / 2, -panelH / 2, panelW, panelH);

    // Silicon Blue Surface
    const cellGrad = ctx.createLinearGradient(-panelW / 2, 0, panelW / 2, 0);
    cellGrad.addColorStop(0, '#0c4a6e');
    cellGrad.addColorStop(0.5, '#0284c7');
    cellGrad.addColorStop(1, '#0c4a6e');
    ctx.fillStyle = cellGrad;
    ctx.fillRect(-panelW / 2 + 2, -panelH / 2 - 3, panelW - 4, 3);

    // Glint when active
    if (params.pvPower > 5) {
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.8)';
      ctx.shadowColor = '#00f2fe';
      ctx.shadowBlur = 8;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-panelW / 2 + 2, -panelH / 2 - 3);
      ctx.lineTo(panelW / 2 - 2, -panelH / 2 - 3);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
    ctx.restore();

    // Sunlight Photon Rays from Sun to Panel
    if (params.irradiance > 20) {
      const rayCount = 5;
      const rayAlpha = Math.max(0.08, (1 - params.cloudDensity / 120) * (params.irradiance / 1200) * 0.45);
      for (let r = 0; r < rayCount; r++) {
        const offset = (r - rayCount / 2) * 12;
        const targetX = panelBaseX + offset * Math.cos(tiltRad);
        const targetY = panelBaseY - 40 + offset * Math.sin(tiltRad);

        ctx.strokeStyle = `rgba(254, 240, 138, ${rayAlpha})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(sunCenterX, sunCenterY);
        ctx.lineTo(targetX, targetY);
        ctx.stroke();
      }
    }

    // ----------------------------------------------------
    // STAGE 3 & 4: MPPT DC-DC CONVERTER & DC LINK
    // ----------------------------------------------------
    const mpptX = w * 0.48;
    const mpptY = groundY - 35;
    const boxW = 55;
    const boxH = 45;

    // MPPT Housing
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.roundRect(mpptX - boxW / 2, mpptY - boxH / 2, boxW, boxH, 4);
    ctx.fill();
    ctx.stroke();

    // MPPT Text
    ctx.font = '700 8px "Fira Code", monospace';
    ctx.fillStyle = '#38bdf8';
    ctx.textAlign = 'center';
    ctx.fillText('MPPT', mpptX, mpptY - 6);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '6px "Fira Code", monospace';
    ctx.fillText('DC-DC', mpptX, mpptY + 4);

    // MPPT LED
    ctx.fillStyle = params.pvPower > 5 ? '#10b981' : '#64748b';
    ctx.beginPath();
    ctx.arc(mpptX, mpptY + 14, 3, 0, Math.PI * 2);
    ctx.fill();

    // ----------------------------------------------------
    // STAGE 5: DC-AC INVERTER
    // ----------------------------------------------------
    const invX = w * 0.68;
    const invY = groundY - 35;

    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#00f2fe';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.roundRect(invX - boxW / 2, invY - boxH / 2, boxW, boxH, 4);
    ctx.fill();
    ctx.stroke();

    ctx.font = '700 8px "Fira Code", monospace';
    ctx.fillStyle = '#00f2fe';
    ctx.textAlign = 'center';
    ctx.fillText('INVERTER', invX, invY - 6);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '6px "Fira Code", monospace';
    ctx.fillText('DC → AC', invX, invY + 4);

    // Inverter Sine Icon
    ctx.strokeStyle = params.acPower > 1 ? '#10b981' : '#64748b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(invX - 8, invY + 13);
    ctx.quadraticCurveTo(invX - 4, invY + 8, invX, invY + 13);
    ctx.quadraticCurveTo(invX + 4, invY + 18, invX + 8, invY + 13);
    ctx.stroke();

    // ----------------------------------------------------
    // STAGE 6: ELECTRICAL LOAD (RESIDENCE / GRID)
    // ----------------------------------------------------
    const houseX = w * 0.88;
    const houseY = groundY;

    // House Structure
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.5;
    ctx.fillRect(houseX - 30, houseY - 45, 60, 45);
    ctx.strokeRect(houseX - 30, houseY - 45, 60, 45);

    // Roof
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.moveTo(houseX - 36, houseY - 45);
    ctx.lineTo(houseX, houseY - 68);
    ctx.lineTo(houseX + 36, houseY - 45);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // House Windows (Illuminated based on supplied power vs demand)
    const isSupplied = params.acPower >= params.loadDemand * 0.9 && params.acPower > 5;
    const isDeficit = params.acPower < params.loadDemand * 0.9 && params.acPower > 5;

    ctx.fillStyle = isSupplied ? '#fbbf24' : (isDeficit ? '#f59e0b' : '#334155');
    if (isSupplied || isDeficit) {
      ctx.shadowColor = '#fbbf24';
      ctx.shadowBlur = 8;
    }
    ctx.fillRect(houseX - 20, houseY - 32, 14, 14);
    ctx.fillRect(houseX + 6, houseY - 32, 14, 14);
    ctx.shadowBlur = 0;

    // Load Label
    ctx.font = '700 7px "Fira Code", monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'center';
    ctx.fillText('AC LOAD', houseX, houseY + 14);

    // ----------------------------------------------------
    // CONNECTING BUS BARS & ANIMATED ENERGY FLOW PARTICLES
    // ----------------------------------------------------
    // Conduits
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2.5;

    // 1. PV to MPPT (DC)
    ctx.beginPath();
    ctx.moveTo(panelBaseX, panelBaseY - 10);
    ctx.lineTo(mpptX - boxW / 2, panelBaseY - 10);
    ctx.lineTo(mpptX - boxW / 2, mpptY);
    ctx.stroke();

    // 2. MPPT to Inverter (DC Link)
    ctx.beginPath();
    ctx.moveTo(mpptX + boxW / 2, mpptY);
    ctx.lineTo(invX - boxW / 2, invY);
    ctx.stroke();

    // 3. Inverter to Load (AC)
    ctx.beginPath();
    ctx.moveTo(invX + boxW / 2, invY);
    ctx.lineTo(houseX - 30, invY);
    ctx.stroke();

    // Energy Flow Particles
    if (params.acPower > 2 && !params.isPaused) {
      const speed = Math.min(6, Math.max(1, (params.acPower / 300) * 4));
      const t = (this.time * speed) % 1;

      // Pulse 1: PV -> MPPT (DC - Cyan)
      const p1X = panelBaseX + t * (mpptX - boxW / 2 - panelBaseX);
      ctx.fillStyle = '#00f2fe';
      ctx.shadowColor = '#00f2fe';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(p1X, panelBaseY - 10, 3, 0, Math.PI * 2);
      ctx.fill();

      // Pulse 2: MPPT -> Inverter (DC Link - Blue)
      const p2X = (mpptX + boxW / 2) + t * (invX - boxW / 2 - (mpptX + boxW / 2));
      ctx.fillStyle = '#38bdf8';
      ctx.shadowColor = '#38bdf8';
      ctx.beginPath();
      ctx.arc(p2X, invY, 3, 0, Math.PI * 2);
      ctx.fill();

      // Pulse 3: Inverter -> Load (AC - Emerald/Amber)
      const p3X = (invX + boxW / 2) + t * (houseX - 30 - (invX + boxW / 2));
      ctx.fillStyle = isSupplied ? '#10b981' : '#f59e0b';
      ctx.shadowColor = isSupplied ? '#10b981' : '#f59e0b';
      ctx.beginPath();
      ctx.arc(p3X, invY, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  // ==========================================
  // 2. WIND ENERGY CONVERSION PIPELINE ANIMATION
  // ==========================================
  renderWindScene(params) {
    /*
      params: {
        windSpeed: number,
        rotorRadius: number,
        rpm: number,
        mechPower: number,
        genPower: number,
        acPower: number,
        loadDemand: number,
        status: string,
        isPaused: boolean
      }
    */
    if (!this.ctx) return;
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    if (!params.isPaused) this.time += 0.02;

    ctx.clearRect(0, 0, w, h);

    // Sky Background
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
    skyGrad.addColorStop(0, '#0c1527');
    skyGrad.addColorStop(1, '#050a14');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h);

    // Ground Landscape
    const groundY = h * 0.78;
    ctx.fillStyle = '#0f1c24';
    ctx.fillRect(0, groundY, w, h - groundY);
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(w, groundY);
    ctx.stroke();

    // ----------------------------------------------------
    // STAGE 1: WIND FLOW PARTICLES (SOURCE)
    // ----------------------------------------------------
    if (params.windSpeed > 0.5) {
      if (!this.windParticles || this.windParticles.length < 40) {
        this.windParticles = [];
        for (let i = 0; i < 40; i++) {
          this.windParticles.push({
            x: Math.random() * (w * 0.45),
            y: 30 + Math.random() * (groundY - 50),
            length: 12 + Math.random() * 25,
            speed: 0.8 + Math.random() * 0.6,
            alpha: 0.15 + Math.random() * 0.35
          });
        }
      }

      const speedMultiplier = params.windSpeed * 0.5;
      this.windParticles.forEach(p => {
        if (!params.isPaused) {
          p.x += p.speed * speedMultiplier;
          if (p.x > w * 0.38) {
            p.x = -30;
            p.y = 30 + Math.random() * (groundY - 50);
          }
        }
        ctx.strokeStyle = `rgba(56, 189, 248, ${p.alpha})`;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + p.length, p.y);
        ctx.stroke();
      });
    }

    // ----------------------------------------------------
    // STAGE 2: TURBINE TOWER & ROTOR (CONVERTER)
    // ----------------------------------------------------
    const hubX = w * 0.32;
    const hubY = h * 0.40;
    const towerBaseY = groundY;
    const bladeVisualRadius = 38 + (params.rotorRadius / 60) * 55;

    // Tower
    const towerGrad = ctx.createLinearGradient(hubX - 15, hubY, hubX + 15, hubY);
    towerGrad.addColorStop(0, '#334155');
    towerGrad.addColorStop(0.5, '#64748b');
    towerGrad.addColorStop(1, '#1e293b');
    ctx.fillStyle = towerGrad;
    ctx.beginPath();
    ctx.moveTo(hubX - 6, hubY);
    ctx.lineTo(hubX + 6, hubY);
    ctx.lineTo(hubX + 12, towerBaseY);
    ctx.lineTo(hubX - 12, towerBaseY);
    ctx.closePath();
    ctx.fill();

    // Nacelle (Cutaway showing shaft & generator)
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(hubX - 18, hubY - 10, 48, 20, 3);
    ctx.fill();
    ctx.stroke();

    // ----------------------------------------------------
    // STAGE 3: GENERATOR (INSIDE NACELLE)
    // ----------------------------------------------------
    const genX = hubX + 14;
    const genY = hubY;
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.2;
    ctx.fillRect(genX - 8, genY - 7, 16, 14);
    ctx.strokeRect(genX - 8, genY - 7, 16, 14);

    if (params.genPower > 0.05) {
      ctx.fillStyle = '#38bdf8';
      ctx.shadowColor = '#00f2fe';
      ctx.shadowBlur = 8;
      ctx.fillRect(genX - 4, genY - 4, 8, 8);
      ctx.shadowBlur = 0;
    }

    // Rotating Blades
    if (!this.bladeAngle) this.bladeAngle = 0;
    if (!params.isPaused && params.rpm > 0) {
      this.bladeAngle += (params.rpm * 2 * Math.PI) / (60 * 60);
    }

    for (let b = 0; b < 3; b++) {
      const angle = this.bladeAngle + (b * 2 * Math.PI) / 3;
      ctx.save();
      ctx.translate(hubX, hubY);
      ctx.rotate(angle);

      const bladeGrad = ctx.createLinearGradient(0, 0, 0, -bladeVisualRadius);
      bladeGrad.addColorStop(0, '#cbd5e1');
      bladeGrad.addColorStop(0.7, '#f8fafc');
      bladeGrad.addColorStop(1, '#ef4444');

      ctx.fillStyle = bladeGrad;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(-5, -bladeVisualRadius * 0.4, -3, -bladeVisualRadius);
      ctx.lineTo(3, -bladeVisualRadius);
      ctx.quadraticCurveTo(5, -bladeVisualRadius * 0.4, 0, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Hub Nose Cone
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(hubX, hubY, 8, 0, Math.PI * 2);
    ctx.fill();

    // ----------------------------------------------------
    // STAGE 4 & 5: RECTIFIER / DC LINK & INVERTER
    // ----------------------------------------------------
    const rectX = w * 0.54;
    const rectY = groundY - 30;
    const boxW = 50;
    const boxH = 40;

    // Rectifier
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(rectX - boxW / 2, rectY - boxH / 2, boxW, boxH, 4);
    ctx.fill();
    ctx.stroke();

    ctx.font = '700 7px "Fira Code", monospace';
    ctx.fillStyle = '#38bdf8';
    ctx.textAlign = 'center';
    ctx.fillText('RECTIFIER', rectX, rectY - 4);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '6px "Fira Code", monospace';
    ctx.fillText('AC → DC', rectX, rectY + 6);

    // Inverter
    const invX = w * 0.72;
    const invY = groundY - 30;

    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#00f2fe';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(invX - boxW / 2, invY - boxH / 2, boxW, boxH, 4);
    ctx.fill();
    ctx.stroke();

    ctx.font = '700 7px "Fira Code", monospace';
    ctx.fillStyle = '#00f2fe';
    ctx.textAlign = 'center';
    ctx.fillText('INVERTER', invX, invY - 4);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '6px "Fira Code", monospace';
    ctx.fillText('DC → AC', invX, invY + 6);

    // ----------------------------------------------------
    // STAGE 6: ELECTRICAL INDUSTRIAL LOAD
    // ----------------------------------------------------
    const loadX = w * 0.88;
    const loadY = groundY;

    // Factory Load
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.5;
    ctx.fillRect(loadX - 25, loadY - 45, 50, 45);
    ctx.strokeRect(loadX - 25, loadY - 45, 50, 45);

    // Smokestack / Pylon
    ctx.fillStyle = '#334155';
    ctx.fillRect(loadX + 12, loadY - 60, 8, 15);

    const isSupplied = params.acPower >= params.loadDemand * 0.9 && params.acPower > 0.05;
    ctx.fillStyle = isSupplied ? '#38bdf8' : (params.acPower > 0.05 ? '#f59e0b' : '#334155');
    if (isSupplied) {
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 8;
    }
    ctx.fillRect(loadX - 15, loadY - 32, 10, 10);
    ctx.fillRect(loadX + 2, loadY - 32, 10, 10);
    ctx.shadowBlur = 0;

    ctx.font = '700 7px "Fira Code", monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'center';
    ctx.fillText('GRID LOAD', loadX, loadY + 14);

    // Conduits & Flow Pulses
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2.5;

    // Tower down to Rectifier
    ctx.beginPath();
    ctx.moveTo(hubX, hubY + 10);
    ctx.lineTo(hubX, towerBaseY - 10);
    ctx.lineTo(rectX - boxW / 2, towerBaseY - 10);
    ctx.lineTo(rectX - boxW / 2, rectY);
    ctx.stroke();

    // Rectifier to Inverter
    ctx.beginPath();
    ctx.moveTo(rectX + boxW / 2, rectY);
    ctx.lineTo(invX - boxW / 2, invY);
    ctx.stroke();

    // Inverter to Load
    ctx.beginPath();
    ctx.moveTo(invX + boxW / 2, invY);
    ctx.lineTo(loadX - 25, invY);
    ctx.stroke();

    // Energy Pulses
    if (params.acPower > 0.05 && !params.isPaused) {
      const t = (this.time * 2.5) % 1;

      // Down tower pulse
      const p1Y = (hubY + 10) + t * (towerBaseY - 10 - (hubY + 10));
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(hubX, p1Y, 3, 0, Math.PI * 2);
      ctx.fill();

      // DC link pulse
      const p2X = (rectX + boxW / 2) + t * (invX - boxW / 2 - (rectX + boxW / 2));
      ctx.fillStyle = '#00f2fe';
      ctx.beginPath();
      ctx.arc(p2X, invY, 3, 0, Math.PI * 2);
      ctx.fill();

      // AC pulse to Load
      const p3X = (invX + boxW / 2) + t * (loadX - 25 - (invX + boxW / 2));
      ctx.fillStyle = isSupplied ? '#10b981' : '#f59e0b';
      ctx.beginPath();
      ctx.arc(p3X, invY, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ==========================================
  // 3. HYDRO ENERGY CONVERSION PIPELINE ANIMATION
  // ==========================================
  renderHydroScene(params) {
    /*
      params: {
        head: number,
        flow: number,
        hydPower: number,
        acPower: number,
        loadDemand: number,
        isPaused: boolean
      }
    */
    if (!this.ctx) return;
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    if (!params.isPaused) this.time += 0.03;

    ctx.clearRect(0, 0, w, h);

    // Sky Background
    ctx.fillStyle = '#08101e';
    ctx.fillRect(0, 0, w, h);

    // ----------------------------------------------------
    // STAGE 1: RESERVOIR (SOURCE)
    // ----------------------------------------------------
    const maxHead = 150;
    const reservoirY = h * 0.52 - (params.head / maxHead) * (h * 0.32);
    const damCrestX = w * 0.28;

    const waterGrad = ctx.createLinearGradient(0, reservoirY, 0, h);
    waterGrad.addColorStop(0, 'rgba(6, 182, 212, 0.7)');
    waterGrad.addColorStop(1, 'rgba(12, 74, 110, 0.95)');
    ctx.fillStyle = waterGrad;
    ctx.beginPath();
    ctx.moveTo(0, reservoirY);
    ctx.lineTo(damCrestX, reservoirY);
    ctx.lineTo(damCrestX, h);
    ctx.lineTo(0, h);
    ctx.fill();

    // Reservoir wavelets
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let x = 0; x <= damCrestX; x += 8) {
      const wy = reservoirY + Math.sin(x * 0.06 + this.time * 2) * 2;
      if (x === 0) ctx.moveTo(x, wy);
      else ctx.lineTo(x, wy);
    }
    ctx.stroke();

    // ----------------------------------------------------
    // STAGE 2: DAM & PENSTOCK
    // ----------------------------------------------------
    const damGrad = ctx.createLinearGradient(damCrestX, 0, w * 0.45, 0);
    damGrad.addColorStop(0, '#334155');
    damGrad.addColorStop(0.3, '#475569');
    damGrad.addColorStop(1, '#1e293b');

    ctx.fillStyle = damGrad;
    ctx.beginPath();
    ctx.moveTo(damCrestX - 8, reservoirY - 15);
    ctx.lineTo(damCrestX + 20, reservoirY - 15);
    ctx.lineTo(w * 0.48, h);
    ctx.lineTo(damCrestX - 8, h);
    ctx.closePath();
    ctx.fill();

    // Penstock Conduit
    const penstockStartX = damCrestX + 5;
    const penstockStartY = reservoirY + 25;
    const turbineX = w * 0.50;
    const turbineY = h * 0.76;

    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 20;
    ctx.beginPath();
    ctx.moveTo(penstockStartX, penstockStartY);
    ctx.lineTo(turbineX, turbineY);
    ctx.stroke();

    // Water Flow Particles in Penstock
    if (params.flow > 0.5) {
      const flowSpeed = (params.flow / 120) * 12;
      for (let p = 0; p < 12; p++) {
        const pt = ((this.time * flowSpeed + p * 3) % 100) / 100;
        const px = penstockStartX + pt * (turbineX - penstockStartX);
        const py = penstockStartY + pt * (turbineY - penstockStartY);

        ctx.fillStyle = '#38bdf8';
        ctx.shadowColor = '#00f2fe';
        ctx.shadowBlur = 5;
        ctx.beginPath();
        ctx.arc(px, py, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }

    // ----------------------------------------------------
    // STAGE 3 & 4: HYDRAULIC TURBINE & GENERATOR
    // ----------------------------------------------------
    // Powerhouse Room
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.fillRect(turbineX - 25, turbineY - 30, 50, 55);
    ctx.strokeRect(turbineX - 25, turbineY - 30, 50, 55);

    // Francis Runner
    if (!this.hydroRunnerAngle) this.hydroRunnerAngle = 0;
    if (!params.isPaused && params.flow > 0) {
      this.hydroRunnerAngle += (params.flow / 120) * 0.35;
    }

    ctx.save();
    ctx.translate(turbineX, turbineY);
    ctx.rotate(this.hydroRunnerAngle);
    for (let b = 0; b < 6; b++) {
      const ang = (b * Math.PI) / 3;
      ctx.fillStyle = '#22d3ee';
      ctx.beginPath();
      ctx.arc(Math.cos(ang) * 9, Math.sin(ang) * 9, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Generator Top Stator
    if (params.acPower > 0.5) {
      ctx.fillStyle = '#00f2fe';
      ctx.shadowColor = '#00f2fe';
      ctx.shadowBlur = 12;
      ctx.fillRect(turbineX - 10, turbineY - 26, 20, 6);
      ctx.shadowBlur = 0;
    }

    // ----------------------------------------------------
    // STAGE 5: SUBSTATION / INVERTER & TRANSFORMER
    // ----------------------------------------------------
    const subX = w * 0.68;
    const subY = h * 0.76 - 15;
    const subW = 45;
    const subH = 35;

    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(subX - subW / 2, subY - subH / 2, subW, subH, 4);
    ctx.fill();
    ctx.stroke();

    ctx.font = '700 7px "Fira Code", monospace';
    ctx.fillStyle = '#06b6d4';
    ctx.textAlign = 'center';
    ctx.fillText('SUBSTATION', subX, subY - 4);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '6px "Fira Code", monospace';
    ctx.fillText('13.8kV GRID', subX, subY + 6);

    // ----------------------------------------------------
    // STAGE 6: REGIONAL GRID LOAD (CITY SKYLINE)
    // ----------------------------------------------------
    const cityX = w * 0.88;
    const cityY = h * 0.76;

    // City Buildings
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.2;
    ctx.fillRect(cityX - 25, cityY - 50, 18, 50);
    ctx.strokeRect(cityX - 25, cityY - 50, 18, 50);
    ctx.fillRect(cityX - 4, cityY - 65, 20, 65);
    ctx.strokeRect(cityX - 4, cityY - 65, 20, 65);
    ctx.fillRect(cityX + 18, cityY - 40, 15, 40);
    ctx.strokeRect(cityX + 18, cityY - 40, 15, 40);

    const isSupplied = params.acPower >= params.loadDemand * 0.9 && params.acPower > 0.5;
    ctx.fillStyle = isSupplied ? '#00f2fe' : (params.acPower > 0.5 ? '#f59e0b' : '#334155');
    if (isSupplied) {
      ctx.shadowColor = '#00f2fe';
      ctx.shadowBlur = 8;
    }
    // Windows
    ctx.fillRect(cityX - 20, cityY - 42, 4, 4);
    ctx.fillRect(cityX - 12, cityY - 42, 4, 4);
    ctx.fillRect(cityX, cityY - 55, 4, 4);
    ctx.fillRect(cityX + 8, cityY - 55, 4, 4);
    ctx.shadowBlur = 0;

    ctx.font = '700 7px "Fira Code", monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'center';
    ctx.fillText('CITY GRID LOAD', cityX + 5, cityY + 16);

    // Power lines & Pulses
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(turbineX + 25, turbineY - 15);
    ctx.lineTo(subX - subW / 2, subY);
    ctx.moveTo(subX + subW / 2, subY);
    ctx.lineTo(cityX - 25, subY);
    ctx.stroke();

    if (params.acPower > 0.5 && !params.isPaused) {
      const t = (this.time * 2.5) % 1;
      const p1X = (turbineX + 25) + t * (subX - subW / 2 - (turbineX + 25));
      ctx.fillStyle = '#06b6d4';
      ctx.beginPath();
      ctx.arc(p1X, subY, 3, 0, Math.PI * 2);
      ctx.fill();

      const p2X = (subX + subW / 2) + t * (cityX - 25 - (subX + subW / 2));
      ctx.fillStyle = isSupplied ? '#10b981' : '#f59e0b';
      ctx.beginPath();
      ctx.arc(p2X, subY, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ==========================================
  // 4. TIDAL ENERGY CONVERSION PIPELINE ANIMATION
  // ==========================================
  renderTidalScene(params) {
    /*
      params: {
        tidalSpeed: number,
        turbineRadius: number,
        waveHeight: number,
        wavePeriod: number,
        acPower: number,
        loadDemand: number,
        isPaused: boolean
      }
    */
    if (!this.ctx) return;
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    if (!params.isPaused) this.time += 0.03;

    ctx.clearRect(0, 0, w, h);

    // Deep Ocean Background
    const oceanGrad = ctx.createLinearGradient(0, 0, 0, h);
    oceanGrad.addColorStop(0, '#040d1a');
    oceanGrad.addColorStop(0.35, '#082f49');
    oceanGrad.addColorStop(1, '#020617');
    ctx.fillStyle = oceanGrad;
    ctx.fillRect(0, 0, w, h);

    // ----------------------------------------------------
    // STAGE 1: SURFACE WAVES & TIDAL FLOW (SOURCE)
    // ----------------------------------------------------
    const surfaceY = h * 0.32;
    const waveAmp = (params.waveHeight / 5) * 18;
    const waveFreq = 0.018;
    const waveSpeed = (1 / params.wavePeriod) * 10;

    ctx.fillStyle = 'rgba(14, 165, 233, 0.35)';
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(0, surfaceY);
    for (let x = 0; x <= w * 0.65; x += 5) {
      const y = surfaceY + Math.sin(x * waveFreq + this.time * waveSpeed) * waveAmp;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w * 0.65, h);
    ctx.closePath();
    ctx.fill();

    // Floating Buoy
    const buoyX = w * 0.18;
    const buoyY = surfaceY + Math.sin(buoyX * waveFreq + this.time * waveSpeed) * waveAmp;
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(buoyX - 5, buoyY - 20, 10, 24);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(buoyX, buoyY - 22, 3, 0, Math.PI * 2);
    ctx.fill();

    // Seabed
    const seabedY = h * 0.82;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, seabedY, w, h - seabedY);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, seabedY);
    ctx.lineTo(w, seabedY);
    ctx.stroke();

    // Marine Flow Streamlines
    if (params.tidalSpeed > 0.1) {
      if (!this.tidalParticles || this.tidalParticles.length < 35) {
        this.tidalParticles = [];
        for (let i = 0; i < 35; i++) {
          this.tidalParticles.push({
            x: Math.random() * (w * 0.5),
            y: surfaceY + 30 + Math.random() * (seabedY - surfaceY - 50),
            speed: 0.6 + Math.random() * 0.8,
            length: 8 + Math.random() * 16,
            alpha: 0.2 + Math.random() * 0.4
          });
        }
      }

      const streamSpeed = params.tidalSpeed * 2.0;
      this.tidalParticles.forEach(p => {
        if (!params.isPaused) {
          p.x += p.speed * streamSpeed;
          if (p.x > w * 0.48) {
            p.x = -30;
            p.y = surfaceY + 30 + Math.random() * (seabedY - surfaceY - 50);
          }
        }
        ctx.strokeStyle = `rgba(99, 102, 241, ${p.alpha})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + p.length, p.y);
        ctx.stroke();
      });
    }

    // ----------------------------------------------------
    // STAGE 2 & 3: SUBSEA TIDAL TURBINE & GENERATOR
    // ----------------------------------------------------
    const turbineHubX = w * 0.38;
    const turbineHubY = h * 0.58;
    const turbineVisualRadius = 20 + (params.turbineRadius / 15) * 45;

    // Foundation
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(turbineHubX - 8, turbineHubY, 16, seabedY - turbineHubY);
    ctx.fillStyle = '#334155';
    ctx.fillRect(turbineHubX - 25, seabedY - 8, 50, 12);

    // Nacelle
    ctx.fillStyle = '#475569';
    ctx.beginPath();
    ctx.roundRect(turbineHubX - 18, turbineHubY - 9, 36, 18, 4);
    ctx.fill();

    // Rotating Dual Blades
    if (!this.tidalRotorAngle) this.tidalRotorAngle = 0;
    if (!params.isPaused && params.tidalSpeed > 0) {
      this.tidalRotorAngle += params.tidalSpeed * 0.05;
    }

    ctx.save();
    ctx.translate(turbineHubX, turbineHubY);
    ctx.rotate(this.tidalRotorAngle);
    for (let b = 0; b < 2; b++) {
      ctx.save();
      ctx.rotate(b * Math.PI);
      const bladeGrad = ctx.createLinearGradient(0, 0, 0, -turbineVisualRadius);
      bladeGrad.addColorStop(0, '#818cf8');
      bladeGrad.addColorStop(1, '#c7d2fe');
      ctx.fillStyle = bladeGrad;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(-6, -turbineVisualRadius * 0.5, -2, -turbineVisualRadius);
      ctx.lineTo(2, -turbineVisualRadius);
      ctx.quadraticCurveTo(6, -turbineVisualRadius * 0.5, 0, 0);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(turbineHubX, turbineHubY, 6, 0, Math.PI * 2);
    ctx.fill();

    // ----------------------------------------------------
    // STAGE 4 & 5: SUBSEA CABLE & ONSHORE INVERTER
    // ----------------------------------------------------
    const shoreX = w * 0.68;
    const shoreY = seabedY - 30;
    const boxW = 50;
    const boxH = 40;

    // Shore Substation
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(shoreX - boxW / 2, shoreY - boxH / 2, boxW, boxH, 4);
    ctx.fill();
    ctx.stroke();

    ctx.font = '700 7px "Fira Code", monospace';
    ctx.fillStyle = '#6366f1';
    ctx.textAlign = 'center';
    ctx.fillText('SHORE INVERTER', shoreX, shoreY - 4);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '6px "Fira Code", monospace';
    ctx.fillText('DC → AC', shoreX, shoreY + 6);

    // ----------------------------------------------------
    // STAGE 6: COASTAL COMMUNITY LOAD
    // ----------------------------------------------------
    const coastalX = w * 0.88;
    const coastalY = seabedY;

    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.5;
    ctx.fillRect(coastalX - 25, coastalY - 40, 50, 40);
    ctx.strokeRect(coastalX - 25, coastalY - 40, 50, 40);

    const isSupplied = params.acPower >= params.loadDemand * 0.9 && params.acPower > 1;
    ctx.fillStyle = isSupplied ? '#818cf8' : (params.acPower > 1 ? '#f59e0b' : '#334155');
    if (isSupplied) {
      ctx.shadowColor = '#818cf8';
      ctx.shadowBlur = 8;
    }
    ctx.fillRect(coastalX - 15, coastalY - 28, 10, 10);
    ctx.fillRect(coastalX + 4, coastalY - 28, 10, 10);
    ctx.shadowBlur = 0;

    ctx.font = '700 7px "Fira Code", monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'center';
    ctx.fillText('COASTAL LOAD', coastalX, coastalY + 14);

    // Subsea Cable
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(turbineHubX, seabedY - 4);
    ctx.lineTo(shoreX - boxW / 2, seabedY - 4);
    ctx.lineTo(shoreX - boxW / 2, shoreY);
    ctx.stroke();

    // Shore to Load
    ctx.beginPath();
    ctx.moveTo(shoreX + boxW / 2, shoreY);
    ctx.lineTo(coastalX - 25, shoreY);
    ctx.stroke();

    // Pulses
    if (params.acPower > 1 && !params.isPaused) {
      const t = (this.time * 2.5) % 1;
      const p1X = turbineHubX + t * (shoreX - boxW / 2 - turbineHubX);
      ctx.fillStyle = '#6366f1';
      ctx.beginPath();
      ctx.arc(p1X, seabedY - 4, 3, 0, Math.PI * 2);
      ctx.fill();

      const p2X = (shoreX + boxW / 2) + t * (coastalX - 25 - (shoreX + boxW / 2));
      ctx.fillStyle = isSupplied ? '#10b981' : '#f59e0b';
      ctx.beginPath();
      ctx.arc(p2X, shoreY, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
