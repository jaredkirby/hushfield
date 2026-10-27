// Starting sounds own only Foundation's voice, expressive model and layer balance.
// Composition, spatial placement and the rest of the Piece stay with the player.
export const FOUNDATION_PRESETS = Object.freeze([
 ['current-dusk','Dusk veil','current','A soft harmonic bed with a little melody above it.',28,18,58,80,25,10],
 ['current-lantern','Lantern notes','current','Clear melodic glints over a lighter chord bed.',68,12,25,45,70,15],
 ['current-mist','Moving mist','current','Air and slow voice movement around warm chords.',43,72,82,65,15,50],
 ['solina-velvet','Velvet strings','solina','Dark ensemble chords with a gentle swelling edge.',22,28,70,85,15,10],
 ['solina-sunroom','Sunroom','solina','Bright strings with a clear melodic line.',76,16,30,65,60,10],
 ['solina-tidal','Tidal strings','solina','A drifting ensemble with long blooms and airy space.',48,82,88,75,20,40],
 ['juno-stillwater','Stillwater chorus','juno','Warm chorus chords and a quiet answering melody.',38,22,45,70,40,15],
 ['juno-amber','Amber keys','juno','Rounded, intimate chords with restrained movement.',17,10,20,85,15,5],
 ['juno-prism','Prism tide','juno','Open chorus shimmer with broad movement and bloom.',78,70,85,65,55,30],
 ['buchla-copper','Copper bells','buchla','Bright metallic notes against a small harmonic bed.',76,24,20,40,75,10],
 ['buchla-embers','Ember field','buchla','Darker complex tones that swell beneath sparse notes.',20,18,75,80,20,15],
 ['buchla-fireflies','Firefly drift','buchla','Restless bright overtones with an airy melodic edge.',58,85,55,50,65,35],
 ['sem-hollow','Hollow reeds','sem','A rounded morphing chord voice with a little breath.',24,22,35,80,20,20],
 ['sem-opal','Opal light','sem','Open, luminous harmonics and a clear melody.',80,30,65,55,65,10],
 ['sem-estuary','Estuary','sem','Slowly moving chords with long blooms and soft air.',48,85,90,75,15,40],
 ['moog-cellar','Cellar hum','moog','Low, rounded chords with very little upper activity.',15,12,30,85,10,5],
 ['moog-cinder','Cinder pulse','moog','A brighter bass voice carrying a small melodic figure.',78,20,18,60,60,5],
 ['moog-slow-current','Slow current','moog','A dark moving foundation with patient swells.',40,75,85,75,25,20]
].map(([id,label,instrument,description,color,drift,bloom,pads,melody,air])=>Object.freeze({
 id,label,instrument,description,
 settings:Object.freeze({instrument,compositionVersion:2,color,drift,bloom,pads,melody,air})
})));

export function applyFoundationPreset(state,id){
 const preset=FOUNDATION_PRESETS.find(preset=>preset.id===id);
 return preset?{...state,...preset.settings}:state;
}
export function matchingFoundationPreset(state){
 return FOUNDATION_PRESETS.find(preset=>Object.entries(preset.settings).every(([key,value])=>state[key]===value))||null;
}
