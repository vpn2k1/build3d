import cv2
import numpy as np

def preprocess(image):
    # Scaling and rigid deskew are recorded; inverse-map detections to source pixels.
    ratio=min(1.,2000/max(image.shape[:2]))
    scaled=cv2.resize(image,None,fx=ratio,fy=ratio,interpolation=cv2.INTER_AREA) if ratio<1 else image.copy()
    gray=cv2.cvtColor(scaled,cv2.COLOR_BGR2GRAY)
    gray=cv2.GaussianBlur(gray,(3,3),0)
    _,binary=cv2.threshold(gray,0,255,cv2.THRESH_BINARY_INV+cv2.THRESH_OTSU)
    lines=cv2.HoughLinesP(binary,1,np.pi/180,70,minLineLength=80,maxLineGap=10)
    angles=[]
    if lines is not None:
        for x1,y1,x2,y2 in lines[:,0]:
            a=np.degrees(np.arctan2(y2-y1,x2-x1));a=(a+45)%90-45
            if abs(a)<15: angles.append(float(a))
    skew=float(np.median(angles)) if angles else 0.
    matrix=np.array([[1.,0.,0.],[0.,1.,0.]])
    applied=.5<abs(skew)<15 and len(angles)>=3
    if applied:
        h,w=binary.shape
        matrix=cv2.getRotationMatrix2D((w/2,h/2),skew,1.)
        binary=cv2.warpAffine(binary,matrix,(w,h),flags=cv2.INTER_NEAREST,borderValue=0)
    return binary,ratio,skew,matrix,applied
