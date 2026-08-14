import { Image } from 'expo-image'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { useMemo } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Body, Card, Note, SectionTitle } from '../../components/ui'
import { itemIcon, type HeroBuildEntry, type ItemAsset } from '../../lib/api'
import { useBuild, useHeroes, useItems, useSteamProfilesBatch } from '../../lib/queries'
import { c, compact, f } from '../../theme'

export default function BuildDetailScreen() {
  const params = useLocalSearchParams<{ id: string; h?: string }>()
  const buildId = Number(params.id)
  const heroHint = Number(params.h) || undefined
  const build = useBuild(buildId, heroHint)
  const insets = useSafeAreaInsets()

  return (
    <>
      <Stack.Screen options={{ title: build.data?.hero_build.name ?? 'Build' }} />
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
      >
        {build.isPending ? (
          <Note>Loading build…</Note>
        ) : build.isError || !build.data ? (
          <Note>Could not load this build.</Note>
        ) : (
          <BuildDetail entry={build.data} />
        )}
      </ScrollView>
    </>
  )
}

function BuildDetail({ entry }: { entry: HeroBuildEntry }) {
  const router = useRouter()
  const b = entry.hero_build
  const heroes = useHeroes()
  const items = useItems()
  const hero = heroes.data?.get(b.hero_id)

  const authorIds = useMemo(
    () => (b.author_account_id ? [b.author_account_id] : []),
    [b.author_account_id],
  )
  const authors = useSteamProfilesBatch(authorIds)
  const author = b.author_account_id ? authors.data?.get(b.author_account_id) : undefined

  const categories = useMemo(
    () =>
      (b.details?.mod_categories ?? [])
        .map((cat) => ({
          name: cat.name ?? '',
          description: cat.description ?? '',
          mods: cat.mods.flatMap((mod) => {
            const item = items.data?.get(mod.ability_id)
            if (!item || !itemIcon(item)) return []
            return [{ item, annotation: mod.annotation ?? '', sell: (mod.sell_priority ?? 0) > 0 }]
          }),
        }))
        .filter((cat) => cat.mods.length > 0),
    [b.details, items.data],
  )

  const favs = entry.num_weekly_favorites ?? entry.num_favorites
  const itemCount = categories.reduce((n, cat) => n + cat.mods.length, 0)

  function openItem(item: ItemAsset) {
    router.push({ pathname: '/items/[id]', params: { id: String(item.id) } })
  }

  return (
    <>
      <View style={styles.head}>
        {hero && (
          <Pressable
            onPress={() =>
              router.push({ pathname: '/heroes/[id]', params: { id: String(b.hero_id) } })
            }
          >
            <Image source={hero.images.icon_hero_card_webp} style={styles.headArt} contentFit="cover" />
          </Pressable>
        )}
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={styles.headName}>{b.name}</Text>
          <Text style={styles.headMeta}>
            {hero?.name ?? `Hero ${b.hero_id}`}
            {favs != null ? ` · ${compact(favs)} favorites` : ''}
          </Text>
          {b.author_account_id ? (
            <Pressable
              onPress={() =>
                router.push({
                  pathname: '/players/[id]',
                  params: { id: String(b.author_account_id) },
                })
              }
            >
              <Text style={styles.headAuthor}>
                by {author?.personaname ?? `#${b.author_account_id}`}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      {b.description ? (
        <Body dim size={13}>
          {b.description}
        </Body>
      ) : null}

      {!items.data ? (
        <Note>Loading items…</Note>
      ) : categories.length === 0 ? (
        <Note>This build has no items.</Note>
      ) : (
        <>
          {categories.map((cat, index) => (
            <View key={index} style={{ gap: 8 }}>
              <SectionTitle>{cat.name || `Group ${index + 1}`}</SectionTitle>
              {cat.description ? (
                <Body dim size={12}>
                  {cat.description}
                </Body>
              ) : null}
              <Card style={{ gap: 10 }}>
                {cat.mods.map((mod, i) => (
                  <Pressable
                    key={`${mod.item.id}-${i}`}
                    style={[styles.itemRow, mod.sell && { opacity: 0.55 }]}
                    onPress={() => openItem(mod.item)}
                  >
                    <Image source={itemIcon(mod.item)} style={styles.itemIcon} contentFit="cover" />
                    <View style={{ flex: 1, gap: 1 }}>
                      <Text style={styles.itemName}>
                        {mod.item.name}
                        {mod.sell ? '  · sell later' : ''}
                      </Text>
                      {mod.annotation ? (
                        <Text style={styles.itemNote} numberOfLines={3}>
                          {mod.annotation}
                        </Text>
                      ) : null}
                    </View>
                  </Pressable>
                ))}
              </Card>
            </View>
          ))}
          <Note>
            {itemCount} items · find this build in the in-game shop by searching “{b.name}”.
          </Note>
        </>
      )}
    </>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bg },
  content: { padding: 16, gap: 12 },
  head: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  headArt: { width: 72, height: 96, borderWidth: 1, borderColor: c.rule },
  headName: { fontFamily: f.bodyBold, fontSize: 17, color: c.brassBright },
  headMeta: { fontFamily: f.body, fontSize: 12, color: c.inkFaint },
  headAuthor: { fontFamily: f.bodySemi, fontSize: 12, color: c.brass },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  itemIcon: { width: 38, height: 38, borderRadius: 2, backgroundColor: c.bgInset },
  itemName: { fontFamily: f.bodySemi, fontSize: 14, color: c.ink },
  itemNote: { fontFamily: f.body, fontSize: 11.5, color: c.inkFaint, lineHeight: 15 },
})
