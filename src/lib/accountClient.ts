import { api, CloudError } from './cloudClient';
import type {
  AccountView,
  DrillTicket,
  PendingDrill,
  DrillResult,
} from './accountProtocol';
import { drillTicks, type LessonId, type Mode } from './course';
import type { RunTick } from './cloudProtocol';
export const ACCOUNT_CHANGED = 'inferno-account-changed';
const QUEUE_KEY = 'inferno-account-pending-v1';
export const emptyAccount: AccountView = {
  enabled: false,
  providers: { google: false, discord: false },
  siteKey: '',
  user: null,
  progress: {},
  imported: null,
  history: [],
  linkedProviders: [],
};
export const getAccount = () => api<AccountView>('/account');
export const accountChanged = () =>
  window.dispatchEvent(new Event(ACCOUNT_CHANGED));
export async function socialSignIn(
  provider: 'google' | 'discord',
  token: string,
  link = false,
) {
  const base = (import.meta.env.PUBLIC_CLOUD_API || '/api/v1').replace(
    /\/$/,
    '',
  );
  const response = await fetch(
    `${base}/auth/${link ? 'link-social' : 'sign-in/social'}`,
    {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-Captcha-Response': token,
      },
      body: JSON.stringify({
        provider,
        callbackURL: `${location.origin}/#account`,
        errorCallbackURL: `${location.origin}/?auth-error=1#account`,
        disableRedirect: true,
      }),
      signal: AbortSignal.timeout(10000),
    },
  );
  const data = await response.json();
  if (!response.ok || !data.url)
    throw new Error(
      data.message || data.error || 'Sign-in could not start. Please retry.',
    );
  const url = new URL(data.url);
  if (
    url.protocol !== 'https:' ||
    !['accounts.google.com', 'discord.com'].includes(url.hostname)
  )
    throw new Error('Unexpected sign-in destination.');
  location.assign(url.href);
}
export function pendingDrills(userId: string): PendingDrill[] {
  try {
    const raw = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    return Array.isArray(raw)
      ? raw
          .filter((p) => p?.ticket?.userId === userId && Array.isArray(p.ticks))
          .slice(-20)
      : [];
  } catch {
    return [];
  }
}
function updateQueue(run: PendingDrill, remove = false) {
  let all: PendingDrill[] = [];
  try {
    const raw = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    if (Array.isArray(raw))
      all = raw.filter(
        (p) =>
          p?.ticket?.id &&
          p.ticket.id !== run.ticket.id &&
          p.updated > Date.now() - 30 * 86400000,
      );
  } catch {
    /* New queue if old data is malformed. */
  }
  if (!remove) all.push(run);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(all.slice(-40)));
}
export function discardDrill(run: PendingDrill) {
  updateQueue(run, true);
  accountChanged();
}
const syncing = new Map<string, Promise<DrillResult>>();
export function syncDrill(run: PendingDrill): Promise<DrillResult> {
  const existing = syncing.get(run.ticket.id);
  if (existing) return existing;
  const job = api<DrillResult>(`/account/drills/${run.ticket.id}/finish`, {
    ticks: run.ticks,
    practice: run.practice,
  })
    .then((result) => {
      try {
        updateQueue(run, true);
      } catch {
        /* The server result is saved even if browser storage is blocked. */
      }
      accountChanged();
      return result;
    })
    .finally(() => syncing.delete(run.ticket.id));
  syncing.set(run.ticket.id, job);
  return job;
}
export class DrillRecorder {
  readonly ticks: RunTick[] = [];
  constructor(readonly ticket: DrillTicket) {}
  record(tick: RunTick) {
    this.ticks.push(tick);
  }
  async cancel() {
    if (this.ticks.length < drillTicks(this.ticket.lesson))
      await api(`/account/drills/${this.ticket.id}/cancel`, {});
  }
  async finish(practice: boolean) {
    const run: PendingDrill = {
      ticket: this.ticket,
      ticks: this.ticks,
      practice,
      updated: Date.now(),
    };
    let retained = true;
    try {
      updateQueue(run);
    } catch {
      retained = false;
    }
    try {
      await syncDrill(run);
      return 'Saved to your account.';
    } catch (error) {
      accountChanged();
      const message =
        error instanceof Error ? error.message : 'Unable to sync.';
      if (error instanceof CloudError && error.status === 401)
        return 'Sign in to the same account to sync this run from Account settings.';
      return retained
        ? `${message} Run kept in this browser. Retry from Account settings.`
        : `${message} Browser storage is unavailable; this run could not be queued.`;
    }
  }
  static async start(userId: string, lesson: LessonId, mode: Mode) {
    const ticket = await api<DrillTicket>('/account/drills', { lesson, mode });
    if (ticket.userId !== userId)
      throw new Error(
        'Your account changed. Refresh before starting a synced drill.',
      );
    return new DrillRecorder(ticket);
  }
}
