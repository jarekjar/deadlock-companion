import { Image } from 'expo-image'
import { useRouter } from 'expo-router'
import { useMemo, useState } from 'react'
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import ModeSegment from '../../components/ModeSegment'
import ScreenBackground from '../../components/ScreenBackground'
import { Mono, Note } from '../../components/ui'
import { useModeFilter } from '../../lib/modeFilter'
import { useHeroAnalytics, useHeroes } from '../../lib/queries'
import { c, f, winRateColor } from '../../theme'

type SortKey = 'winrate' | 'matches' | 'name'

export default function HeroesScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const heroes = useHeroes()
  const { mode } = useModeFilter()
  const analytics = useHeroAnalytics(mode)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortKey>('winrate')

  const rows = useMemo(() => {
    if (!heroes.data) return null
    const stats = new Map(
      (analytics.data ?? []).map((s) => [s.hero_id, s] as const),
    )
    const needle = search.trim().toLowerCase()
    const list = [...heroes.data.values()]
      .filter((h) => !needle || h.name.toLowerCase().includes(needle))
      .map((hero) => {
        const stat = stats.get(hero.id)
        const wr = stat && stat.matches > 0 ? (stat.wins / stat.matches) * 100 : null
        return { hero, wr, matches: stat?.matches ?? 0 }
      })
    switch (sort) {
      case 'winrate':
        return list.sort((a, b) => (b.wr ?? -1) - (a.wr ?? -1))
      case 'matches':
        return list.sort((a, b) => b.matches - a.matches)
      case 'name':
        return list.sort((a, b) => a.hero.name.localeCompare(b.hero.name))
    }
  }, [heroes.data, analytics.data, search, sort])

  return (
    <ScreenBackground>
    <View style={[styles.screen, { paddingTop: insets.top + 10 }]}>
      <Text style={styles.h1}>Heroes</Text>
      <View style={styles.h1Rule} />
      <View style={styles.controls}>
        <TextInput
          style={styles.search}
          value={search}
          onChangeText={setSearch}
          placeholder="Search heroes"
          placeholderTextColor={c.inkFaint}
        />
        <View style={styles.segRow}>
          <View style={styles.sortSeg}>
            {(
              [
                ['winrate', 'WR'],
                ['matches', 'Picks'],
                ['name', 'A–Z'],
              ] as const
            ).map(([key, label]) => (
              <Pressable
                key={key}
                onPress={() => setSort(key)}
                style={[styles.sortBtn, sort === key && styles.sortBtnOn]}
              >
                <Text style={[styles.sortLabel, sort === key && styles.sortLabelOn]}>{label}</Text>
              </Pressable>
            ))}
          </View>
          <ModeSegment />
        </View>
      </View>
      {!rows ? (
        <Note>Loading heroes…</Note>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(row) => String(row.hero.id)}
          numColumns={3}
          columnWrapperStyle={{ gap: 10 }}
          contentContainerStyle={{ gap: 10, paddingBottom: 24 }}
          renderItem={({ item: row }) => (
            <Pressable
              style={({ pressed }) => [styles.card, pressed && { opacity: 0.75 }]}
              onPress={() =>
                router.push({ pathname: '/heroes/[id]', params: { id: String(row.hero.id) } })
              }
            >
              <Image
                source={row.hero.images.icon_hero_card_webp}
                style={styles.art}
                contentFit="cover"
                transition={120}
              />
              <View style={styles.cardFoot}>
                <Text style={styles.name} numberOfLines={1}>
                  {row.hero.name}
                </Text>
                {row.wr !== null && (
                  <Mono size={12} color={winRateColor(row.wr)}>
                    {row.wr.toFixed(1)}%
                  </Mono>
                )}
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
    </ScreenBackground>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: 'transparent', paddingHorizontal: 16 },
  h1: {
    fontFamily: f.display,
    fontSize: 21,
    color: c.brassBright,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  h1Rule: { height: 1, backgroundColor: c.rule, marginTop: 8, marginBottom: 12 },
  controls: { gap: 10, marginBottom: 12 },
  segRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  search: {
    borderWidth: 1,
    borderColor: c.rule,
    borderRadius: 2,
    backgroundColor: c.bgInset,
    color: c.ink,
    fontFamily: f.body,
    fontSize: 15,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  sortSeg: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: c.rule,
    borderRadius: 2,
    alignSelf: 'flex-start',
  },
  sortBtn: { paddingVertical: 6, paddingHorizontal: 14 },
  sortBtnOn: { backgroundColor: c.brass },
  sortLabel: {
    fontFamily: f.bodyBold,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: c.inkFaint,
  },
  sortLabelOn: { color: c.bg },
  card: { flex: 1 / 3, borderWidth: 1, borderColor: c.rule, backgroundColor: c.bgRaised },
  art: { width: '100%', aspectRatio: 0.8 },
  cardFoot: {
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 7,
  },
  name: {
    fontFamily: f.bodySemi,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: c.ink,
  },
})
