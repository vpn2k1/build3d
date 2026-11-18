import cv2
from shapely.geometry import LineString

def candidates(binary,ratio,mpp,height):
    found=[]
    for horizontal in [True,False]:
        kernel=cv2.getStructuringElement(cv2.MORPH_RECT,(35,1) if horizontal else (1,35))
        mask=cv2.morphologyEx(binary,cv2.MORPH_OPEN,kernel)
        count,labels,stats,centroids=cv2.connectedComponentsWithStats(mask)
        for x,y,w,h,pixels in stats[1:]:
            length=w if horizontal else h;thickness=h if horizontal else w
            if length<40 or thickness<3 or thickness>length*.25: continue
            if pixels/(w*h)<.55: continue
            thick=thickness/ratio*mpp
            if not .05<=thick<=1.0 or length/ratio*mpp<.4: continue
            a=(x,y+h/2) if horizontal else (x+w/2,y)
            b=(x+w,y+h/2) if horizontal else (x+w/2,y+h)
            line=LineString([(a[0]/ratio*mpp,a[1]/ratio*mpp),(b[0]/ratio*mpp,b[1]/ratio*mpp)])
            if not line.is_valid or line.length<.1: continue
            found.append({'start':list(line.coords[0]),'end':list(line.coords[-1]),'thickness':round(thick,4),'height':height,'status':'detected','confidence':.55})
    # Snap nearby endpoints only; confidence is a heuristic, not calibrated probability.
    for i,w in enumerate(found):
        w['id']=f'detected-{i+1}'
        for key in ['start','end']:
            for previous in found[:i]:
                for other in ['start','end']:
                    if sum((w[key][j]-previous[other][j])**2 for j in range(2))**.5<.08:
                        w[key]=previous[other].copy()
    return [w for w in found[:2000] if LineString([w['start'],w['end']]).length>=.1]
