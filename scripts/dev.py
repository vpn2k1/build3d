"""Start both local services after following README installation instructions."""
from pathlib import Path
import os,signal,subprocess,sys,time
root=Path(__file__).resolve().parents[1]
python=root/'.venv'/('Scripts/python.exe' if os.name=='nt' else 'bin/python')
if not python.exists():sys.exit('Create .venv and install services/vision/requirements.txt first; see README.md')
npm='npm.cmd' if os.name=='nt' else 'npm'
children=[]
try:
    children.append(subprocess.Popen([str(python),'-m','uvicorn','app.main:app','--host','127.0.0.1','--port','8000'],cwd=root/'services/vision'))
    children.append(subprocess.Popen([npm,'run','dev'],cwd=root/'apps/web',env={**os.environ,'NEXT_TELEMETRY_DISABLED':'1'}))
    print('\nBuildVision 3D: http://127.0.0.1:3000\nVision API: http://127.0.0.1:8000/docs\nCtrl+C to stop both services.\n',flush=True)
    while all(p.poll() is None for p in children):time.sleep(.5)
except KeyboardInterrupt:pass
finally:
    for p in children:
        if p.poll() is None:p.terminate()
    for p in children:
        try:p.wait(timeout=5)
        except subprocess.TimeoutExpired:p.kill()
