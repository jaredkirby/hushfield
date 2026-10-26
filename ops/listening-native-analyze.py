"""Read saved WAV bytes independently of the native renderer and emit artifact QA."""
from pathlib import Path
import json, wave, hashlib
import numpy as np
import argparse
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--workspace',type=Path,default=Path(__file__).resolve().parent.parent/'.scratch/surge-native')
args=parser.parse_args()
ROOT=args.workspace.resolve()
FOLDER=ROOT/'candidates'
def rms(values): return float(np.sqrt(np.mean(values.astype(np.float64)**2)))
def spectrum_at(data,start,seconds=1):
    mono=data[int(start*48000):int((start+seconds)*48000)].mean(axis=1)
    spec=np.abs(np.fft.rfft(mono*np.hanning(len(mono))))**2
    freq=np.fft.rfftfreq(len(mono),1/48000)
    return spec,freq
report={'purpose':'Independent saved-WAV/toolchain artifact QA; not product or human acceptance','assets':[]}
for file in sorted(FOLDER.glob('*.wav')):
    with wave.open(str(file),'rb') as reader:
        header={'channels':reader.getnchannels(),'rate':reader.getframerate(),'frames':reader.getnframes(),'sampleWidth':reader.getsampwidth()}
        raw=reader.readframes(reader.getnframes())
    data=np.frombuffer(raw,dtype='<i2').reshape(-1,header['channels']).astype(np.float64)/32768
    assert header=={'channels':2,'rate':48000,'frames':1152000,'sampleWidth':2}, (file,header)
    peak=float(np.abs(data).max())
    assert peak<.98 and peak>.001 and rms(data)>.00001
    spec,freq=spectrum_at(data,.2)
    # Spectral interpolation is a corroborating pitch check, not a substitute for recorded MIDI.
    band=(freq>240)&(freq<285)
    nearRoot=float(freq[band][np.argmax(spec[band])])
    row={'file':file.name,'sha256':hashlib.sha256(file.read_bytes()).hexdigest(),'header':header,
         'durationSeconds':len(data)/48000,'peak':peak,'rms':rms(data),'dc':float(data.mean()),
         'clippedSamples':int((np.abs(data)>=.9999).sum()),'nearC4SpectralPeakHz':nearRoot,
         'firstStrikeRms':rms(data[int(.1*48000):int(.7*48000)]),
         'lateFirstStrikeRms':rms(data[int(5*48000):int(6*48000)])}
    if '-pad-' in file.name:
        shape=[]
        for second in [3,7,11,15,17]:
            s,f=spectrum_at(data,second)
            valid=(f>80)&(f<12000)
            shape.append({'second':second,'spectralCentroidHz':float(np.sum(s[valid]*f[valid])/np.sum(s[valid])),
                          'upperEnergyFraction':float(np.sum(s[f>1500])/np.sum(s))})
        row['evolution']=shape
        assert max(p['spectralCentroidHz'] for p in shape)-min(p['spectralCentroidHz'] for p in shape)>50, 'Pad spectrum must evolve'
    elif '-pluck-' in file.name:
        assert row['lateFirstStrikeRms']<row['firstStrikeRms']*.05, 'Pluck must damp clearly'
    elif '-bell-' in file.name:
        assert row['lateFirstStrikeRms']<row['firstStrikeRms']*.4, 'Bell must have a decaying tail'
    report['assets'].append(row)
    print(json.dumps(row),flush=True)
report['result']='passed'
(FOLDER/'artifact-qa.json').write_text(json.dumps(report,indent=2)+'\n')
