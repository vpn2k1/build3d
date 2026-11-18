"""Read installed package metadata and retain available license notices."""
from pathlib import Path
import importlib.metadata as metadata
import json,shutil,re
root=Path(__file__).resolve().parents[1]
rows=[]
for p in sorted((root/'apps/web/node_modules').glob('*/package.json'))+sorted((root/'apps/web/node_modules').glob('@*/*/package.json')):
 try:d=json.loads(p.read_text())
 except Exception:continue
 name=d.get('name',p.parent.name);version=d.get('version','?');license=d.get('license','NOT IN PACKAGE METADATA')
 rows.append({'ecosystem':'npm','name':name,'version':version,'license':license})
 for f in p.parent.iterdir():
  if f.is_file() and f.name.lower().startswith(('license','copying','notice')):
   dest=root/'docs/licenses'/(re.sub(r'[^a-zA-Z0-9._-]','_',name)+'-'+f.name);shutil.copyfile(f,dest)
for d in metadata.distributions():
 name=d.metadata.get('Name','?');license=d.metadata.get('License-Expression') or d.metadata.get('License') or '; '.join(d.metadata.get_all('Classifier',[]))
 rows.append({'ecosystem':'python','name':name,'version':d.version,'license':license})
 for f in d.files or []:
  if 'license' in str(f).lower() and f.name.lower().startswith(('license','copying','notice')):
   src=Path(d.locate_file(f))
   if src.is_file():shutil.copyfile(src,root/'docs/licenses'/(re.sub(r'[^a-zA-Z0-9._-]','_',name)+'-'+f.name))
(root/'docs/dependency-inventory.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2))
print(f'{len(rows)} installed distributions inventoried')
