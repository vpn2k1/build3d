from typing import Literal
from pydantic import BaseModel, Field, ConfigDict, model_validator
from shapely.geometry import Polygon
from math import hypot

class Strict(BaseModel):
    model_config = ConfigDict(extra='forbid', allow_inf_nan=False)
Status = Literal['detected','estimated','confirmed']
Point = tuple[float,float]
class Wall(Strict):
    id: str = Field(min_length=1)
    start: Point
    end: Point
    thickness: float = Field(ge=.05,le=2)
    height: float = Field(ge=1,le=10)
    status: Status
    confidence: float | None = Field(default=None,ge=0,le=1)
class Opening(Strict):
    id: str = Field(min_length=1)
    type: Literal['door','window']
    wallId: str
    offset: float = Field(ge=0)
    width: float = Field(ge=.2,le=10)
    height: float = Field(ge=.2,le=10)
    sillHeight: float = Field(ge=0,le=10)
    status: Status
    confidence: float | None = Field(default=None,ge=0,le=1)
class Slab(Strict):
    id: str
    polygon: list[Point] = Field(min_length=3,max_length=500)
    status: Status
class Room(Strict):
    id: str
    name: str
    center: Point
class Floor(Strict):
    id: str
    elevation: float
    height: float = Field(ge=1,le=10)
    walls: list[Wall] = Field(max_length=2000)
    openings: list[Opening] = Field(max_length=2000)
    rooms: list[Room]
    slabs: list[Slab]
    @model_validator(mode='after')
    def geometry(self):
        ids=[self.id]+[v.id for group in [self.walls,self.openings,self.rooms,self.slabs] for v in group]
        if len(ids)!=len(set(ids)): raise ValueError('ID phải duy nhất')
        walls={w.id:w for w in self.walls}
        for w in self.walls:
            if hypot(w.end[0]-w.start[0],w.end[1]-w.start[1])<.1: raise ValueError('Tường quá ngắn')
        for i,o in enumerate(self.openings):
            w=walls.get(o.wallId)
            if not w or o.offset+o.width>hypot(w.end[0]-w.start[0],w.end[1]-w.start[1])+1e-6 or o.sillHeight+o.height>w.height+1e-6: raise ValueError('Lỗ mở ngoài tường')
            if o.type=='door' and o.sillHeight!=0: raise ValueError('Cửa đi phải có cao độ 0')
            for b in self.openings[i+1:]:
                if o.wallId==b.wallId and o.offset<b.offset+b.width and o.offset+o.width>b.offset and o.sillHeight<b.sillHeight+b.height and o.sillHeight+o.height>b.sillHeight: raise ValueError('Lỗ mở chồng lấn')
        for s in self.slabs:
            poly=Polygon(s.polygon)
            if not poly.is_valid or poly.area<.01: raise ValueError('Polygon sàn không hợp lệ')
        return self
class Calibration(Strict):
    metersPerPixel: float = Field(gt=0)
    confirmed: bool
    reference: list[Point] | None = None
    distance: float | None = Field(default=None,gt=0)
class Image(Strict):
    dataUrl: str = Field(max_length=30000000,pattern=r"^data:image/(png|jpeg);base64,")
    originalDataUrl: str | None = Field(default=None,max_length=30000000,pattern=r"^data:image/(png|jpeg);base64,")
    width: int = Field(gt=0)
    height: int = Field(gt=0)
    rotation: float
    crop: list[float] | None = None
class SourceTransform(Strict):
    resizeRatio: float = Field(gt=0)
    deskewApplied: bool
    estimatedSkewDegrees: float
    deskewMatrix: list[list[float]] | None = None
    inverseDeskewMatrix: list[list[float]] | None = None
class OCRItem(Strict):
    text: str
    confidence: float
    box: list[list[float]]
    status: Literal['detected']
class Recognition(Strict):
    sourceTransform: SourceTransform
    warnings: list[str]
    ocr: list[OCRItem]
    elapsedSeconds: float = Field(ge=0)
class Project(Strict):
    schemaVersion: Literal[1]
    projectId: str = Field(pattern=r'^[a-zA-Z0-9_-]{1,100}$')
    name: str = Field(min_length=1,max_length=100)
    unit: Literal['m']
    revision: int = Field(ge=0)
    calibration: Calibration
    image: Image | None = None
    recognition: Recognition | None = None
    floors: list[Floor] = Field(min_length=1,max_length=1)
