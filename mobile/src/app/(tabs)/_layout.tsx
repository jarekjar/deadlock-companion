import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { Tabs } from 'expo-router'
import { type ColorValue } from 'react-native'
import { c, f } from '../../theme'

type IconName = keyof typeof MaterialCommunityIcons.glyphMap

const icon =
  (name: IconName) =>
  ({ color }: { color: ColorValue }) => (
    <MaterialCommunityIcons name={name} size={22} color={color} />
  )

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.brassBright,
        tabBarInactiveTintColor: c.inkFaint,
        // no fixed height — React Navigation adds the gesture-bar inset itself
        tabBarStyle: {
          backgroundColor: c.bgInset,
          borderTopColor: c.rule,
          borderTopWidth: 1,
          paddingTop: 6,
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
        options={{ title: 'Timers', tabBarIcon: icon('timer-outline') }}
      />
      <Tabs.Screen
        name="match"
        options={{ title: 'My Match', tabBarIcon: icon('sword-cross') }}
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
