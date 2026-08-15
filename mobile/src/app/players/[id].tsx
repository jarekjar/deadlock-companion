import { Image } from 'expo-image'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { useMemo, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import LineChart from '../../components/LineChart'
import RankBadge from '../../components/RankBadge'
import { Btn, Card, Mono, Note, SectionTitle, StatTile } from '../../components/ui'
import {
  badgeToIndex,
  indexToBadge,
  isWin,
  rankName,
  type MatchHistoryEntry,
  type RankAsset,
} from '../../lib/api'
import { useFavorites } from '../../lib/favorites'
import {
  useEnemyStats,
  useHeroes,
  useMatchHistory,
  useMateStats,
  usePlayerHeroStats,
  useRank,
  useRankAssets,
  useSteamProfile,
  useSteamProfilesBatch,
} from '../../lib/queries'
import { formatClock } from '../../lib/timerEngine'
import { c, compact, f, winRateColor } from '../../theme'

const PAGE = 25
// recent matches are what people came for; the rest is one tap away
const INITIAL = 6

export default function PlayerProfileScreen() {
  const params = useLocalSearchParams<{ id: string }>()
  const accountId = Number(params.id)
  const profile = useSteamProfile(accountId)
  const rank = useRank(accountId)
  const history = useMatchHistory(accountId)
  const heroStats = usePlayerHeroStats(accountId)
  const heroes = useHeroes()
  const { isFavorite, toggle } = useFavorites()
  const [visible, setVisible] = useState(INITIAL)
  const insets = useSafeAreaInsets()

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
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
      >
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

        {history.data && <RankHistory matches={history.data} />}
        {history.data && <Trends matches={history.data} />}

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

        <Companions accountId={accountId} />
      </ScrollView>
    </>
  )
}

/**
 * Rank over time, from the Valve-reported badge on each ranked match in the
 * history already fetched. Non-ranked matches carry no badge and are skipped.
 */
function RankHistory({ matches }: { matches: MatchHistoryEntry[] }) {
  const rankAssets = useRankAssets()
  const ranks = rankAssets.data

  const points = useMemo(
    () =>
      matches
        .filter((m) => (m.ranked_display_badge ?? 0) > 0)
        .sort((a, b) => a.start_time - b.start_time)
        .map((m) => ({ x: m.start_time, y: badgeToIndex(m.ranked_display_badge!) })),
    [matches],
  )

  if (points.length < 2) return null

  const indices = points.map((p) => p.y)
  const minIdx = Math.min(...indices)
  const maxIdx = Math.max(...indices)
  const span = maxIdx - minIdx
  const yTicks: number[] = []
  let tickLabel: (index: number) => string
  if (span <= 8) {
    // a narrow climb: tick every subrank, with full names ("Oracle 5")
    for (let i = minIdx; i <= maxIdx; i++) yTicks.push(i)
    tickLabel = (index) => rankName(indexToBadge(Math.round(index)), ranks)
  } else {
    const tierStep = span > 30 ? 12 : 6
    for (let i = Math.ceil((minIdx - 1) / tierStep) * tierStep; i <= maxIdx + 1; i += tierStep) {
      yTicks.push(i)
    }
    tickLabel = (index) =>
      ranks?.find((r: RankAsset) => r.tier === Math.floor(indexToBadge(index) / 10))?.name ?? ''
  }

  return (
    <>
      <SectionTitle>Rank History</SectionTitle>
      <Card>
        <LineChart
          xs={points.map((p) => p.x)}
          values={points.map((p) => p.y)}
          formatX={(x) => dateLabel(x)}
          formatYTick={tickLabel}
          yTicks={yTicks}
          yDomain={[minIdx - 1, maxIdx + 1]}
        />
        <Note>Rank after each ranked match.</Note>
      </Card>
    </>
  )
}

const TREND_WINDOW = 20

type TrendMetric = 'win' | 'kda' | 'souls'

const TREND_METRICS: { value: TrendMetric; label: string }[] = [
  { value: 'win', label: 'Win rate' },
  { value: 'kda', label: 'KDA' },
  { value: 'souls', label: 'Souls/min' },
]

function Trends({ matches }: { matches: MatchHistoryEntry[] }) {
  const [metric, setMetric] = useState<TrendMetric>('win')

  const points = useMemo(() => {
    const ordered = [...matches].sort((a, b) => a.start_time - b.start_time)
    if (ordered.length < TREND_WINDOW) return []
    const valueOf = (m: MatchHistoryEntry) => {
      switch (metric) {
        case 'win':
          return isWin(m) ? 100 : 0
        case 'kda':
          return m.player_deaths === 0
            ? m.player_kills + m.player_assists
            : (m.player_kills + m.player_assists) / m.player_deaths
        case 'souls':
          return m.match_duration_s > 0 ? m.net_worth / (m.match_duration_s / 60) : 0
      }
    }
    const values = ordered.map(valueOf)
    const out: { x: number; y: number }[] = []
    let sum = 0
    for (let i = 0; i < values.length; i++) {
      sum += values[i]
      if (i >= TREND_WINDOW) sum -= values[i - TREND_WINDOW]
      if (i >= TREND_WINDOW - 1) out.push({ x: ordered[i].start_time, y: sum / TREND_WINDOW })
    }
    return out
  }, [matches, metric])

  if (points.length < 2) return null

  const formatY = (y: number) =>
    metric === 'win' ? `${y.toFixed(0)}%` : metric === 'kda' ? y.toFixed(1) : compact(y)
  // win rate is a percentage: keep the axis inside 0-100
  const winDomain: [number, number] | undefined =
    metric === 'win'
      ? [
          Math.max(0, Math.min(...points.map((p) => p.y)) - 5),
          Math.min(100, Math.max(...points.map((p) => p.y)) + 5),
        ]
      : undefined

  return (
    <>
      <SectionTitle>Performance Trends</SectionTitle>
      <Card style={{ gap: 10 }}>
        <View style={styles.trendSeg}>
          {TREND_METRICS.map((m) => {
            const on = metric === m.value
            return (
              <Pressable
                key={m.value}
                onPress={() => setMetric(m.value)}
                style={[styles.trendBtn, on && styles.trendBtnOn]}
              >
                <Text style={[styles.trendLabel, on && styles.trendLabelOn]}>{m.label}</Text>
              </Pressable>
            )
          })}
        </View>
        <LineChart
          xs={points.map((p) => p.x)}
          values={points.map((p) => p.y)}
          formatX={(x) => dateLabel(x)}
          formatYTick={formatY}
          yDomain={winDomain}
        />
        <Note>Rolling {TREND_WINDOW}-match average across the full history.</Note>
      </Card>
    </>
  )
}

const MIN_NEMESIS_MATCHES = 8

function Companions({ accountId }: { accountId: number }) {
  const router = useRouter()
  const mates = useMateStats(accountId)
  const enemies = useEnemyStats(accountId)

  const mateRows = useMemo(
    () =>
      (mates.data ?? [])
        .filter((m) => m.mate_id !== accountId && m.matches_played >= 5)
        .sort((a, b) => b.matches_played - a.matches_played)
        .slice(0, 8)
        .map((m) => ({
          id: m.mate_id,
          matches: m.matches_played,
          wr: (m.wins / m.matches_played) * 100,
        })),
    [mates.data, accountId],
  )
  const enemyRows = useMemo(
    () =>
      (enemies.data ?? [])
        .filter((e) => e.enemy_id !== accountId && e.matches_played >= MIN_NEMESIS_MATCHES)
        .sort(
          (a, b) =>
            a.wins / a.matches_played - b.wins / b.matches_played ||
            b.matches_played - a.matches_played,
        )
        .slice(0, 8)
        .map((e) => ({
          id: e.enemy_id,
          matches: e.matches_played,
          wr: (e.wins / e.matches_played) * 100,
        })),
    [enemies.data, accountId],
  )

  const ids = useMemo(
    () => [...new Set([...mateRows.map((m) => m.id), ...enemyRows.map((e) => e.id)])],
    [mateRows, enemyRows],
  )
  const profiles = useSteamProfilesBatch(ids)

  if (mateRows.length === 0 && enemyRows.length === 0) return null

  const row = (r: { id: number; matches: number; wr: number }, unit: string) => {
    const p = profiles.data?.get(r.id)
    return (
      <Pressable
        key={r.id}
        style={styles.companionRow}
        onPress={() => router.push({ pathname: '/players/[id]', params: { id: String(r.id) } })}
      >
        {p ? (
          <Image source={p.avatarmedium} style={styles.companionAvatar} contentFit="cover" />
        ) : (
          <View style={styles.companionAvatar} />
        )}
        <Text style={styles.companionName} numberOfLines={1}>
          {p?.personaname ?? `#${r.id}`}
        </Text>
        <Text style={styles.companionMeta}>
          {r.matches} {unit}
        </Text>
        <Mono size={13} color={winRateColor(r.wr)}>
          {r.wr.toFixed(0)}%
        </Mono>
      </Pressable>
    )
  }

  return (
    <>
      {mateRows.length > 0 && (
        <>
          <SectionTitle>Runs With</SectionTitle>
          <Card style={{ gap: 10 }}>
            {mateRows.map((r) => row(r, 'together'))}
            <Note>Teammates who keep showing up on this player’s side.</Note>
          </Card>
        </>
      )}
      {enemyRows.length > 0 && (
        <>
          <SectionTitle>Nemeses</SectionTitle>
          <Card style={{ gap: 10 }}>
            {enemyRows.map((r) => row(r, 'faced'))}
            <Note>Repeat opponents this player struggles against the most.</Note>
          </Card>
        </>
      )}
    </>
  )
}

function dateLabel(unixSec: number): string {
  const d = new Date(unixSec * 1000)
  return `${d.getMonth() + 1}/${d.getDate()}/${String(d.getFullYear()).slice(2)}`
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
  trendSeg: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: c.rule,
    borderRadius: 2,
    alignSelf: 'flex-start',
  },
  trendBtn: { paddingVertical: 6, paddingHorizontal: 12 },
  trendBtnOn: { backgroundColor: c.brass },
  trendLabel: {
    fontFamily: f.bodyBold,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: c.inkFaint,
  },
  trendLabelOn: { color: c.bg },
  companionRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  companionAvatar: {
    width: 30,
    height: 30,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: c.rule,
    backgroundColor: c.bgInset,
  },
  companionName: { flex: 1, fontFamily: f.bodySemi, fontSize: 14, color: c.ink },
  companionMeta: { fontFamily: f.body, fontSize: 11, color: c.inkFaint },
})
