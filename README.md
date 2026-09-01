# RPGS Renewable Energy System Simulation Suite
### Renewable Power Generation Systems (RPGS) — Assignment – 1

An interactive, academic-grade web-based simulation platform for exploring and analyzing the physical conversion pipelines, power conditioning, and electrical load balancing of four core renewable energy systems:
1. **[Solar PV System (`solar.html`)](solar.html)**
2. **[Wind Energy System (`wind.html`)](wind.html)**
3. **[Hydro Energy System (`hydro.html`)](hydro.html)**
4. **[Tidal Stream & Ocean Wave System (`tidal.html`)](tidal.html)**

---

## ⚡ Multi-Page Architecture

To ensure a clean, focused, and intuitive user experience without overwhelming clutter, the application is organized into dedicated standalone pages:

```
RPGS/
├── index.html              # Main Landing Dashboard & System Pipeline Overview
├── solar.html              # Dedicated Solar PV & MPPT System Simulator
├── wind.html               # Dedicated Wind Turbine & Pitch System Simulator
├── hydro.html              # Dedicated Hydroelectric Dam & Sluice System Simulator
├── tidal.html              # Dedicated Marine Current & Subsea System Simulator
├── css/
│   ├── global.css          # Design tokens, 6-stage process flow, modal & HUD styling
│   ├── dashboard.css       # Landing page cards & hero section
│   ├── solar.css           # Solar module theme
│   ├── wind.css            # Wind module theme
│   ├── hydro.css           # Hydro module theme
│   └── tidal.css           # Tidal module theme
└── js/
    ├── app.js              # Page initializer, component inspector modal & shortcuts
    ├── electricalModel.js  # Stage-by-stage calculations & component knowledge base
    ├── charts.js           # Stage-by-stage power breakdown & live load balance telemetry
    ├── animations.js       # 60 FPS Canvas physics & continuous energy pulse engine
    ├── solar.js            # Solar PV system pipeline controller
    ├── wind.js             # Wind turbine system pipeline controller
    ├── hydro.js            # Hydroelectric dam system pipeline controller
    └── tidal.js            # Marine tidal stream system pipeline controller
```

---

## 🚀 Key Features on Each Simulator Page

1. **6-Stage Interactive Process Flow Diagram**:
   - `Source → Converter → Generator → Power Conditioning → Inverter → Load`.
   - Displays real-time stage metrics and energy type badges.
   - **Click-to-Inspect**: Clicking any stage opens an educational component modal with energy conversions, typical efficiency, and governing principles.
2. **Step-by-Step Educational Energy Walkthrough**:
   - Click **Step-by-Step Flow** on any simulator to step from Step 1 through Step 6 with spotlight highlighting and detailed descriptions.
3. **Dynamic Electrical Load Balancer**:
   - Interactive **Load Demand** slider on all four simulators.
   - Live calculation of **Power Balance** ($\Delta P = P_{AC} - P_{Load}$) with `POWER SURPLUS`, `LOAD BALANCED`, or `POWER DEFICIT` status.
4. **60 FPS Canvas Physics & Energy Flow Animations**:
   - Continuous animated energy pulses traveling along physical cables and conduits from source to load.
5. **Multi-Tab Canvas Telemetry**:
   - **Generation vs Load Demand (Live)** rolling telemetry.
   - **Stage-by-Stage Power Breakdown** column chart.
   - **Physics Characteristic Curves** ($I-V$, Power vs Wind $V^3$, Power vs Flow $Q$, Power vs Current $V$).

---

## 🛠️ How to Run

1. **Direct Browser Execution**:
   - Double-click [`index.html`](file:///c:/Users/mmaha/Projects/RPGS/index.html) in any web browser.
2. **Local Web Server**:
   ```bash
   python -m http.server 3000
   ```
   Open `http://localhost:3000`.
