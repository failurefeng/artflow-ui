import type { AiGateway } from '@/features/canvas/application/ports';

let cachedGateway: AiGateway | null = null;

export async function getAiGateway(): Promise<AiGateway> {
  if (cachedGateway) {
    return cachedGateway;
  }

  const { webAiGateway } = await import('./webAiGateway');
  cachedGateway = webAiGateway;
  return cachedGateway;
}
