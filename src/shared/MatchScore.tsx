import { rankTier, type MatchRank } from '../lib/matchScore'

export const MATCH_SCORE_HELP =
  'Where this player placed among everyone in the match, 1 being the best performance. Ordered by kills + assists, souls and hero damage most, then KDA, deaths and last hits, then boss damage, healing and denies.'

export default function MatchScore({ placement }: { placement: MatchRank | undefined }) {
  if (placement === undefined) return <span className="dim">—</span>
  return (
    <span className={`match-score score-${rankTier(placement)}`} title={MATCH_SCORE_HELP}>
      #{placement.rank}
      <span className="score-of">/{placement.of}</span>
    </span>
  )
}
