import os
from pathlib import Path

def recognize(image_path):
    # Explicit local model directory: never auto-download model weights during analysis.
    model_dir=os.getenv('PADDLE_OCR_MODEL_DIR')
    if not model_dir:
        return [],'OCR chưa bật: cần cài PaddleOCR và cấp thư mục model local đã kiểm tra giấy phép.'
    root=Path(model_dir)
    if not (root/'det').is_dir() or not (root/'rec').is_dir():
        return [],'OCR: thư mục model phải có det/ và rec/.'
    try:
        from paddleocr import PaddleOCR
        engine=PaddleOCR(det_model_dir=str(root/'det'),rec_model_dir=str(root/'rec'),use_angle_cls=False,lang='en',use_gpu=False,show_log=False)
        result=engine.ocr(str(image_path),cls=False)
        items=[]
        for page in result or []:
            for box,(text,confidence) in page or []:
                items.append({'text':text,'confidence':float(confidence),'box':box,'status':'detected'})
        return items,None
    except Exception as exc:
        return [],f'OCR chưa chạy được ({type(exc).__name__}). Tiếp tục chỉnh tay.'
