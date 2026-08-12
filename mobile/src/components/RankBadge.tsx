import { Image } from 'expo-image'
import { StyleSheet, Text, View } from 'react-native'
import { rankName } from '../lib/api'
import { useRankAssets } from '../lib/queries'
import { c, f } from '../theme'

/** Rank emblem + name, or "Unranked". Size is the emblem edge in px. */
export default function RankBadge({ badge, size = 26 }: { badge?: number; size?: number }) {
  const ranks = useRankAssets()
  if (!badge || !ranks.data) {
    return <Text style={styles.unranked}>Unranked</Text>
  }
  const tier = Math.floor(badge / 10)
  const rank = ranks.data.find((r) => r.tier === tier)
  const image = rank?.images[`small_subrank${badge % 10}_webp`] ?? rank?.images.small_webp
  return (
    <View style={styles.wrap}>
      {image ? (
        <Image source={image} style={{ width: size, height: size }} contentFit="contain" />
      ) : null}
      <Text style={styles.name}>{rankName(badge, ranks.data)}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontFamily: f.bodySemi, fontSize: 13, color: c.inkDim },
  unranked: { fontFamily: f.body, fontSize: 13, color: c.inkFaint },
})
