import { type MatchSalt } from './api'

/**
 * Extraction of match salts from Steam's HTTP cache. The Deadlock client
 * downloads match metadata and replays from URLs like
 *   http://replay404.valve.net/1422450/37959196_937530290.meta.bz2
 * which Steam caches on disk. The cache blobs store the request with no
 * scheme, as NUL-terminated host and path fields:
 *   replay404.valve.net\0/1422450/37959196_937530290.meta.bz2\0
 * so the pattern allows an optional NUL between host and path and must not
 * require "http://".
 */

// eslint-disable-next-line no-control-regex -- the NUL separator is exactly what's on disk
const REPLAY_URL = /replay(\d+)\.valve\.net\x00?\/1422450\/(\d+)_(\d+)\.(meta|dem)\.bz2/g

/** All salt references found in one file's text (latin1-decoded bytes). */
export function extractSalts(text: string): MatchSalt[] {
  const out: MatchSalt[] = []
  for (const m of text.matchAll(REPLAY_URL)) {
    const [, cluster, matchId, salt, kind] = m
    out.push({
      match_id: Number(matchId),
      cluster_id: Number(cluster),
      metadata_salt: kind === 'meta' ? Number(salt) : null,
      replay_salt: kind === 'dem' ? Number(salt) : null,
    })
  }
  return out
}

/** One entry per match, meta and replay salts folded together. */
export function mergeSalts(salts: MatchSalt[]): MatchSalt[] {
  const byMatch = new Map<number, MatchSalt>()
  for (const salt of salts) {
    const existing = byMatch.get(salt.match_id)
    if (!existing) {
      byMatch.set(salt.match_id, { ...salt })
      continue
    }
    existing.cluster_id = existing.cluster_id ?? salt.cluster_id
    existing.metadata_salt = existing.metadata_salt ?? salt.metadata_salt
    existing.replay_salt = existing.replay_salt ?? salt.replay_salt
  }
  return [...byMatch.values()].sort((a, b) => b.match_id - a.match_id)
}
