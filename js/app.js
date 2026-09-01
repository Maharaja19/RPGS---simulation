/**
 * RPGS SIMULATION SUITE - MULTI-PAGE APPLICATION CONTROLLER
 * Handles standalone page simulator initializations, component modal inspector, and accordion toggles.
 */

document.addEventListener('DOMContentLoaded', () => {
  // Component Inspector Modal
  const modalBackdrop = document.getElementById('component-modal');
  const modalCloseBtn = document.getElementById('modal-close-btn');

  function showComponentModal(compKey) {
    if (!modalBackdrop || typeof RpgsElectricalModel === 'undefined') return;
    const info = RpgsElectricalModel.getComponentInfo(compKey);

    const setEl = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    setEl('modal-comp-icon', info.icon);
    setEl('modal-comp-name', info.name);
    setEl('modal-comp-category', info.category);
    setEl('modal-comp-desc', info.functionDesc);
    setEl('modal-comp-input', info.input);
    setEl('modal-comp-output', info.output);
    setEl('modal-comp-efficiency', info.efficiency);
    setEl('modal-comp-principles', info.principles);

    modalBackdrop.classList.add('active');
  }

  function closeComponentModal() {
    if (modalBackdrop) modalBackdrop.classList.remove('active');
  }

  if (modalCloseBtn) {
    modalCloseBtn.addEventListener('click', closeComponentModal);
  }
  if (modalBackdrop) {
    modalBackdrop.addEventListener('click', (e) => {
      if (e.target === modalBackdrop) closeComponentModal();
    });
  }

  // Expose to window for global component triggers
  window.RpgsApp = {
    showComponentModal,
    closeComponentModal
  };

  // Accordion Toggle Handlers
  document.querySelectorAll('.details-accordion-card').forEach(card => {
    const header = card.querySelector('.accordion-header');
    if (header) {
      header.addEventListener('click', () => {
        card.classList.toggle('open');
      });
    }
  });

  // Global Keyboard Shortcuts
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalBackdrop && modalBackdrop.classList.contains('active')) {
      closeComponentModal();
    }
  });

  // Auto-initialize simulator based on current active page canvas
  if (document.getElementById('solar-canvas') && typeof SolarSimulator !== 'undefined') {
    const solarSim = new SolarSimulator();
    solarSim.init();
    window.solarSim = solarSim;
  }

  if (document.getElementById('wind-canvas') && typeof WindSimulator !== 'undefined') {
    const windSim = new WindSimulator();
    windSim.init();
    window.windSim = windSim;
  }

  if (document.getElementById('hydro-canvas') && typeof HydroSimulator !== 'undefined') {
    const hydroSim = new HydroSimulator();
    hydroSim.init();
    window.hydroSim = hydroSim;
  }

  if (document.getElementById('tidal-canvas') && typeof TidalSimulator !== 'undefined') {
    const tidalSim = new TidalSimulator();
    tidalSim.init();
    window.tidalSim = tidalSim;
  }
});
