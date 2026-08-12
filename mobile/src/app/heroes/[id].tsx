import { Image } from 'expo-image'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { useMemo, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Body, Card, Mono, Note, SectionTitle, StatTile } from '../../components/ui'
import {
  itemDescription,
  itemIcon,
  itemMeta,
  type HeroAsset,
  type ItemAsset,
} from '../../lib/api'
import {
  useHeroAnalytics,
  useHeroCounters,
  useHeroes,
  useHeroItemStats,
  useItems,
  useItemsByClassName,
} from '../../lib/queries'
import { formatClock } from '../../lib/timerEngine'
import { c, compact, f, winRateColor } from '../../theme'

const TIER_LABELS = ['Tier I', 'Tier II', 'Tier III', 'Tier IV']

export default function HeroDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>()
  const heroId = Number(params.id)
  const heroes = useHeroes()
  const hero = heroes.data?.get(heroId)

  return (
    <>
      <Stack.Screen options={{ title: hero?.name ?? '' }} />
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        {!hero ? <Note>Loading hero…</Note> : <HeroDetail hero={hero} />}
      </ScrollView>
    </>
  )
}

function HeroDetail({ hero }: { hero: HeroAsset }) {
  const analytics = useHeroAnalytics()
  const stat = analytics.data?.find((s) => s.hero_id === hero.id)
  const winRate = stat && stat.matches > 0 ? (stat.wins / stat.matches) * 100 : null
  const totalMatches = (analytics.data ?? []).reduce((sum, s) => sum + s.matches, 0)
  const pickRate = stat && totalMatches > 0 ? (stat.matches / totalMatches) * 100 * 12 : null

  return (
    <>
      <View style={styles.headWrap}>
        <Image
          source={hero.images.icon_hero_card_webp}
          style={styles.headArt}
          contentFit="cover"
          transition={150}
        />
        <View style={styles.headText}>
          <Text style={styles.headName}>{hero.name}</Text>
          {hero.hero_type ? <Text style={styles.headType}>{hero.hero_type}</Text> : null}
        </View>
      </View>

      <View style={styles.tiles}>
        <StatTile
          label="Win rate"
          value={winRate !== null ? `${winRate.toFixed(1)}%` : '—'}
          color={winRate !== null ? winRateColor(winRate) : undefined}
        />
        <StatTile label="Pick rate" value={pickRate !== null ? `${pickRate.toFixed(1)}%` : '—'} />
        <StatTile label="Matches 30d" value={stat ? compact(stat.matches) : '—'} />
      </View>

      {hero.description?.lore ? (
        <>
          <SectionTitle>Lore</SectionTitle>
          <Body dim size={14}>
            {hero.description.lore}
          </Body>
        </>
      ) : null}
      {hero.description?.playstyle ? (
        <>
          <SectionTitle>Playstyle</SectionTitle>
          <Body dim size={14}>
            {hero.description.playstyle}
          </Body>
        </>
      ) : null}

      <Abilities hero={hero} />
      <BuildPath hero={hero} heroMatches={stat?.matches ?? 0} />
      <Matchups heroId={hero.id} />
      <Note>Stats cover the last 30 days across all ranks.</Note>
    </>
  )
}

function Abilities({ hero }: { hero: HeroAsset }) {
  const byClassName = useItemsByClassName()
  const [open, setOpen] = useState<string | null>(null)

  const abilities = useMemo(() => {
    if (!byClassName.data || !hero.items) return []
    return ['signature1', 'signature2', 'signature3', 'signature4'].flatMap((slot) => {
      const className = hero.items?.[slot]
      const item = className ? byClassName.data.get(className) : undefined
      return item ? [item] : []
    })
  }, [byClassName.data, hero.items])

  if (abilities.length === 0) return null
  return (
    <>
      <SectionTitle>Abilities</SectionTitle>
      {abilities.map((ability) => {
        const icon = ability.image_webp ?? ability.image
        const expanded = open === ability.class_name
        const desc = itemDescription(ability)
        return (
          <Pressable
            key={ability.class_name}
            onPress={() => setOpen(expanded ? null : (ability.class_name ?? null))}
          >
            <Card style={styles.abilityCard}>
              <View style={styles.abilityRow}>
                {icon ? (
                  <Image source={icon} style={styles.abilityIcon} contentFit="contain" />
                ) : null}
                <Text style={styles.abilityName}>{ability.name}</Text>
                <Text style={styles.abilityToggle}>{expanded ? '–' : '+'}</Text>
              </View>
              {expanded && desc ? (
                <Body dim size={13} style={{ marginTop: 8 }}>
                  {desc}
                </Body>
              ) : null}
            </Card>
          </Pressable>
        )
      })}
    </>
  )
}

function BuildPath({ hero, heroMatches }: { hero: HeroAsset; heroMatches: number }) {
  const router = useRouter()
  const items = useItems()
  const stats = useHeroItemStats(hero.id)

  const { steps, byTier } = useMemo(() => {
    if (!items.data || !stats.data || heroMatches === 0) {
      return { steps: null, byTier: null }
    }
    const rows = stats.data.flatMap((stat) => {
      const item = items.data.get(stat.item_id)
      if (!item || item.type !== 'upgrade' || item.shopable === false) return []
      if (stat.matches === 0) return []
      return [
        {
          item,
          stat,
          usage: (stat.matches / heroMatches) * 100,
          wr: (stat.wins / stat.matches) * 100,
        },
      ]
    })
    const steps = rows
      .filter((row) => row.usage >= 25)
      .sort((a, b) => a.stat.avg_buy_time_s - b.stat.avg_buy_time_s)
      .slice(0, 10)
    const byTier = [0, 1, 2, 3].map((tier) =>
      rows
        .filter((row) => (row.item.item_tier ?? 1) - 1 === tier)
        .sort((a, b) => b.usage - a.usage)
        .slice(0, 5),
    )
    return { steps: steps.length >= 3 ? steps : null, byTier }
  }, [items.data, stats.data, heroMatches])

  function openItem(item: ItemAsset) {
    router.push({ pathname: '/items/[id]', params: { id: String(item.id) } })
  }

  return (
    <>
      {steps && (
        <>
          <SectionTitle>Typical Build Path</SectionTitle>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.pathRow}>
              {steps.map(({ item, stat }, index) => (
                <View key={item.id} style={styles.pathStep}>
                  {index > 0 && <Text style={styles.pathArrow}>›</Text>}
                  <Pressable onPress={() => openItem(item)} style={styles.pathItem}>
                    <Image source={itemIcon(item)} style={styles.pathIcon} contentFit="cover" />
                    <Mono size={10} color={c.inkFaint}>
                      {formatClock(stat.avg_buy_time_s)}
                    </Mono>
                  </Pressable>
                </View>
              ))}
            </View>
          </ScrollView>
          <Note>The most popular items, ordered by when players typically buy them.</Note>
        </>
      )}
      {byTier && (
        <>
          <SectionTitle>Popular Items by Tier</SectionTitle>
          {byTier.map((rows, tier) =>
            rows.length === 0 ? null : (
              <Card key={tier} style={{ gap: 8 }}>
                <Text style={styles.tierLabel}>{TIER_LABELS[tier]}</Text>
                {rows.map(({ item, usage, wr }) => (
                  <Pressable key={item.id} style={styles.tierRow} onPress={() => openItem(item)}>
                    <Image source={itemIcon(item)} style={styles.tierIcon} contentFit="cover" />
                    <View style={{ flex: 1, gap: 1 }}>
                      <Text style={styles.tierName}>{item.name}</Text>
                      <Text style={styles.tierMeta}>{itemMeta(item)}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Mono size={13} color={winRateColor(wr)}>
                        {wr.toFixed(1)}%
                      </Mono>
                      <Text style={styles.tierMeta}>{usage.toFixed(0)}% use</Text>
                    </View>
                  </Pressable>
                ))}
              </Card>
            ),
          )}
        </>
      )}
    </>
  )
}

function Matchups({ heroId }: { heroId: number }) {
  const router = useRouter()
  const heroes = useHeroes()
  const counters = useHeroCounters()

  const rows = useMemo(() => {
    if (!counters.data || !heroes.data) return null
    return counters.data
      .filter((stat) => stat.hero_id === heroId && stat.matches_played >= 200)
      .flatMap((stat) => {
        const enemy = heroes.data.get(stat.enemy_hero_id)
        return enemy ? [{ enemy, wr: (stat.wins / stat.matches_played) * 100 }] : []
      })
      .sort((a, b) => a.wr - b.wr)
  }, [counters.data, heroes.data, heroId])

  if (!rows || rows.length === 0) return null
  const hardest = rows.slice(0, 5)
  const easiest = rows.slice(-5).reverse()

  return (
    <>
      <SectionTitle>Toughest Matchups</SectionTitle>
      <Card style={{ gap: 8 }}>
        {hardest.map((row) => (
          <MatchupRow key={row.enemy.id} row={row} router={router} />
        ))}
      </Card>
      <SectionTitle>Best Matchups</SectionTitle>
      <Card style={{ gap: 8 }}>
        {easiest.map((row) => (
          <MatchupRow key={row.enemy.id} row={row} router={router} />
        ))}
      </Card>
    </>
  )
}

function MatchupRow({
  row,
  router,
}: {
  row: { enemy: HeroAsset; wr: number }
  router: ReturnType<typeof useRouter>
}) {
  return (
    <Pressable
      style={styles.matchupRow}
      onPress={() =>
        router.push({ pathname: '/heroes/[id]', params: { id: String(row.enemy.id) } })
      }
    >
      <Image
        source={row.enemy.images.icon_image_small_webp}
        style={styles.matchupIcon}
        contentFit="cover"
      />
      <Text style={styles.matchupName}>{row.enemy.name}</Text>
      <Mono size={14} color={winRateColor(row.wr)}>
        {row.wr.toFixed(1)}%
      </Mono>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bg },
  content: { padding: 16, paddingBottom: 32, gap: 12 },
  headWrap: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  headArt: { width: 92, height: 122, borderWidth: 1, borderColor: c.rule },
  headText: { flex: 1, gap: 4 },
  headName: {
    fontFamily: f.display,
    fontSize: 24,
    color: c.brassBright,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  headType: {
    fontFamily: f.bodySemi,
    fontSize: 12,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: c.inkFaint,
  },
  tiles: { flexDirection: 'row', gap: 10 },
  abilityCard: { paddingVertical: 10 },
  abilityRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  abilityIcon: { width: 34, height: 34, backgroundColor: c.bgInset },
  abilityName: { flex: 1, fontFamily: f.bodySemi, fontSize: 15, color: c.ink },
  abilityToggle: { fontFamily: f.monoSemi, fontSize: 18, color: c.brassDim },
  pathRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  pathStep: { flexDirection: 'row', alignItems: 'center' },
  pathArrow: { fontFamily: f.monoSemi, fontSize: 16, color: c.brassDim, marginHorizontal: 6 },
  pathItem: { alignItems: 'center', gap: 3 },
  pathIcon: { width: 44, height: 44, borderRadius: 2, backgroundColor: c.bgInset },
  tierLabel: {
    fontFamily: f.bodyBold,
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: c.brass,
  },
  tierRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  tierIcon: { width: 36, height: 36, borderRadius: 2, backgroundColor: c.bgInset },
  tierName: { fontFamily: f.bodySemi, fontSize: 14, color: c.ink },
  tierMeta: { fontFamily: f.body, fontSize: 11, color: c.inkFaint },
  matchupRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  matchupIcon: { width: 30, height: 30, borderRadius: 15, backgroundColor: c.bgInset },
  matchupName: { flex: 1, fontFamily: f.bodySemi, fontSize: 14, color: c.ink },
})
