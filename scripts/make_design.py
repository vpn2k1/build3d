"""Generate editable vector handoff frames, not browser screenshots."""
import json,html,math
from pathlib import Path
root=Path(__file__).resolve().parents[1]
p=json.loads((root/'fixtures/demo-house.json').read_text())
def frame(w,h,mobile=False):
 parts=[f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}"><title>BuildVision 3D — mẫu A, vector handoff</title>']
 def rect(x,y,w,h,fill='#fff',r=8,stroke='#e0e6ef'):parts.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}" fill="{fill}" stroke="{stroke}"/>')
 def text(x,y,t,size=13,fill='#1c2c47',weight=400):parts.append(f'<text x="{x}" y="{y}" font-family="Arial,sans-serif" font-size="{size}" fill="{fill}" font-weight="{weight}">{html.escape(t)}</text>')
 def line(x1,y1,x2,y2,stroke='#485366',width=4):parts.append(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{stroke}" stroke-width="{width}"/>')
 rect(0,0,w,h,'#f5f7fb',0);rect(0,0,w,74,r=0);rect(20,18,36,36,'#2361e8');text(29,43,'B',22,'white',700);text(68,42,'BuildVision 3D',20,weight=700)
 if not mobile:text(312,42,'Nhà mẫu · 1 tầng');text(1000,42,'↶   ↷     Lưu dự án');rect(1205,20,205,35,'#2361e8');text(1230,43,'Xuất mô hình',13,'white')
 text(22,105,'DỰ ÁN / WORKSPACE',9,'#8190a6',700);text(22,138,'Nhà mẫu · 1 tầng',25,weight=700);text(22,161,'Biến mặt bằng thành không gian.',11,'#8190a6')
 rect(20,182,w-40,64);rect(30,195,88,36,'#2361e8');text(46,218,'Tải ảnh',12,'white');text(133,218,'Phân tích',12)
 if not mobile:text(262,218,'Chọn       Tường       Cửa đi       Cửa sổ       Sàn       Tỷ lệ       Di chuyển',12)
 else:text(228,218,'Tường   Sàn   Tỷ lệ',11)
 if mobile:
  rect(20,259,170,36,'#edf3ff');text(61,282,'Mặt bằng 2D',12,'#2361e8');rect(200,259,170,36);text(236,282,'Không gian 3D',12)
  x,y,pw,ph=20,309,350,490
 else:x,y,pw,ph=20,264,515,600
 rect(x,y,pw,ph);text(x+16,y+30,'Mặt bằng 2D',13,weight=700);line(x,y+48,x+pw,y+48,'#e0e6ef',1)
 ox=x+pw*.19;oz=y+ph*.15;s=min(pw*.63/10,ph*.75/12)
 for wall in p['floors'][0]['walls']:
  a,b=wall['start'],wall['end'];line(ox+a[0]*s,oz+a[1]*s,ox+b[0]*s,oz+b[1]*s,'#485366',max(3,s*.2))
 for o in p['floors'][0]['openings']:
  wall=next(w for w in p['floors'][0]['walls'] if w['id']==o['wallId']);a,b=wall['start'],wall['end'];l=math.dist(a,b);dx=(b[0]-a[0])/l;dz=(b[1]-a[1])/l;start=[a[0]+dx*o['offset'],a[1]+dz*o['offset']];end=[start[0]+dx*o['width'],start[1]+dz*o['width']];line(ox+start[0]*s,oz+start[1]*s,ox+end[0]*s,oz+end[1]*s,'#fff',s*.25)
 for room in p['floors'][0]['rooms']:text(ox+(room['center'][0]-1.1)*s,oz+room['center'][1]*s,room['name'],6 if mobile else 8,'#8190a6')
 text(x+15,y+ph-17,'● Tỷ lệ đã xác nhận · 0.01 m/px',10,'#698879')
 if not mobile:
  rect(550,264,610,600,'#eef2f8');rect(550,264,610,48);text(568,294,'Không gian 3D',13,weight=700)
  def iso(x,z,yy=0):return(850+(x-5)*21-(z-6)*14,590+(x-5)*9+(z-6)*12-yy*32)
  floor=[iso(*v) for v in [[0,0],[10,0],[10,12],[0,12]]];parts.append('<polygon points="'+' '.join(f'{a},{b}' for a,b in floor)+'" fill="#d7d0c2"/>')
  for wall in p['floors'][0]['walls']:
   a,b=wall['start'],wall['end'];pts=[iso(*a),iso(*b),iso(*b,3.2),iso(*a,3.2)];parts.append('<polygon points="'+' '.join(f'{x},{y}' for x,y in pts)+'" fill="#f6f5f0" stroke="#b6c0cc" stroke-width="1"/>')
  text(664,766,'Minh họa khối · xem lỗ mở thật trong ứng dụng',10,'#8190a6');rect(725,797,260,38);text(746,821,'Chỉnh sửa        |        Đi bộ',12,'#2361e8')
  rect(1176,264,244,600);text(1192,294,'Thuộc tính',13,weight=700);text(1192,344,'CÔNG TRÌNH',10,'#8190a6',700)
  for i,(label,value) in enumerate([('Chiều cao tầng','3.2 m'),('Cao độ sàn','0 m'),('Độ dày tường','0.2 m')]):text(1192,378+i*73,label,11,'#8190a6');rect(1192,390+i*73,211,34,'#f9fbfe',5);text(1202,412+i*73,value,12)
  text(1192,647,'Chọn tường hoặc cửa',11,'#8190a6');text(1192,667,'để chỉnh thuộc tính.',11,'#8190a6')
 else:
  rect(20,814,350,220);text(36,844,'Thuộc tính · Công trình',14,weight=700);text(36,886,'Chiều cao tầng',11,'#8190a6');rect(36,900,318,35,'#f9fbfe');text(48,924,'3.2 m',12);text(36,980,'Tỷ lệ đã xác nhận · Một tầng',11,'#8190a6')
 vy=1050 if mobile else 888;rect(20,vy,w-40,52,'#fffaf0',7,'#efdfb9');text(34,vy+23,'Mô hình phục vụ trực quan hóa',11,'#b18436',700);text(34,vy+40,'Không thay thế hồ sơ thi công.',10,'#b18436');text(22,h-24,'BUILDVISION 3D  /  LOCAL MVP · Design handoff',8,'#8190a6');parts.append('</svg>');return ''.join(parts)
(root/'design/frames/desktop.svg').write_text(frame(1440,1000))
(root/'design/frames/mobile.svg').write_text(frame(390,1160,True))
