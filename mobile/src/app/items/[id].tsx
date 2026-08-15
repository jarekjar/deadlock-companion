import { Image } from 'expo-image'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { useMemo } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Body, Card, Mono, Note, SectionTitle, StatTile } from '../../components/ui'
import { itemDescription, itemIcon, itemMeta, type ItemAsset } from '../../lib/api'
import { useModeFilter } from '../../lib/modeFilter'
import {
  useAllItemStats,
  useHeroAnalytics,
  useHeroes,
  useHeroStatsWithItem,
  useItems,
} from '../../lib/queries'
import { c, f, winRateColor } from '../../theme'

export default function ItemDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>()
  const itemId = Number(params.id)
  const items = useItems()
  const item = items.data?.get(itemId)
  const insets = useSafeAreaInsets()

  return (
    <>
      <Stack.Screen options={{ title: item?.name ?? '' }} />
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
      >
        {!item ? <Note>Loading item…</Note> : <ItemDetail item={item} />}
      </ScrollView>
    </>
  )
}

function ItemDetail({ item }: { item: ItemAsset }) {
  const { mode } = useModeFilter()
  const stats = useAllItemStats(mode)
  const analytics = useHeroAnalytics(mode)

  const stat = stats.data?.find((s) => s.item_id === item.id)
  const totalSlots = (analytics.data ?? []).reduce((sum, s) => sum + s.matches, 0)
  const wr = stat && stat.matches > 0 ? (stat.wins / stat.matches) * 100 : null
  const usage = stat && totalSlots > 0 ? (stat.matches / totalSlots) * 100 : null
  const desc = itemDescription(item)

  return (
    <>
      <View style={styles.head}>
        <Image source={itemIcon(item)} style={styles.icon} contentFit="cover" />
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.meta}>{itemMeta(item)}</Text>
        </View>
      </View>

      <View style={styles.tiles}>
        <StatTile
          label="Win rate"
          value={wr !== null ? `${wr.toFixed(1)}%` : '—'}
          color={wr !== null ? winRateColor(wr) : undefined}
        />
        <StatTile label="Usage" value={usage !== null ? `${usage.toFixed(1)}%` : '—'} />
      </View>

      {desc ? (
        <>
          <SectionTitle>What it does</SectionTitle>
          <Body dim size={14}>
            {desc}
          </Body>
        </>
      ) : null}

      <TopHeroes itemId={item.id} />
      <Note>
        Win rate covers matches where the item was bought, last 30 days — popular late-game
        items skew high because buying them means the game already went well.
      </Note>
    </>
  )
}

function TopHeroes({ itemId }: { itemId: number }) {
  const router = useRouter()
  const heroes = useHeroes()
  const { mode } = useModeFilter()
  const withItem = useHeroStatsWithItem(itemId, mode)
  const analytics = useHeroAnalytics(mode)

  const rows = useMemo(() => {
    if (!withItem.data || !heroes.data || !analytics.data) return null
    const heroTotals = new Map(analytics.data.map((s) => [s.hero_id, s.matches] as const))
    return withItem.data
      .flatMap((stat) => {
        const hero = heroes.data.get(stat.hero_id)
        const total = heroTotals.get(stat.hero_id) ?? 0
        if (!hero || total === 0 || stat.matches < 50) return []
        return [
          {
            hero,
            pickRate: (stat.matches / total) * 100,
            wr: stat.matches > 0 ? (stat.wins / stat.matches) * 100 : 0,
          },
        ]
      })
      .sort((a, b) => b.pickRate - a.pickRate)
      .slice(0, 10)
  }, [withItem.data, heroes.data, analytics.data])

  if (!rows || rows.length === 0) return null
  return (
    <>
      <SectionTitle>Who buys it most</SectionTitle>
      <Card style={{ gap: 8 }}>
        {rows.map((row) => (
          <Pressable
            key={row.hero.id}
            style={styles.heroRow}
            onPress={() =>
              router.push({ pathname: '/heroes/[id]', params: { id: String(row.hero.id) } })
            }
          >
            <Image
              source={row.hero.images.icon_image_small_webp}
              style={styles.heroIcon}
              contentFit="cover"
            />
            <Text style={styles.heroName}>{row.hero.name}</Text>
            <View style={{ alignItems: 'flex-end' }}>
              <Mono size={13} color={winRateColor(row.wr)}>
                {row.wr.toFixed(1)}%
              </Mono>
              <Text style={styles.rowMeta}>{row.pickRate.toFixed(0)}% of games</Text>
            </View>
          </Pressable>
        ))}
      </Card>
    </>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: 'transparent' },
  content: { padding: 16, paddingBottom: 32, gap: 12 },
  head: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  icon: { width: 72, height: 72, borderRadius: 2, backgroundColor: c.bgInset },
  name: {
    fontFamily: f.bodyBold,
    fontSize: 20,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: c.brassBright,
  },
  meta: { fontFamily: f.body, fontSize: 13, color: c.inkFaint },
  tiles: { flexDirection: 'row', gap: 10 },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  heroIcon: { width: 30, height: 30, borderRadius: 15, backgroundColor: c.bgInset },
  heroName: { flex: 1, fontFamily: f.bodySemi, fontSize: 14, color: c.ink },
  rowMeta: { fontFamily: f.body, fontSize: 10, color: c.inkFaint },
})
