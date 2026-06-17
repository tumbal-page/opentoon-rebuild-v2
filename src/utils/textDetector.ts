/**
 * Text Detection Module - TFLite Integration
 *
 * Uses the original TFLite model (detector_dywi8.tflite) from OpenToon APK.
 * Detects speech bubbles (class 1) and free-standing text (class 2).
 *
 * Model specifications:
 * - Input size: 640x640 pixels
 * - Confidence threshold: 0.3
 * - Minimum detection box size: 5px
 * - IoU merge threshold: 0.5
 */

import { DetectedBox } from "./imageSlicer";

// Model constants
const MODEL_INPUT_SIZE = 640;
const CONFIDENCE_THRESHOLD = 0.3;
const MIN_BOX_SIZE = 5;
const CLASS_TEXT_BUBBLE = 1;
const CLASS_TEXT_FREE = 2;
const TEXT_DETECTION_MERGE_IOU_THRESHOLD = 0.5;

// TFLite model instance
let tfliteModel: any = null;
let modelLoaded = false;

/**
 * Initialize the TFLite text detection model
 */
async function initializeModel(): Promise<void> {
  if (modelLoaded) return;

  try {
    // In production, use @tensorflow/tflite-react-native:
    //
    // import { TFLiteModel } from '@tensorflow/tflite-react-native';
    // import { Asset } from 'expo-asset';
    //
    // const modelAsset = Asset.fromModule(require('../assets/detector_dywi8.tflite'));
    // await modelAsset.downloadAsync();
    //
    // tfliteModel = await TFLiteModel.fromModel(modelAsset.uri, {
    //   numThreads: 4,
    // });
    //
    // modelLoaded = true;
    // console.log("TFLite model loaded successfully");

    // Mock mode for development
    console.log("TFLite: Using mock mode (model at src/assets/detector_dywi8.tflite)");
    modelLoaded = true;
  } catch (error) {
    console.error("Failed to initialize TFLite model:", error);
    throw error;
  }
}

/**
 * Detect text blocks in image slices
 */
export async function detectTextBlocks(
  slices: { uri: string; index: number; offsetY: number; height: number; originalWidth: number; originalHeight: number }[]
): Promise<DetectedBox[]> {
  await initializeModel();

  const allBoxes: DetectedBox[] = [];

  for (const slice of slices) {
    const boxes = await detectInSlice(slice);
    allBoxes.push(...boxes);
  }

  return mergeOverlappingBoxes(allBoxes);
}

/**
 * Detect text blocks in a single image slice
 */
async function detectInSlice(slice: {
  uri: string;
  index: number;
  offsetY: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
}): Promise<DetectedBox[]> {
  try {
    // ============================================================
    // PRODUCTION CODE - Uncomment when TFLite is properly set up
    // ============================================================
    //
    // import * as tf from '@tensorflow/tfjs';
    // import { decodeJpeg } from '@tensorflow/tfjs-react-native';
    //
    // // 1. Load and preprocess image
    // const response = await fetch(slice.uri);
    // const imageData = await response.arrayBuffer();
    // const imageTensor = decodeJpeg(new Uint8Array(imageData));
    //
    // // Resize to model input size
    // const resized = tf.image.resizeBilinear(imageTensor, [MODEL_INPUT_SIZE, MODEL_INPUT_SIZE]);
    // const normalized = resized.div(255.0);
    // const batched = normalized.expandDims(0);
    //
    // // 2. Run TFLite inference
    // const output = await tfliteModel.predict(batched);
    //
    // // 3. Parse outputs
    // const boxes = output.boxes.dataSync();
    // const logits = output.logits.dataSync();
    //
    // // 4. Filter by confidence
    // const detections: DetectedBox[] = [];
    // const numDetections = logits.length / 3;
    //
    // for (let i = 0; i < numDetections; i++) {
    //   const classScores = [
    //     logits[i * 3],      // background
    //     logits[i * 3 + 1],  // speech bubble
    //     logits[i * 3 + 2],  // free text
    //   ];
    //
    //   const confidence = Math.max(classScores[1], classScores[2]);
    //   const classId = classScores[1] > classScores[2] ? 1 : 2;
    //
    //   if (confidence > CONFIDENCE_THRESHOLD) {
    //     const scaleX = slice.originalWidth / MODEL_INPUT_SIZE;
    //     const scaleY = slice.height / MODEL_INPUT_SIZE;
    //
    //     const x1 = boxes[i * 4] * scaleX;
    //     const y1 = boxes[i * 4 + 1] * scaleY;
    //     const x2 = boxes[i * 4 + 2] * scaleX;
    //     const y2 = boxes[i * 4 + 3] * scaleY;
    //
    //     const boxWidth = x2 - x1;
    //     const boxHeight = y2 - y1;
    //
    //     if (boxWidth >= MIN_BOX_SIZE && boxHeight >= MIN_BOX_SIZE) {
    //       detections.push({
    //         x1, y1, x2, y2,
    //         x: x1, y: y1, width: boxWidth, height: boxHeight,
    //         classId, confidence,
    //         sliceIndex: slice.index,
    //         originalX1: x1,
    //         originalY1: y1 + slice.offsetY,
    //         originalX2: x2,
    //         originalY2: y2 + slice.offsetY,
    //       });
    //     }
    //   }
    // }
    //
    // // Cleanup
    // imageTensor.dispose();
    // resized.dispose();
    // normalized.dispose();
    // batched.dispose();
    // output.boxes.dispose();
    // output.logits.dispose();
    //
    // return detections;

    // ============================================================
    // MOCK MODE
    // ============================================================
    return generateMockDetections(slice);

  } catch (error) {
    console.error(`Detection failed for slice ${slice.index}:`, error);
    return [];
  }
}

/**
 * Generate mock detections for development
 */
function generateMockDetections(slice: {
  uri: string;
  index: number;
  offsetY: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
}): DetectedBox[] {
  const mockBoxes: DetectedBox[] = [];
  const numBoxes = Math.floor(Math.random() * 3) + 2;

  for (let i = 0; i < numBoxes; i++) {
    const x1 = Math.random() * (slice.originalWidth - 200) + 50;
    const y1 = Math.random() * (slice.height - 100) + 30;
    const isBubble = Math.random() > 0.4;
    const width = isBubble ? Math.random() * 120 + 80 : Math.random() * 200 + 100;
    const height = isBubble ? Math.random() * 50 + 40 : Math.random() * 30 + 20;

    mockBoxes.push({
      x1,
      y1,
      x2: x1 + width,
      y2: y1 + height,
      x: x1,
      y: y1,
      width,
      height,
      classId: isBubble ? CLASS_TEXT_BUBBLE : CLASS_TEXT_FREE,
      confidence: Math.random() * 0.4 + 0.6,
      sliceIndex: slice.index,
      originalX1: x1,
      originalY1: y1 + slice.offsetY,
      originalX2: x1 + width,
      originalY2: y1 + height + slice.offsetY,
    });
  }

  return mockBoxes;
}

/**
 * Merge overlapping detection boxes
 */
function mergeOverlappingBoxes(boxes: DetectedBox[]): DetectedBox[] {
  if (boxes.length === 0) return boxes;

  const sorted = [...boxes].sort((a, b) => b.confidence - a.confidence);
  const merged: DetectedBox[] = [];

  for (const box of sorted) {
    let isDuplicate = false;
    for (const existing of merged) {
      const iou = calculateIoU(box, existing);
      if (iou > TEXT_DETECTION_MERGE_IOU_THRESHOLD) {
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
