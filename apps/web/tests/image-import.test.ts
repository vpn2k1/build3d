import {expect,it} from "vitest";
import {detectWalls} from "../lib/image-import";
it("maps a horizontal and vertical wall to metres without creating a solid floor from whitespace",()=>{
 const w=120,h=80,p=new Uint8ClampedArray(w*h*4).fill(255);
 expect(detectWalls(p,w,h,.02,.02,3)).toEqual([]);
 for(let y=8;y<60;y++)for(let x=10;x<105;x++)if(y<14||x>=99)p.fill(0,(y*w+x)*4,(y*w+x)*4+3);
 const walls=detectWalls(p,w,h,.02,.02,3);
 expect(walls.some(v=>v.end[0]-v.start[0]>1.8)).toBe(true);
 expect(walls.some(v=>v.end[1]-v.start[1]>.8)).toBe(true);
 expect(walls.every(v=>v.status==="detected")).toBe(true);
});
