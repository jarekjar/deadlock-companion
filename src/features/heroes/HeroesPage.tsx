import HeroBrowser from './HeroBrowser'
import { usePageMeta } from '../../lib/usePageMeta'

export default function HeroesPage() {
  usePageMeta(
    'Deadlock Heroes — Win Rates & Meta — The Cursed Apple',
    'Win and pick rates for every Deadlock hero over the last 30 days, with guides covering abilities, base stats, and the most popular items.',
  )
  return <HeroBrowser linkTo={(heroId) => `/heroes/${heroId}`} />
}
