import { Image } from 'expo-image'
import { useRouter } from 'expo-router'
import { useMemo, useState } from 'react'
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import ModeSegment from '../../components/ModeSegment'
import { Mono, Note } from '../../components/ui'
import { itemIcon, itemMeta, type ItemAsset } from '../../lib/api'
import { useModeFilter } from '../../lib/modeFilter'
import { useAllItemStats, useHeroAnalytics, useItems } from '../../lib/queries'
import { c, f, winRateColor } from '../../theme'

const SLOTS = ['all', 'weapon', 'vitality', 'spirit'] as const
type Slot = (typeof SLOTS)[number]

type SortKey = 'usage' | 'winrate' | 'cost' | 'name'

interface Row {
  item: ItemAsset
  wr: number | null
  usage: number | null
}

export default function ItemsScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const items = useItems()
  const { mode } = useModeFilter()
  const stats = useAllItemStats(mode)
  const analytics = useHeroAnalytics(mode)
  const [search, setSearch] = useState('')
  const [slot, setSlot] = useState<Slot>('all')
  const [sort, setSort] = useState<SortKey>('usage')

  const rows = useMemo((): Row[] | null => {
    if (!items.data) return null
    const statMap = new Map((stats.data ?? []).map((s) => [s.item_id, s] as const))
    // item-stats rows count player-slots; total slots = sum of hero matches
    const totalSlots = (analytics.data ?? []).reduce((sum, s) => sum + s.matches, 0)
    const needle = search.trim().toLowerCase()
    return [...items.data.values()]
      .filter(
        (item) =>
          item.type === 'upgrade' &&
          item.shopable !== false &&
          itemIcon(item) !== undefined &&
          (slot === 'all' || item.item_slot_type === slot) &&
          (!needle || item.name.toLowerCase().includes(needle)),
      )
      .map((item) => {
        const stat = statMap.get(item.id)
        return {
          item,
          wr: stat && stat.matches > 0 ? (stat.wins / stat.matches) * 100 : null,
          usage: stat && totalSlots > 0 ? (stat.matches / totalSlots) * 100 : null,
        }
      })
      .sort((a, b) => {
        switch (sort) {
          case 'usage':
            return (b.usage ?? -1) - (a.usage ?? -1)
          case 'winrate':
            return (b.wr ?? -1) - (a.wr ?? -1)
          case 'cost':
            return (a.item.cost ?? Infinity) - (b.item.cost ?? Infinity)
          case 'name':
            return a.item.name.localeCompare(b.item.name)
        }
      })
  }, [items.data, stats.data, analytics.data, search, slot, sort])

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 10 }]}>
      <Text style={styles.h1}>Items</Text>
      <View style={styles.h1Rule} />
      <View style={styles.controls}>
        <TextInput
          style={styles.search}
          value={search}
          onChangeText={setSearch}
          placeholder="Search items"
          placeholderTextColor={c.inkFaint}
        />
        <View style={styles.segRow}>
          <View style={styles.seg}>
            {SLOTS.map((s) => (
              <Pressable
                key={s}
                onPress={() => setSlot(s)}
                style={[styles.segBtn, slot === s && styles.segBtnOn]}
              >
                <Text style={[styles.segLabel, slot === s && styles.segLabelOn]}>{s}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.seg}>
            {(
              [
                ['usage', 'Use'],
                ['winrate', 'WR'],
                ['cost', 'Souls'],
                ['name', 'A–Z'],
              ] as const
            ).map(([key, label]) => (
              <Pressable
                key={key}
                onPress={() => setSort(key)}
                style={[styles.segBtn, sort === key && styles.segBtnOn]}
              >
                <Text style={[styles.segLabel, sort === key && styles.segLabelOn]}>{label}</Text>
              </Pressable>
            ))}
          </View>
          <ModeSegment />
        </View>
      </View>
      {!rows ? (
        <Note>Loading items…</Note>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(row) => String(row.item.id)}
          contentContainerStyle={{ gap: 8, paddingBottom: 24 }}
          renderItem={({ item: row }) => (
            <Pressable
              style={({ pressed }) => [styles.row, pressed && { opacity: 0.75 }]}
              onPress={() =>
                router.push({ pathname: '/items/[id]', params: { id: String(row.item.id) } })
              }
            >
              <Image source={itemIcon(row.item)} style={styles.icon} contentFit="cover" />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.name}>{row.item.name}</Text>
                <Text style={styles.meta} numberOfLines={1}>
                  {itemMeta(row.item)}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 2 }}>
                {row.wr !== null && (
                  <Mono size={14} color={winRateColor(row.wr)}>
                    {row.wr.toFixed(1)}%
                  </Mono>
                )}
                {row.usage !== null && <Text style={styles.meta}>{row.usage.toFixed(1)}% use</Text>}
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
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
  segRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
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
    gap: 12,
    backgroundColor: c.bgRaised,
    borderWidth: 1,
    borderColor: c.rule,
    borderRadius: 2,
    padding: 10,
  },
  icon: { width: 44, height: 44, borderRadius: 2, backgroundColor: c.bgInset },
  name: { fontFamily: f.bodySemi, fontSize: 15, color: c.ink },
  meta: { fontFamily: f.body, fontSize: 11, color: c.inkFaint },
})
