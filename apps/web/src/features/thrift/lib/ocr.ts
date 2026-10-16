import type { Worker } from "tesseract.js";

/** Long edge of the image text recognition reads; bigger is slower, not better. */
const MAX_EDGE = 1600;

let worker: Promise<Worker> | undefined;

/**
 * One English reader for the whole visit. The first scan downloads the
 * reader and its language data (a few MB); later scans reuse it.
 */
function reader(): Promise<Worker> {
  worker ??= import("tesseract.js").then(({ createWorker }) =>
    createWorker("eng"),
  );
  worker.catch(() => {
    worker = undefined;
  });
  return worker;
}

/** Starts the download early, e.g. when the camera opens. */
export const warmUpReader = () => {
  void reader().catch(() => undefined);
};

/** The photo shrunk, upright and in high-contrast gray, which reads best. */
async function prepare(file: Blob): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(file, {
    imageOrientation: "from-image",
  });
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Couldn't prepare the photo");
  ctx.filter = "grayscale(1) contrast(1.5)";
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas;
}

/** The text on a tag photo, read on the phone. Nothing is uploaded. */
export async function readTag(file: Blob): Promise<string> {
  const [canvas, w] = await Promise.all([prepare(file), reader()]);
  const { data } = await w.recognize(canvas);
  return data.text;
}
