import { Image } from 'expo-image'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { useMemo, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import RankBadge from '../../components/RankBadge'
import { Btn, Card, Mono, Note, SectionTitle, StatTile } from '../../components/ui'
import { isWin, type MatchHistoryEntry } from '../../lib/api'
import { useFavorites } from '../../lib/favorites'
import {
  useHeroes,
  useMatchHistory,
  usePlayerHeroStats,
  useRank,
  useSteamProfile,
} from '../../lib/queries'
import { formatClock } from '../../lib/timerEngine'
import { c, compact, f, winRateColor } from '../../theme'

const PAGE = 25

export default function PlayerProfileScreen() {
  const params = useLocalSearchParams<{ id: string }>()
  const accountId = Number(params.id)
  const profile = useSteamProfile(accountId)
  const rank = useRank(accountId)
  const history = useMatchHistory(accountId)
  const heroStats = usePlayerHeroStats(accountId)
  const heroes = useHeroes()
  const { isFavorite, toggle } = useFavorites()
  const [visible, setVisible] = useState(PAGE)

  const summary = useMemo(() => {
    if (!history.data || history.data.length === 0) return null
    const games = history.data
    const wins = games.filter(isWin).length
    const kills = games.reduce((s, g) => s + g.player_kills, 0)
    const deaths = games.reduce((s, g) => s + g.player_deaths, 0)
    const assists = games.reduce((s, g) => s + g.player_assists, 0)
    const soulsPerMin =
      games.reduce((s, g) => s + g.net_worth / Math.max(1, g.match_duration_s / 60), 0) /
      games.length
    return {
      matches: games.length,
      winRate: (wins / games.length) * 100,
      kda: (kills + assists) / Math.max(1, deaths),
      soulsPerMin,
    }
  }, [history.data])

  const highlights = useMemo(() => {
    if (!heroStats.data || !heroes.data) return null
    const played = heroStats.data.filter((s) => s.matches_played >= 5)
    if (played.length === 0) return null
    const most = [...played].sort((a, b) => b.matches_played - a.matches_played)[0]
    const best = [...played].sort(
      (a, b) => b.wins / b.matches_played - a.wins / a.matches_played,
    )[0]
    return {
      most: { hero: heroes.data.get(most.hero_id), stat: most },
      best: { hero: heroes.data.get(best.hero_id), stat: best },
    }
  }, [heroStats.data, heroes.data])

  return (
    <>
      <Stack.Screen options={{ title: profile.data?.personaname ?? 'Player' }} />
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <View style={styles.head}>
          {profile.data ? (
            <Image source={profile.data.avatarfull} style={styles.avatar} contentFit="cover" />
          ) : (
            <View style={styles.avatar} />
          )}
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={styles.persona}>{profile.data?.personaname ?? `#${accountId}`}</Text>
            <RankBadge badge={rank.data?.badge} />
          </View>
          {profile.data && (
            <Btn
              small
              label={isFavorite(accountId) ? 'Unfavorite' : 'Favorite'}
              onPress={() =>
                toggle({
                  accountId,
                  personaname: profile.data!.personaname,
                  avatar: profile.data!.avatarmedium,
                })
              }
            />
          )}
        </View>

        {summary && (
          <View style={styles.tiles}>
            <StatTile label="Matches" value={String(summary.matches)} />
            <StatTile
              label="Win rate"
              value={`${summary.winRate.toFixed(1)}%`}
              color={winRateColor(summary.winRate)}
            />
            <StatTile label="KDA" value={summary.kda.toFixed(2)} />
            <StatTile label="Souls/min" value={compact(summary.soulsPerMin)} />
          </View>
        )}

        {highlights && (
          <>
            <SectionTitle>Heroes</SectionTitle>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {highlights.most.hero && (
                <HeroHighlight
                  label="Most played"
                  heroName={highlights.most.hero.name}
                  art={highlights.most.hero.images.icon_hero_card_webp}
                  line={`${highlights.most.stat.matches_played} matches`}
                />
              )}
              {highlights.best.hero && (
                <HeroHighlight
                  label="Best win rate"
                  heroName={highlights.best.hero.name}
                  art={highlights.best.hero.images.icon_hero_card_webp}
                  line={`${(
                    (highlights.best.stat.wins / highlights.best.stat.matches_played) *
                    100
                  ).toFixed(0)}% over ${highlights.best.stat.matches_played}`}
                />
              )}
            </View>
          </>
        )}

        <SectionTitle>Match History</SectionTitle>
        {history.isPending && <Note>Loading matches…</Note>}
        {history.isError && <Note>Could not load match history.</Note>}
        {history.data?.slice(0, visible).map((match) => (
          <MatchRow key={match.match_id} match={match} />
        ))}
        {history.data && visible < history.data.length && (
          <Btn
            label={`Show more (${history.data.length - visible} left)`}
            onPress={() => setVisible((v) => v + PAGE)}
          />
        )}
      </ScrollView>
    </>
  )
}

function HeroHighlight({
  label,
  heroName,
  art,
  line,
}: {
  label: string
  heroName: string
  art: string
  line: string
}) {
  return (
    <Card style={styles.highlight}>
      <Image source={art} style={styles.highlightArt} contentFit="cover" />
      <Text style={styles.highlightLabel}>{label}</Text>
      <Text style={styles.highlightName}>{heroName}</Text>
      <Text style={styles.highlightLine}>{line}</Text>
    </Card>
  )
}

function MatchRow({ match }: { match: MatchHistoryEntry }) {
  const heroes = useHeroes()
  const hero = heroes.data?.get(match.hero_id)
  const won = isWin(match)
  const ago = agoLabel(match.start_time)
  return (
    <View style={[styles.matchRow, { borderLeftColor: won ? c.up : c.danger }]}>
      {hero && (
        <Image
          source={hero.images.icon_image_small_webp}
          style={styles.matchIcon}
          contentFit="cover"
        />
      )}
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.matchHero}>{hero?.name ?? `Hero ${match.hero_id}`}</Text>
        <Text style={styles.matchMeta}>
          {formatClock(match.match_duration_s)} · {ago}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 2 }}>
        <Mono size={13}>
          {match.player_kills}/{match.player_deaths}/{match.player_assists}
        </Mono>
        <Text style={styles.matchMeta}>{compact(match.net_worth)} souls</Text>
      </View>
      <Text style={[styles.matchResult, { color: won ? c.up : c.danger }]}>
        {won ? 'W' : 'L'}
      </Text>
    </View>
  )
}

function agoLabel(unixSec: number): string {
  const days = Math.floor((Date.now() / 1000 - unixSec) / 86400)
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  return months === 1 ? '1mo ago' : `${months}mo ago`
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bg },
  content: { padding: 16, paddingBottom: 32, gap: 12 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: c.brassDim,
    backgroundColor: c.bgInset,
  },
  persona: { fontFamily: f.bodyBold, fontSize: 19, color: c.ink },
  tiles: { flexDirection: 'row', gap: 8 },
  highlight: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 12 },
  highlightArt: { width: 64, height: 84, borderWidth: 1, borderColor: c.rule },
  highlightLabel: {
    fontFamily: f.bodySemi,
    fontSize: 9,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: c.inkFaint,
    marginTop: 4,
  },
  highlightName: {
    fontFamily: f.bodySemi,
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: c.brassBright,
  },
  highlightLine: { fontFamily: f.body, fontSize: 11, color: c.inkDim },
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: c.bgRaised,
    borderWidth: 1,
    borderColor: c.rule,
    borderLeftWidth: 3,
    borderRadius: 2,
    padding: 10,
  },
  matchIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: c.bgInset },
  matchHero: { fontFamily: f.bodySemi, fontSize: 14, color: c.ink },
  matchMeta: { fontFamily: f.body, fontSize: 11, color: c.inkFaint },
  matchResult: { fontFamily: f.bodyBold, fontSize: 16, marginLeft: 4 },
})
