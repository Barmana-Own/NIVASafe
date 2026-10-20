export function rulaVisionDimensions(width: number, height: number) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) throw new Error("Invalid image dimensions");
  const ratio = Math.min(1, 1600 / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * ratio)), height: Math.max(1, Math.round(height * ratio)) };
}

// Optimize only the analysis request. The original upload and preview are preserved.
export async function prepareRulaVisionImage(file: File): Promise<File> {
  if (file.size <= 512_000 || typeof createImageBitmap !== "function") return file;
  let bitmap: ImageBitmap | undefined;
  try {
    bitmap = await createImageBitmap(file);
    const dimensions = rulaVisionDimensions(bitmap.width, bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;
    const context = canvas.getContext("2d");
    if (!context) return file;
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.88));
    return blob && blob.size < file.size ? new File([blob], "posture-analysis.jpg", { type: "image/jpeg", lastModified: file.lastModified }) : file;
  } catch {
    // Unsupported decoding/encoding must not prevent an otherwise valid upload.
    return file;
  } finally {
    bitmap?.close();
  }
}
