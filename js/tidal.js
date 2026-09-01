/**
 * RPGS TIDAL ENERGY SIMULATION MODULE (REFACTORED)
 * Complete System Pipeline: Tidal Current -> Subsea Rotor -> Shaft -> Generator -> Umbilical/DC Link -> Onshore Inverter -> Coastal Load
 */

class TidalSimulator {
  constructor() {
    this.params = {
      tidalSpeed: 2.2,     // m/s (0 - 5.0)
      turbineRadius: 8,    // m (2 - 15)
      seawaterDensity: 1025, // kg/m³
      cp: 0.40,            // 0.1 - 0.59
      genEfficiency: 0.94, // 94%
      rectEfficiency: 0.98,// 98%
      invEfficiency: 0.97, // 97% (Combined default: ~90.1%)
      waveHeight: 2.5,     // m (0.1 - 5.0)
      wavePeriod: 8,       // s (3 - 15)
      loadDemandKW: 300.0  // kW (0 - 600 kW coastal load)
    };

    this.outputs = {
      kineticPowerKW: 0,
      mechPowerKW: 0,
      genPowerKW: 0,
      dcLinkPowerKW: 0,
      acPowerKW: 0,
      acPowerMW: 0,
      powerBalanceKW: 0,
      overallEfficiency: 0,
      voltageAC: 690,
      currentAC: 0,
      rpm: 0,
      sweptArea: 0,
      status: 'ACTIVE GENERATION',
      statusClass: 'generating'
    };

    this.isPaused = false;
    this.currentGraphMode = 'load-telemetry'; // 'load-telemetry', 'stage-flow', 'power-speed'
    this.currentStep = 0;
    this.animEngine = null;
    this.chartEngine = null;
  }

  init() {
    this.animEngine = new SimAnimationEngine('tidal-canvas');
    this.chartEngine = new SimChartEngine('tidal-graph-canvas');

    this.bindDOM();
    this.calculate();
    this.updateUI();
    this.startLoop();
  }

  bindDOM() {
    const inputs = ['tidalSpeed', 'turbineRadius', 'cp', 'waveHeight', 'wavePeriod', 'loadDemandKW'];
    inputs.forEach(key => {
      const el = document.getElementById(`tidal-${key}`);
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
      'preset-tidal-calm': { tidalSpeed: 0.5, turbineRadius: 8, waveHeight: 0.5, wavePeriod: 5, cp: 0.35, loadDemandKW: 100.0 },
      'preset-tidal-moderate': { tidalSpeed: 2.2, turbineRadius: 8, waveHeight: 2.5, wavePeriod: 8, cp: 0.40, loadDemandKW: 300.0 },
      'preset-tidal-spring': { tidalSpeed: 3.5, turbineRadius: 10, waveHeight: 3.8, wavePeriod: 10, cp: 0.42, loadDemandKW: 500.0 },
      'preset-tidal-severe': { tidalSpeed: 4.8, turbineRadius: 12, waveHeight: 4.8, wavePeriod: 12, cp: 0.44, loadDemandKW: 600.0 }
    };

    Object.entries(presets).forEach(([id, vals]) => {
      const btn = document.getElementById(id);
      if (btn) {
        btn.addEventListener('click', () => {
          Object.assign(this.params, vals);
          Object.entries(vals).forEach(([k, v]) => {
            const inputEl = document.getElementById(`tidal-${k}`);
            if (inputEl) inputEl.value = v;
          });
          document.querySelectorAll('.tidal-preset-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');

          this.calculate();
          this.updateUI();
        });
      }
    });

    // Controls
    const pauseBtn = document.getElementById('tidal-btn-pause');
    if (pauseBtn) pauseBtn.addEventListener('click', () => this.togglePause());

    const resetBtn = document.getElementById('tidal-btn-reset');
    if (resetBtn) resetBtn.addEventListener('click', () => this.reset());

    // Step-by-Step
    const stepBtn = document.getElementById('tidal-btn-step');
    if (stepBtn) stepBtn.addEventListener('click', () => this.toggleStepWalkthrough());

    const stepPrev = document.getElementById('tidal-step-prev');
    if (stepPrev) stepPrev.addEventListener('click', () => this.navStep(-1));

    const stepNext = document.getElementById('tidal-step-next');
    if (stepNext) stepNext.addEventListener('click', () => this.navStep(1));

    const stepExit = document.getElementById('tidal-step-exit');
    if (stepExit) stepExit.addEventListener('click', () => this.toggleStepWalkthrough(false));

    // Interactive Component Inspector Clicks
    document.querySelectorAll('[data-tidal-component]').forEach(el => {
      el.addEventListener('click', () => {
        const compKey = el.dataset.tidalComponent;
        window.RpgsApp?.showComponentModal(compKey);
      });
    });

    // Graph Tabs
    const graphTabs = document.querySelectorAll('.tidal-graph-tab');
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
    const { tidalSpeed, turbineRadius, seawaterDensity, cp, genEfficiency, rectEfficiency, invEfficiency, loadDemandKW } = this.params;

    // 1. Swept Area & Total Marine Kinetic Power Available
    const sweptArea = Math.PI * Math.pow(turbineRadius, 2);
    const totalKineticPowerW = 0.5 * seawaterDensity * sweptArea * Math.pow(tidalSpeed, 3);
    const kineticPowerKW = totalKineticPowerW / 1e3;

    // 2. Mechanical Hydrokinetic Rotor Power
    const mechPowerW = tidalSpeed > 0.05 ? totalKineticPowerW * cp : 0;
    const mechPowerKW = mechPowerW / 1e3;

    // 3. Subsea Generator Stage
    const genPowerW = mechPowerW * genEfficiency;
    const genPowerKW = genPowerW / 1e3;

    // 4. Subsea Umbilical & DC Link
    const dcLinkPowerW = genPowerW * rectEfficiency;
    const dcLinkPowerKW = dcLinkPowerW / 1e3;

    // 5. Onshore Grid Inverter (DC -> AC 690V)
    // Formula verification: 0.5 * 1025 * π*8² * 2.2³ * 0.40 * 0.90 ≈ 395.2 kW
    const combinedSystemEff = cp * genEfficiency * rectEfficiency * invEfficiency;
    const acPowerW = totalKineticPowerW * combinedSystemEff;
    const acPowerKW = acPowerW / 1e3;
    const acPowerMW = acPowerW / 1e6;

    // Subsea RPM & AC Voltage
    const lambda = 4.0;
    const rpm = tidalSpeed > 0.05 ? Math.min(30, (30 * lambda * tidalSpeed) / (Math.PI * turbineRadius)) : 0;
    const voltageAC = acPowerKW > 0.5 ? 690 : 0;
    const currentAC = voltageAC > 0 ? (acPowerW / (Math.sqrt(3) * voltageAC * 0.95)) : 0;

    // 6. Overall System Efficiency
    const overallEfficiency = totalKineticPowerW > 0 ? (acPowerW / totalKineticPowerW) * 100 : 0;

    // 7. Power Balance against Coastal Load Demand
    const balanceObj = RpgsElectricalModel.calculatePowerBalance(acPowerKW, loadDemandKW);

    if (tidalSpeed <= 0.1) {
      balanceObj.status = 'LOW CURRENT';
      balanceObj.statusClass = 'danger';
    }

    this.outputs = {
      kineticPowerKW,
      mechPowerKW,
      genPowerKW,
      dcLinkPowerKW,
      acPowerKW,
      acPowerMW,
      powerBalanceKW: balanceObj.balance,
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

    setElemText('tidal-val-tidalSpeed', `${this.params.tidalSpeed.toFixed(1)} m/s`);
    setElemText('tidal-val-turbineRadius', `${this.params.turbineRadius} m`);
    setElemText('tidal-val-cp', this.params.cp.toFixed(2));
    setElemText('tidal-val-waveHeight', `${this.params.waveHeight.toFixed(1)} m`);
    setElemText('tidal-val-wavePeriod', `${this.params.wavePeriod} s`);
    setElemText('tidal-val-loadDemandKW', `${this.params.loadDemandKW.toFixed(0)} kW`);

    // Primary 4 Output Cards
    setElemText('tidal-out-acpower', `${this.outputs.acPowerKW.toFixed(1)} kW`);
    setElemText('tidal-out-demand', `${this.params.loadDemandKW.toFixed(0)} kW`);

    const balanceElem = document.getElementById('tidal-out-balance');
    if (balanceElem) {
      const sign = this.outputs.powerBalanceKW > 0 ? '+' : '';
      balanceElem.textContent = `${sign}${this.outputs.powerBalanceKW.toFixed(1)} kW`;
      balanceElem.style.color = this.outputs.powerBalanceKW >= 0 ? '#10b981' : '#f59e0b';
    }

    setElemText('tidal-out-eff', `${this.outputs.overallEfficiency.toFixed(1)}%`);

    // Secondary Electrical Metrics Bar
    setElemText('tidal-sub-mechpower', `${this.outputs.mechPowerKW.toFixed(1)} kW`);
    setElemText('tidal-sub-dclink', `${this.outputs.dcLinkPowerKW.toFixed(1)} kW DC`);
    setElemText('tidal-sub-voltage', `${this.outputs.voltageAC} V AC`);
    setElemText('tidal-sub-current', `${this.outputs.currentAC.toFixed(1)} A`);

    // Process Chain Stage Metric Badges
    setElemText('stage-tidal-source-val', `${this.params.tidalSpeed.toFixed(1)} m/s (${this.outputs.kineticPowerKW.toFixed(0)}kW)`);
    setElemText('stage-tidal-rotor-val', `${this.outputs.mechPowerKW.toFixed(1)} kW (${this.outputs.rpm.toFixed(1)} RPM)`);
    setElemText('stage-tidal-gen-val', `${this.outputs.genPowerKW.toFixed(1)} kW Subsea`);
    setElemText('stage-tidal-dclink-val', `${this.outputs.dcLinkPowerKW.toFixed(1)} kW DC`);
    setElemText('stage-tidal-inv-val', `${this.outputs.acPowerKW.toFixed(1)} kW AC`);
    setElemText('stage-tidal-load-val', `${this.params.loadDemandKW.toFixed(0)} kW Req`);

    // Status Pill
    const statusPill = document.getElementById('tidal-status-pill');
    const statusText = document.getElementById('tidal-status-text');
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
        title: 'TIDAL AC GENERATION VS COASTAL LOAD DEMAND',
        series: [
          { key: 'acPowerKW', name: 'Tidal Generation', color: '#6366f1', unit: 'kW' },
          { key: 'loadDemandKW', name: 'Load Demand', color: '#fbbf24', unit: 'kW' },
          { key: 'powerBalanceKW', name: 'Power Balance', color: '#10b981', unit: 'kW' }
        ]
      });
    } else if (this.currentGraphMode === 'stage-flow') {
      this.chartEngine.renderStagePowerFlow({
        title: 'TIDAL STREAM POWER CONVERSION PIPELINE (kW)',
        stages: [
          { name: 'Marine Kinetic', power: this.outputs.kineticPowerKW, unit: 'kW', color: '#6366f1' },
          { name: 'Subsea Rotor', power: this.outputs.mechPowerKW, unit: 'kW', color: '#38bdf8' },
          { name: 'Subsea Gen', power: this.outputs.genPowerKW, unit: 'kW', color: '#00f2fe' },
          { name: 'Umbilical DC', power: this.outputs.dcLinkPowerKW, unit: 'kW', color: '#a5b4fc' },
          { name: 'Shore Inverter', power: this.outputs.acPowerKW, unit: 'kW', color: '#10b981' },
          { name: 'Coastal Load', power: this.params.loadDemandKW, unit: 'kW', color: '#f59e0b' }
        ]
      });
    } else if (this.currentGraphMode === 'power-speed') {
      const rho = this.params.seawaterDensity;
      const A = this.outputs.sweptArea || Math.PI * Math.pow(this.params.turbineRadius, 2);
      const cp = this.params.cp;
      const eta = this.params.genEfficiency * this.params.rectEfficiency * this.params.invEfficiency;
      const maxPowerKW = (0.5 * rho * A * Math.pow(5.0, 3) * cp * eta) / 1e3;

      this.chartEngine.renderFunctionCurve({
        title: 'TIDAL TURBINE POWER vs CURRENT SPEED (P vs Vcurrent)',
        xLabel: 'Current Velocity (m/s)',
        yLabel: 'Net AC Power (kW)',
        xMin: 0,
        xMax: 5.0,
        yMin: 0,
        yMax: Math.max(500, Math.ceil(maxPowerKW * 1.1)),
        curves: [
          {
            name: 'P vs V',
            color: '#6366f1',
            fill: true,
            fillColor: 'rgba(99, 102, 241, 0.12)',
            fn: (v) => (0.5 * rho * A * Math.pow(v, 3) * cp * eta) / 1e3
          }
        ],
        markers: [
          {
            x: this.params.tidalSpeed,
            y: this.outputs.acPowerKW,
            label: `Op Point (${this.params.tidalSpeed.toFixed(1)} m/s, ${this.outputs.acPowerKW.toFixed(1)} kW)`,
            color: '#a5b4fc'
          }
        ]
      });
    }
  }

  toggleStepWalkthrough(forceState) {
    const hud = document.getElementById('tidal-step-hud');
    const stepBtn = document.getElementById('tidal-btn-step');
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
      document.querySelectorAll('[data-tidal-step]').forEach(el => el.classList.remove('step-highlighted'));
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
      1: { title: 'STEP 1: ENERGY SOURCE (TIDAL CURRENT)', desc: 'Dense seawater flow (ρ = 1025 kg/m³) driven by gravitational lunar orbital cycles.' },
      2: { title: 'STEP 2: PRIMARY CONVERTER (SUBSEA ROTOR)', desc: 'Hydrokinetic bi-directional blades extract kinetic momentum from underwater marine currents.' },
      3: { title: 'STEP 3: SEALED SUBSEA GENERATOR', desc: 'Direct-drive permanent magnet generator sealed inside marine nacelle producing raw AC power.' },
      4: { title: 'STEP 4: SUBSEA UMBILICAL & DC LINK', desc: 'Seabed cable rectifies AC to high-voltage DC to minimize transmission losses to the shoreline.' },
      5: { title: 'STEP 5: ONSHORE GRID INVERTER', desc: 'Shore substation converts subsea DC bus power into clean, synchronized 690V 3-phase AC power.' },
      6: { title: 'STEP 6: COASTAL COMMUNITY LOAD', desc: 'Provides reliable, highly predictable renewable power to coastal communities and harbours.' }
    };

    const info = stepDescriptions[this.currentStep];
    const titleEl = document.getElementById('tidal-step-hud-title');
    const descEl = document.getElementById('tidal-step-hud-desc');
    if (titleEl) titleEl.textContent = info.title;
    if (descEl) descEl.textContent = info.desc;

    document.querySelectorAll('[data-tidal-step]').forEach(el => {
      el.classList.toggle('step-highlighted', parseInt(el.dataset.tidalStep) === this.currentStep);
    });
  }

  togglePause() {
    this.isPaused = !this.isPaused;
    const btn = document.getElementById('tidal-btn-pause');
    if (btn) {
      btn.innerHTML = this.isPaused
        ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg> Resume'
        : '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg> Pause';
      btn.classList.toggle('is-paused', this.isPaused);
    }
  }

  reset() {
    this.params = {
      tidalSpeed: 2.2,
      turbineRadius: 8,
      seawaterDensity: 1025,
      cp: 0.40,
      genEfficiency: 0.94,
      rectEfficiency: 0.98,
      invEfficiency: 0.97,
      waveHeight: 2.5,
      wavePeriod: 8,
      loadDemandKW: 300.0
    };

    ['tidalSpeed', 'turbineRadius', 'cp', 'waveHeight', 'wavePeriod', 'loadDemandKW'].forEach(k => {
      const el = document.getElementById(`tidal-${k}`);
      if (el) el.value = this.params[k];
    });

    this.chartEngine.clear();
    this.isPaused = false;
    this.toggleStepWalkthrough(false);

    const btn = document.getElementById('tidal-btn-pause');
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
        this.animEngine.renderTidalScene({
          tidalSpeed: this.params.tidalSpeed,
          turbineRadius: this.params.turbineRadius,
          waveHeight: this.params.waveHeight,
          wavePeriod: this.params.wavePeriod,
          acPower: this.outputs.acPowerKW,
          loadDemand: this.params.loadDemandKW,
          isPaused: this.isPaused
        });
      }
      requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);

    setInterval(() => {
      if (!this.isPaused) {
        this.chartEngine.addTelemetryPoint({
          acPowerKW: this.outputs.acPowerKW,
          loadDemandKW: this.params.loadDemandKW,
          powerBalanceKW: this.outputs.powerBalanceKW
        });
        if (this.currentGraphMode === 'load-telemetry') {
          this.renderGraph();
        }
      }
    }, 500);
  }
}
