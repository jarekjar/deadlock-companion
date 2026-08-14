import { Pressable, StyleSheet, Text } from 'react-native'
import { View } from 'react-native'
import { MODE_OPTIONS, useModeFilter } from '../lib/modeFilter'
import { c, f } from '../theme'

/** Segmented control for the global mode bracket (all / ranked / brawl). */
export default function ModeSegment() {
  const { mode, setMode } = useModeFilter()
  return (
    <View style={styles.seg}>
      {MODE_OPTIONS.map((option) => {
        const on = mode === option.value
        return (
          <Pressable
            key={option.value}
            onPress={() => setMode(option.value)}
            style={[styles.btn, on && styles.btnOn]}
          >
            <Text style={[styles.label, on && styles.labelOn]}>{option.label}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  seg: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: c.rule,
    borderRadius: 2,
    alignSelf: 'flex-start',
  },
  btn: { paddingVertical: 6, paddingHorizontal: 14 },
  btnOn: { backgroundColor: c.brass },
  label: {
    fontFamily: f.bodyBold,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: c.inkFaint,
  },
  labelOn: { color: c.bg },
})
