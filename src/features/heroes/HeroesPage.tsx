import HeroBrowser from './HeroBrowser'

export default function HeroesPage() {
  return <HeroBrowser linkTo={(heroId) => `/heroes/${heroId}`} />
}
