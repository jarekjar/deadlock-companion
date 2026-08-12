import { Image } from 'expo-image'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import RankBadge from '../../components/RankBadge'
import { Btn, Note, Screen, SectionTitle } from '../../components/ui'
import { resolveVanity, type SteamProfile } from '../../lib/api'
import { useFavorites } from '../../lib/favorites'
import { usePlayerSearch, useRanks } from '../../lib/queries'
import { parsePlayerInput } from '../../lib/steamid'
import { c, f } from '../../theme'

export default function PlayersScreen() {
  const router = useRouter()
  const [input, setInput] = useState('')
  const [query, setQuery] = useState('')
  const [resolving, setResolving] = useState(false)
  const search = usePlayerSearch(query)
  const { favorites } = useFavorites()
  const badges = useRanks([
    ...(search.data?.map((p) => p.account_id) ?? []),
    ...favorites.map((fav) => fav.accountId),
  ])

  function openPlayer(accountId: number) {
    router.push({ pathname: '/players/[id]', params: { id: String(accountId) } })
  }

  async function handleFind() {
    const parsed = parsePlayerInput(input)
    if (!parsed) return
    if (parsed.kind === 'account') {
      openPlayer(parsed.accountId)
      return
    }
    if (parsed.kind === 'vanity') {
      setResolving(true)
      const accountId = await resolveVanity(parsed.name)
      setResolving(false)
      if (accountId !== null) {
        openPlayer(accountId)
        return
      }
      setQuery(parsed.name)
      return
    }
    setQuery(parsed.query)
  }

  return (
    <Screen title="Players">
      <View style={styles.form}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Steam profile URL, ID, or name"
          placeholderTextColor={c.inkFaint}
          autoCapitalize="none"
          onSubmitEditing={() => void handleFind()}
        />
        <Btn label={resolving ? 'Finding' : 'Find'} solid onPress={() => void handleFind()} />
      </View>
      <Note>Paste a steamcommunity.com link, a SteamID, or search by name.</Note>

      {query ? (
        <>
          <SectionTitle>Results</SectionTitle>
          {search.isPending && <Note>Searching…</Note>}
          {search.isError && <Note>Search failed — try again.</Note>}
          {search.data?.length === 0 && <Note>No players found.</Note>}
          {search.data?.map((profile) => (
            <PlayerRow
              key={profile.account_id}
              profile={profile}
              badge={badges.get(profile.account_id)}
              onPress={() => openPlayer(profile.account_id)}
            />
          ))}
        </>
      ) : null}

      {favorites.length > 0 && (
        <>
          <SectionTitle>Favorites</SectionTitle>
          {favorites.map((fav) => (
            <Pressable
              key={fav.accountId}
              style={({ pressed }) => [styles.row, pressed && { opacity: 0.75 }]}
              onPress={() => openPlayer(fav.accountId)}
            >
              <Image source={fav.avatar} style={styles.avatar} contentFit="cover" />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.persona}>{fav.personaname}</Text>
                <RankBadge badge={badges.get(fav.accountId)} size={20} />
              </View>
              <Text style={styles.meta}>#{fav.accountId}</Text>
            </Pressable>
          ))}
        </>
      )}
    </Screen>
  )
}

function PlayerRow({
  profile,
  badge,
  onPress,
}: {
  profile: SteamProfile
  badge?: number
  onPress: () => void
}) {
  return (
    <Pressable style={({ pressed }) => [styles.row, pressed && { opacity: 0.75 }]} onPress={onPress}>
      <Image source={profile.avatarmedium} style={styles.avatar} contentFit="cover" />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.persona}>{profile.personaname}</Text>
        <RankBadge badge={badge} size={20} />
      </View>
      <Text style={styles.meta}>
        {profile.matches_played_last_30d > 0
          ? `${profile.matches_played_last_30d} in 30d`
          : `#${profile.account_id}`}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  form: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: c.rule,
    borderRadius: 2,
    backgroundColor: c.bgInset,
    color: c.ink,
    fontFamily: f.body,
    fontSize: 15,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: c.bgRaised,
    borderWidth: 1,
    borderColor: c.rule,
    borderRadius: 2,
    padding: 10,
  },
  avatar: { width: 40, height: 40, borderRadius: 2, backgroundColor: c.bgInset },
  persona: { fontFamily: f.bodySemi, fontSize: 15, color: c.ink },
  meta: { fontFamily: f.mono, fontSize: 11, color: c.inkFaint },
})
