import {expect,it} from "vitest";
import sharp from "sharp";
import {normalizeRulaImage} from "./rula-image-normalization.js";

it("normalizes EXIF rotation and strips metadata without changing image aspect",async()=>{
  const input=await sharp({create:{width:40,height:20,channels:3,background:"white"}}).jpeg().withMetadata({orientation:6}).toBuffer();
  const output=await normalizeRulaImage(input,"image/jpeg");
  expect(output).toMatchObject({mimeType:"image/png",width:20,height:40,normalized:true,sourceOrientation:6});
  const meta=await sharp(output.buffer).metadata();
  expect(meta.orientation).toBeUndefined();
  expect(meta.exif).toBeUndefined();
});
it("rejects corrupt, mismatched and oversized decoded input before a paid model request",async()=>{
  await expect(normalizeRulaImage(Buffer.from([0x89,0x50,0x4e,0x47]),"image/png")).rejects.toMatchObject({statusCode:415,code:"RULA_IMAGE_DECODE_INVALID"});
  const png=await sharp({create:{width:2,height:2,channels:3,background:"white"}}).png().toBuffer();
  await expect(normalizeRulaImage(png,"image/jpeg")).rejects.toMatchObject({statusCode:415,code:"RULA_IMAGE_DECODE_INVALID"});
  const tooManyPixels=await sharp({create:{width:5000,height:5000,channels:3,background:"white"}}).png().toBuffer();
  await expect(normalizeRulaImage(tooManyPixels,"image/png")).rejects.toMatchObject({code:"RULA_IMAGE_DECODE_INVALID"});
});
