import { Image } from 'expo-image'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useMemo, useState } from 'react'
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { Btn, Note } from '../../components/ui'
import { type BuildSort } from '../../lib/api'
import { useBuilds, useHeroes } from '../../lib/queries'
import { c, compact, f } from '../../theme'

const SORTS: { value: BuildSort; label: string }[] = [
  { value: 'weekly_favorites', label: 'Weekly' },
  { value: 'favorites', label: 'All-time' },
  { value: 'updated_at', label: 'Updated' },
]

const PAGE_SIZE = 30

export default function BuildsScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ hero?: string }>()
  const heroId = Number(params.hero) || 0
  const heroes = useHeroes()

  const [sortBy, setSortBy] = useState<BuildSort>('weekly_favorites')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [allLanguages, setAllLanguages] = useState(false)
  const [limit, setLimit] = useState(PAGE_SIZE)

  // debounce the server-side name search
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 350)
    return () => clearTimeout(t)
  }, [searchInput])

  useEffect(() => {
    setLimit(PAGE_SIZE)
  }, [heroId, sortBy, search, allLanguages])

  const builds = useBuilds({
    heroId: heroId || undefined,
    sortBy,
    search: search || undefined,
    language: allLanguages ? undefined : 0,
    limit,
  })

  const hero = heroId ? heroes.data?.get(heroId) : undefined
  const favLabel = sortBy === 'favorites' ? 'favorites' : 'weekly favorites'

  const header = useMemo(
    () => (
      <View style={styles.controls}>
        {hero && (
          <View style={styles.heroChipRow}>
            <View style={styles.heroChip}>
              <Image
                source={hero.images.icon_image_small_webp}
                style={styles.heroChipIcon}
                contentFit="cover"
              />
              <Text style={styles.heroChipName}>{hero.name}</Text>
            </View>
            <Btn small label="All heroes" onPress={() => router.setParams({ hero: '' })} />
          </View>
        )}
        <TextInput
          style={styles.search}
          value={searchInput}
          onChangeText={setSearchInput}
          placeholder="Search build names"
          placeholderTextColor={c.inkFaint}
        />
        <View style={styles.segRow}>
          <View style={styles.seg}>
            {SORTS.map((s) => {
              const on = sortBy === s.value
              return (
                <Pressable
                  key={s.value}
                  onPress={() => setSortBy(s.value)}
                  style={[styles.segBtn, on && styles.segBtnOn]}
                >
                  <Text style={[styles.segLabel, on && styles.segLabelOn]}>{s.label}</Text>
                </Pressable>
              )
            })}
          </View>
          <View style={styles.seg}>
            {[false, true].map((all) => {
              const on = allLanguages === all
              return (
                <Pressable
                  key={String(all)}
                  onPress={() => setAllLanguages(all)}
                  style={[styles.segBtn, on && styles.segBtnOn]}
                >
                  <Text style={[styles.segLabel, on && styles.segLabelOn]}>
                    {all ? 'All langs' : 'EN'}
                  </Text>
                </Pressable>
              )
            })}
          </View>
        </View>
        <Note>In-game published builds — favorite one in the shop to use it.</Note>
      </View>
    ),
    [hero, searchInput, sortBy, allLanguages, router],
  )

  return (
    <>
      <Stack.Screen options={{ title: 'Build Library' }} />
      <View style={styles.screen}>
        {builds.isError ? (
          <Note>Could not load builds.</Note>
        ) : !builds.data ? (
          <Note>Loading builds…</Note>
        ) : (
          <FlatList
            data={builds.data}
            keyExtractor={(entry) =>
              `${entry.hero_build.hero_build_id}-${entry.hero_build.hero_id}-${entry.hero_build.language ?? 0}`
            }
            ListHeaderComponent={header}
            ListEmptyComponent={<Note>No builds found.</Note>}
            contentContainerStyle={{ gap: 8, padding: 16, paddingBottom: 32 }}
            ListFooterComponent={
              builds.data.length >= limit ? (
                <Btn label="Show more" onPress={() => setLimit((l) => l + PAGE_SIZE)} />
              ) : null
            }
            renderItem={({ item: entry }) => {
              const b = entry.hero_build
              const buildHero = heroes.data?.get(b.hero_id)
              const favs = entry.num_weekly_favorites ?? entry.num_favorites
              return (
                <Pressable
                  style={({ pressed }) => [styles.row, pressed && { opacity: 0.75 }]}
                  onPress={() =>
                    router.push({
                      pathname: '/builds/[id]',
                      params: { id: String(b.hero_build_id), h: String(b.hero_id) },
                    })
                  }
                >
                  {buildHero && (
                    <Image
                      source={buildHero.images.icon_image_small_webp}
                      style={styles.rowIcon}
                      contentFit="cover"
                    />
                  )}
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.rowName} numberOfLines={1}>
                      {b.name}
                    </Text>
                    <Text style={styles.rowMeta}>
                      {buildHero?.name ?? `Hero ${b.hero_id}`}
                      {favs != null ? ` · ${compact(favs)} ${favLabel}` : ''}
                    </Text>
                  </View>
                </Pressable>
              )
            }}
          />
        )}
      </View>
    </>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: 'transparent' },
  controls: { gap: 10, marginBottom: 12 },
  heroChipRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  heroChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: c.brassDim,
    borderRadius: 2,
    backgroundColor: c.bgRaised,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  heroChipIcon: { width: 26, height: 26, borderRadius: 13, backgroundColor: c.bgInset },
  heroChipName: {
    fontFamily: f.bodySemi,
    fontSize: 13,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: c.brassBright,
  },
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
  segRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  seg: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: c.rule,
    borderRadius: 2,
    alignSelf: 'flex-start',
  },
  segBtn: { paddingVertical: 6, paddingHorizontal: 12 },
  segBtnOn: { backgroundColor: c.brass },
  segLabel: {
    fontFamily: f.bodyBold,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: c.inkFaint,
  },
  segLabelOn: { color: c.bg },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: c.bgRaised,
    borderWidth: 1,
    borderColor: c.rule,
    borderRadius: 2,
    padding: 10,
  },
  rowIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: c.bgInset },
  rowName: { fontFamily: f.bodySemi, fontSize: 14, color: c.ink },
  rowMeta: { fontFamily: f.body, fontSize: 11, color: c.inkFaint },
})
