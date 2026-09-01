/**
 * RPGS ELECTRICAL & ENERGY FLOW COMMON SYSTEM MODEL
 * Handles stage-by-stage power degradation, DC links, Inverters, and Load Balancers.
 */

class RpgsElectricalModel {
  /**
   * Calculate Power Balance between AC Generation and Load Demand
   */
  static calculatePowerBalance(generatedACPower, loadDemand) {
    const balance = generatedACPower - loadDemand;
    let status = 'LOAD BALANCED';
    let statusClass = 'balanced';

    if (generatedACPower <= 0.001) {
      status = 'NO GENERATION';
      statusClass = 'danger';
    } else if (balance > 0.05 * (generatedACPower || 1)) {
      status = 'POWER SURPLUS';
      statusClass = 'surplus';
    } else if (balance < -0.05 * (loadDemand || 1)) {
      status = 'POWER DEFICIT';
      statusClass = 'deficit';
    } else {
      status = 'LOAD BALANCED';
      statusClass = 'balanced';
    }

    return {
      balance,
      isSurplus: balance > 0,
      isDeficit: balance < 0,
      status,
      statusClass
    };
  }

  /**
   * Format power with dynamic SI prefixes (W, kW, MW)
   */
  static formatPower(powerInWatts) {
    if (Math.abs(powerInWatts) >= 1e6) {
      return { value: (powerInWatts / 1e6).toFixed(2), unit: 'MW', raw: powerInWatts };
    } else if (Math.abs(powerInWatts) >= 1e3) {
      return { value: (powerInWatts / 1e3).toFixed(2), unit: 'kW', raw: powerInWatts };
    } else {
      return { value: powerInWatts.toFixed(1), unit: 'W', raw: powerInWatts };
    }
  }

  /**
   * Comprehensive Educational Component Knowledge Base for Interactive Inspector
   */
  static getComponentInfo(componentKey) {
    const db = {
      // SOLAR COMPONENTS
      'solar-source': {
        name: 'Solar Radiation (Sunlight)',
        category: 'Energy Source',
        icon: '☀️',
        functionDesc: 'Provides electromagnetic radiation flux (irradiance in W/m²) across the optical and infrared spectrum to the Earth surface.',
        input: 'Solar Nuclear Fusion',
        output: 'Photon Flux (W/m²)',
        efficiency: 'N/A (Primary Source)',
        principles: 'Solar position θ_sun, Atmospheric cloud scattering, Angle of incidence on panel.'
      },
      'solar-pv': {
        name: 'Photovoltaic (PV) Solar Panel',
        category: 'Primary Energy Converter',
        icon: '🔲',
        functionDesc: 'Converts photon flux into direct electrical current (DC) via the photoelectric effect in semiconductor P-N junctions.',
        input: 'Effective Solar Irradiance (G_eff)',
        output: 'Raw DC Voltage & Current (V_pv, I_pv)',
        efficiency: 'Approx. 18% - 22% (Silicon Semiconductor)',
        principles: 'Non-linear diode I-V characteristics, Temperature coefficient (-0.4%/°C).'
      },
      'solar-mppt': {
        name: 'MPPT / DC-DC Buck-Boost Converter',
        category: 'Power Conditioning',
        icon: '⚡',
        functionDesc: 'Tracks the Maximum Power Point (MPP) impedance matching on the I-V curve and converts variable PV voltage into a regulated DC bus.',
        input: 'Variable PV DC Power',
        output: 'Conditioned DC Link Power',
        efficiency: 'Approx. 95% - 98%',
        principles: 'Perturb & Observe (P&O) or Incremental Conductance algorithm, High-frequency PWM switching.'
      },
      'solar-dclink': {
        name: 'DC Bus Link Capacitor',
        category: 'Energy Buffer',
        icon: '🔋',
        functionDesc: 'Acts as an electrostatic energy buffer between the DC-DC stage and the inverter, decoupling DC ripple.',
        input: 'Conditioned DC Power',
        output: 'Stabilized DC Link Voltage',
        efficiency: 'Approx. 99%',
        principles: 'Capacitive charge reservoir smoothing DC ripple voltage.'
      },
      'solar-inverter': {
        name: 'DC-to-AC Solar Inverter',
        category: 'Inversion Stage',
        icon: '🔄',
        functionDesc: 'Converts stabilized DC power into 50/60 Hz sinusoidal AC electricity synchronized with consumer/grid standards.',
        input: 'DC Link Voltage & Current',
        output: '230V / 400V AC Pure Sine Wave',
        efficiency: 'Approx. 95% - 98%',
        principles: 'Insulated-Gate Bipolar Transistor (IGBT) H-Bridge with Sinusoidal Pulse-Width Modulation (SPWM).'
      },
      'solar-load': {
        name: 'Electrical Consumer Load',
        category: 'Load / Grid',
        icon: '🏠',
        functionDesc: 'Consumes the generated AC electrical power to run residential appliances, lighting, and industrial machinery.',
        input: 'AC Electricity (230V AC)',
        output: 'Useful Work, Heat, Light',
        efficiency: 'Load-dependent',
        principles: 'Ohm’s law, Active Power Demand (P = V · I · cos φ).'
      },

      // WIND COMPONENTS
      'wind-source': {
        name: 'Atmospheric Wind Flow',
        category: 'Energy Source',
        icon: '💨',
        functionDesc: 'Atmospheric air movement caused by uneven solar heating of the Earth surface and Coriolis forces.',
        input: 'Atmospheric Pressure Gradients',
        output: 'Kinetic Airflow (m/s)',
        efficiency: 'N/A (Natural Resource)',
        principles: 'Kinetic energy density = 0.5 · ρ · V³.'
      },
      'wind-rotor': {
        name: 'Aerodynamic Rotor Blades & Hub',
        category: 'Primary Energy Converter',
        icon: '🌀',
        functionDesc: 'Aerofoil blade geometry creates aerodynamic lift, transforming kinetic wind energy into low-speed mechanical shaft rotation.',
        input: 'Wind Velocity Streamlines',
        output: 'Low-Speed Rotor Torque & RPM',
        efficiency: 'Betz Limit Max Cp = 59.3% (Operating ~40%)',
        principles: 'Blade element momentum theory, Aerodynamic lift & drag.'
      },
      'wind-generator': {
        name: 'Wind Turbine Generator',
        category: 'Electromechanical Generator',
        icon: '⚙️',
        functionDesc: 'Converts mechanical shaft rotation into variable-frequency AC electricity using electromagnetic induction.',
        input: 'Mechanical Shaft Power (Torque × ω)',
        output: 'Variable AC Electrical Power',
        efficiency: 'Approx. 90% - 95%',
        principles: 'Faraday’s Law of induction, Permanent Magnet Synchronous Generator (PMSG) or DFIG.'
      },
      'wind-rectifier': {
        name: 'AC-DC Rectifier & DC Link',
        category: 'Power Conditioning',
        icon: '🔀',
        functionDesc: 'Rectifies variable-frequency/voltage generator AC output into smooth intermediate DC electricity.',
        input: 'Variable Frequency AC',
        output: 'Stabilized DC Link Power',
        efficiency: 'Approx. 97%',
        principles: 'Active 3-phase diode/IGBT bridge rectification.'
      },
      'wind-inverter': {
        name: 'Grid Inverter (DC → AC)',
        category: 'Inversion Stage',
        icon: '🔄',
        functionDesc: 'Converts DC link energy into grid-synchronized AC power with active power and frequency control.',
        input: 'Intermediate DC Link',
        output: '690V / 400V AC Utility Power',
        efficiency: 'Approx. 96%',
        principles: 'Full-scale back-to-back frequency converter topology.'
      },
      'wind-load': {
        name: 'Industrial / Grid Load',
        category: 'Load / Grid',
        icon: '🏭',
        functionDesc: 'Receives the high-capacity renewable wind electrical power for municipal or industrial distribution.',
        input: 'AC Utility Power',
        output: 'Industrial & Domestic Power',
        efficiency: 'Load-dependent',
        principles: 'Grid power balance and frequency regulation.'
      },

      // HYDRO COMPONENTS
      'hydro-source': {
        name: 'Elevated Water Reservoir',
        category: 'Energy Source',
        icon: '💧',
        functionDesc: 'High-elevation catchment storing immense gravitational potential energy.',
        input: 'Hydrological Rainfall & Inflow',
        output: 'Hydraulic Head Height (H in meters)',
        efficiency: 'N/A (Potential Storage)',
        principles: 'Potential energy E_p = m · g · H.'
      },
      'hydro-penstock': {
        name: 'Sluice Gate & Penstock Conduit',
        category: 'Fluid Transmission',
        icon: '🌊',
        functionDesc: 'High-pressure steel pipeline accelerating water from reservoir elevation down to powerhouse nozzles.',
        input: 'Hydraulic Head & Gate Opening',
        output: 'High-Velocity Pressurized Water Flow Q (m³/s)',
        efficiency: 'Approx. 95% (Hydraulic friction loss)',
        principles: 'Bernoulli equation and continuity equation Q = A · v.'
      },
      'hydro-turbine': {
        name: 'Francis / Pelton Hydraulic Runner',
        category: 'Primary Energy Converter',
        icon: '🌀',
        functionDesc: 'Water jets impact curved turbine runner vanes, converting water momentum into rotational mechanical torque.',
        input: 'Pressurized Water Jet Impulse/Reaction',
        output: 'Mechanical Shaft Power & High RPM',
        efficiency: 'Approx. 90% - 94%',
        principles: 'Euler turbine equation, Hydrodynamic momentum transfer.'
      },
      'hydro-generator': {
        name: 'Hydro Synchronous Alternator',
        category: 'Electromechanical Generator',
        icon: '⚙️',
        functionDesc: 'Heavy-duty synchronous rotor excited by DC field magnets generating multi-megawatt 3-phase AC power.',
        input: 'Turbine Shaft Mechanical Torque',
        output: '13.8 kV Alternator Bus Power',
        efficiency: 'Approx. 96% - 98%',
        principles: 'Synchronous electromagnetic induction at grid-locked frequency.'
      },
      'hydro-conditioning': {
        name: 'Power Transformer & Conditioning',
        category: 'Power Conditioning',
        icon: '⚡',
        functionDesc: 'Conditions generated power, provides DC link stabilization and step-up transformation for grid export.',
        input: 'Medium Voltage Generator Output',
        output: 'Regulated Grid-Ready Electric Power',
        efficiency: 'Approx. 98%',
        principles: 'Magnetic flux coupling and power electronics filter banks.'
      },
      'hydro-load': {
        name: 'High-Capacity Utility Grid Load',
        category: 'Load / Grid',
        icon: '🏙️',
        functionDesc: 'Large regional transmission load consuming base-load or peak-demand hydroelectric power.',
        input: 'High-Voltage AC Grid Power',
        output: 'City & Regional Power Supply',
        efficiency: 'Regional load',
        principles: 'Real-time generation-demand balancing.'
      },

      // TIDAL COMPONENTS
      'tidal-source': {
        name: 'Ocean Tidal Current Flow',
        category: 'Energy Source',
        icon: '🌊',
        functionDesc: 'Predictable, periodic marine currents driven by the gravitational pull of the Moon and Sun on oceans.',
        input: 'Lunar/Solar Gravitational Pull',
        output: 'Seawater Current Velocity (m/s)',
        efficiency: 'N/A (Astronomical Gravitational)',
        principles: 'Kinetic energy = 0.5 · ρ_seawater · V³ with high density ρ = 1025 kg/m³.'
      },
      'tidal-turbine': {
        name: 'Subsea Hydrokinetic Rotor',
        category: 'Primary Energy Converter',
        icon: '🌀',
        functionDesc: 'Submerged bi-directional or pitch-controlled rotor blades extracting kinetic torque from dense marine flows.',
        input: 'Marine Seawater Flow Velocity',
        output: 'Low-Speed Subsea Shaft Rotation',
        efficiency: 'Approx. 38% - 44% (Hydrodynamic Cp)',
        principles: 'Cavitation limits, Marine boundary layer aerodynamics.'
      },
      'tidal-generator': {
        name: 'Subsea Sealed Alternator',
        category: 'Electromechanical Generator',
        icon: '⚙️',
        functionDesc: 'Hermetically sealed marine direct-drive permanent magnet generator converting rotor torque into subsea electric power.',
        input: 'Rotor Shaft Torque',
        output: 'Subsea Raw AC Electric Power',
        efficiency: 'Approx. 92% - 95%',
        principles: 'Sealed direct-drive PMSG with marine corrosion protection.'
      },
      'tidal-rectifier': {
        name: 'Subsea Umbilical & DC Link',
        category: 'Power Conditioning',
        icon: '🔌',
        functionDesc: 'Converts variable subsea AC to HVDC for low-loss transmission through seabed umbilical cables to shore.',
        input: 'Subsea Raw AC Power',
        output: 'Shoreline DC Bus Link',
        efficiency: 'Approx. 96%',
        principles: 'HVDC subsea transmission and rectification.'
      },
      'tidal-inverter': {
        name: 'Onshore Marine Grid Inverter',
        category: 'Inversion Stage',
        icon: '🔄',
        functionDesc: 'Shore-based inverter station converting subsea DC link power into clean 3-phase AC electricity.',
        input: 'Shoreline DC Bus Power',
        output: '690V / 400V Clean AC Grid Power',
        efficiency: 'Approx. 96%',
        principles: 'Multilevel voltage source inverter (VSI).'
      },
      'tidal-load': {
        name: 'Coastal Community & Grid Load',
        category: 'Load / Grid',
        icon: '🏘️',
        functionDesc: 'Supplies predictable clean marine electrical energy to coastal settlements and offshore microgrids.',
        input: 'Grid-Ready AC Power',
        output: 'Coastal Power Consumption',
        efficiency: 'Community load',
        principles: 'Tidal cycle peak-shaving and energy storage integration.'
      }
    };

    return db[componentKey] || {
      name: 'System Component',
      category: 'Power Subsystem',
      icon: '⚡',
      functionDesc: 'Transfers and conditions renewable energy throughout the system.',
      input: 'Input Energy/Power',
      output: 'Output Power',
      efficiency: 'Approx. 95%',
      principles: 'Fundamental conservation of energy and conversion mechanics.'
    };
  }
}
