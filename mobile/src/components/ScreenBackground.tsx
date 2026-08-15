import { type ReactNode } from 'react'
import { StyleSheet, View } from 'react-native'
import { Image } from 'expo-image'
import defaultBg from '../../assets/images/default-bg.webp'
import { c } from '../theme'

/**
 * Opaque screen backdrop: base color plus the website's ambient poster art.
 * Every screen paints this itself — native stack transitions need each screen
 * surface to be opaque, or animations see through to the screen behind.
 * expo-image's memory cache means the art is decoded once, not per screen.
 */
export default function ScreenBackground({ children }: { children: ReactNode }) {
  return (
    <View style={styles.root}>
      <Image
        source={defaultBg}
        style={[StyleSheet.absoluteFill, { opacity: 0.14 }]}
        contentFit="cover"
        contentPosition="top right"
        pointerEvents="none"
      />
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
})
