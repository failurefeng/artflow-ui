import type { ImageSplitGateway } from '@/features/canvas/application/ports';

let cachedImageSplitGateway: ImageSplitGateway | null = null;

export async function getImageSplitGateway(): Promise<ImageSplitGateway> {
  if (cachedImageSplitGateway) {
    return cachedImageSplitGateway;
  }

  const { webImageSplitGateway } = await import('./webImageSplitGateway');
  cachedImageSplitGateway = webImageSplitGateway;
  return cachedImageSplitGateway;
}
