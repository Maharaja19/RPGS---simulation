/**
 * RPGS HYDRO ENERGY SIMULATION MODULE (REFACTORED)
 * Complete System Pipeline: Reservoir -> Penstock -> Turbine -> Generator -> Conditioning -> Grid Substation -> Load
 */

class HydroSimulator {
  constructor() {
    this.params = {
      head: 80,            // Hydraulic Head Height in meters (10 - 150)
      flow: 65,            // Water Flow Rate in m³/s (0 - 120)
      turbineEfficiency: 0.92, // 92%
      genEfficiency: 0.98,     // 98% (Combined default: ~90.16%)
      condEfficiency: 0.99,    // 99%
      loadDemandMW: 40.0       // MW (0 - 80 MW regional load)
    };

    this.outputs = {
      hydraulicPowerMW: 0,
      mechPowerMW: 0,
      genPowerMW: 0,
      acPowerMW: 0,
      powerBalanceMW: 0,
      overallEfficiency: 0,
      voltageKV: 13.8,
      currentA: 0,
      status: 'GENERATING',
      statusClass: 'generating'
    };

    this.isPaused = false;
    this.currentGraphMode = 'load-telemetry'; // 'load-telemetry', 'stage-flow', 'power-flow'
    this.currentStep = 0;
    this.animEngine = null;
    this.chartEngine = null;
  }

  init() {
    this.animEngine = new SimAnimationEngine('hydro-canvas');
    this.chartEngine = new SimChartEngine('hydro-graph-canvas');

    this.bindDOM();
    this.calculate();
    this.updateUI();
    this.startLoop();
  }

  bindDOM() {
    const inputs = ['head', 'flow', 'loadDemandMW'];
    inputs.forEach(key => {
      const el = document.getElementById(`hydro-${key}`);
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
      'preset-hydro-closed': { flow: 0, head: 80, loadDemandMW: 30.0 },
      'preset-hydro-baseload': { flow: 40, head: 75, loadDemandMW: 25.0 },
      'preset-hydro-peak': { flow: 65, head: 80, loadDemandMW: 40.0 },
      'preset-hydro-max': { flow: 115, head: 140, loadDemandMW: 70.0 }
    };

    Object.entries(presets).forEach(([id, vals]) => {
      const btn = document.getElementById(id);
      if (btn) {
        btn.addEventListener('click', () => {
          Object.assign(this.params, vals);
          Object.entries(vals).forEach(([k, v]) => {
            const inputEl = document.getElementById(`hydro-${k}`);
            if (inputEl) inputEl.value = v;
          });
          document.querySelectorAll('.hydro-preset-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');

          this.calculate();
          this.updateUI();
        });
      }
    });

    // Pause / Reset
    const pauseBtn = document.getElementById('hydro-btn-pause');
    if (pauseBtn) pauseBtn.addEventListener('click', () => this.togglePause());

    const resetBtn = document.getElementById('hydro-btn-reset');
    if (resetBtn) resetBtn.addEventListener('click', () => this.reset());

    // Step-by-Step
    const stepBtn = document.getElementById('hydro-btn-step');
    if (stepBtn) stepBtn.addEventListener('click', () => this.toggleStepWalkthrough());

    const stepPrev = document.getElementById('hydro-step-prev');
    if (stepPrev) stepPrev.addEventListener('click', () => this.navStep(-1));

    const stepNext = document.getElementById('hydro-step-next');
    if (stepNext) stepNext.addEventListener('click', () => this.navStep(1));

    const stepExit = document.getElementById('hydro-step-exit');
    if (stepExit) stepExit.addEventListener('click', () => this.toggleStepWalkthrough(false));

    // Interactive Component Inspector Clicks
    document.querySelectorAll('[data-hydro-component]').forEach(el => {
      el.addEventListener('click', () => {
        const compKey = el.dataset.hydroComponent;
        window.RpgsApp?.showComponentModal(compKey);
      });
    });

    // Graph Tabs
    const graphTabs = document.querySelectorAll('.hydro-graph-tab');
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
    const { head, flow, turbineEfficiency, genEfficiency, condEfficiency, loadDemandMW } = this.params;

    // Physical Constants
    const rho = 1000; // Fresh water density (kg/m³)
    const g = 9.81;   // Gravitational acceleration (m/s²)

    // 1. Gross Hydraulic Power: P_hyd = ρ * g * Q * H
    const hydraulicPowerW = rho * g * flow * head;
    const hydraulicPowerMW = hydraulicPowerW / 1e6;

    // 2. Mechanical Turbine Runner Power
    const mechPowerW = hydraulicPowerW * turbineEfficiency;
    const mechPowerMW = mechPowerW / 1e6;

    // 3. Generator Alternator Power
    const genPowerW = mechPowerW * genEfficiency;
    const genPowerMW = genPowerW / 1e6;

    // 4. Net Electrical Grid Power (After Substation & Conditioning)
    // Formula verification: 1000 * 9.81 * 65 * 80 * 0.90 = 45.91 MW
    const combinedSystemEff = turbineEfficiency * genEfficiency * condEfficiency;
    const acPowerW = hydraulicPowerW * combinedSystemEff;
    const acPowerMW = acPowerW / 1e6;

    // Generator Voltage & Current
    const voltageKV = flow > 0.1 ? 13.8 : 0;
    const currentA = voltageKV > 0 ? (acPowerW / (Math.sqrt(3) * voltageKV * 1000 * 0.9)) : 0;

    // 5. Overall System Efficiency
    const overallEfficiency = hydraulicPowerMW > 0 ? (acPowerMW / hydraulicPowerMW) * 100 : 0;

    // 6. Power Balance against Regional Grid Demand
    const balanceObj = RpgsElectricalModel.calculatePowerBalance(acPowerMW, loadDemandMW);

    if (flow <= 0.1) {
      balanceObj.status = 'NO FLOW';
      balanceObj.statusClass = 'danger';
    }

    this.outputs = {
      hydraulicPowerMW,
      mechPowerMW,
      genPowerMW,
      acPowerMW,
      powerBalanceMW: balanceObj.balance,
      overallEfficiency,
      voltageKV,
      currentA,
      status: balanceObj.status,
      statusClass: balanceObj.statusClass
    };
  }

  updateUI() {
    const setElemText = (id, txt) => {
      const el = document.getElementById(id);
      if (el) el.textContent = txt;
    };

    setElemText('hydro-val-head', `${this.params.head} m`);
    setElemText('hydro-val-flow', `${this.params.flow} m³/s`);
    setElemText('hydro-val-loadDemandMW', `${this.params.loadDemandMW.toFixed(1)} MW`);

    // Primary 4 Output Cards
    setElemText('hydro-out-acpower', `${this.outputs.acPowerMW.toFixed(2)} MW`);
    setElemText('hydro-out-demand', `${this.params.loadDemandMW.toFixed(1)} MW`);

    const balanceElem = document.getElementById('hydro-out-balance');
    if (balanceElem) {
      const sign = this.outputs.powerBalanceMW > 0 ? '+' : '';
      balanceElem.textContent = `${sign}${this.outputs.powerBalanceMW.toFixed(2)} MW`;
      balanceElem.style.color = this.outputs.powerBalanceMW >= 0 ? '#10b981' : '#f59e0b';
    }

    setElemText('hydro-out-eff', `${this.outputs.overallEfficiency.toFixed(1)}%`);

    // Secondary Electrical Metrics Bar
    setElemText('hydro-sub-hydpower', `${this.outputs.hydraulicPowerMW.toFixed(2)} MW`);
    setElemText('hydro-sub-genpower', `${this.outputs.genPowerMW.toFixed(2)} MW`);
    setElemText('hydro-sub-voltage', `${this.outputs.voltageKV.toFixed(1)} kV AC`);
    setElemText('hydro-sub-current', `${this.outputs.currentA.toFixed(0)} A`);

    // Process Chain Stage Metric Badges
    setElemText('stage-hydro-source-val', `${(this.params.head * 1.15).toFixed(0)}m ASL (${this.outputs.hydraulicPowerMW.toFixed(1)}MW)`);
    setElemText('stage-hydro-penstock-val', `${this.params.flow} m³/s Flow`);
    setElemText('stage-hydro-turb-val', `${this.outputs.mechPowerMW.toFixed(2)} MW Mech`);
    setElemText('stage-hydro-gen-val', `${this.outputs.genPowerMW.toFixed(2)} MW Alternator`);
    setElemText('stage-hydro-sub-val', `${this.outputs.acPowerMW.toFixed(2)} MW (13.8kV)`);
    setElemText('stage-hydro-load-val', `${this.params.loadDemandMW.toFixed(1)} MW Req`);

    // Status Pill
    const statusPill = document.getElementById('hydro-status-pill');
    const statusText = document.getElementById('hydro-status-text');
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
        title: 'HYDROELECTRIC GENERATION VS GRID DEMAND',
        series: [
          { key: 'acPowerMW', name: 'Hydro Generation', color: '#06b6d4', unit: 'MW' },
          { key: 'loadDemandMW', name: 'Grid Demand', color: '#fbbf24', unit: 'MW' },
          { key: 'powerBalanceMW', name: 'Power Balance', color: '#10b981', unit: 'MW' }
        ]
      });
    } else if (this.currentGraphMode === 'stage-flow') {
      this.chartEngine.renderStagePowerFlow({
        title: 'HYDROELECTRIC POWER CONVERSION PIPELINE (MW)',
        stages: [
          { name: 'Hydraulic Gross', power: this.outputs.hydraulicPowerMW, unit: 'MW', color: '#06b6d4' },
          { name: 'Penstock Conduit', power: this.outputs.hydraulicPowerMW * 0.98, unit: 'MW', color: '#38bdf8' },
          { name: 'Francis Runner', power: this.outputs.mechPowerMW, unit: 'MW', color: '#00f2fe' },
          { name: 'Synchronous Gen', power: this.outputs.genPowerMW, unit: 'MW', color: '#6366f1' },
          { name: 'Substation AC', power: this.outputs.acPowerMW, unit: 'MW', color: '#10b981' },
          { name: 'Grid Demand', power: this.params.loadDemandMW, unit: 'MW', color: '#f59e0b' }
        ]
      });
    } else if (this.currentGraphMode === 'power-flow') {
      const H = this.params.head;
      const rho = 1000;
      const g = 9.81;
      const eta = 0.90;

      this.chartEngine.renderFunctionCurve({
        title: `HYDRO POWER vs FLOW RATE (Head H = ${H}m, η = ${(eta*100).toFixed(0)}%)`,
        xLabel: 'Flow Rate Q (m³/s)',
        yLabel: 'Hydro Power (MW)',
        xMin: 0,
        xMax: 120,
        yMin: 0,
        yMax: Math.max(80, Math.ceil((rho * g * 120 * H * eta / 1e6) * 1.1)),
        curves: [
          {
            name: 'P vs Q',
            color: '#06b6d4',
            fill: true,
            fillColor: 'rgba(6, 182, 212, 0.1)',
            fn: (q) => (rho * g * q * H * eta) / 1e6
          }
        ],
        markers: [
          {
            x: this.params.flow,
            y: this.outputs.acPowerMW,
            label: `Op Point (${this.params.flow} m³/s, ${this.outputs.acPowerMW.toFixed(2)} MW)`,
            color: '#22d3ee'
          }
        ]
      });
    }
  }

  toggleStepWalkthrough(forceState) {
    const hud = document.getElementById('hydro-step-hud');
    const stepBtn = document.getElementById('hydro-btn-step');
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
      document.querySelectorAll('[data-hydro-step]').forEach(el => el.classList.remove('step-highlighted'));
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
      1: { title: 'STEP 1: ENERGY SOURCE (RESERVOIR)', desc: 'High-elevation catchment storing gravitational potential energy: E_p = m·g·H.' },
      2: { title: 'STEP 2: PENSTOCK & SLUICE GATE', desc: 'Converts potential head into high-pressure kinetic fluid momentum flowing toward the powerhouse nozzles.' },
      3: { title: 'STEP 3: HYDRAULIC TURBINE (FRANCIS RUNNER)', desc: 'Water jets impact curved runner vanes, transferring hydrodynamic momentum into high-torque shaft rotation.' },
      4: { title: 'STEP 4: SYNCHRONOUS ALTERNATOR GENERATOR', desc: 'Multi-pole electromagnetic rotor generates massive 13.8kV 3-phase AC power locked to grid frequency.' },
      5: { title: 'STEP 5: POWER CONDITIONING & SUBSTATION', desc: 'Filters, regulates, and steps up voltage for high-efficiency, long-distance transmission lines.' },
      6: { title: 'STEP 6: REGIONAL GRID LOAD', desc: 'Distributes multi-megawatt clean energy across municipal, industrial, and commercial consumers.' }
    };

    const info = stepDescriptions[this.currentStep];
    const titleEl = document.getElementById('hydro-step-hud-title');
    const descEl = document.getElementById('hydro-step-hud-desc');
    if (titleEl) titleEl.textContent = info.title;
    if (descEl) descEl.textContent = info.desc;

    document.querySelectorAll('[data-hydro-step]').forEach(el => {
      el.classList.toggle('step-highlighted', parseInt(el.dataset.hydroStep) === this.currentStep);
    });
  }

  togglePause() {
    this.isPaused = !this.isPaused;
    const btn = document.getElementById('hydro-btn-pause');
    if (btn) {
      btn.innerHTML = this.isPaused
        ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg> Resume'
        : '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg> Pause';
      btn.classList.toggle('is-paused', this.isPaused);
    }
  }

  reset() {
    this.params = {
      head: 80,
      flow: 65,
      turbineEfficiency: 0.92,
      genEfficiency: 0.98,
      condEfficiency: 0.99,
      loadDemandMW: 40.0
    };

    ['head', 'flow', 'loadDemandMW'].forEach(k => {
      const el = document.getElementById(`hydro-${k}`);
      if (el) el.value = this.params[k];
    });

    this.chartEngine.clear();
    this.isPaused = false;
    this.toggleStepWalkthrough(false);

    const btn = document.getElementById('hydro-btn-pause');
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
        this.animEngine.renderHydroScene({
          head: this.params.head,
          flow: this.params.flow,
          hydPower: this.outputs.hydraulicPowerMW,
          acPower: this.outputs.acPowerMW,
          loadDemand: this.params.loadDemandMW,
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
