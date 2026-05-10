import type { ImageSplitGateway } from '@/features/canvas/application/ports';

export const webImageSplitGateway: ImageSplitGateway = {
  split: async (imageSource: string, rows: number, cols: number, lineThickness = 0): Promise<string[]> => {
    return await splitImageWeb(imageSource, rows, cols, lineThickness);
  },
};

async function splitImageWeb(
  imageSource: string,
  rows: number,
  cols: number,
  lineThickness: number
): Promise<string[]> {
  const img = await loadImage(imageSource);
  const cellWidth = img.width / cols;
  const cellHeight = img.height / rows;
  const gap = lineThickness;
  const gapHalf = gap / 2;

  const promises: Promise<string>[] = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * cellWidth + gapHalf;
      const y = r * cellHeight + gapHalf;
      const w = cellWidth - gap;
      const h = cellHeight - gap;

      promises.push(
        new Promise<string>((resolve, reject) => {
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, w);
          canvas.height = Math.max(1, h);
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }

          ctx.drawImage(img, x, y, w, h, 0, 0, w, h);
          resolve(canvas.toDataURL('image/png'));
        })
      );
    }
  }

  return Promise.all(promises);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (error) => reject(new Error(`Failed to load image: ${error}`));
    if (src.startsWith('data:')) {
      img.src = src;
    } else {
      img.src = src;
    }
  });
}
