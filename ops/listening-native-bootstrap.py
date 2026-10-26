"""Build pinned native Surge bindings locally, without installing an app or plug-in.
Requires macOS, Git, Apple Command Line Tools, Python 3.9–3.11 and internet access.
Downloads only public dependencies; all source, packages and build outputs stay in workspace.
"""
from pathlib import Path
import argparse, hashlib, json, platform, subprocess, sys, sysconfig, venv

parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--workspace',type=Path,default=Path(__file__).resolve().parent.parent/'.scratch/surge-native')
args=parser.parse_args()
root=args.workspace.resolve()
if sys.platform!='darwin': parser.error('This validated recipe targets macOS; other platforms need their own verified build flags.')
if not (3,9)<=sys.version_info[:2]<(3,12): parser.error('Use Python 3.9, 3.10 or 3.11 for the pinned pybind11 version.')
root.mkdir(parents=True,exist_ok=True)
source=root/'source';build=root/'build-headless';python=root/'venv/bin/python';cmake=root/'venv/bin/cmake'
commit='f7b97c682ade0b87da85ca5968b63d5c7c98e68d'
patch=Path(__file__).with_name('listening-native-workspace.patch')
def run(command,**kwargs):
 print('+ '+' '.join(map(str,command)),flush=True)
 return subprocess.run(list(map(str,command)),check=True,**kwargs)
def output(command):return subprocess.check_output(list(map(str,command)),text=True).strip()
if not python.exists():venv.EnvBuilder(with_pip=True).create(root/'venv')
run([python,'-m','pip','install','--no-cache-dir','cmake==3.31.6','numpy==2.0.2'])
if not source.exists():run(['git','clone','--depth','1','--branch','release_xt_1.3.4','https://github.com/surge-synthesizer/surge.git',source])
if output(['git','-C',source,'rev-parse','HEAD'])!=commit:parser.error('Existing source has another revision; choose a fresh workspace.')
run(['git','-C',source,'submodule','update','--init','--recursive','--depth','1','--jobs','4'])
check=subprocess.run(['git','-C',str(source),'apply','--reverse','--check',str(patch)],capture_output=True)
if check.returncode:run(['git','-C',source,'apply',patch])
flags={'SURGE_BUILD_PYTHON_BINDINGS':'ON','SURGE_BUILD_TESTRUNNER':'OFF','SURGE_BUILD_XT':'OFF','SURGE_BUILD_FX':'OFF','SURGE_SKIP_JUCE_FOR_RACK':'ON','SURGE_COPY_AFTER_BUILD':'OFF','SURGE_SKIP_WERROR':'ON','CMAKE_OSX_DEPLOYMENT_TARGET':'14.0','CMAKE_BUILD_TYPE':'Release','PYTHON_EXECUTABLE':str(python)}
run([cmake,'-S',source,'-B',build,*[f'-D{k}={v}' for k,v in flags.items()]])
run([cmake,'--build',build,'--parallel','4','--target','surgepy'])
extensions=list((build/'src/surge-python').glob('surgepy*.so'))
if len(extensions)!=1:raise RuntimeError('Expected one native binding; inspect build outputs.')
receipt={'upstreamRepository':'https://github.com/surge-synthesizer/surge','tag':'release_xt_1.3.4','commit':commit,'configuration':flags,'submodules':output(['git','-C',source,'submodule','status','--recursive']).splitlines(),'patch':str(patch),'patchSha256':hashlib.sha256(patch.read_bytes()).hexdigest(),'extension':str(extensions[0]),'extensionSha256':hashlib.sha256(extensions[0].read_bytes()).hexdigest(),'pythonVersion':sys.version,'pythonAbi':sysconfig.get_config_var('SOABI'),'platform':platform.platform(),'systemInstall':False,'humanListeningAcceptance':'pending'}
(root/'toolchain-provenance.json').write_text(json.dumps(receipt,indent=2)+'\n')
print('Native build complete. Run listening-native-render.py with the workspace venv Python, then listening-native-analyze.py.')
