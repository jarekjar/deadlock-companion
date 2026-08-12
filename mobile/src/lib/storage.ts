import AsyncStorage from '@react-native-async-storage/async-storage'

/** JSON load/save over AsyncStorage; failures degrade to "not persisted". */
export async function loadJson<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

export async function saveJson(key: string, value: unknown): Promise<void> {
  try {
    if (value === null) await AsyncStorage.removeItem(key)
    else await AsyncStorage.setItem(key, JSON.stringify(value))
  } catch {
    // storage unavailable; state just won't survive a restart
  }
}
