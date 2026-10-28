// 브라우저에서 이미지 크기를 줄이는 도우미 (외부 라이브러리 없이 Canvas 사용)
// - 휴대폰 사진(수 MB)을 업로드 전에 적당한 크기의 JPEG 로 줄여
//   저장 공간과 로딩 시간을 아낍니다.
// - 사진의 회전 정보(EXIF)를 반영하고, 위치정보 등 메타데이터는 자연히 제거됩니다.

export type ResizedImage = { blob: Blob; width: number; height: number };

async function loadBitmap(file: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if ("createImageBitmap" in window) {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      // 일부 브라우저는 옵션을 지원하지 않음 → 아래 방식으로 재시도
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function resizeImage(file: Blob, maxSide: number, quality = 0.86): Promise<ResizedImage> {
  const source = await loadBitmap(file);
  const srcW = "naturalWidth" in source ? source.naturalWidth : source.width;
  const srcH = "naturalHeight" in source ? source.naturalHeight : source.height;
  const scale = Math.min(1, maxSide / Math.max(srcW, srcH));
  const width = Math.max(1, Math.round(srcW * scale));
  const height = Math.max(1, Math.round(srcH * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("이미지를 처리할 수 없는 브라우저입니다.");
  // 투명 배경(PNG)은 흰색으로 채움 (JPEG 는 투명을 지원하지 않음)
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, 0, 0, width, height);
  if ("close" in source) source.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", quality),
  );
  if (!blob) throw new Error("이미지를 변환하지 못했습니다.");
  return { blob, width, height };
}
