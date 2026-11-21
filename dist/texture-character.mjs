// Texture characters: named starting points that set the grain engine as a whole.
// The raw grain, scan and variation controls stay available on their own tabs.
export const TEXTURE_CHARACTERS = {
  halo: {
    label: 'Halo',
    description: 'An octave above, thinned to a shimmer that sits over Foundation.',
    params: { size: 700, density: 22, spray: 30, pitch: 12, reverse: 10, static: 0, jump: 0, hold: 0, elastic: 15, chaos: 10, speed: 0.15, wander: 15, smooth: 0, textureTone: 60 }
  },
  undertow: {
    label: 'Undertow',
    description: 'An octave below, darkened into a slow swell underneath.',
    params: { size: 1100, density: 16, spray: 20, pitch: -12, reverse: 30, static: 15, jump: 0, hold: 0, elastic: 0, chaos: 5, speed: 0.06, wander: 10, smooth: 0, textureTone: -60 }
  },
  dust: {
    label: 'Dust',
    description: 'Sparse, short fragments scattered across the phrase.',
    params: { size: 60, density: 10, spray: 80, pitch: 12, reverse: 40, static: 0, jump: 30, hold: 25, elastic: 30, chaos: 50, speed: 0.5, wander: 20, smooth: 0, textureTone: 30 }
  },
  bloom: {
    label: 'Bloom',
    description: 'Long, overlapping grains that hold one moment and let it swell.',
    params: { size: 1400, density: 30, spray: 10, pitch: 0, reverse: 0, static: 40, jump: 0, hold: 0, elastic: 0, chaos: 0, speed: 0.03, wander: 5, smooth: 60, textureTone: 0 }
  }
};

export function matchingTextureCharacter(params) {
  return Object.keys(TEXTURE_CHARACTERS).find(key => Object.entries(TEXTURE_CHARACTERS[key].params).every(([id, value]) => Math.abs((params[id] ?? 0) - value) < 1e-6)) || null;
}

// Builds the Character group as the first Texture tab. Returns the container that
// receives the Tone and Follow sliders, and a refresh for the selected character.
export function setupTextureCharacter({ onSelect }) {
  const group = document.createElement('div');
  group.className = 'control-group texture-character-group';
  group.innerHTML = '<div class="group-title"><h3>Character</h3><span>START HERE</span></div><div class="texture-characters" role="group" aria-label="Texture character"></div><p class="texture-character-help"></p><div id="textureCharacterControls"></div>';
  const buttons = group.querySelector('.texture-characters'), help = group.querySelector('.texture-character-help');
  for (const [key, character] of Object.entries(TEXTURE_CHARACTERS)) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.character = key;
    button.textContent = character.label;
    button.title = character.description;
    button.addEventListener('click', () => onSelect(key));
    buttons.append(button);
  }
  document.getElementById('grainPage').querySelector('.control-grid').prepend(group);
  return {
    refresh(params) {
      const current = matchingTextureCharacter(params);
      for (const button of buttons.querySelectorAll('button')) {
        const active = button.dataset.character === current;
        button.classList.toggle('active', active);
        button.setAttribute('aria-pressed', String(active));
      }
      help.textContent = current ? TEXTURE_CHARACTERS[current].description : 'Custom grains. Choose a character to start again, or shape it on the Grains, Scan and Variation tabs.';
    }
  };
}
