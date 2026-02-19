export function logSceneGeneration(data: {
  storyId: string;
  userId: string;
  sceneNumber?: number;
  durationMs?: number;
  success: boolean;
  stage?: string;
  error?: string;
}) {
  const payload = {
    timestamp: new Date().toISOString(),
    event: 'scene_generation',
    storyId: data.storyId,
    userId: data.userId,
    sceneNumber: data.sceneNumber ?? null,
    durationMs: data.durationMs ?? null,
    success: data.success,
    stage: data.stage ?? null,
    error: data.error ?? null
  };
  console.log(JSON.stringify(payload));
}

export function logStage(data: {
  event: string;
  stage: string;
  storyId?: string;
  userId?: string;
  detail?: Record<string, unknown>;
}) {
  const payload = {
    timestamp: new Date().toISOString(),
    event: data.event,
    stage: data.stage,
    storyId: data.storyId ?? null,
    userId: data.userId ?? null,
    detail: data.detail ?? null
  };
  console.log(JSON.stringify(payload));
}
