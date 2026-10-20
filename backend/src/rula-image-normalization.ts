import sharp from "sharp";

/** Decode only the allowed raster formats, normalize EXIF orientation and strip metadata.
 * Pixel and byte bounds limit decompression and provider cost. No original is overwritten.
 */
export async function normalizeRulaImage(input:Buffer,mimeType:string) {
  try {
    const image=sharp(input,{limitInputPixels:24_000_000,failOn:"warning"});
    const metadata=await image.metadata();
    const expected:Record<string,string>={"image/png":"png","image/jpeg":"jpeg","image/webp":"webp"};
    if(!expected[mimeType]||metadata.format!==expected[mimeType]||(metadata.pages??1)!==1||!metadata.width||!metadata.height||metadata.width>16384||metadata.height>16384) throw new Error("Invalid raster metadata");
    const {data,info}=await image.autoOrient().png().timeout({seconds:5}).toBuffer({resolveWithObject:true});
    if(data.length>10*1024*1024) throw Object.assign(new Error("Normalized image is too large"),{statusCode:413,code:"RULA_IMAGE_SIZE_LIMIT"});
    return {buffer:data,mimeType:"image/png",width:info.width,height:info.height,normalized:true as const,sourceOrientation:metadata.orientation??1};
  } catch(error) {
    if(error&&typeof error==="object"&&"code" in error&&error.code==="RULA_IMAGE_SIZE_LIMIT") throw error;
    throw Object.assign(new Error("تصویر قابل خواندن نیست؛ یک تصویر معتبر PNG، JPEG یا WebP ارسال کنید."),{statusCode:415,code:"RULA_IMAGE_DECODE_INVALID",retryable:false});
  }
}
