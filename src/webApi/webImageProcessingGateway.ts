import type { MergeStoryboardImagesPayload, MergeStoryboardImagesResult, PrepareNodeImageSourceResult, CropImageSourcePayload } from '@/commands/image';

export interface WebImageProcessingGateway {
  mergeStoryboardImages: (payload: MergeStoryboardImagesPayload) => Promise<MergeStoryboardImagesResult>;
  prepareNodeImageSource: (source: string, maxPreviewDimension?: number) => Promise<PrepareNodeImageSourceResult>;
  cropImageSource: (payload: CropImageSourcePayload) => Promise<string>;
  saveImageSourceToDownloads: (source: string, suggestedFileName?: string) => Promise<string>;
  copyImageSourceToClipboard: (source: string) => Promise<void>;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });
}

async function loadImageFromSource(source: string): Promise<HTMLImageElement> {
  if (source.startsWith('data:') || source.startsWith('blob:') || source.startsWith('http')) {
    return loadImage(source);
  }
  return loadImage(source);
}

export const webImageProcessingGateway: WebImageProcessingGateway = {
  async mergeStoryboardImages(payload: MergeStoryboardImagesPayload): Promise<MergeStoryboardImagesResult> {
    const { frameSources, rows, cols, cellGap, outerPadding, noteHeight, fontSize, backgroundColor, maxDimension } = payload;
    const { showFrameIndex, showFrameNote, notePlacement, imageFit, frameIndexPrefix, textColor, frameNotes } = payload;

    const frameImages: HTMLImageElement[] = [];
    for (const src of frameSources) {
      frameImages.push(await loadImageFromSource(src));
    }

    const cellWidth = Math.floor((maxDimension - outerPadding * 2 - cellGap * (cols - 1)) / cols);
    const cellHeight = Math.floor(cellWidth);
    const canvasWidth = outerPadding * 2 + cols * cellWidth + (cols - 1) * cellGap;
    const canvasHeight = outerPadding * 2 + rows * cellHeight + (rows - 1) * cellGap + (notePlacement === 'bottom' ? noteHeight * rows : 0);

    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');

    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    let frameIndex = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = outerPadding + c * (cellWidth + cellGap);
        const y = outerPadding + r * (cellHeight + cellGap);
        const img = frameImages[frameIndex];

        if (img) {
          if (imageFit === 'cover') {
            const scale = Math.max(cellWidth / img.width, cellHeight / img.height);
            const scaledW = img.width * scale;
            const scaledH = img.height * scale;
            const offsetX = (cellWidth - scaledW) / 2;
            const offsetY = (cellHeight - scaledH) / 2;
            ctx.drawImage(img, x + offsetX, y + offsetY, scaledW, scaledH);
          } else {
            ctx.drawImage(img, x, y, cellWidth, cellHeight);
          }
        }

        if (showFrameIndex && notePlacement === 'overlay') {
          const label = `${frameIndexPrefix ?? ''}${frameIndex + 1}`;
          ctx.fillStyle = 'rgba(0,0,0,0.5)';
          const labelWidth = ctx.measureText(label).width + 16;
          ctx.fillRect(x, y, labelWidth, 24);
          ctx.fillStyle = textColor ?? '#ffffff';
          ctx.fillText(label, x + labelWidth / 2, y + 4);
        }

        if (showFrameNote && frameNotes?.[frameIndex] && notePlacement === 'bottom') {
          ctx.fillStyle = textColor ?? '#ffffff';
          ctx.font = `${fontSize}px sans-serif`;
          ctx.fillText(frameNotes[frameIndex], x + cellWidth / 2, y + cellHeight + 4);
        }

        frameIndex++;
      }
    }

    const imagePath = canvas.toDataURL('image/png');

    return {
      imagePath,
      canvasWidth,
      canvasHeight,
      cellWidth,
      cellHeight,
      gap: cellGap,
      padding: outerPadding,
      noteHeight,
      fontSize,
      textOverlayApplied: showFrameIndex ?? false,
    };
  },

  async prepareNodeImageSource(source: string, maxPreviewDimension = 512): Promise<PrepareNodeImageSourceResult> {
    const img = await loadImageFromSource(source);

    let width = img.width;
    let height = img.height;
    const aspectRatio = `${width}:${height}`;

    if (width > maxPreviewDimension || height > maxPreviewDimension) {
      const scale = Math.min(maxPreviewDimension / width, maxPreviewDimension / height);
      width = Math.floor(width * scale);
      height = Math.floor(height * scale);
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');

    ctx.drawImage(img, 0, 0, width, height);
    const previewImagePath = canvas.toDataURL('image/png');

    return {
      imagePath: source,
      previewImagePath,
      aspectRatio,
    };
  },

  async cropImageSource(payload: CropImageSourcePayload): Promise<string> {
    const { source, cropX = 0, cropY = 0, cropWidth, cropHeight } = payload;

    const img = await loadImageFromSource(source);

    const targetWidth = cropWidth ?? img.width;
    const targetHeight = cropHeight ?? img.height;

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');

    ctx.drawImage(img, cropX, cropY, targetWidth, targetHeight, 0, 0, targetWidth, targetHeight);

    return canvas.toDataURL('image/png');
  },

  async saveImageSourceToDownloads(source: string, suggestedFileName = 'storyboard.png'): Promise<string> {
    const link = document.createElement('a');
    link.href = source;
    link.download = suggestedFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return suggestedFileName;
  },

  async copyImageSourceToClipboard(source: string): Promise<void> {
    try {
      const response = await fetch(source);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob }),
      ]);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = source;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
  },
};
