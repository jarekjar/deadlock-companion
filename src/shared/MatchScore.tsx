import { MAX_MATCH_SCORE, scoreTier } from '../lib/matchScore'

export const MATCH_SCORE_HELP =
  'Performance score out of 12, ranked against the other players in this match: kills + assists, souls and hero damage count most, then KDA, deaths and last hits, then boss damage, healing and denies. 12 means best in the lobby at everything.'

export default function MatchScore({ score }: { score: number | undefined }) {
  if (score === undefined) return <span className="dim">—</span>
  return (
    <span className={`match-score score-${scoreTier(score)}`} title={MATCH_SCORE_HELP}>
      {score.toFixed(1)}
      <span className="score-of">/{MAX_MATCH_SCORE}</span>
    </span>
  )
}
