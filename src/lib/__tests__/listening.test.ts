import {
  ALL_CHAPTER_IDS,
  chaptersToDownload,
  estimateRemainingBytes,
  formatDownloadSize,
  nextChapterId,
  SLEEP_TIMER_CHOICES,
  sleepEndsAt,
  sleepRemaining,
} from "../listening";

describe("nextChapterId : lecture continue", () => {
  it("passe à la sourate suivante jusqu'à An-Nâs", () => {
    expect(nextChapterId(1)).toBe(2);
    expect(nextChapterId(113)).toBe(114);
  });

  it("s'arrête après la 114e et refuse un numéro invalide", () => {
    expect(nextChapterId(114)).toBeNull();
    expect(nextChapterId(0)).toBeNull();
    expect(nextChapterId(115)).toBeNull();
    expect(nextChapterId(2.5)).toBeNull();
    expect(nextChapterId(Number.NaN)).toBeNull();
  });
});

describe("minuteur de sommeil", () => {
  const now = 1_000_000;

  it("propose 15, 30, 45, 60 minutes ou aucun", () => {
    expect(SLEEP_TIMER_CHOICES).toEqual([0, 15, 30, 45, 60]);
  });

  it("calcule l'échéance à partir du choix", () => {
    expect(sleepEndsAt(30, now)).toBe(now + 30 * 60_000);
    expect(sleepEndsAt(0, now)).toBeNull();
  });

  it("affiche les minutes restantes, arrondies vers le haut", () => {
    expect(sleepRemaining(now + 23 * 60_000, now)).toBe("23 min");
    expect(sleepRemaining(now + 22 * 60_000 + 10_000, now)).toBe("23 min");
    expect(sleepRemaining(now + 60_000, now)).toBe("1 min");
    expect(sleepRemaining(now + 20_000, now)).toBe("< 1 min");
  });

  it("n'affiche rien sans minuteur ou une fois l'échéance passée", () => {
    expect(sleepRemaining(null, now)).toBeNull();
    expect(sleepRemaining(now, now)).toBeNull();
    expect(sleepRemaining(now - 1, now)).toBeNull();
  });
});

describe("estimateRemainingBytes : tout le Coran", () => {
  const chapters = [
    { id: 1, versesCount: 7 },
    { id: 2, versesCount: 286 },
    { id: 112, versesCount: 4 },
  ];

  it("extrapole la moyenne par verset des sourates déjà téléchargées", () => {
    // 7 + 4 = 11 versets pour 1 100 octets : 100 octets par verset, 286 versets restants.
    const entries = [
      { chapterId: 1, translationId: 1, recitationId: 7, bytes: 700 },
      { chapterId: 112, translationId: 1, recitationId: 7, bytes: 400 },
    ];
    expect(estimateRemainingBytes(entries, chapters)).toBe(28_600);
  });

  it("vaut zéro quand tout est déjà là, et null sans aucune sourate téléchargée", () => {
    const all = chapters.map((c) => ({ chapterId: c.id, translationId: null, recitationId: 7, bytes: 10 }));
    expect(estimateRemainingBytes(all, chapters)).toBe(0);
    expect(estimateRemainingBytes([], chapters)).toBeNull();
    expect(estimateRemainingBytes([{ chapterId: 1, translationId: null, recitationId: 7, bytes: 10 }], [])).toBeNull();
  });
});

describe("formatDownloadSize", () => {
  it("arrondit en Mo puis en Go", () => {
    expect(formatDownloadSize(850 * 1024 * 1024)).toBe("850 Mo");
    expect(formatDownloadSize(1.5 * 1024 * 1024 * 1024)).toBe("1,5 Go");
    expect(formatDownloadSize(10)).toBe("1 Mo");
  });
});

describe("chaptersToDownload : sourates à récupérer pour tout le Coran", () => {
  const entries = [
    { chapterId: 1, translationId: 1, recitationId: 7, bytes: 1 },
    { chapterId: 2, translationId: 2, recitationId: 7, bytes: 1 },
    { chapterId: 3, translationId: 1, recitationId: 9, bytes: 1 },
  ];

  it("saute les sourates présentes avec la même traduction et le même récitateur", () => {
    expect(chaptersToDownload([1, 2, 3, 4], entries, 1, () => 7)).toEqual([2, 3, 4]);
  });

  it("respecte le récitateur effectif de chaque sourate", () => {
    expect(chaptersToDownload([1, 3], entries, 1, (id) => (id === 3 ? 9 : 7))).toEqual([]);
  });

  it("garde la copie existante quand le récitateur est celui du serveur (null)", () => {
    expect(chaptersToDownload([1, 3], entries, 1, () => null)).toEqual([]);
    expect(chaptersToDownload([1], entries, null, () => null)).toEqual([1]);
  });

  it("couvre les 114 sourates dans l'ordre", () => {
    expect(ALL_CHAPTER_IDS).toHaveLength(114);
    expect(ALL_CHAPTER_IDS[0]).toBe(1);
    expect(ALL_CHAPTER_IDS[113]).toBe(114);
  });
});
