import io,json,time
import pytest
from PIL import Image,ImageDraw
from fastapi.testclient import TestClient
from app import main
from app.schema import Project
from app.pipeline.run import analyze
@pytest.fixture
def client(tmp_path,monkeypatch):
    monkeypatch.setattr(main,'ROOT',tmp_path);monkeypatch.setattr(main,'DB',tmp_path/'test.sqlite3')
    with TestClient(main.app) as c:yield c

def project():
    return {'schemaVersion':1,'projectId':'test-1','name':'Test','unit':'m','revision':0,'calibration':{'metersPerPixel':.01,'confirmed':True},'floors':[{'id':'f1','elevation':0,'height':3,'walls':[{'id':'w1','start':[0,0],'end':[5,0],'thickness':.2,'height':3,'status':'confirmed'}],'openings':[],'rooms':[],'slabs':[]}]}
def image_bytes():
    image=Image.new('RGB',(600,500),'white');d=ImageDraw.Draw(image);d.rectangle((50,50,550,450),outline='black',width=12);d.line((300,50,300,350),fill='black',width=12)
    b=io.BytesIO();image.save(b,format='PNG');return b.getvalue()
def test_save_read_revision_and_delete(client):
    p=project();assert client.post('/api/projects',json=p).status_code==200
    assert client.get('/api/projects/test-1').json()==p
    p['name']='Changed';assert client.put('/api/projects/test-1',json=p).status_code==409
    p['revision']=1;assert client.put('/api/projects/test-1',json=p).status_code==200
    assert client.get('/api/projects').json()[0]['name']=='Changed'
    assert client.delete('/api/projects/test-1').status_code==200
    assert client.get('/api/projects/test-1').status_code==404

def test_bad_geometry_and_origin(client):
    p=project();p['floors'][0]['openings']=[{'id':'d','type':'door','wallId':'w1','offset':4.5,'width':1,'height':2,'sillHeight':0,'status':'confirmed'}]
    assert client.put('/api/projects/test-1',json=p).status_code==422
    assert client.put('/api/projects/test-1',json=project(),headers={'Origin':'https://evil.example'}).status_code==403
    assert client.put('/api/projects/wrong',json=project()).status_code==400

def test_upload_validates_real_mime(client):
    client.post('/api/projects',json=project())
    assert client.post('/api/projects/test-1/image',files={'file':('a.png',b'not an image','image/png')}).status_code==400
    assert client.post('/api/projects/test-1/image',files={'file':('a.png',image_bytes(),'image/png')}).status_code==200

def test_pipeline_detects_candidates_with_uncertainty(tmp_path):
    path=tmp_path/'plan.png';path.write_bytes(image_bytes());r=analyze(path,.01,3)
    assert len(r['walls'])>=4
    assert all(w['status']=='detected' for w in r['walls'])
    assert r['openings']==[] and len(r['warnings'])>=3
    p=project();p['floors'][0]['walls']=r['walls'];Project.model_validate(p)

def test_async_job_roundtrip(client):
    client.post('/api/projects',json=project());client.post('/api/projects/test-1/image',files={'file':('a.png',image_bytes(),'image/png')})
    r=client.post('/api/projects/test-1/analyze');assert r.status_code==202
    for _ in range(100):
        s=client.get('/api/jobs/'+r.json()['id']).json()
        if s['status'] in ['succeeded','failed']:break
        time.sleep(.05)
    assert s['status']=='succeeded',s
    assert s['result']['walls']

def test_uncalibrated_rejected(client):
    p=project();p['calibration']['confirmed']=False;client.post('/api/projects',json=p)
    client.post('/api/projects/test-1/image',files={'file':('a.png',image_bytes(),'image/png')})
    assert client.post('/api/projects/test-1/analyze').status_code==400

def test_deskew_maps_candidates_back_to_source(tmp_path):
    image=Image.open(io.BytesIO(image_bytes())).rotate(4,expand=True,fillcolor='white')
    path=tmp_path/'rotated.png';image.save(path)
    r=analyze(path,.01,3)
    assert r['sourceTransform']['deskewApplied']
    assert len(r['walls'])>=4
    assert any(abs(w['end'][1]-w['start'][1])>.05 and abs(w['end'][0]-w['start'][0])>1 for w in r['walls'])
    p=project();p['floors'][0]['walls']=r['walls'];Project.model_validate(p)
