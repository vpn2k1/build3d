import io,json,os,re,sqlite3,subprocess,sys,time,uuid,threading,shutil
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from fastapi import FastAPI,HTTPException,UploadFile,File,Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware
from PIL import Image,ImageOps,UnidentifiedImageError
from .schema import Project
ROOT=Path(os.getenv('BUILDVISION_DATA',str(Path(__file__).resolve().parents[1]/'data'))).resolve()
ROOT.mkdir(parents=True,exist_ok=True)
DB=ROOT/'projects.sqlite3'
MAX_UPLOAD=15*1024*1024
Image.MAX_IMAGE_PIXELS=25000000
ORIGINS=['http://localhost:3000','http://127.0.0.1:3000']
app=FastAPI(title='BuildVision Local Vision',version='0.1.0')
app.add_middleware(CORSMiddleware,allow_origins=ORIGINS,allow_methods=['GET','POST','PUT','DELETE'],allow_headers=['Content-Type'])
app.add_middleware(TrustedHostMiddleware,allowed_hosts=['127.0.0.1','localhost','testserver'])
@app.middleware('http')
async def limits(request:Request,call_next):
    from starlette.responses import JSONResponse
    if request.method in ['POST','PUT','DELETE'] and request.headers.get('origin') and request.headers['origin'] not in ORIGINS:
        return JSONResponse({'detail':'Origin không được phép'},status_code=403)
    try:
        if int(request.headers.get('content-length','0'))>65000000:return JSONResponse({'detail':'Request quá lớn'},status_code=413)
    except ValueError:return JSONResponse({'detail':'Content-Length không hợp lệ'},status_code=400)
    return await call_next(request)
def connection():
    c=sqlite3.connect(DB);c.execute('PRAGMA journal_mode=WAL')
    c.execute('CREATE TABLE IF NOT EXISTS projects (id TEXT PRIMARY KEY, revision INTEGER NOT NULL, body TEXT NOT NULL, updated REAL NOT NULL)')
    c.execute('CREATE TABLE IF NOT EXISTS versions (id TEXT, revision INTEGER, body TEXT, PRIMARY KEY(id,revision))')
    return c
def safe_id(id):
    if not re.fullmatch(r'[a-zA-Z0-9_-]{1,100}',id):raise HTTPException(400,'ID không hợp lệ')
    return id
def get(id):
    safe_id(id)
    with connection() as c:r=c.execute('SELECT body FROM projects WHERE id=?',(id,)).fetchone()
    if not r:raise HTTPException(404,'Không có dự án')
    return json.loads(r[0])
@app.get('/api/health')
def health():return {'status':'ok','mode':'local','ocr':'opt-in-local-models'}
@app.get('/api/projects')
def projects():
    with connection() as c: rows=c.execute('SELECT id,revision,body,updated FROM projects ORDER BY updated DESC').fetchall()
    return [{'projectId':id,'revision':rev,'name':json.loads(body)['name'],'updatedAt':updated} for id,rev,body,updated in rows]
@app.post('/api/projects')
def create(p:Project):
    with connection() as c:
        if c.execute('SELECT 1 FROM projects WHERE id=?',(p.projectId,)).fetchone():raise HTTPException(409,'Dự án đã tồn tại')
    return save(p.projectId,p)
@app.get('/api/projects/{id}')
def read(id:str):return get(id)
@app.get('/api/projects/{id}/export')
def export(id:str):return get(id)
@app.put('/api/projects/{id}')
def save(id:str,p:Project):
    safe_id(id)
    if id!=p.projectId:raise HTTPException(400,'ID không khớp')
    body=p.model_dump_json(exclude_none=True)
    with connection() as c:
        c.execute('BEGIN IMMEDIATE')
        old=c.execute('SELECT revision,body FROM projects WHERE id=?',(id,)).fetchone()
        if old and (p.revision<old[0] or (p.revision==old[0] and json.loads(body)!=json.loads(old[1]))):raise HTTPException(409,'Xung đột revision; tải bản mới hoặc tạo dự án khác')
        c.execute('INSERT OR REPLACE INTO projects VALUES (?,?,?,?)',(id,p.revision,body,time.time()))
        c.execute('INSERT OR REPLACE INTO versions VALUES (?,?,?)',(id,p.revision,body))
    return {'projectId':id,'revision':p.revision}
@app.delete('/api/projects/{id}')
def delete(id:str):
    get(id)
    with connection() as c:c.execute('DELETE FROM projects WHERE id=?',(id,));c.execute('DELETE FROM versions WHERE id=?',(id,))
    shutil.rmtree(ROOT/id,ignore_errors=True)
    return {'deleted':True}
@app.post('/api/projects/{id}/image')
async def upload(id:str,file:UploadFile=File(...)):
    get(id);data=await file.read(MAX_UPLOAD+1)
    if len(data)>MAX_UPLOAD:raise HTTPException(413,'Ảnh vượt 15 MB')
    try:
        im=Image.open(io.BytesIO(data))
        if im.format not in ['PNG','JPEG']:raise HTTPException(415,'Chỉ chấp nhận nội dung PNG/JPEG')
        if im.width*im.height>25000000:raise HTTPException(413,'Ảnh vượt 25 MP')
        im=ImageOps.exif_transpose(im).convert('RGB');im.load()
    except (UnidentifiedImageError,OSError,Image.DecompressionBombError,Image.DecompressionBombWarning):raise HTTPException(400,'Ảnh không hợp lệ')
    directory=ROOT/safe_id(id);directory.mkdir(exist_ok=True)
    (directory/'original.bin').write_bytes(data)
    im.save(directory/'image.png')
    return {'width':im.width,'height':im.height}
JOBS={};LOCK=threading.Lock();POOL=ThreadPoolExecutor(max_workers=2)
def worker(job_id,path,mpp,height):
    with LOCK:JOBS[job_id].update(status='running',progress=.1)
    try:
        result=subprocess.run([sys.executable,'-m','app.pipeline.run',str(path),str(mpp),str(height)],capture_output=True,text=True,timeout=90,cwd=str(Path(__file__).resolve().parents[1]))
        if result.returncode:raise RuntimeError('Pipeline xử lý ảnh thất bại; kiểm tra cài đặt OpenCV/OCR')
        output=json.loads(result.stdout.strip().splitlines()[-1])
        with LOCK:JOBS[job_id].update(status='succeeded',progress=1,result=output)
    except subprocess.TimeoutExpired:
        with LOCK:JOBS[job_id].update(status='failed',error='Phân tích quá 90 giây; đã dừng worker')
    except Exception as exc:
        with LOCK:JOBS[job_id].update(status='failed',error=str(exc))
@app.post('/api/projects/{id}/analyze',status_code=202)
def analyze(id:str):
    p=get(id);path=ROOT/safe_id(id)/'image.png'
    if not path.exists():raise HTTPException(400,'Chưa upload ảnh')
    if not p['calibration']['confirmed']:raise HTTPException(400,'Chưa xác nhận tỷ lệ')
    with LOCK:
        if sum(j['status'] in ['queued','running'] for j in JOBS.values())>=2:raise HTTPException(429,'Đang có hai job, vui lòng thử lại')
        if len(JOBS)>100:
            for key in list(JOBS):
                if JOBS[key]['status'] in ['succeeded','failed']:del JOBS[key]
        job_id=uuid.uuid4().hex;JOBS[job_id]={'id':job_id,'projectId':id,'status':'queued','progress':0}
    # Snapshot image prevents a later upload from changing a queued job's input.
    snapshot=path.parent/(job_id+'.png');shutil.copyfile(path,snapshot)
    future=POOL.submit(worker,job_id,snapshot,p['calibration']['metersPerPixel'],p['floors'][0]['height'])
    future.add_done_callback(lambda _:snapshot.unlink(missing_ok=True))
    return {'id':job_id,'status':'queued'}
@app.get('/api/jobs/{id}')
def job(id:str):
    with LOCK:
        if id not in JOBS:raise HTTPException(404,'Không có job')
        return JOBS[id].copy()
