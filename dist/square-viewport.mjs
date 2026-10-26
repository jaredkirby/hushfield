// Give the visual the full landscape height or portrait width first.
// Only reserve the minimum space needed to reach the scrolling controls.
export function squareViewportSize(width, height, portrait, gap = 8) {
  return Math.max(0, Math.floor(portrait ? Math.min(width, height - gap - 160) : Math.min(height, width - gap - 240)));
}

export function setupSquareViewport() {
  const instrument = document.querySelector('.instrument'), panel = document.querySelector('.main-panel'), stage = document.getElementById('displayStage');
  const dock = document.createElement('div'); dock.id = 'adjustmentDock';
  dock.append(stage.querySelector('.piece-blend'),stage.querySelector('.piece-tools'),...panel.querySelectorAll(':scope > .page'));
  panel.append(dock);
  const shell = document.createElement('div'); shell.id = 'controlsShell';
  const scroll = document.createElement('div'); scroll.id = 'controlsScroll';
  scroll.setAttribute('role','region'); scroll.setAttribute('aria-label','Editor adjustments'); scroll.tabIndex = 0;
  scroll.append(document.querySelector('.instrument-head'),document.querySelector('.tabs'),document.querySelector('.audio-check'),document.querySelector('.workspace'));
  shell.append(scroll,document.querySelector('.transport'));
  instrument.append(stage,shell);
  document.body.classList.add('square-viewport');
  function resize() {
    const rect = instrument.getBoundingClientRect(), style = getComputedStyle(instrument);
    const width = rect.width - parseFloat(style.borderLeftWidth) - parseFloat(style.borderRightWidth);
    const height = rect.height - parseFloat(style.borderTopWidth) - parseFloat(style.borderBottomWidth);
    const gap = parseFloat(style.gap) || 0;
    const portrait = document.body.dataset.orientation === 'portrait';
    const size = squareViewportSize(width,height,portrait,gap);
    instrument.style.setProperty('--visual-size',size+'px');
    const controlsWidth = portrait ? width : width - size - gap;
    shell.classList.toggle('compact-controls',controlsWidth < 320);
    shell.classList.toggle('medium-controls',controlsWidth < 540);
    window.dispatchEvent(new CustomEvent('hushfield:visualresize'));
  }
  new ResizeObserver(resize).observe(instrument);
  window.addEventListener('hushfield:layoutchange',resize);
  window.addEventListener('hushfield:pagechange',()=>{scroll.scrollTop=0;});
  resize();
}
