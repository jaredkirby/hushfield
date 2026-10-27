import * as sem from './foundation-instruments/sem.mjs';
import * as moog from './foundation-instruments/moog.mjs';
import * as juno from './foundation-instruments/juno.mjs';
import * as buchla from './foundation-instruments/buchla.mjs';
import * as solina from './foundation-instruments/solina.mjs';
export const INSTRUMENT_LABELS={current:'Hushfield',solina:'String ensemble',juno:'Chorus synth',buchla:'Complex synth',sem:'Morph synth',moog:'Bass synth'};
export const instrumentModules={solina,juno,buchla,sem,moog};
export const INSTRUMENT_HELP={
 current:'Color shapes harmonics. Drift moves each voice gently. Bloom changes color over time.',
 solina:'Inspired by Solina strings. Color brightens the strings. Drift deepens the stereo ensemble. Bloom brings the ensemble forward.',
 juno:'Inspired by Juno chorus synths. Color brightens the voice. Drift adds movement. Bloom opens the sound over time.',
 buchla:'Inspired by Buchla complex synthesis. Color adds harmonics. Drift moves the tone. Bloom shapes its opening and decay.',
 sem:'Inspired by the SEM. Color shifts the filter shape. Drift moves the oscillators. Bloom changes the filter over time.',
 moog:'Inspired by the Minimoog. The chord layer plays one low voice; all harmony notes still guide Motion. Color opens the filter. Drift loosens the tuning. Bloom moves the tone.'
};
