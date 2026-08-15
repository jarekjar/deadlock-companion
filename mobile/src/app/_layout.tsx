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
import { Image } from 'expo-image'
import defaultBg from '../../assets/images/default-bg.webp'
import { useFonts } from 'expo-font'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { useEffect, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { c, f } from '../theme'

SplashScreen.preventAutoHideAsync()

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
      {/* the website's ambient poster art behind every screen, same 14% wash */}
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        <Image
          source={defaultBg}
          style={[StyleSheet.absoluteFill, { opacity: 0.14 }]}
          contentFit="cover"
          contentPosition="top right"
          transition={300}
          pointerEvents="none"
        />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: c.bg },
            headerTintColor: c.brassBright,
            headerTitleStyle: { fontFamily: f.bodySemi, color: c.ink },
            headerShadowVisible: false,
            contentStyle: { backgroundColor: 'transparent' },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="heroes/[id]" options={{ title: '' }} />
          <Stack.Screen name="items/[id]" options={{ title: '' }} />
          <Stack.Screen name="players/[id]" options={{ title: '' }} />
          <Stack.Screen name="builds/index" options={{ title: 'Build Library' }} />
          <Stack.Screen name="builds/[id]" options={{ title: '' }} />
        </Stack>
      </View>
    </QueryClientProvider>
  )
}
