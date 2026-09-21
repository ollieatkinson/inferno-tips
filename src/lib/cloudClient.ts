import type {
  Board,
  CloudResult,
  CloudTicket,
  InputBatch,
  RunTick,
} from './cloudProtocol';
import type { SeriesMode } from './series';
export interface CloudConfig {
  enabled: boolean;
  version: number;
  siteKey: string;
}
const base = (import.meta.env.PUBLIC_CLOUD_API || '/api/v1').replace(/\/$/, '');
export class CloudError extends Error {
  constructor(
    message: string,
    public status = 0,
  ) {
    super(message);
  }
}
export async function api<T>(
  path: string,
  data?: unknown,
  method = data === undefined ? 'GET' : 'POST',
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${base}${path}`, {
      method,
      credentials: 'include',
      headers:
        data === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: data === undefined ? undefined : JSON.stringify(data),
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    throw new CloudError(
      'Connection unavailable. Your run is kept here; try saving again.',
    );
  }
  const value = await response
    .json()
    .catch(() => ({ error: 'Public high scores are not available yet.' }));
  if (!response.ok || value.error)
    throw new CloudError(
      value.error || 'Unable to save. Please retry.',
      response.status,
    );
  return value;
}
export const getCloudConfig = () =>
  api<CloudConfig>('/config').catch(() => ({
    enabled: false,
    version: 1,
    siteKey: '',
  }));
export const getBoard = (
  mode: SeriesMode,
  period: 'all' | 'weekly',
  version?: number,
  week?: string,
) =>
  api<Board>(
    `/leaderboards?mode=${mode}&period=${period}${version ? `&version=${version}` : ''}${week ? `&week=${week}` : ''}`,
  );
const PENDING_KEY = 'inferno-tips-cloud-pending-v1';
export interface PendingRun {
  ticket: CloudTicket;
  batches: InputBatch[];
  sequence: number;
  reason?: 'finish' | 'practice';
  result?: CloudResult;
  error?: string;
  updated: number;
}
export function pendingRuns(): PendingRun[] {
  try {
    const rows = JSON.parse(localStorage.getItem(PENDING_KEY) || '[]');
    return Array.isArray(rows)
      ? rows.filter(
          (r) =>
            r?.ticket?.id &&
            Array.isArray(r.batches) &&
            Number.isInteger(r.sequence) &&
            Date.now() - r.updated < 30 * 86400000,
        )
      : [];
  } catch {
    return [];
  }
}
function persist(row: PendingRun) {
  try {
    localStorage.setItem(
      PENDING_KEY,
      JSON.stringify([
        ...pendingRuns().filter((r) => r.ticket.id !== row.ticket.id),
        row,
      ]),
    );
    return true;
  } catch {
    return false;
  }
}
export function discardPending(id: string) {
  try {
    localStorage.setItem(
      PENDING_KEY,
      JSON.stringify(pendingRuns().filter((r) => r.ticket.id !== id)),
    );
  } catch {
    /* Current run remains usable in memory. */
  }
}
export class CloudRecorder {
  readonly row: PendingRun;
  private buffer: RunTick[] = [];
  private stage = 0;
  private flight: Promise<void> | null = null;
  persistent = true;
  constructor(ticket: CloudTicket, saved?: PendingRun) {
    this.row = saved ?? {
      ticket,
      batches: [],
      sequence: 0,
      updated: Date.now(),
    };
    this.save();
  }
  private save() {
    this.row.updated = Date.now();
    this.persistent = persist(this.row);
  }
  record(stage: number, input: RunTick) {
    if (this.row.reason) return;
    if (stage !== this.stage && this.buffer.length) this.flush();
    this.stage = stage;
    this.buffer.push({ ...input, transitions: [...input.transitions] });
    if (input.tick === 36) {
      this.flush();
      void this.sync().catch(() => {});
    }
  }
  private flush() {
    if (!this.buffer.length) return;
    this.row.batches.push({
      sequence: this.row.sequence++,
      stage: this.stage,
      ticks: this.buffer,
    });
    this.buffer = [];
    this.save();
  }
  finish(practice: boolean) {
    if (this.row.reason) return;
    this.flush();
    this.row.reason = practice ? 'practice' : 'finish';
    this.save();
    void this.sync().catch(() => {});
  }
  async sync(): Promise<void> {
    if (this.flight) {
      await this.flight;
      if (this.row.batches.length || (this.row.reason && !this.row.result))
        return this.sync();
      return;
    }
    this.flight = this.upload();
    try {
      await this.flight;
    } finally {
      this.flight = null;
    }
  }
  private async upload() {
    try {
      while (this.row.batches.length) {
        const batch = this.row.batches[0];
        await api(`/runs/${this.row.ticket.id}/batches`, batch);
        this.row.batches.shift();
        this.save();
      }
      if (this.row.reason && !this.row.result) {
        this.row.result = await api<CloudResult>(
          `/runs/${this.row.ticket.id}/finish`,
          { batches: this.row.sequence, reason: this.row.reason },
        );
        if (this.row.result.practice || this.row.result.points === 0) {
          discardPending(this.row.ticket.id);
          return;
        }
      }
      delete this.row.error;
      this.save();
    } catch (error) {
      this.row.error = (error as Error).message;
      this.save();
      throw error;
    }
  }
  async publish(name: string, token: string, accountId?: string) {
    await this.sync();
    if (!this.row.result || this.row.result.practice)
      throw new CloudError('This run is practice only.');
    const result = await api<CloudResult>(
      `/runs/${this.row.ticket.id}/publish`,
      { name, token, ...(accountId ? { accountId } : {}) },
    );
    discardPending(this.row.ticket.id);
    return result;
  }
}
export async function startCloudRun(mode: SeriesMode) {
  return new CloudRecorder(await api<CloudTicket>('/runs', { mode }));
}
