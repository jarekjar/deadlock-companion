import { Image } from 'expo-image'
import { useRouter } from 'expo-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import HeroPicker from '../../components/HeroPicker'
import { Btn, Card, Mono, Note, Screen, SectionTitle } from '../../components/ui'
import { itemIcon, itemMeta, type HeroAsset } from '../../lib/api'
import {
  useCounterItems,
  useHeroAnalytics,
  useHeroCounters,
  useHeroes,
  useItems,
} from '../../lib/queries'
import { loadJson, saveJson } from '../../lib/storage'
import { c, f, winRateColor } from '../../theme'

const PREP_KEY = 'dc.prepBoard.v1'
const LANES = ['L', 'M', 'R', 'FX'] as const
const MAX_ENEMIES = 6

interface PrepEnemy {
  heroId: number
  lane: string
}

interface PrepState {
  myHeroId: number | null
  enemies: PrepEnemy[]
}

export default function MyMatchScreen() {
  const router = useRouter()
  const heroes = useHeroes()
  const analytics = useHeroAnalytics()
  const counters = useHeroCounters()
  const items = useItems()

  const [prep, setPrep] = useState<PrepState>({ myHeroId: null, enemies: [] })
  const [picker, setPicker] = useState<'mine' | 'enemy' | null>(null)
  const [openCounters, setOpenCounters] = useState<number | null>(null)
  const hydrated = useRef(false)

  useEffect(() => {
    void loadJson<PrepState>(PREP_KEY).then((saved) => {
      if (saved) setPrep(saved)
      hydrated.current = true
    })
  }, [])
  useEffect(() => {
    if (hydrated.current) void saveJson(PREP_KEY, prep)
  }, [prep])

  const myHero = prep.myHeroId ? heroes.data?.get(prep.myHeroId) : undefined

  const matchupWinRates = useMemo(() => {
    const map = new Map<number, number>()
    if (!prep.myHeroId) return map
    for (const stat of counters.data ?? []) {
      if (stat.hero_id === prep.myHeroId && stat.matches_played > 0) {
        map.set(stat.enemy_hero_id, (stat.wins / stat.matches_played) * 100)
      }
    }
    return map
  }, [counters.data, prep.myHeroId])

  const draftAverage = useMemo(() => {
    if (!prep.myHeroId || prep.enemies.length < 3) return null
    const rates = prep.enemies
      .map((e) => matchupWinRates.get(e.heroId))
      .filter((v): v is number => v !== undefined)
    if (rates.length < 3) return null
    return rates.reduce((sum, v) => sum + v, 0) / rates.length
  }, [prep.myHeroId, prep.enemies, matchupWinRates])

  function setLane(index: number, lane: string) {
    setPrep((p) => ({
      ...p,
      enemies: p.enemies.map((en, i) =>
        i === index ? { ...en, lane: en.lane === lane ? '' : lane } : en,
      ),
    }))
  }

  return (
    <Screen title="My Match">
      <Note>
        Pick your hero and the enemy team as the draft reveals them — matchup win rates and
        counter items, ready before the horn.
      </Note>

      <SectionTitle>My Hero</SectionTitle>
      {myHero ? (
        <Card style={styles.myHeroCard}>
          <Image
            source={myHero.images.icon_hero_card_webp}
            style={styles.myHeroArt}
            contentFit="cover"
          />
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={styles.myHeroName}>{myHero.name}</Text>
            <HeroWinRate stat={analytics.data?.find((s) => s.hero_id === myHero.id)} />
          </View>
          <Btn small label="Change" onPress={() => setPicker('mine')} />
        </Card>
      ) : (
        <Btn label="Pick your hero" solid onPress={() => setPicker('mine')} />
      )}

      <SectionTitle>Enemy Team</SectionTitle>
      {prep.enemies.map((enemy, index) => {
        const hero = heroes.data?.get(enemy.heroId)
        const wr = matchupWinRates.get(enemy.heroId)
        if (!hero) return null
        return (
          <Card key={enemy.heroId} style={styles.enemyCard}>
            <View style={styles.enemyRow}>
              <Pressable
                style={styles.enemyHero}
                onPress={() =>
                  router.push({ pathname: '/heroes/[id]', params: { id: String(hero.id) } })
                }
              >
                <Image
                  source={hero.images.icon_image_small_webp}
                  style={styles.enemyIcon}
                  contentFit="cover"
                />
                <Text style={styles.enemyName}>{hero.name}</Text>
              </Pressable>
              {wr !== undefined && (
                <Mono size={15} color={winRateColor(wr)}>
                  {wr.toFixed(1)}%
                </Mono>
              )}
            </View>
            <View style={styles.enemyControls}>
              <View style={styles.laneSeg}>
                {LANES.map((lane) => (
                  <Pressable
                    key={lane}
                    onPress={() => setLane(index, lane)}
                    style={[styles.laneBtn, enemy.lane === lane && styles.laneBtnOn]}
                  >
                    <Text
                      style={[styles.laneLabel, enemy.lane === lane && styles.laneLabelOn]}
                    >
                      {lane}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {prep.myHeroId ? (
                  <Btn
                    small
                    label={openCounters === enemy.heroId ? 'Hide items' : 'Counter items'}
                    onPress={() =>
                      setOpenCounters(openCounters === enemy.heroId ? null : enemy.heroId)
                    }
                  />
                ) : null}
                <Btn
                  small
                  label="Remove"
                  onPress={() =>
                    setPrep((p) => ({
                      ...p,
                      enemies: p.enemies.filter((e) => e.heroId !== enemy.heroId),
                    }))
                  }
                />
              </View>
            </View>
            {openCounters === enemy.heroId && prep.myHeroId ? (
              <CounterItems myHeroId={prep.myHeroId} enemyHeroId={enemy.heroId} />
            ) : null}
          </Card>
        )
      })}
      {prep.enemies.length < MAX_ENEMIES && (
        <Btn
          label={prep.enemies.length === 0 ? 'Add enemy heroes' : 'Add another enemy'}
          onPress={() => setPicker('enemy')}
        />
      )}

      {draftAverage !== null && (
        <Card>
          <Text style={styles.draftLine}>
            Average matchup for {myHero?.name}:{' '}
            <Text style={{ color: winRateColor(draftAverage), fontFamily: f.monoSemi }}>
              {draftAverage.toFixed(1)}%
            </Text>{' '}
            over the last 30 days.
          </Text>
        </Card>
      )}

      {(prep.myHeroId || prep.enemies.length > 0) && (
        <Btn
          label="Clear board"
          onPress={() => {
            setPrep({ myHeroId: null, enemies: [] })
            setOpenCounters(null)
          }}
        />
      )}

      <HeroPicker
        visible={picker !== null}
        title={picker === 'mine' ? 'Pick your hero' : 'Add an enemy hero'}
        excludeIds={picker === 'enemy' ? prep.enemies.map((e) => e.heroId) : []}
        onClose={() => setPicker(null)}
        onPick={(hero: HeroAsset) => {
          if (picker === 'mine') {
            setPrep((p) => ({ ...p, myHeroId: hero.id }))
          } else {
            setPrep((p) =>
              p.enemies.length >= MAX_ENEMIES || p.enemies.some((e) => e.heroId === hero.id)
                ? p
                : { ...p, enemies: [...p.enemies, { heroId: hero.id, lane: '' }] },
            )
          }
          setPicker(null)
        }}
      />
    </Screen>
  )
}

function HeroWinRate({ stat }: { stat?: { matches: number; wins: number } }) {
  if (!stat || stat.matches === 0) return null
  const wr = (stat.wins / stat.matches) * 100
  return (
    <Text style={styles.heroWr}>
      <Text style={{ color: winRateColor(wr), fontFamily: f.monoSemi }}>{wr.toFixed(1)}%</Text>
      {'  win rate, 30 days'}
    </Text>
  )
}

function CounterItems({ myHeroId, enemyHeroId }: { myHeroId: number; enemyHeroId: number }) {
  const router = useRouter()
  const items = useItems()
  const stats = useCounterItems(myHeroId, enemyHeroId)
  const top = useMemo(() => {
    if (!stats.data || !items.data) return null
    return stats.data
      .flatMap((stat) => {
        const item = items.data.get(stat.item_id)
        if (!item || item.type !== 'upgrade' || item.shopable === false) return []
        if (stat.matches < 50) return []
        return [{ item, wr: (stat.wins / stat.matches) * 100, matches: stat.matches }]
      })
      .sort((a, b) => b.wr - a.wr)
      .slice(0, 6)
  }, [stats.data, items.data])

  if (stats.isPending) return <Note>Loading counter items…</Note>
  if (!top || top.length === 0) return <Note>Not enough data for this matchup.</Note>
  return (
    <View style={styles.counterList}>
      {top.map(({ item, wr, matches }) => (
        <Pressable
          key={item.id}
          style={styles.counterRow}
          onPress={() =>
            router.push({ pathname: '/items/[id]', params: { id: String(item.id) } })
          }
        >
          <Image source={itemIcon(item)} style={styles.counterIcon} contentFit="cover" />
          <View style={{ flex: 1, gap: 1 }}>
            <Text style={styles.counterName}>{item.name}</Text>
            <Text style={styles.counterMeta} numberOfLines={1}>
              {itemMeta(item)}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Mono size={14} color={winRateColor(wr)}>
              {wr.toFixed(1)}%
            </Mono>
            <Text style={styles.counterMeta}>{matches} buys</Text>
          </View>
        </Pressable>
      ))}
      <Note>Win rate of this matchup when your hero bought the item, last 30 days.</Note>
    </View>
  )
}

const styles = StyleSheet.create({
  myHeroCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  myHeroArt: { width: 56, height: 74, borderWidth: 1, borderColor: c.rule },
  myHeroName: {
    fontFamily: f.bodyBold,
    fontSize: 17,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: c.brassBright,
  },
  heroWr: { fontFamily: f.body, fontSize: 13, color: c.inkFaint },
  enemyCard: { gap: 10 },
  enemyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  enemyHero: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  enemyIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: c.bgInset },
  enemyName: { fontFamily: f.bodySemi, fontSize: 15, color: c.ink },
  enemyControls: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  laneSeg: { flexDirection: 'row', borderWidth: 1, borderColor: c.rule, borderRadius: 2 },
  laneBtn: { paddingVertical: 6, paddingHorizontal: 12 },
  laneBtnOn: { backgroundColor: c.brass },
  laneLabel: { fontFamily: f.bodyBold, fontSize: 11, color: c.inkFaint },
  laneLabelOn: { color: c.bg },
  draftLine: { fontFamily: f.body, fontSize: 14, color: c.inkDim, lineHeight: 20 },
  counterList: { gap: 8, borderTopWidth: 1, borderTopColor: c.ruleFaint, paddingTop: 10 },
  counterRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  counterIcon: { width: 38, height: 38, borderRadius: 2, backgroundColor: c.bgInset },
  counterName: { fontFamily: f.bodySemi, fontSize: 14, color: c.ink },
  counterMeta: { fontFamily: f.body, fontSize: 11, color: c.inkFaint },
})
