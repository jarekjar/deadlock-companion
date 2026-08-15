import {
  IBMPlexMono_500Medium,
  IBMPlexMono_600SemiBold,
} from '@expo-google-fonts/ibm-plex-mono'
import {
  JosefinSans_400Regular,
  JosefinSans_600SemiBold,
  JosefinSans_700Bold,
} from '@expo-google-fonts/josefin-sans'
import { Limelight_400Regular } from '@expo-google-fonts/limelight'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useFonts } from 'expo-font'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { useEffect, useState } from 'react'
import { c, f } from '../theme'

SplashScreen.preventAutoHideAsync()

// deep-linked screens (players/…, builds/…) always sit on top of the tabs, so
// a back control exists even when the app cold-starts straight into a profile
export const unstable_settings = {
  anchor: '(tabs)',
}

export default function RootLayout() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
      }),
  )
  const [fontsLoaded] = useFonts({
    Limelight_400Regular,
    JosefinSans_400Regular,
    JosefinSans_600SemiBold,
    JosefinSans_700Bold,
    IBMPlexMono_500Medium,
    IBMPlexMono_600SemiBold,
  })

  useEffect(() => {
    if (fontsLoaded) void SplashScreen.hideAsync()
  }, [fontsLoaded])

  if (!fontsLoaded) return null

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: c.bg },
          headerTintColor: c.brassBright,
          headerTitleStyle: { fontFamily: f.bodySemi, color: c.ink },
          headerShadowVisible: false,
          // opaque: transparent screen surfaces break native stack animations
          contentStyle: { backgroundColor: c.bg },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="heroes/[id]" options={{ title: '' }} />
        <Stack.Screen name="items/[id]" options={{ title: '' }} />
        <Stack.Screen name="players/[id]" options={{ title: '' }} />
        <Stack.Screen name="builds/index" options={{ title: 'Build Library' }} />
        <Stack.Screen name="builds/[id]" options={{ title: '' }} />
      </Stack>
    </QueryClientProvider>
  )
}
