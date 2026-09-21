import type { Env } from './env';
import { ApiError } from './http';

// Curated, short words keep every generated name within the public-name limit.
const first =
  'Amber Azure Blue Bold Brave Bright Calm Clear Coral Cosy Dusk Fair Fern Gold Grand Green Happy Jade Jolly Kind Lunar Merry Mint Noble Quiet Rapid Red Royal Silly Silver Sunny Swift'.split(
    ' ',
  );
const second =
  'Ash Bay Birch Brook Cedar Cloud Cove Dawn Dew Dune Elm Field Flint Frost Grove Hill Isle Lake Leaf Maple Mist Moon Moss Oak Pine Rain Reed River Rock Sand Snow Star'.split(
    ' ',
  );
const third =
  'Badger Bear Bee Bird Bison Boar Cat Cobra Crane Crow Deer Dove Drake Eagle Falcon Finch Fox Frog Gecko Hare Hawk Heron Koala Lynx Moth Newt Otter Owl Panda Raven Robin Wolf'.split(
    ' ',
  );

export function randomNickname() {
  const values = crypto.getRandomValues(new Uint32Array(3));
  return [first, second, third]
    .map((words, i) => words[values[i] % words.length])
    .join(' ');
}

export function publicName(value: unknown): string {
  const name = typeof value === 'string' ? value.trim().normalize('NFC') : '';
  if (
    name.length < 2 ||
    name.length > 24 ||
    !/^[\p{L}\p{N} _'’-]+$/u.test(name) ||
    !/[\p{L}\p{N}]/u.test(name)
  )
    throw new ApiError(
      400,
      'Use 2–24 letters, numbers, spaces, apostrophes, hyphens or underscores, including at least one letter or number.',
    );
  return name;
}

export async function accountNickname(
  env: Env,
  userId: string,
): Promise<string> {
  const existing = await env.DB.prepare(
    'SELECT nickname FROM account_profiles WHERE user_id = ?',
  )
    .bind(userId)
    .first<{ nickname: string }>();
  if (existing) return existing.nickname;
  // Concurrent first requests must return the same saved name.
  await env.DB.prepare(
    'INSERT OR IGNORE INTO account_profiles(user_id,nickname,updated_at) VALUES (?,?,?)',
  )
    .bind(userId, randomNickname(), Date.now())
    .run();
  const profile = await env.DB.prepare(
    'SELECT nickname FROM account_profiles WHERE user_id = ?',
  )
    .bind(userId)
    .first<{ nickname: string }>();
  if (!profile) throw new ApiError(409, 'Account changed. Sign in again.');
  return profile.nickname;
}
