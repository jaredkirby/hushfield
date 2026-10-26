"""Original native Surge authoring candidates; no app or system installation.
Run with this directory's venv. Records engine, patch, notes, settings and raw PCM checks.
"""
from pathlib import Path
import ctypes, datetime, hashlib, json, math, os, sys, wave
import numpy as np

import argparse
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--workspace',type=Path,default=Path(__file__).resolve().parent.parent/'.scratch/surge-native')
args=parser.parse_args()
ROOT=args.workspace.resolve()
SOURCE=ROOT/'source'
BUILD=ROOT/'build-headless/src/surge-python'
OUTPUT=ROOT/'candidates'
OUTPUT.mkdir(exist_ok=True)
os.environ['SURGE_DATA_HOME']=str(SOURCE/'resources/data')
os.environ['HUSHFIELD_SURGE_USER_DATA']=str(ROOT/'user-data')
(ROOT/'user-data').mkdir(exist_ok=True)
sys.path.insert(0,str(BUILD))
import surgepy

RATE=48000
SECONDS=24
MIDI=60
SEED=26025

def sha(path): return hashlib.sha256(path.read_bytes()).hexdigest()
def metrics(data):
    assert np.isfinite(data).all(), 'Native PCM contains non-finite samples'
    peak=float(np.abs(data).max())
    return {'peak':peak,'rms':float(np.sqrt(np.mean(data.astype(np.float64)**2))),
            'maxStep':float(np.abs(np.diff(data,axis=1)).max()),
            'dc':float(np.mean(data)),'clippedSamples':int((np.abs(data)>=1).sum())}
def flatten(synth,value,path=''):
    if isinstance(value,dict):
        return [row for key,v in value.items() for row in flatten(synth,v,f'{path}.{key}'.lstrip('.'))]
    if isinstance(value,list):
        return [row for i,v in enumerate(value) for row in flatten(synth,v,f'{path}[{i}]')]
    return [{'path':path,'name':synth.getParameterName(value.getId()),
             'value':synth.getParamVal(value),'display':synth.getParamDisplay(value),
             'minimum':synth.getParamMin(value),'maximum':synth.getParamMax(value)}]

def candidate(family,light=False):
    synth=surgepy.createSurge(RATE)
    assert Path(synth.getUserDataPath()).resolve()==(ROOT/'user-data').resolve()
    assert Path(synth.getFactoryDataPath()).resolve()==(SOURCE/'resources/data').resolve()
    ctypes.CDLL(None).srand(SEED)
    synth.retuneToStandardTuning()
    templates={'pad':'Init Wavetable.fxp','pluck':'Init Karplus-Strong.fxp','bell':'Init FM2.fxp'}
    template=SOURCE/'resources/data/patches_factory/Templates'/templates[family]
    assert synth.loadPatch(str(template)), f'Could not load {template}'
    patch=synth.getPatch()
    scene=patch['scene'][0]
    edits=[]
    def setv(param,value,label):
        minimum,maximum=synth.getParamMin(param),synth.getParamMax(param)
        assert minimum<=value<=maximum, (label,value,minimum,maximum)
        synth.setParamVal(param,value)
        edits.append({'target':label,'value':value,'display':synth.getParamDisplay(param)})
    setv(patch['volume'],-12,'volume')
    setv(scene['drift'],0.04,'scene[0].drift')
    for fx in patch['fx']: setv(fx['type'],0,'fx.type')
    env=scene['adsr'][0]
    shape={'pad':(2.4,3.5,.78,4.5),'pluck':(.004,1.2,0,1.2),'bell':(.012,3.8,0,3.8)}[family]
    for key,value in zip(['a','d','s','r'],shape):
        setv(env[key],value if key=='s' else math.log2(value),f'scene[0].adsr[0].{key}')
    if family=='pad':
        setv(scene['osc'][0]['p'][0],.12,'scene[0].osc[0].p[0] morph')
        setv(scene['osc'][0]['p'][5],.035,'scene[0].osc[0].p[5] detune')
        setv(scene['osc'][0]['p'][6],2,'scene[0].osc[0].p[6] unison')
    elif family=='pluck':
        setv(scene['osc'][0]['p'][1],.62,'scene[0].osc[0].p[1] exciter')
        setv(scene['osc'][0]['p'][2],.78,'scene[0].osc[0].p[2] decay1')
        setv(scene['osc'][0]['p'][3],.74,'scene[0].osc[0].p[3] decay2')
    else:
        setv(scene['osc'][0]['p'][0],.16,'scene[0].osc[0].p[0] FM amount')
        setv(scene['osc'][0]['p'][1],2,'scene[0].osc[0].p[1] FM ratio')
        setv(scene['osc'][0]['p'][2],.045,'scene[0].osc[0].p[2] FM amount2')
        setv(scene['osc'][0]['p'][3],3,'scene[0].osc[0].p[3] FM ratio2')
    # A native Surge master reverb, applied only to the separate light-FX candidate.
    if light:
        setv(patch['fx'][6]['type'],surgepy.constants.fxt_reverb,'fx[6].type')
        for _ in range(8): synth.process()
        patch=synth.getPatch()
        matching=[p for p in patch['fx'][6]['p'] if 'mix' in synth.getParameterName(p.getId()).lower()]
        assert len(matching)==1, 'Native reverb mix parameter must be unambiguous'
        setv(matching[0],.12,'fx[6].mix')
    stem=f'hushfield-{family}-c4-'+('light-fx' if light else 'dry')
    patchfile=OUTPUT/(stem+'.fxp')
    synth.savePatch(str(patchfile))
    initial=flatten(synth,synth.getPatch())
    blocks=math.ceil(SECONDS*RATE/synth.getBlockSize())
    audio=synth.createMultiBlock(blocks)
    notes=[{'on':.1,'off':18.0,'midi':MIDI,'velocity':66}] if family=='pad' else [
        {'on':.1,'off':1.2,'midi':MIDI,'velocity':62},
        {'on':8.1,'off':9.2,'midi':MIDI,'velocity':58},
        {'on':16.1,'off':17.2,'midi':MIDI,'velocity':62}]
    commands={}
    for event in notes:
        commands.setdefault(round(event['on']*RATE/synth.getBlockSize()),[]).append(('on',event))
        commands.setdefault(round(event['off']*RATE/synth.getBlockSize()),[]).append(('off',event))
    automation=[]
    # Slow nonperiodic spectral opening, with a quieter retreat before release.
    if family=='pad':
        for second,value in [(0,.12),(4,.24),(8,.48),(12,.66),(16,.35),(20,.12)]:
            block=round(second*RATE/synth.getBlockSize())
            commands.setdefault(block,[]).append(('morph',value))
            automation.append({'seconds':second,'parameter':'scene[0].osc[0].p[0]','value':value})
    boundaries=sorted(set([0,blocks,*commands.keys()]))
    for i,start in enumerate(boundaries[:-1]):
        for command,event in commands.get(start,[]):
            if command=='on': synth.playNote(0,event['midi'],event['velocity'])
            elif command=='off': synth.releaseNote(0,event['midi'],0)
            else: synth.setParamVal(scene['osc'][0]['p'][0],event)
        count=boundaries[i+1]-start
        synth.processMultiBlock(audio,start,count)
    data=np.asarray(audio)[:,:SECONDS*RATE]
    raw=metrics(data)
    assert raw['peak']>.001 and raw['rms']>.00001, ('Silent native render',stem,raw)
    assert raw['peak']<.98 and raw['clippedSamples']==0, ('Native clipping',stem,raw)
    # Retain native dynamics. Equal reference gain across dry and wet versions is set upstream.
    wav=OUTPUT/(stem+'.wav')
    pcm=np.rint(np.clip(data.T,-1,1)*32767).astype('<i2')
    with wave.open(str(wav),'wb') as writer:
        writer.setnchannels(2);writer.setsampwidth(2);writer.setframerate(RATE);writer.writeframes(pcm.tobytes())
    with wave.open(str(wav),'rb') as reader:
        assert reader.getnframes()==RATE*SECONDS and reader.getnchannels()==2 and reader.getframerate()==RATE
    receipt={'engine':'native Surge XT','engineVersion':surgepy.getVersion(),'family':family,
        'intent':{'pad':'evolving sustained wavetable','pluck':'damped physical string','bell':'soft FM2 bell'}[family],
        'processing':'native Surge reverb, 12 percent mix' if light else 'dry; no enabled FX',
        'sampleRate':RATE,'durationSeconds':SECONDS,'channels':2,'encoding':'PCM16',
        'rootMidi':MIDI,'rootName':'C4','rootHz':440*2**((MIDI-69)/12),'tuning':'12-TET, A4=440Hz',
        'followsFoundationHarmony':False,'noteSchedule':notes,'automation':automation,
        'template':str(template.relative_to(SOURCE)),'templateSha256':sha(template),
        'edits':edits,'initialParameters':initial,'rawMetrics':raw,
        'wav':wav.name,'wavSha256':sha(wav),'patch':patchfile.name,'patchSha256':sha(patchfile),
        'humanListeningAcceptance':'pending','pcmReproducibility':'schedule and patch reproducible; native oscillator random state is not fully exposed',
        'licenseEvidence':'https://surge-synthesizer.github.io/faq/'}
    (OUTPUT/(stem+'.json')).write_text(json.dumps(receipt,indent=2)+'\n')
    print(json.dumps({'candidate':stem,'version':surgepy.getVersion(),'metrics':raw,'wav':str(wav)}),flush=True)
    return receipt

if __name__=='__main__':
    receipts=[candidate(family,light) for family in ['pad','pluck','bell'] for light in [False,True]]
    (OUTPUT/'manifest.json').write_text(json.dumps({'recordedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),
        'stage':'native-toolchain-validation-candidates','humanListeningAcceptance':'pending',
        'assets':[{'wav':r['wav'],'receipt':Path(r['wav']).with_suffix('.json').name,'sha256':r['wavSha256']} for r in receipts]},indent=2)+'\n')
