import { Image } from 'expo-image'
import { useMemo, useState } from 'react'
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { type HeroAsset } from '../lib/api'
import { useHeroes } from '../lib/queries'
import { c, f } from '../theme'

/** Full-screen hero picker used by the My Match board. */
export default function HeroPicker({
  visible,
  title,
  excludeIds = [],
  onPick,
  onClose,
}: {
  visible: boolean
  title: string
  excludeIds?: number[]
  onPick: (hero: HeroAsset) => void
  onClose: () => void
}) {
  const heroes = useHeroes()
  const insets = useSafeAreaInsets()
  const [search, setSearch] = useState('')

  const list = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return [...(heroes.data?.values() ?? [])]
      .filter((h) => !excludeIds.includes(h.id))
      .filter((h) => !needle || h.name.toLowerCase().includes(needle))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [heroes.data, excludeIds, search])

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.sheet, { paddingTop: insets.top + 10 }]}>
        <View style={styles.head}>
          <Text style={styles.title}>{title}</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Text style={styles.close}>Close</Text>
          </Pressable>
        </View>
        <TextInput
          style={styles.search}
          value={search}
          onChangeText={setSearch}
          placeholder="Search heroes"
          placeholderTextColor={c.inkFaint}
        />
        <FlatList
          data={list}
          keyExtractor={(h) => String(h.id)}
          numColumns={3}
          columnWrapperStyle={{ gap: 10 }}
          contentContainerStyle={{ gap: 10, paddingBottom: insets.bottom + 20 }}
          renderItem={({ item: hero }) => (
            <Pressable
              style={({ pressed }) => [styles.cell, pressed && { opacity: 0.7 }]}
              onPress={() => onPick(hero)}
            >
              <Image
                source={hero.images.icon_hero_card_webp}
                style={styles.art}
                contentFit="cover"
                transition={100}
              />
              <Text style={styles.name} numberOfLines={1}>
                {hero.name}
              </Text>
            </Pressable>
          )}
        />
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: c.bg, paddingHorizontal: 16 },
  head: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontFamily: f.bodyBold,
    fontSize: 13,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: c.brass,
  },
  close: { fontFamily: f.bodySemi, fontSize: 13, color: c.brassBright },
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
    marginBottom: 12,
  },
  cell: { flex: 1 / 3, borderWidth: 1, borderColor: c.rule, backgroundColor: c.bgRaised },
  art: { width: '100%', aspectRatio: 0.75 },
  name: {
    fontFamily: f.bodySemi,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: c.ink,
    textAlign: 'center',
    paddingVertical: 6,
  },
})
