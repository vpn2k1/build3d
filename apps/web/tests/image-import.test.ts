import {expect,it} from "vitest";
import {detectWalls} from "../lib/image-import";
it("recognizes four single-pixel room edges at the calibrated 4 m width", () => {
  const width = 240;
  const pixels = new Uint8ClampedArray(width * 180 * 4).fill(255);
  for (let y = 20; y < 160; y++) {
    for (let x = 20; x < 220; x++) {
      if (y === 20 || y === 159 || x === 20 || x === 219) {
        const offset = 4 * (y * width + x);
        pixels.fill(0, offset, offset + 3);
      }
    }
  }
  const walls = detectWalls(pixels, width, 180, .02, .02, 3);
  expect(walls).toHaveLength(4);
  const horizontal = walls.filter(w => w.start[1] === w.end[1]);
  expect(horizontal).toHaveLength(2);
  for (const w of horizontal) expect(w.end[0] - w.start[0]).toBeCloseTo(4, 6);
});
it("maps a horizontal and vertical wall to metres without creating a solid floor from whitespace",()=>{
 const w=120,h=80,p=new Uint8ClampedArray(w*h*4).fill(255);
 expect(detectWalls(p,w,h,.02,.02,3)).toEqual([]);
 for(let y=8;y<60;y++)for(let x=10;x<105;x++)if(y<14||x>=99)p.fill(0,(y*w+x)*4,(y*w+x)*4+3);
 const walls=detectWalls(p,w,h,.02,.02,3);
 expect(walls.some(v=>v.end[0]-v.start[0]>1.8)).toBe(true);
 expect(walls.some(v=>v.end[1]-v.start[1]>.8)).toBe(true);
 expect(walls.every(v=>v.status==="detected")).toBe(true);
});
