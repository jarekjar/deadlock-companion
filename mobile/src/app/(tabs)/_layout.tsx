import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { Tabs } from 'expo-router'
import { type ColorValue } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { c, f } from '../../theme'

type IconName = keyof typeof MaterialCommunityIcons.glyphMap

const icon =
  (name: IconName) =>
  ({ color }: { color: ColorValue }) => (
    <MaterialCommunityIcons name={name} size={22} color={color} />
  )

export default function TabLayout() {
  const insets = useSafeAreaInsets()
  // Size the bar explicitly from the device's bottom inset — the automatic
  // computation leaves labels clipping into the nav/gesture area on some
  // devices under edge-to-edge.
  const bottomPad = Math.max(insets.bottom, 10)
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.brassBright,
        tabBarInactiveTintColor: c.inkFaint,
        tabBarStyle: {
          backgroundColor: c.bgInset,
          borderTopColor: c.rule,
          borderTopWidth: 1,
          height: 66 + bottomPad,
          paddingTop: 6,
          paddingBottom: bottomPad + 8,
        },
        tabBarLabelStyle: {
          fontFamily: f.bodySemi,
          fontSize: 10,
          letterSpacing: 0.8,
          textTransform: 'uppercase',
        },
        sceneStyle: { backgroundColor: c.bg },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Home', tabBarIcon: icon('home-variant-outline') }}
      />
      <Tabs.Screen
        name="timers"
        options={{ title: 'Timers', tabBarIcon: icon('timer-outline') }}
      />
      <Tabs.Screen
        name="match"
        options={{ title: 'Match', tabBarIcon: icon('sword-cross') }}
      />
      <Tabs.Screen
        name="heroes"
        options={{ title: 'Heroes', tabBarIcon: icon('account-group') }}
      />
      <Tabs.Screen
        name="items"
        options={{ title: 'Items', tabBarIcon: icon('diamond-stone') }}
      />
      <Tabs.Screen
        name="players"
        options={{ title: 'Players', tabBarIcon: icon('magnify') }}
      />
    </Tabs>
  )
}
