import { ReactNode } from 'react'
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { c, f } from '../theme'
import ScreenBackground from './ScreenBackground'

/** Scrollable page container with the standing header treatment. */
export function Screen({ title, children }: { title?: string; children: ReactNode }) {
  const insets = useSafeAreaInsets()
  return (
    <ScreenBackground>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[styles.screenContent, { paddingTop: insets.top + 10 }]}
        keyboardShouldPersistTaps="handled"
      >
        {title ? <H1>{title}</H1> : null}
        {children}
      </ScrollView>
    </ScreenBackground>
  )
}

export function H1({ children }: { children: ReactNode }) {
  return (
    <View style={styles.h1Wrap}>
      <Text style={styles.h1}>{children}</Text>
      <View style={styles.h1Rule} />
    </View>
  )
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <Text style={styles.sectionTitle}>{children}</Text>
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>
}

export function Note({ children }: { children: ReactNode }) {
  return <Text style={styles.note}>{children}</Text>
}

export function Btn({
  label,
  onPress,
  solid = false,
  disabled = false,
  small = false,
}: {
  label: string
  onPress: () => void
  solid?: boolean
  disabled?: boolean
  small?: boolean
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.btn,
        solid && styles.btnSolid,
        small && styles.btnSmall,
        pressed && { opacity: 0.7 },
        disabled && { opacity: 0.4 },
      ]}
    >
      <Text
        style={[styles.btnLabel, solid && styles.btnLabelSolid, small && styles.btnLabelSmall]}
      >
        {label}
      </Text>
    </Pressable>
  )
}

export function StatTile({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.statTile}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, color ? { color } : null]}>{value}</Text>
    </View>
  )
}

export function Mono({
  children,
  color,
  size = 14,
  style,
}: {
  children: ReactNode
  color?: string
  size?: number
  style?: StyleProp<TextStyle>
}) {
  return (
    <Text style={[{ fontFamily: f.mono, fontSize: size, color: color ?? c.ink }, style]}>
      {children}
    </Text>
  )
}

export function Body({
  children,
  dim = false,
  size = 15,
  style,
}: {
  children: ReactNode
  dim?: boolean
  size?: number
  style?: StyleProp<TextStyle>
}) {
  return (
    <Text
      style={[
        { fontFamily: f.body, fontSize: size, color: dim ? c.inkFaint : c.ink, lineHeight: size * 1.45 },
        style,
      ]}
    >
      {children}
    </Text>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: 'transparent' },
  screenContent: { paddingHorizontal: 16, paddingBottom: 32, gap: 14 },
  h1Wrap: { marginBottom: 6 },
  h1: {
    fontFamily: f.display,
    fontSize: 21,
    color: c.brassBright,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  h1Rule: { height: 1, backgroundColor: c.rule, marginTop: 8 },
  sectionTitle: {
    fontFamily: f.bodyBold,
    fontSize: 12,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    color: c.brass,
    marginTop: 10,
  },
  card: {
    backgroundColor: c.bgRaised,
    borderWidth: 1,
    borderColor: c.rule,
    borderRadius: 2,
    padding: 14,
  },
  note: { fontFamily: f.body, fontSize: 13, color: c.inkFaint, lineHeight: 19 },
  btn: {
    borderWidth: 1,
    borderColor: c.brassDim,
    borderRadius: 2,
    paddingVertical: 11,
    paddingHorizontal: 16,
    alignItems: 'center',
    backgroundColor: c.bgInset,
  },
  btnSolid: { backgroundColor: c.brass, borderColor: c.brass },
  btnSmall: { paddingVertical: 7, paddingHorizontal: 12 },
  btnLabel: {
    fontFamily: f.bodySemi,
    fontSize: 13,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: c.brassBright,
  },
  btnLabelSolid: { color: c.bg },
  btnLabelSmall: { fontSize: 11 },
  statTile: {
    flex: 1,
    backgroundColor: c.bgRaised,
    borderWidth: 1,
    borderColor: c.rule,
    borderRadius: 2,
    paddingVertical: 12,
    paddingHorizontal: 10,
    gap: 4,
  },
  statLabel: {
    fontFamily: f.bodySemi,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: c.inkFaint,
  },
  statValue: { fontFamily: f.monoSemi, fontSize: 18, color: c.ink },
})
