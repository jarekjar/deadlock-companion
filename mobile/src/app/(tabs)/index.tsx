import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { Image } from 'expo-image'
import { useRouter, type Href } from 'expo-router'
import { useMemo } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Body } from '../../components/ui'
import timersData from '../../data/timers.json'
import { useHeroAnalytics, useHeroes } from '../../lib/queries'
import { c, f } from '../../theme'

type IconName = keyof typeof MaterialCommunityIcons.glyphMap

const FEATURES: { to: Href; icon: IconName; title: string; text: string }[] = [
  {
    to: '/timers',
    icon: 'timer-outline',
    title: 'Spawn Timers',
    text: 'Every objective countdown, with alerts that buzz your phone even when the screen is off.',
  },
  {
    to: '/match',
    icon: 'sword-cross',
    title: 'My Match',
    text: 'Pick your hero and the enemy team for matchup win rates and counter items before the horn.',
  },
  {
    to: '/heroes',
    icon: 'account-group',
    title: 'Heroes',
    text: 'Win rates, abilities, typical build paths, and the matchups that matter.',
  },
  {
    to: '/items',
    icon: 'diamond-stone',
    title: 'Items',
    text: 'What every item does, who buys it, and how often it wins.',
  },
  {
    to: '/builds',
    icon: 'book-open-page-variant-outline',
    title: 'Build Library',
    text: 'The community’s most-favorited in-game builds, with the authors’ notes.',
  },
  {
    to: '/players',
    icon: 'magnify',
    title: 'Players',
    text: 'Look up anyone by Steam link, ID, or name — rank, stats, and match history.',
  },
]

export default function HomeScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const heroes = useHeroes()
  const analytics = useHeroAnalytics()

  const marquee = useMemo(() => {
    if (!heroes.data || !analytics.data) return null
    return [...analytics.data]
      .sort((a, b) => b.matches - a.matches)
      .flatMap((stat) => {
        const hero = heroes.data.get(stat.hero_id)
        return hero ? [hero] : []
      })
  }, [heroes.data, analytics.data])

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 26 }]}
    >
      <View style={styles.mast}>
        <Text style={styles.wordmark}>The Cursed Apple</Text>
        <Text style={styles.tagline}>A Deadlock Companion</Text>
      </View>

      <Body dim style={styles.blurb}>
        Your one-stop shop for Deadlock — spawn timers next to your keyboard, a prep board
        for every match, and the full hero and item meta in your pocket.
      </Body>

      {marquee && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.marquee}
        >
          {marquee.map((hero) => (
            <Pressable
              key={hero.id}
              onPress={() =>
                router.push({ pathname: '/heroes/[id]', params: { id: String(hero.id) } })
              }
            >
              <Image
                source={hero.images.icon_hero_card_webp}
                style={styles.marqueeArt}
                contentFit="cover"
                transition={120}
              />
            </Pressable>
          ))}
        </ScrollView>
      )}

      <View style={{ gap: 10 }}>
        {FEATURES.map((feature) => (
          <Pressable
            key={feature.title}
            style={({ pressed }) => [styles.feature, pressed && { opacity: 0.75 }]}
            onPress={() => router.push(feature.to)}
          >
            <MaterialCommunityIcons name={feature.icon} size={26} color={c.brass} />
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={styles.featureTitle}>{feature.title}</Text>
              <Text style={styles.featureText}>{feature.text}</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={22} color={c.brassDim} />
          </Pressable>
        ))}
      </View>

      <Text style={styles.foot}>
        Timings as of patch {timersData.patch} · stats from the community Deadlock API ·
        thecursedapple.app
      </Text>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: 'transparent' },
  content: { paddingHorizontal: 16, paddingBottom: 32, gap: 18 },
  mast: { alignItems: 'center', gap: 6 },
  wordmark: {
    fontFamily: f.display,
    fontSize: 30,
    color: c.brassBright,
    letterSpacing: 2,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  tagline: {
    fontFamily: f.bodySemi,
    fontSize: 11,
    letterSpacing: 3.5,
    textTransform: 'uppercase',
    color: c.inkFaint,
  },
  blurb: { textAlign: 'center' },
  marquee: { gap: 10 },
  marqueeArt: { width: 72, height: 96, borderWidth: 1, borderColor: c.rule },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: c.bgRaised,
    borderWidth: 1,
    borderColor: c.rule,
    borderRadius: 2,
    padding: 14,
  },
  featureTitle: {
    fontFamily: f.bodyBold,
    fontSize: 14,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: c.brassBright,
  },
  featureText: { fontFamily: f.body, fontSize: 13, color: c.inkDim, lineHeight: 18 },
  foot: {
    fontFamily: f.body,
    fontSize: 11,
    color: c.inkFaint,
    textAlign: 'center',
    lineHeight: 17,
  },
})
