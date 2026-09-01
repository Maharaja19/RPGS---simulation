/**
 * RPGS WIND ENERGY SIMULATION MODULE (REFACTORED)
 * Complete System Pipeline: Wind -> Rotor -> Shaft -> Generator -> Rectifier/DC Link -> Inverter -> Load
 */

class WindSimulator {
  constructor() {
    this.params = {
      windSpeed: 12,       // m/s (0 - 30)
      rotorRadius: 45,     // m (10 - 60)
      airDensity: 1.225,   // kg/m³ (1.0 - 1.3)
      cp: 0.40,            // 0.1 - 0.59 (Betz limit: 0.593)
      genEfficiency: 0.90, // 90% (0.70 - 0.98)
      rectEfficiency: 0.97,// 97%
      invEfficiency: 0.96, // 96%
      loadDemandMW: 2.0    // MW (0 - 5 MW industrial load)
    };

    this.outputs = {
      windPowerMW: 0,
      mechPowerMW: 0,
      genPowerMW: 0,
      dcLinkPowerMW: 0,
      acPowerMW: 0,
      acPowerKW: 0,
      powerBalanceMW: 0,
      overallEfficiency: 0,
      voltageAC: 690,
      currentAC: 0,
      rpm: 0,
      sweptArea: 0,
      status: 'GENERATING',
      statusClass: 'generating'
    };

    this.isPaused = false;
    this.currentGraphMode = 'load-telemetry'; // 'load-telemetry', 'stage-flow', 'power-curve'
    this.currentStep = 0;
    this.animEngine = null;
    this.chartEngine = null;
  }

  init() {
    this.animEngine = new SimAnimationEngine('wind-canvas');
    this.chartEngine = new SimChartEngine('wind-graph-canvas');

    this.bindDOM();
    this.calculate();
    this.updateUI();
    this.startLoop();
  }

  bindDOM() {
    const inputs = ['windSpeed', 'rotorRadius', 'airDensity', 'cp', 'genEfficiency', 'loadDemandMW'];
    inputs.forEach(key => {
      const el = document.getElementById(`wind-${key}`);
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
      'preset-wind-calm': { windSpeed: 0, rotorRadius: 45, airDensity: 1.225, cp: 0.40, genEfficiency: 0.90, loadDemandMW: 1.5 },
      'preset-wind-cutin': { windSpeed: 4.5, rotorRadius: 45, airDensity: 1.225, cp: 0.38, genEfficiency: 0.88, loadDemandMW: 0.5 },
      'preset-wind-rated': { windSpeed: 12, rotorRadius: 45, airDensity: 1.225, cp: 0.40, genEfficiency: 0.90, loadDemandMW: 2.0 },
      'preset-wind-storm': { windSpeed: 26, rotorRadius: 45, airDensity: 1.225, cp: 0.40, genEfficiency: 0.90, loadDemandMW: 2.5 }
    };

    Object.entries(presets).forEach(([id, vals]) => {
      const btn = document.getElementById(id);
      if (btn) {
        btn.addEventListener('click', () => {
          Object.assign(this.params, vals);
          Object.entries(vals).forEach(([k, v]) => {
            const inputEl = document.getElementById(`wind-${k}`);
            if (inputEl) inputEl.value = v;
          });
          document.querySelectorAll('.wind-preset-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');

          this.calculate();
          this.updateUI();
        });
      }
    });

    // Pause / Reset
    const pauseBtn = document.getElementById('wind-btn-pause');
    if (pauseBtn) pauseBtn.addEventListener('click', () => this.togglePause());

    const resetBtn = document.getElementById('wind-btn-reset');
    if (resetBtn) resetBtn.addEventListener('click', () => this.reset());

    // Step-by-Step
    const stepBtn = document.getElementById('wind-btn-step');
    if (stepBtn) stepBtn.addEventListener('click', () => this.toggleStepWalkthrough());

    const stepPrev = document.getElementById('wind-step-prev');
    if (stepPrev) stepPrev.addEventListener('click', () => this.navStep(-1));

    const stepNext = document.getElementById('wind-step-next');
    if (stepNext) stepNext.addEventListener('click', () => this.navStep(1));

    const stepExit = document.getElementById('wind-step-exit');
    if (stepExit) stepExit.addEventListener('click', () => this.toggleStepWalkthrough(false));

    // Interactive Component Inspector Clicks
    document.querySelectorAll('[data-wind-component]').forEach(el => {
      el.addEventListener('click', () => {
        const compKey = el.dataset.windComponent;
        window.RpgsApp?.showComponentModal(compKey);
      });
    });

    // Graph Tabs
    const graphTabs = document.querySelectorAll('.wind-graph-tab');
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
    let { windSpeed, rotorRadius, airDensity, cp, genEfficiency, rectEfficiency, invEfficiency, loadDemandMW } = this.params;

    cp = Math.min(0.593, Math.max(0, cp));
    windSpeed = Math.max(0, windSpeed);
    rotorRadius = Math.max(1, rotorRadius);

    // 1. Swept Area & Total Kinetic Wind Power Available
    const sweptArea = Math.PI * Math.pow(rotorRadius, 2);
    const totalWindPowerW = 0.5 * airDensity * sweptArea * Math.pow(windSpeed, 3);
    const windPowerMW = totalWindPowerW / 1e6;

    // 2. Aerodynamic Regimes
    const vCutIn = 3.0;
    const vRated = 12.5;
    const vCutOut = 25.0;

    let mechPowerW = 0;
    let rpm = 0;

    if (windSpeed < vCutIn || windSpeed >= vCutOut) {
      mechPowerW = 0;
      rpm = 0;
    } else if (windSpeed <= vRated) {
      mechPowerW = totalWindPowerW * cp;
      rpm = Math.min(22, (30 * 7.0 * windSpeed) / (Math.PI * rotorRadius));
    } else {
      // Pitch regulation clamps to rated capacity
      const ratedKinetic = 0.5 * airDensity * sweptArea * Math.pow(vRated, 3);
      mechPowerW = ratedKinetic * cp;
      rpm = Math.min(22, (30 * 7.0 * vRated) / (Math.PI * rotorRadius));
    }

    const mechPowerMW = mechPowerW / 1e6;

    // 3. Generator Stage
    const genPowerW = mechPowerW * genEfficiency;
    const genPowerMW = genPowerW / 1e6;

    // 4. Rectifier / DC Link
    const dcLinkPowerW = genPowerW * rectEfficiency;
    const dcLinkPowerMW = dcLinkPowerW / 1e6;

    // 5. Inverter Stage (DC -> AC 690V)
    const acPowerW = dcLinkPowerW * invEfficiency;
    const acPowerMW = acPowerW / 1e6;
    const acPowerKW = acPowerW / 1e3;
    const voltageAC = acPowerW > 100 ? 690 : 0;
    const currentAC = voltageAC > 0 ? (acPowerW / (Math.sqrt(3) * voltageAC * 0.95)) : 0;

    // 6. Overall System Efficiency
    const overallEfficiency = totalWindPowerW > 0 ? (acPowerW / totalWindPowerW) * 100 : 0;

    // 7. Power Balance against Load Demand
    const balanceObj = RpgsElectricalModel.calculatePowerBalance(acPowerMW, loadDemandMW);

    if (windSpeed >= vCutOut) {
      balanceObj.status = 'HIGH WIND / PROTECTION';
      balanceObj.statusClass = 'danger';
    } else if (windSpeed < vCutIn) {
      balanceObj.status = 'NOT GENERATING';
      balanceObj.statusClass = 'danger';
    }

    this.outputs = {
      windPowerMW,
      mechPowerMW,
      genPowerMW,
      dcLinkPowerMW,
      acPowerMW,
      acPowerKW,
      powerBalanceMW: balanceObj.balance,
      overallEfficiency,
      voltageAC,
      currentAC,
      rpm,
      sweptArea,
      status: balanceObj.status,
      statusClass: balanceObj.statusClass
    };
  }

  updateUI() {
    const setElemText = (id, txt) => {
      const el = document.getElementById(id);
      if (el) el.textContent = txt;
    };

    setElemText('wind-val-windSpeed', `${this.params.windSpeed.toFixed(1)} m/s`);
    setElemText('wind-val-rotorRadius', `${this.params.rotorRadius} m`);
    setElemText('wind-val-airDensity', `${this.params.airDensity.toFixed(3)} kg/m³`);
    setElemText('wind-val-cp', this.params.cp.toFixed(2));
    setElemText('wind-val-genEfficiency', `${Math.round(this.params.genEfficiency * 100)}%`);
    setElemText('wind-val-loadDemandMW', `${this.params.loadDemandMW.toFixed(2)} MW`);

    // Primary Output Cards
    setElemText('wind-out-acpower', `${this.outputs.acPowerMW.toFixed(2)} MW`);
    setElemText('wind-out-demand', `${this.params.loadDemandMW.toFixed(2)} MW`);

    const balanceElem = document.getElementById('wind-out-balance');
    if (balanceElem) {
      const sign = this.outputs.powerBalanceMW > 0 ? '+' : '';
      balanceElem.textContent = `${sign}${this.outputs.powerBalanceMW.toFixed(2)} MW`;
      balanceElem.style.color = this.outputs.powerBalanceMW >= 0 ? '#10b981' : '#f59e0b';
    }

    setElemText('wind-out-eff', `${this.outputs.overallEfficiency.toFixed(1)}%`);

    // Secondary Electrical Metrics Bar
    setElemText('wind-sub-genpower', `${this.outputs.genPowerMW.toFixed(2)} MW`);
    setElemText('wind-sub-dclink', `${this.outputs.dcLinkPowerMW.toFixed(2)} MW`);
    setElemText('wind-sub-voltage', `${this.outputs.voltageAC} V AC`);
    setElemText('wind-sub-current', `${this.outputs.currentAC.toFixed(0)} A`);

    // Process Chain Stage Metric Badges
    setElemText('stage-wind-source-val', `${this.params.windSpeed.toFixed(1)} m/s (${this.outputs.windPowerMW.toFixed(1)}MW)`);
    setElemText('stage-wind-rotor-val', `${this.outputs.mechPowerMW.toFixed(2)} MW (${this.outputs.rpm.toFixed(1)} RPM)`);
    setElemText('stage-wind-gen-val', `${this.outputs.genPowerMW.toFixed(2)} MW`);
    setElemText('stage-wind-rect-val', `${this.outputs.dcLinkPowerMW.toFixed(2)} MW DC`);
    setElemText('stage-wind-inv-val', `${this.outputs.acPowerMW.toFixed(2)} MW AC`);
    setElemText('stage-wind-load-val', `${this.params.loadDemandMW.toFixed(2)} MW Req`);

    // Status Pill
    const statusPill = document.getElementById('wind-status-pill');
    const statusText = document.getElementById('wind-status-text');
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
        title: 'WIND AC GENERATION VS LOAD DEMAND',
        series: [
          { key: 'acPowerMW', name: 'AC Generation', color: '#38bdf8', unit: 'MW' },
          { key: 'loadDemandMW', name: 'Load Demand', color: '#fbbf24', unit: 'MW' },
          { key: 'powerBalanceMW', name: 'Power Balance', color: '#10b981', unit: 'MW' }
        ]
      });
    } else if (this.currentGraphMode === 'stage-flow') {
      this.chartEngine.renderStagePowerFlow({
        title: 'WIND POWER CONVERSION PIPELINE (MW)',
        stages: [
          { name: 'Wind Kinetic', power: this.outputs.windPowerMW, unit: 'MW', color: '#38bdf8' },
          { name: 'Rotor Mech', power: this.outputs.mechPowerMW, unit: 'MW', color: '#00f2fe' },
          { name: 'Generator', power: this.outputs.genPowerMW, unit: 'MW', color: '#fbbf24' },
          { name: 'DC Link', power: this.outputs.dcLinkPowerMW, unit: 'MW', color: '#6366f1' },
          { name: 'Inverter AC', power: this.outputs.acPowerMW, unit: 'MW', color: '#10b981' },
          { name: 'Load Demand', power: this.params.loadDemandMW, unit: 'MW', color: '#f59e0b' }
        ]
      });
    } else if (this.currentGraphMode === 'power-curve') {
      const A = this.outputs.sweptArea || Math.PI * Math.pow(this.params.rotorRadius, 2);
      const rho = this.params.airDensity;
      const cp = this.params.cp;
      const eta = this.params.genEfficiency * this.params.rectEfficiency * this.params.invEfficiency;
      const ratedP = (0.5 * rho * A * Math.pow(12.5, 3) * cp * eta) / 1e6;

      this.chartEngine.renderFunctionCurve({
        title: 'WIND TURBINE POWER CURVE (P vs Vwind)',
        xLabel: 'Wind Speed (m/s)',
        yLabel: 'Net AC Power (MW)',
        xMin: 0,
        xMax: 30,
        yMin: 0,
        yMax: Math.max(3.5, Math.ceil(ratedP * 1.3)),
        curves: [
          {
            name: 'Power Curve',
            color: '#38bdf8',
            fill: true,
            fillColor: 'rgba(56, 189, 248, 0.1)',
            fn: (v) => {
              if (v < 3.0 || v >= 25.0) return 0;
              if (v >= 12.5) return ratedP;
              return (0.5 * rho * A * Math.pow(v, 3) * cp * eta) / 1e6;
            }
          }
        ],
        markers: [
          {
            x: this.params.windSpeed,
            y: this.outputs.acPowerMW,
            label: `Op Point (${this.params.windSpeed.toFixed(1)} m/s, ${this.outputs.acPowerMW.toFixed(2)} MW)`,
            color: '#00f2fe'
          }
        ]
      });
    }
  }

  toggleStepWalkthrough(forceState) {
    const hud = document.getElementById('wind-step-hud');
    const stepBtn = document.getElementById('wind-btn-step');
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
      document.querySelectorAll('[data-wind-step]').forEach(el => el.classList.remove('step-highlighted'));
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
      1: { title: 'STEP 1: ENERGY SOURCE (WIND)', desc: 'Kinetic energy in moving atmospheric air. Power scales cubically with velocity: P = 0.5·ρ·A·V³.' },
      2: { title: 'STEP 2: PRIMARY CONVERTER (ROTOR BLADES)', desc: 'Aerofoil blades create aerodynamic lift, converting linear wind momentum into low-speed shaft torque.' },
      3: { title: 'STEP 3: GENERATOR (MECHANICAL TO ELECTRICAL)', desc: 'Gearbox steps up RPM and drives the alternator to generate variable-frequency AC electricity.' },
      4: { title: 'STEP 4: RECTIFIER & DC LINK', desc: 'Converts variable generator AC to intermediate DC to decouple grid frequency from wind speed.' },
      5: { title: 'STEP 5: GRID INVERTER (DC → AC)', desc: 'Full-scale frequency inverter synthesizes clean 690V 50Hz AC electricity synchronized to grid standards.' },
      6: { title: 'STEP 6: INDUSTRIAL / UTILITY LOAD', desc: 'Supplies electrical power to the consumer grid, dynamically balancing supply and demand.' }
    };

    const info = stepDescriptions[this.currentStep];
    const titleEl = document.getElementById('wind-step-hud-title');
    const descEl = document.getElementById('wind-step-hud-desc');
    if (titleEl) titleEl.textContent = info.title;
    if (descEl) descEl.textContent = info.desc;

    document.querySelectorAll('[data-wind-step]').forEach(el => {
      el.classList.toggle('step-highlighted', parseInt(el.dataset.windStep) === this.currentStep);
    });
  }

  togglePause() {
    this.isPaused = !this.isPaused;
    const btn = document.getElementById('wind-btn-pause');
    if (btn) {
      btn.innerHTML = this.isPaused
        ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg> Resume'
        : '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg> Pause';
      btn.classList.toggle('is-paused', this.isPaused);
    }
  }

  reset() {
    this.params = {
      windSpeed: 12,
      rotorRadius: 45,
      airDensity: 1.225,
      cp: 0.40,
      genEfficiency: 0.90,
      rectEfficiency: 0.97,
      invEfficiency: 0.96,
      loadDemandMW: 2.0
    };

    ['windSpeed', 'rotorRadius', 'airDensity', 'cp', 'genEfficiency', 'loadDemandMW'].forEach(k => {
      const el = document.getElementById(`wind-${k}`);
      if (el) el.value = this.params[k];
    });

    this.chartEngine.clear();
    this.isPaused = false;
    this.toggleStepWalkthrough(false);

    const btn = document.getElementById('wind-btn-pause');
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
        this.animEngine.renderWindScene({
          windSpeed: this.params.windSpeed,
          rotorRadius: this.params.rotorRadius,
          rpm: this.outputs.rpm,
          mechPower: this.outputs.mechPowerMW,
          genPower: this.outputs.genPowerMW,
          acPower: this.outputs.acPowerMW,
          loadDemand: this.params.loadDemandMW,
          status: this.outputs.status,
          isPaused: this.isPaused
        });
      }
      requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);

    setInterval(() => {
      if (!this.isPaused) {
        this.chartEngine.addTelemetryPoint({
          acPowerMW: this.outputs.acPowerMW,
          loadDemandMW: this.params.loadDemandMW,
          powerBalanceMW: this.outputs.powerBalanceMW
        });
        if (this.currentGraphMode === 'load-telemetry') {
          this.renderGraph();
        }
      }
    }, 500);
  }
}
