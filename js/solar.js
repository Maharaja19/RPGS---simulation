/**
 * RPGS SOLAR ENERGY SIMULATION MODULE (REFACTORED)
 * Complete System Pipeline: Sun -> PV Panel -> MPPT DC-DC -> DC Link -> Inverter -> AC Load
 */

class SolarSimulator {
  constructor() {
    this.params = {
      irradiance: 1000,    // W/m² (0 - 1200)
      temperature: 25,     // °C (10 - 50)
      tilt: 35,            // degrees (0 - 90)
      cloudDensity: 10,    // % (0 - 100)
      solarAngle: 55,      // degrees (0 - 90)
      area: 1.6,           // m²
      baseEfficiency: 0.20,// 20%
      mpptEfficiency: 0.95,// 95%
      invEfficiency: 0.95, // 95%
      loadDemand: 250      // W (0 - 500 W load for residential demonstration)
    };

    this.outputs = {
      solarInputPower: 0,
      pvPower: 0,
      mpptPower: 0,
      dcLinkVoltage: 48,
      acPower: 0,
      acVoltage: 230,
      acCurrent: 0,
      powerBalance: 0,
      overallEfficiency: 0,
      vmp: 0,
      imp: 0,
      voc: 0,
      isc: 0,
      status: 'GENERATING',
      statusClass: 'generating'
    };

    this.isPaused = false;
    this.currentGraphMode = 'load-telemetry'; // 'load-telemetry', 'stage-flow', 'iv'
    this.currentStep = 0; // 0 = off, 1-6 = step walkthrough
    this.animEngine = null;
    this.chartEngine = null;
  }

  init() {
    this.animEngine = new SimAnimationEngine('solar-canvas');
    this.chartEngine = new SimChartEngine('solar-graph-canvas');

    this.bindDOM();
    this.calculate();
    this.updateUI();
    this.startLoop();
  }

  bindDOM() {
    // Sliders
    const inputs = ['irradiance', 'temperature', 'tilt', 'cloudDensity', 'solarAngle', 'loadDemand'];
    inputs.forEach(key => {
      const el = document.getElementById(`solar-${key}`);
      if (el) {
        el.addEventListener('input', (e) => {
          this.params[key] = parseFloat(e.target.value);
          this.calculate();
          this.updateUI();
        });
      }
    });

    // Presets
    const presets = {
      'preset-solar-clear': { irradiance: 1000, cloudDensity: 10, temperature: 25, tilt: 35, solarAngle: 55, loadDemand: 250 },
      'preset-solar-partly': { irradiance: 700, cloudDensity: 45, temperature: 28, tilt: 35, solarAngle: 50, loadDemand: 200 },
      'preset-solar-overcast': { irradiance: 400, cloudDensity: 80, temperature: 20, tilt: 30, solarAngle: 45, loadDemand: 150 },
      'preset-solar-storm': { irradiance: 150, cloudDensity: 95, temperature: 18, tilt: 25, solarAngle: 35, loadDemand: 200 }
    };

    Object.entries(presets).forEach(([id, vals]) => {
      const btn = document.getElementById(id);
      if (btn) {
        btn.addEventListener('click', () => {
          Object.assign(this.params, vals);
          Object.entries(vals).forEach(([k, v]) => {
            const inputEl = document.getElementById(`solar-${k}`);
            if (inputEl) inputEl.value = v;
          });
          document.querySelectorAll('.solar-preset-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');

          this.calculate();
          this.updateUI();
        });
      }
    });

    // Control Buttons
    const pauseBtn = document.getElementById('solar-btn-pause');
    if (pauseBtn) {
      pauseBtn.addEventListener('click', () => this.togglePause());
    }

    const resetBtn = document.getElementById('solar-btn-reset');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => this.reset());
    }

    // Step-by-Step Flow Button
    const stepBtn = document.getElementById('solar-btn-step');
    if (stepBtn) {
      stepBtn.addEventListener('click', () => this.toggleStepWalkthrough());
    }

    const stepPrev = document.getElementById('solar-step-prev');
    if (stepPrev) stepPrev.addEventListener('click', () => this.navStep(-1));

    const stepNext = document.getElementById('solar-step-next');
    if (stepNext) stepNext.addEventListener('click', () => this.navStep(1));

    const stepExit = document.getElementById('solar-step-exit');
    if (stepExit) stepExit.addEventListener('click', () => this.toggleStepWalkthrough(false));

    // Interactive Component Inspector Clicks on Process Flow Blocks
    document.querySelectorAll('[data-solar-component]').forEach(el => {
      el.addEventListener('click', () => {
        const compKey = el.dataset.solarComponent;
        window.RpgsApp?.showComponentModal(compKey);
      });
    });

    // Graph Switch Tabs
    const graphTabs = document.querySelectorAll('.solar-graph-tab');
    graphTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        graphTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.currentGraphMode = tab.dataset.graph;
        this.renderGraph();
      });
    });
  }

  calculate() {
    const { irradiance, temperature, tilt, cloudDensity, solarAngle, area, baseEfficiency, mpptEfficiency, invEfficiency, loadDemand } = this.params;

    // 1. Solar Irradiance reaching panel
    const angleDiffRad = Math.abs(solarAngle - tilt) * (Math.PI / 180);
    const orientationFactor = Math.max(0, Math.cos(angleDiffRad));
    const cloudFactor = Math.max(0, 1 - (cloudDensity / 100) * 0.85);
    const effectiveG = Math.max(0, irradiance * orientationFactor * cloudFactor);

    // Total raw incident solar power hitting panel area (W)
    const solarInputPower = effectiveG * area;

    // 2. Temperature Derated Efficiency & Raw PV Output
    const tempDelta = temperature - 25;
    const tempDerateFactor = Math.max(0.7, 1 - (0.004 * tempDelta));
    const effectiveEfficiency = baseEfficiency * tempDerateFactor;

    let pvPower = effectiveG > 1 ? effectiveG * area * effectiveEfficiency : 0;

    // Diode characteristics
    const Isc = (effectiveG / 1000) * 9.5;
    const Voc = effectiveG > 5 ? Math.max(0, (37.5 - 0.12 * tempDelta) * (0.92 + 0.08 * Math.log10(effectiveG / 10 + 1))) : 0;
    const Vmp = Voc * 0.82;
    const Imp = Isc * 0.91;

    // 3. MPPT / DC-DC Stage
    const mpptPower = pvPower * mpptEfficiency;
    const dcLinkVoltage = pvPower > 5 ? 48.0 : 0; // Standard 48V telecom/residential DC bus

    // 4. Inverter Stage (DC -> AC 230V)
    const acPower = mpptPower * invEfficiency;
    const acVoltage = acPower > 2 ? 230 : 0;
    const acCurrent = acVoltage > 0 ? (acPower / acVoltage) : 0;

    // 5. Overall System Efficiency
    const overallEfficiency = solarInputPower > 0 ? (acPower / solarInputPower) * 100 : 0;

    // 6. Load Balance Calculation
    const balanceObj = RpgsElectricalModel.calculatePowerBalance(acPower, loadDemand);

    this.outputs = {
      solarInputPower,
      pvPower,
      mpptPower,
      dcLinkVoltage,
      acPower,
      acVoltage,
      acCurrent,
      powerBalance: balanceObj.balance,
      overallEfficiency,
      vmp: Vmp,
      imp: Imp,
      voc: Voc,
      isc: Isc,
      status: balanceObj.status,
      statusClass: balanceObj.statusClass
    };
  }

  updateUI() {
    const setElemText = (id, txt) => {
      const el = document.getElementById(id);
      if (el) el.textContent = txt;
    };

    // Sliders readouts
    setElemText('solar-val-irradiance', `${this.params.irradiance} W/m²`);
    setElemText('solar-val-temperature', `${this.params.temperature} °C`);
    setElemText('solar-val-tilt', `${this.params.tilt}°`);
    setElemText('solar-val-cloudDensity', `${this.params.cloudDensity}%`);
    setElemText('solar-val-solarAngle', `${this.params.solarAngle}°`);
    setElemText('solar-val-loadDemand', `${this.params.loadDemand.toFixed(0)} W`);

    // Primary 4 Output Cards
    setElemText('solar-out-acpower', `${this.outputs.acPower.toFixed(1)} W`);
    setElemText('solar-out-demand', `${this.params.loadDemand.toFixed(1)} W`);

    const balanceElem = document.getElementById('solar-out-balance');
    if (balanceElem) {
      const sign = this.outputs.powerBalance > 0 ? '+' : '';
      balanceElem.textContent = `${sign}${this.outputs.powerBalance.toFixed(1)} W`;
      balanceElem.style.color = this.outputs.powerBalance >= 0 ? '#10b981' : '#f59e0b';
    }

    setElemText('solar-out-eff', `${this.outputs.overallEfficiency.toFixed(1)}%`);

    // Secondary Electrical Metrics Bar
    setElemText('solar-sub-dcpower', `${this.outputs.pvPower.toFixed(1)} W`);
    setElemText('solar-sub-dclink', `${this.outputs.dcLinkVoltage.toFixed(1)} V DC`);
    setElemText('solar-sub-acvolt', `${this.outputs.acVoltage} V AC`);
    setElemText('solar-sub-accurr', `${this.outputs.acCurrent.toFixed(2)} A`);

    // Process Chain Stage Metric Badges
    setElemText('stage-solar-source-val', `${(this.outputs.solarInputPower / 1000).toFixed(2)} kW Flux`);
    setElemText('stage-solar-pv-val', `${this.outputs.pvPower.toFixed(1)} W DC`);
    setElemText('stage-solar-mppt-val', `${this.outputs.mpptPower.toFixed(1)} W (95%)`);
    setElemText('stage-solar-dclink-val', `${this.outputs.dcLinkVoltage.toFixed(0)}V Bus`);
    setElemText('stage-solar-inv-val', `${this.outputs.acPower.toFixed(1)} W AC`);
    setElemText('stage-solar-load-val', `${this.params.loadDemand.toFixed(0)} W Req`);

    // Status Pill
    const statusPill = document.getElementById('solar-status-pill');
    const statusText = document.getElementById('solar-status-text');
    if (statusPill && statusText) {
      statusText.textContent = this.outputs.status;
      statusPill.className = `status-pill ${this.outputs.statusClass}`;
    }

    this.renderGraph();
  }

  renderGraph() {
    if (!this.chartEngine) return;

    if (this.currentGraphMode === 'load-telemetry') {
      this.chartEngine.renderTelemetry({
        title: 'REAL-TIME GENERATION VS LOAD DEMAND',
        series: [
          { key: 'acPower', name: 'AC Generation', color: '#00f2fe', unit: 'W' },
          { key: 'loadDemand', name: 'Load Demand', color: '#fbbf24', unit: 'W' },
          { key: 'powerBalance', name: 'Net Balance', color: '#10b981', unit: 'W' }
        ]
      });
    } else if (this.currentGraphMode === 'stage-flow') {
      this.chartEngine.renderStagePowerFlow({
        title: 'SOLAR POWER CONVERSION STAGES BREAKDOWN',
        stages: [
          { name: 'Incident Flux', power: this.outputs.solarInputPower, unit: 'W', color: '#f59e0b' },
          { name: 'PV DC Out', power: this.outputs.pvPower, unit: 'W', color: '#38bdf8' },
          { name: 'MPPT DC-DC', power: this.outputs.mpptPower, unit: 'W', color: '#00f2fe' },
          { name: 'DC Link', power: this.outputs.mpptPower, unit: 'W', color: '#6366f1' },
          { name: 'Inverter AC', power: this.outputs.acPower, unit: 'W', color: '#10b981' },
          { name: 'Load Demand', power: this.params.loadDemand, unit: 'W', color: '#fbbf24' }
        ]
      });
    } else if (this.currentGraphMode === 'iv') {
      const Voc = this.outputs.voc || 40;
      const Isc = this.outputs.isc || 10;
      const Vmp = this.outputs.vmp;
      const Imp = this.outputs.imp;

      this.chartEngine.renderFunctionCurve({
        title: 'PHOTOVOLTAIC I-V CHARACTERISTIC CURVE',
        xLabel: 'Voltage (V)',
        yLabel: 'Current (A)',
        xMin: 0,
        xMax: Math.max(45, Math.ceil(Voc * 1.15)),
        yMin: 0,
        yMax: Math.max(12, Math.ceil(Isc * 1.25)),
        curves: [
          {
            name: 'I-V Curve',
            color: '#00f2fe',
            fill: true,
            fillColor: 'rgba(0, 242, 254, 0.08)',
            fn: (v) => {
              if (v >= Voc || Voc <= 0) return 0;
              return Math.max(0, Isc * (1 - Math.pow(v / Voc, 8)));
            }
          }
        ],
        markers: [
          {
            x: Vmp,
            y: Imp,
            label: `MPP (${Vmp.toFixed(1)}V, ${Imp.toFixed(2)}A)`,
            color: '#f59e0b'
          }
        ]
      });
    }
  }

  toggleStepWalkthrough(forceState) {
    const hud = document.getElementById('solar-step-hud');
    const stepBtn = document.getElementById('solar-btn-step');
    const isActive = forceState !== undefined ? forceState : (this.currentStep === 0);

    if (isActive) {
      this.currentStep = 1;
      hud?.classList.add('active');
      stepBtn?.classList.add('active');
      this.applyStepHighlight();
    } else {
      this.currentStep = 0;
      hud?.classList.remove('active');
      stepBtn?.classList.remove('active');
      document.querySelectorAll('[data-solar-step]').forEach(el => el.classList.remove('step-highlighted'));
    }
  }

  navStep(dir) {
    this.currentStep += dir;
    if (this.currentStep < 1) this.currentStep = 6;
    if (this.currentStep > 6) this.currentStep = 1;
    this.applyStepHighlight();
  }

  applyStepHighlight() {
    const stepDescriptions = {
      1: { title: 'STEP 1: ENERGY SOURCE (SUN)', desc: 'Nuclear fusion produces photon flux. Irradiance (W/m²), angle, and clouds determine available solar flux.' },
      2: { title: 'STEP 2: PRIMARY CONVERTER (PV PANEL)', desc: 'Silicon semiconductors convert photons into raw DC voltage & current via the photovoltaic effect.' },
      3: { title: 'STEP 3: POWER CONDITIONING (MPPT DC-DC)', desc: 'Maximum Power Point Tracker dynamically adjusts impedance to extract peak power and stabilizes voltage.' },
      4: { title: 'STEP 4: DC LINK BUS', desc: 'Intermediate capacitive DC bus providing filtered, ripple-free DC power to the inverter.' },
      5: { title: 'STEP 5: INVERTER (DC → AC)', desc: 'SPWM switching bridge converts 48V DC into standard 230V 50Hz single-phase AC sinusoidal electricity.' },
      6: { title: 'STEP 6: ELECTRICAL LOAD', desc: 'Consumer appliances draw active AC power. The system balances generation surplus vs deficit.' }
    };

    const info = stepDescriptions[this.currentStep];
    const titleEl = document.getElementById('solar-step-hud-title');
    const descEl = document.getElementById('solar-step-hud-desc');
    if (titleEl) titleEl.textContent = info.title;
    if (descEl) descEl.textContent = info.desc;

    document.querySelectorAll('[data-solar-step]').forEach(el => {
      el.classList.toggle('step-highlighted', parseInt(el.dataset.solarStep) === this.currentStep);
    });
  }

  togglePause() {
    this.isPaused = !this.isPaused;
    const btn = document.getElementById('solar-btn-pause');
    if (btn) {
      btn.innerHTML = this.isPaused
        ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg> Resume'
        : '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg> Pause';
      btn.classList.toggle('is-paused', this.isPaused);
    }
  }

  reset() {
    this.params = {
      irradiance: 1000,
      temperature: 25,
      tilt: 35,
      cloudDensity: 10,
      solarAngle: 55,
      area: 1.6,
      baseEfficiency: 0.20,
      mpptEfficiency: 0.95,
      invEfficiency: 0.95,
      loadDemand: 250
    };

    ['irradiance', 'temperature', 'tilt', 'cloudDensity', 'solarAngle', 'loadDemand'].forEach(k => {
      const el = document.getElementById(`solar-${k}`);
      if (el) el.value = this.params[k];
    });

    this.chartEngine.clear();
    this.isPaused = false;
    this.toggleStepWalkthrough(false);

    const btn = document.getElementById('solar-btn-pause');
    if (btn) {
      btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg> Pause';
      btn.classList.remove('is-paused');
    }

    this.calculate();
    this.updateUI();
  }

  startLoop() {
    const animate = () => {
      if (this.animEngine) {
        this.animEngine.renderSolarScene({
          irradiance: this.params.irradiance,
          tilt: this.params.tilt,
          cloudDensity: this.params.cloudDensity,
          solarAngle: this.params.solarAngle,
          temperature: this.params.temperature,
          pvPower: this.outputs.pvPower,
          mpptPower: this.outputs.mpptPower,
          acPower: this.outputs.acPower,
          loadDemand: this.params.loadDemand,
          isPaused: this.isPaused,
          highlightStep: this.currentStep
        });
      }
      requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);

    setInterval(() => {
      if (!this.isPaused) {
        this.chartEngine.addTelemetryPoint({
          acPower: this.outputs.acPower,
          loadDemand: this.params.loadDemand,
          powerBalance: this.outputs.powerBalance
        });
        if (this.currentGraphMode === 'load-telemetry') {
          this.renderGraph();
        }
      }
    }, 500);
  }
}
