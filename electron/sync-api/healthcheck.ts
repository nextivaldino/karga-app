import type { HealthcheckResult } from '../../src/types';

export function healthcheck(): HealthcheckResult {
  return { status: 'ok', timestamp: new Date().toISOString() };
}
