import type {Wall} from "./model";

export async function decodeImage(source:string) {
  const image=new Image();
  image.src=source;
  try {await image.decode()} catch {throw Error("Trình duyệt không đọc được ảnh. Kiểm tra tệp hoặc chuyển sang PNG/JPEG.")}
  return image;
}

// Track consecutive dark runs of similar length across adjacent scan lines.
export function detectWalls(rgba:Uint8ClampedArray,width:number,height:number,mx:number,mz:number,wallHeight:number):Wall[] {
  const walls:Wall[]=[];
  for(const horizontal of [true,false]){
    const across=horizontal?width:height,rows=horizontal?height:width;
    type Run={a:number,b:number,first:number,last:number};
    let active:Run[]=[];
    function finish(r:Run){
      const length=r.b-r.a, thickness=r.last-r.first+1;
      const along=horizontal?mx:mz, acrossScale=horizontal?mz:mx;
      if(thickness<2||length<5*thickness||length*along<.4||thickness*acrossScale>2||walls.length>=1000)return;
      const center=(r.first+r.last+1)/2*acrossScale;
      walls.push({id:"scan-"+walls.length,start:horizontal?[r.a*along,center]:[center,r.a*along],end:horizontal?[r.b*along,center]:[center,r.b*along],height:wallHeight,thickness:Math.max(.05,thickness*acrossScale),status:"detected"});
    }
    for(let y=0;y<rows;y++){
      let a=-1;const next:Run[]=[];
      for(let x=0;x<=across;x++){
        const i=(horizontal?y*width+x:x*width+y)*4;
        const dark=x<across&&rgba[i+3]>127&&(rgba[i]*.3+rgba[i+1]*.59+rgba[i+2]*.11)<155;
        if(dark){if(a<0)a=x;continue}
        if(a>=0&&x-a>=16){
          const idx=active.findIndex(r=>Math.abs(r.a-a)<=3&&Math.abs(r.b-x)<=3);
          const run=idx>=0?active.splice(idx,1)[0]:{a,b:x,first:y,last:y};
          run.last=y;next.push(run);
        }
        a=-1;
      }
      active.forEach(finish);active=next;
    }
    active.forEach(finish);
  }
  return walls;
}

export async function analyzeInBrowser(url:string,mpp:number,wallHeight:number){
  const started=performance.now(),image=await decodeImage(url);
  const ratio=Math.min(1,1400/Math.max(image.width,image.height));
  const canvas=document.createElement("canvas");
  canvas.width=Math.max(1,Math.round(image.width*ratio));canvas.height=Math.max(1,Math.round(image.height*ratio));
  const ctx=canvas.getContext("2d")!;ctx.fillStyle="#fff";ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);
  const walls=detectWalls(ctx.getImageData(0,0,canvas.width,canvas.height).data,canvas.width,canvas.height,mpp*image.width/canvas.width,mpp*image.height/canvas.height,wallHeight);
  return {walls,openings:[],ocr:[],warnings:["Phân tích trong trình duyệt tìm nét tường gần ngang hoặc dọc. Kiểm tra kết quả trước khi áp dụng."],sourceTransform:{resizeRatio:ratio,deskewApplied:false,estimatedSkewDegrees:0},elapsedSeconds:(performance.now()-started)/1000};
}
