import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useBottomTabBarHeight } from "expo-router/js-tabs";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  type GestureResponderEvent,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { ProgressBar } from "@/components/ProgressBar";
import { ProgressRing } from "@/components/ProgressRing";
import { SegmentedTabs } from "@/components/SegmentedTabs";
import { ErrorState, LoadingState } from "@/components/States";
import { useReducedMotion } from "@/lib/a11y";
import { useKidsMode } from "@/lib/kids";
import { LEARN_TABS, type LearnTab, useLearnTab } from "@/lib/learn-tab";
import {
  useChapters,
  useCourse,
  useLessons,
  useMe,
  useStats,
  useThemes,
} from "@/lib/queries";
import { fonts, radius, spacing, useColors } from "@/lib/theme";
import type { CourseChapter, LessonSummary, ThemeSummary } from "@/lib/types";

// Décalage horizontal des étapes pour dessiner un chemin sinueux.
const OFFSETS = [0, 52, 78, 52, 0, -52, -78, -52];
const TABS: readonly { id: LearnTab; label: string }[] = [
  { id: "sourates", label: "Sourates" },
  { id: "themes", label: "Thèmes" },
  { id: "fiches", label: "Fiches" },
];
/** Distance horizontale (en points) à partir de laquelle un balayage change d'onglet. */
const SWIPE = 60;
/** Or de la carte « Aujourd'hui » : lisible sur le vert profond, en clair comme en sombre. */
const GOLD = "#E9C46A";

type Colors = ReturnType<typeof useColors>;

/**
 * Vocabulaire : la carte « Aujourd'hui » (progression, séance du jour, révisions), deux raccourcis,
 * puis trois façons d'apprendre dans des onglets qu'on touche ou qu'on balaie : le parcours par
 * sourate, les thèmes et les fiches du livre. L'onglet choisi est retenu pour chaque profil.
 */
export default function LearnScreen() {
  const colors = useColors();
  const kids = useKidsMode();
  const me = useMe();
  const reduced = useReducedMotion();
  const tabBarHeight = useBottomTabBarHeight();
  const lessons = useLessons();
  const stats = useStats();
  const course = useCourse();
  const themes = useThemes();
  const { tab, choose: setTab, ready } = useLearnTab(me.data?.id, kids);

  // Changement d'onglet : le contenu entre par le côté d'où l'on vient.
  const [enter] = useState(() => new Animated.Value(1));
  const [direction, setDirection] = useState(1);
  const choose = (next: LearnTab) => {
    if (next === tab) return;
    setDirection(LEARN_TABS.indexOf(next) > LEARN_TABS.indexOf(tab) ? 1 : -1);
    setTab(next);
  };
  useEffect(() => {
    if (reduced) {
      enter.setValue(1);
      return;
    }
    enter.setValue(0);
    Animated.timing(enter, {
      toValue: 1,
      duration: 240,
      useNativeDriver: true,
    }).start();
  }, [tab, reduced, enter]);

  // Balayage horizontal sur le contenu : onglet suivant ou précédent (un geste surtout vertical fait défiler).
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: GestureResponderEvent) => {
    touchStart.current = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY };
  };
  const onTouchEnd = (e: GestureResponderEvent) => {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start) return;
    const dx = e.nativeEvent.pageX - start.x;
    const dy = e.nativeEvent.pageY - start.y;
    if (Math.abs(dx) < SWIPE || Math.abs(dx) < Math.abs(dy) * 2) return;
    const i = LEARN_TABS.indexOf(tab);
    if (dx < 0 && i < LEARN_TABS.length - 1) choose(LEARN_TABS[i + 1]!);
    else if (dx > 0 && i > 0) choose(LEARN_TABS[i - 1]!);
  };

  const total = lessons.data?.reduce((n, l) => n + l.wordCount, 0) ?? 0;
  const learned = lessons.data?.reduce((n, l) => n + l.learnedCount, 0) ?? 0;
  const due = stats.data?.vocabulary.due ?? 0;

  if (lessons.isPending) return <LoadingState />;
  if (lessons.isError)
    return (
      <ErrorState
        error={lessons.error}
        onRetry={() => void lessons.refetch()}
      />
    );

  const refreshing =
    lessons.isRefetching || course.isRefetching || themes.isRefetching;
  const refresh = () => {
    void lessons.refetch();
    void stats.refetch();
    void course.refetch();
    void themes.refetch();
  };

  return (
    <SafeAreaView
      edges={["top"]}
      style={[styles.flex, { backgroundColor: colors.background }]}
    >
      <ScrollView
        stickyHeaderIndices={[1]}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: spacing.xxxl + tabBarHeight },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.header}>
          <AppText variant="label" muted>
            80 % des mots du Qour’ân
          </AppText>
          <AppText variant="display">Vocabulaire</AppText>
          <TodayCard
            learned={learned}
            total={total}
            streak={stats.data?.currentStreak ?? 0}
            due={due}
          />
          <View style={styles.shortcuts}>
            <Shortcut
              tone="primary"
              glyph="اقْرَأْ"
              title="Lire l’arabe"
              detail="Lettres, voyelles, premières sourates"
              onPress={() => router.push("/reading")}
            />
            <Shortcut
              tone="accent"
              icon="moon-outline"
              title="Sa prière"
              detail="Al-Fâtiha et les dix dernières sourates"
              onPress={() => router.push("/prayer")}
            />
          </View>
        </View>

        <View style={[styles.selector, { backgroundColor: colors.background }]}>
          {/* Affiché une fois l'onglet retenu relu : la pastille apparaît d'emblée au bon endroit. */}
          {ready ? (
            <SegmentedTabs
              tabs={TABS}
              value={tab}
              onChange={choose}
              label="Façon d’apprendre"
            />
          ) : (
            <View style={styles.selectorPlaceholder} />
          )}
        </View>

        {ready ? (
          <Animated.View
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
            style={{
              opacity: enter,
              transform: [
                {
                  translateX: enter.interpolate({
                    inputRange: [0, 1],
                    outputRange: [24 * direction, 0],
                  }),
                },
              ],
            }}
          >
            {tab === "sourates" ? (
              <SouratesPanel
                chapters={course.data}
                loading={course.isPending}
                onRetry={() => void course.refetch()}
              />
            ) : tab === "themes" ? (
              <ThemesPanel
                themes={themes.data}
                loading={themes.isPending}
                onRetry={() => void themes.refetch()}
              />
            ) : (
              <FichesPanel lessons={lessons.data} />
            )}
          </Animated.View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

/** Ce qu'on fait chaque jour : la progression, la séance du jour et les révisions. */
function TodayCard({
  learned,
  total,
  streak,
  due,
}: {
  learned: number;
  total: number;
  streak: number;
  due: number;
}) {
  const percent = total ? Math.round((learned / total) * 100) : 0;
  return (
    <Card tone="primary" style={styles.today}>
      <View style={styles.todayRow}>
        <ProgressRing
          value={total ? learned / total : 0}
          size={84}
          stroke={6}
          color={GOLD}
          track="#FFFFFF26"
        >
          <AppText variant="bodyStrong" color="#FFFFFF">
            {percent} %
          </AppText>
        </ProgressRing>
        <View style={styles.flex}>
          <AppText variant="label" color="#FFFFFFB3">
            Aujourd’hui
          </AppText>
          <AppText variant="title" color="#FFFFFF">
            {learned}
            <AppText variant="headline" color="#FFFFFF99">
              {" "}
              / {total}
            </AppText>
          </AppText>
          <AppText variant="caption" color="#FFFFFFCC">
            mots appris
          </AppText>
        </View>
        <View
          style={styles.streak}
          accessible
          accessibilityLabel={`${streak} jour${streak > 1 ? "s" : ""} de suite`}
        >
          <Ionicons name="flame" size={15} color={GOLD} />
          <AppText variant="bodyStrong" color="#FFFFFF">
            {streak}
          </AppText>
        </View>
      </View>
      <Button
        title="Séance du jour"
        icon="sunny-outline"
        variant="light"
        size="md"
        onPress={() =>
          router.push({ pathname: "/learn/session", params: { daily: "1" } })
        }
      />
      {due > 0 ? (
        <Button
          title={`Réviser seulement ${due} mot${due > 1 ? "s" : ""}`}
          icon="refresh"
          variant="onDark"
          size="md"
          onPress={() =>
            router.push({ pathname: "/learn/session", params: { review: "1" } })
          }
        />
      ) : (
        <AppText variant="caption" color="#FFFFFFB3" center>
          Aucune révision en attente : la séance du jour vous propose de
          nouveaux mots.
        </AppText>
      )}
    </Card>
  );
}

function Shortcut({
  tone,
  glyph,
  icon,
  title,
  detail,
  onPress,
}: {
  tone: "primary" | "accent";
  glyph?: string;
  icon?: ComponentProps<typeof Ionicons>["name"];
  title: string;
  detail: string;
  onPress: () => void;
}) {
  const colors = useColors();
  const tint = tone === "primary" ? colors.primary : colors.accent;
  return (
    <Card
      onPress={onPress}
      style={styles.shortcut}
      accessibilityLabel={`${title} : ${detail}`}
    >
      <View
        style={[
          styles.shortcutMark,
          {
            backgroundColor:
              tone === "primary" ? colors.primarySoft : colors.accentSoft,
          },
        ]}
      >
        {glyph ? (
          <AppText style={styles.shortcutGlyph} color={tint}>
            {glyph}
          </AppText>
        ) : (
          <Ionicons name={icon ?? "book-outline"} size={22} color={tint} />
        )}
      </View>
      <AppText variant="bodyStrong" numberOfLines={1}>
        {title}
      </AppText>
      <AppText variant="caption" muted numberOfLines={2}>
        {detail}
      </AppText>
    </Card>
  );
}

function PanelIntro({ title, text }: { title: string; text: string }) {
  return (
    <View style={styles.panelIntro}>
      <AppText variant="headline">{title}</AppText>
      <AppText variant="caption" muted>
        {text}
      </AppText>
    </View>
  );
}

/** Chargement d'un onglet, ou échec avec « Réessayer ». */
function PanelState({
  loading,
  onRetry,
}: {
  loading: boolean;
  onRetry: () => void;
}) {
  const colors = useColors();
  if (loading)
    return (
      <ActivityIndicator color={colors.primary} style={styles.panelLoading} />
    );
  return (
    <View style={styles.panelLoading}>
      <AppText muted center>
        Impossible de charger cette partie.
      </AppText>
      <Button
        title="Réessayer"
        variant="secondary"
        size="md"
        onPress={onRetry}
      />
    </View>
  );
}

/** Le parcours « Comprendre une sourate » : la sourate en cours en grand, puis les autres. */
function SouratesPanel({
  chapters,
  loading,
  onRetry,
}: {
  chapters?: CourseChapter[];
  loading: boolean;
  onRetry: () => void;
}) {
  const colors = useColors();
  const names = useChapters();
  if (!chapters) return <PanelState loading={loading} onRetry={onRetry} />;
  const firstLocked = chapters.findIndex((c) => !c.unlocked);
  const shown = chapters.slice(
    0,
    firstLocked === -1 ? chapters.length : firstLocked + 1,
  );
  const current = shown.find((c) => c.unlocked && !c.done);
  const others = shown.filter((c) => c !== current);
  const nameOf = (id: number) => names.data?.find((c) => c.id === id);

  return (
    <View style={styles.panel}>
      <PanelIntro
        title="Votre parcours"
        text="Comprendre une sourate après l’autre, en commençant par celles que l’on récite."
      />
      {current ? (
        <CurrentChapter
          chapter={current}
          name={nameOf(current.chapterId)}
          colors={colors}
        />
      ) : (
        <Card tone="flat">
          <AppText muted center>
            Toutes les sourates ouvertes sont comprises. BârakAllâhou fîk !
          </AppText>
        </Card>
      )}
      {others.map((chapter) => (
        <CourseRow
          key={chapter.chapterId}
          chapter={chapter}
          name={nameOf(chapter.chapterId)}
          colors={colors}
        />
      ))}
    </View>
  );
}

function CurrentChapter({
  chapter,
  name,
  colors,
}: {
  chapter: CourseChapter;
  name?: { nameSimple: string; nameArabic: string };
  colors: Colors;
}) {
  const ratio = chapter.totalWords
    ? chapter.knownWords / chapter.totalWords
    : 0;
  const words = Math.min(chapter.missingWords, 6);
  return (
    <Card style={styles.currentCard}>
      <View style={styles.currentTop}>
        <View style={styles.flex}>
          <AppText variant="label" color={colors.accent}>
            En cours
          </AppText>
          <AppText variant="title">
            {name?.nameSimple ?? `Sourate ${chapter.chapterId}`}
          </AppText>
          <AppText variant="caption" muted>
            {chapter.missingWords} mot{chapter.missingWords > 1 ? "s" : ""} à
            apprendre
            {chapter.nextVerse
              ? ` · reprise au verset ${chapter.nextVerse}`
              : ""}
          </AppText>
        </View>
        <ProgressRing
          value={ratio}
          size={72}
          stroke={5}
          color={colors.accent}
          track={colors.surfaceMuted}
        >
          <AppText variant="bodyStrong">{Math.round(ratio * 100)} %</AppText>
        </ProgressRing>
      </View>
      {name?.nameArabic ? (
        <AppText style={styles.currentArabic} color={colors.arabic}>
          {name.nameArabic}
        </AppText>
      ) : null}
      <Button
        title={`Continuer · ${words} mot${words > 1 ? "s" : ""}`}
        icon="play"
        size="md"
        onPress={() =>
          router.push({
            pathname: "/learn/session",
            params: { chapterId: String(chapter.chapterId) },
          })
        }
      />
    </Card>
  );
}

function CourseRow({
  chapter,
  name,
  colors,
}: {
  chapter: CourseChapter;
  name?: { nameSimple: string; nameArabic: string };
  colors: Colors;
}) {
  const ratio = chapter.totalWords
    ? chapter.knownWords / chapter.totalWords
    : 0;
  const detail = chapter.done
    ? "Sourate comprise"
    : chapter.unlocked
      ? `${chapter.missingWords} mot${chapter.missingWords > 1 ? "s" : ""} manquant${chapter.missingWords > 1 ? "s" : ""}${chapter.nextVerse ? ` · verset ${chapter.nextVerse}` : ""}`
      : "Se débloque avec la sourate précédente";
  return (
    <Card
      padded={false}
      onPress={() =>
        chapter.unlocked
          ? router.push({
              pathname: "/learn/session",
              params: { chapterId: String(chapter.chapterId) },
            })
          : Alert.alert(
              "Sourate verrouillée",
              "Comprenez d’abord 80 % de la sourate précédente.",
            )
      }
      style={[styles.courseRow, !chapter.unlocked && { opacity: 0.6 }]}
    >
      <ProgressRing
        value={ratio}
        size={48}
        stroke={4}
        color={chapter.done ? colors.success : colors.accent}
        track={colors.surfaceMuted}
      >
        {chapter.done ? (
          <Ionicons name="checkmark" size={18} color={colors.success} />
        ) : chapter.unlocked ? (
          <AppText variant="caption">{Math.round(ratio * 100)}%</AppText>
        ) : (
          <Ionicons name="lock-closed" size={16} color={colors.textFaint} />
        )}
      </ProgressRing>
      <View style={styles.flex}>
        <AppText variant="bodyStrong">
          {name?.nameSimple ?? `Sourate ${chapter.chapterId}`}
        </AppText>
        <AppText variant="caption" muted>
          {detail}
        </AppText>
      </View>
      {name?.nameArabic ? (
        <AppText style={styles.courseArabic} color={colors.textMuted}>
          {name.nameArabic}
        </AppText>
      ) : null}
    </Card>
  );
}

/**
 * Les thèmes en bandeaux calligraphiques, un par ligne : le thème commencé en vert profond,
 * les thèmes terminés en or.
 */
function ThemesPanel({
  themes,
  loading,
  onRetry,
}: {
  themes?: ThemeSummary[];
  loading: boolean;
  onRetry: () => void;
}) {
  const colors = useColors();
  if (!themes) return <PanelState loading={loading} onRetry={onRetry} />;
  const current = themes.find(
    (t) => t.learnedCount > 0 && t.learnedCount < t.wordCount,
  )?.id;
  return (
    <View style={styles.panel}>
      <PanelIntro
        title="Par thème"
        text="Les mots du Coran regroupés par sujet, avec leurs versets."
      />
      {themes.map((theme) => (
        <ThemeBand
          key={theme.id}
          theme={theme}
          state={
            theme.wordCount > 0 && theme.learnedCount >= theme.wordCount
              ? "done"
              : theme.id === current
                ? "current"
                : "idle"
          }
          colors={colors}
        />
      ))}
    </View>
  );
}

function ThemeBand({
  theme,
  state,
  colors,
}: {
  theme: ThemeSummary;
  state: "idle" | "current" | "done";
  colors: Colors;
}) {
  const ratio = theme.wordCount ? theme.learnedCount / theme.wordCount : 0;
  const current = state === "current";
  const done = state === "done";
  const text = current ? "#FFFFFF" : colors.text;
  const muted = current ? "#FFFFFFB3" : colors.textMuted;
  const status = done
    ? `Terminé · ${theme.wordCount} mots`
    : `${current ? "En cours · " : ""}${theme.learnedCount}/${theme.wordCount} mots`;
  return (
    <Card
      tone={current ? "primary" : done ? "accent" : "default"}
      onPress={() =>
        router.push({
          pathname: "/learn/theme/[themeId]",
          params: { themeId: theme.id },
        })
      }
      style={[styles.band, done && { borderWidth: 1, borderColor: GOLD }]}
      accessibilityLabel={`${theme.title}, ${done ? "terminé" : `${theme.learnedCount} mots appris sur ${theme.wordCount}`}`}
    >
      <View style={styles.bandRow}>
        <View
          style={[
            styles.bandIcon,
            {
              backgroundColor: current
                ? "#FFFFFF1F"
                : done
                  ? GOLD
                  : colors.primarySoft,
            },
          ]}
        >
          <Ionicons
            name={
              (done
                ? "checkmark"
                : (theme.icon ?? "pricetag-outline")) as ComponentProps<
                typeof Ionicons
              >["name"]
            }
            size={20}
            color={current ? GOLD : done ? "#3A2E0C" : colors.primary}
          />
        </View>
        <View style={styles.flex}>
          <AppText variant="bodyStrong" color={text} numberOfLines={2}>
            {theme.title}
          </AppText>
          <AppText variant="caption" color={muted}>
            {status}
          </AppText>
        </View>
        {theme.titleAr ? (
          <AppText
            style={styles.bandArabic}
            color={current ? GOLD : done ? colors.accent : colors.arabic}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            {theme.titleAr}
          </AppText>
        ) : null}
      </View>
      {done ? null : (
        <ProgressBar
          value={ratio}
          height={4}
          color={current ? GOLD : colors.primary}
          track={current ? "#FFFFFF26" : undefined}
        />
      )}
    </Card>
  );
}

/** Les 47 fiches du livre, en chemin, avec un bandeau par partie. */
function FichesPanel({ lessons }: { lessons?: LessonSummary[] }) {
  const colors = useColors();
  const parts = useMemo(() => {
    const byPart = new Map<string, LessonSummary[]>();
    for (const lesson of lessons ?? [])
      byPart.set(lesson.part, [...(byPart.get(lesson.part) ?? []), lesson]);
    return [...byPart.entries()];
  }, [lessons]);
  // La fiche à faire ensuite : la première ouverte et pas encore terminée.
  const nextId = lessons?.find((l) => l.unlocked && !l.completed)?.id;

  return (
    <View style={styles.panel}>
      <PanelIntro
        title="Les fiches du livre"
        text="Les 47 fiches de « 80 % des mots du Qour’ân », consultables dans n’importe quel ordre."
      />
      {parts.map(([part, items]) => (
        <View key={part}>
          <View
            style={[styles.partBand, { backgroundColor: colors.accentSoft }]}
          >
            <AppText variant="label" color={colors.accent} center>
              {part}
            </AppText>
          </View>
          {items.map((lesson, index) => (
            <LessonNode
              key={lesson.id}
              lesson={lesson}
              offset={OFFSETS[index % OFFSETS.length] ?? 0}
              next={lesson.id === nextId}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

function LessonNode({
  lesson,
  offset,
  next,
}: {
  lesson: LessonSummary;
  offset: number;
  next: boolean;
}) {
  const colors = useColors();
  const reduced = useReducedMotion();
  const [pulse] = useState(() => new Animated.Value(1));
  const ratio = lesson.wordCount ? lesson.learnedCount / lesson.wordCount : 0;
  const current = lesson.unlocked && !lesson.completed;
  const fill = !lesson.unlocked
    ? colors.surfaceMuted
    : lesson.completed
      ? colors.accentSoft
      : colors.primary;
  const iconColor = !lesson.unlocked
    ? colors.textFaint
    : lesson.completed
      ? colors.accent
      : colors.onPrimary;
  const icon = !lesson.unlocked
    ? "lock-closed"
    : lesson.completed
      ? "checkmark"
      : "play";

  // La fiche suivante respire doucement pour attirer l'œil (pas si « Réduire les animations »).
  useEffect(() => {
    if (!next || reduced) {
      pulse.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.07,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [next, reduced, pulse]);

  return (
    <View style={[styles.nodeWrap, { transform: [{ translateX: offset }] }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${lesson.title}${lesson.unlocked ? "" : ", verrouillée"}${next ? ", à faire ensuite" : ""}`}
        onPress={() =>
          lesson.unlocked
            ? router.push({
                pathname: "/learn/[lessonId]",
                params: { lessonId: lesson.id },
              })
            : Alert.alert(
                "Leçon verrouillée",
                "Terminez la leçon précédente pour débloquer celle-ci.",
              )
        }
        style={({ pressed }) => ({
          transform: [{ scale: pressed ? 0.94 : 1 }],
        })}
      >
        <Animated.View style={{ transform: [{ scale: pulse }] }}>
          <ProgressRing
            value={lesson.unlocked ? ratio : 0}
            size={80}
            stroke={3}
            color={colors.accent}
            track={current ? colors.primarySoft : "transparent"}
          >
            <View style={[styles.node, { backgroundColor: fill }]}>
              <Ionicons
                name={icon}
                size={current ? 24 : 22}
                color={iconColor}
              />
            </View>
          </ProgressRing>
        </Animated.View>
      </Pressable>
      {/* Titres reproduits tels qu'imprimés dans le livre (en capitales), sans la lettre d'ordre. */}
      <AppText
        variant="label"
        center
        numberOfLines={2}
        color={lesson.unlocked ? colors.text : colors.textFaint}
        style={styles.nodeTitle}
      >
        {lesson.title.replace(/^[A-Z] - /, "")}
      </AppText>
      {lesson.unlocked ? (
        <AppText variant="caption" muted center>
          {lesson.learnedCount}/{lesson.wordCount} mots
          {lesson.bestScore ? ` · ${lesson.bestScore}%` : ""}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: spacing.xl - 4, paddingTop: spacing.lg },
  header: { gap: spacing.lg, marginBottom: spacing.md },
  today: { gap: spacing.md },
  todayRow: { flexDirection: "row", alignItems: "center", gap: spacing.lg },
  streak: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    alignSelf: "flex-start",
    backgroundColor: "#FFFFFF1F",
  },
  shortcuts: { flexDirection: "row", gap: spacing.md },
  shortcut: { flex: 1, gap: 4 },
  shortcutMark: {
    width: 52,
    height: 44,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  shortcutGlyph: { fontFamily: fonts.arabic, fontSize: 20, lineHeight: 40 },
  selector: { paddingVertical: spacing.sm },
  selectorPlaceholder: { height: 52 },
  panel: { gap: spacing.md, paddingTop: spacing.md },
  panelIntro: { gap: 2 },
  panelLoading: { gap: spacing.md, paddingVertical: spacing.xxl },
  currentCard: { gap: spacing.md },
  currentTop: { flexDirection: "row", alignItems: "center", gap: spacing.lg },
  currentArabic: {
    fontFamily: fonts.arabic,
    fontSize: 34,
    lineHeight: 64,
    textAlign: "right",
  },
  courseRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
  },
  courseArabic: { fontFamily: fonts.arabic, fontSize: 20, lineHeight: 34 },
  band: { gap: spacing.md, paddingVertical: spacing.lg },
  bandRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  bandIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  bandArabic: {
    fontFamily: fonts.arabic,
    fontSize: 26,
    lineHeight: 50,
    maxWidth: "42%",
    textAlign: "right",
  },
  partBand: {
    borderRadius: radius.pill,
    paddingVertical: 6,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
    alignSelf: "center",
  },
  nodeWrap: { alignItems: "center", marginBottom: spacing.xl, gap: 4 },
  node: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  nodeTitle: {
    maxWidth: 230,
    marginTop: spacing.sm,
    fontSize: 12,
    lineHeight: 16,
  },
});
