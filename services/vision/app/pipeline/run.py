import json,sys,time
import cv2
import numpy as np
from .preprocess import preprocess
from .walls import candidates
from .ocr import recognize

def analyze(path,mpp,height):
    started=time.perf_counter();image=cv2.imread(str(path))
    if image is None: raise ValueError('Không đọc được ảnh')
    binary,ratio,skew,matrix,applied=preprocess(image)
    walls=candidates(binary,ratio,mpp,height)
    inverse=cv2.invertAffineTransform(matrix)
    for wall in walls:
        for key in ['start','end']:
            x,y=wall[key]
            source=inverse@np.array([x/mpp*ratio,y/mpp*ratio,1.])
            wall[key]=[round(float(v)/ratio*mpp,6) for v in source]
    ocr,warning=recognize(path)
    warnings=['Ứng viên tường chưa xác nhận; có thể nhầm đường kích thước hoặc bỏ sót tường.', 'Baseline tìm tường theo hai trục vuông góc sau deskew. Cửa đi/cửa sổ cần thêm thủ công.', 'Không tạo sàn tự động; hãy vẽ polygon kín và xác nhận.']
    if applied: warnings.append(f'Đã deskew {skew:.1f}° cho nhận diện, rồi chuyển tọa độ về ảnh gốc. Kiểm tra lại đường tường với ảnh.')
    if warning: warnings.append(warning)
    return {'walls':walls,'openings':[],'ocr':ocr,'warnings':warnings,'sourceTransform':{'resizeRatio':ratio,'deskewApplied':bool(applied),'estimatedSkewDegrees':skew,'deskewMatrix':matrix.tolist(),'inverseDeskewMatrix':inverse.tolist()},'elapsedSeconds':round(time.perf_counter()-started,3)}
if __name__=='__main__':
    print(json.dumps(analyze(sys.argv[1],float(sys.argv[2]),float(sys.argv[3]))))
