/**
 * Image Slicing Utility
 *
 * Splits tall manga/manhwa page images into smaller pieces
 * for better processing efficiency.
 */

export interface DetectedBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  x: number;
  y: number;
  width: number;
  height: number;
  classId: number;
  confidence: number;
  sliceIndex: number;
  originalX1: number;
  originalY1: number;
  originalX2: number;
  originalY2: number;
}

export interface ImageSlice {
  uri: string;
  index: number;
  offsetY: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
}

export interface SliceOptions {
  sliceHeight: number;
  overlap: number;
}

/**
 * Slice an image into smaller pieces
 */
export async function sliceImage(
  imageUri: string,
  options: SliceOptions = { sliceHeight: 640, overlap: 50 }
): Promise<ImageSlice[]> {
  const { sliceHeight, overlap } = options;

  // Get image dimensions
  const imageInfo = await getImageInfo(imageUri);

  const slices: ImageSlice[] = [];
  let currentY = 0;
  let sliceIndex = 0;

  while (currentY < imageInfo.height) {
    const sliceEnd = Math.min(currentY + sliceHeight, imageInfo.height);
    const actualHeight = sliceEnd - currentY;

    slices.push({
      uri: imageUri,
      index: sliceIndex,
      offsetY: currentY,
      height: actualHeight,
      originalWidth: imageInfo.width,
      originalHeight: imageInfo.height,
    });

    currentY += sliceHeight - overlap;
    sliceIndex++;
  }

  return slices;
}

/**
 * Map boxes from slice coordinates to original image coordinates
 */
export function mapBoxesToOriginal(
  boxes: DetectedBox[],
  slice: ImageSlice
): DetectedBox[] {
  return boxes.map((box) => ({
    ...box,
    originalY1: box.y1 + slice.offsetY,
    originalY2: box.y2 + slice.offsetY,
    originalX1: box.x1,
    originalX2: box.x2,
    sliceIndex: slice.index,
  }));
}

/**
 * Merge overlapping detection boxes
 */
export function mergeOverlappingBoxes(
  boxes: DetectedBox[],
  iouThreshold: number = 0.5
): DetectedBox[] {
  if (boxes.length === 0) return boxes;

  const sorted = [...boxes].sort((a, b) => b.confidence - a.confidence);
  const merged: DetectedBox[] = [];

  for (const box of sorted) {
    let isDuplicate = false;
    for (const existing of merged) {
      const iou = calculateIoU(box, existing);
      if (iou > iouThreshold) {
        isDuplicate = true;
        break;
      }
    }
    if (!isDuplicate) {
      merged.push(box);
    }
  }

  return merged;
}

/**
 * Calculate IoU between two boxes
 */
function calculateIoU(a: DetectedBox, b: DetectedBox): number {
  const x1 = Math.max(a.originalX1, b.originalX1);
  const y1 = Math.max(a.originalY1, b.originalY1);
  const x2 = Math.min(a.originalX2, b.originalX2);
  const y2 = Math.min(a.originalY2, b.originalY2);

  const intersectionArea = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  const aArea = (a.originalX2 - a.originalX1) * (a.originalY2 - a.originalY1);
  const bArea = (b.originalX2 - b.originalX1) * (b.originalY2 - b.originalY1);
  const unionArea = aArea + bArea - intersectionArea;

  return unionArea > 0 ? intersectionArea / unionArea : 0;
}

/**
 * Get image dimensions
 */
async function getImageInfo(uri: string): Promise<{
  width: number;
  height: number;
}> {
  return new Promise((resolve) => {
    const Image = require("react-native").Image;
    Image.getSize(
      uri,
      (width: number, height: number) => resolve({ width, height }),
      () => resolve({ width: 1200, height: 1800 })
    );
  });
}
