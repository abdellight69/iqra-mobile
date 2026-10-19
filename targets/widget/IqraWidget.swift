import SwiftUI
import WidgetKit

// Instantané écrit par l'app (src/lib/widget.ts) dans le groupe d'applications, sous la clé
// « snapshot ». Le widget ne parle jamais au serveur : il affiche ce que l'app a laissé.
struct Snapshot: Decodable {
  var displayName: String
  var todayXp: Int
  var goalXp: Int
  var currentStreak: Int
  var dueVerses: Int
  var dueWords: Int
  var resumeChapterId: Int?
  var resumeChapterName: String?
  var resumeVerse: Int?
  var updatedAt: String

  static let appGroup = "group.app.iqra.mobile"

  static func load() -> Snapshot? {
    guard let raw = UserDefaults(suiteName: appGroup)?.string(forKey: "snapshot"),
          let data = raw.data(using: .utf8) else { return nil }
    return try? JSONDecoder().decode(Snapshot.self, from: data)
  }

  var progress: Double { goalXp > 0 ? min(1, Double(todayXp) / Double(goalXp)) : 0 }
  var due: Int { dueVerses + dueWords }
  var resumeLabel: String {
    if let name = resumeChapterName { return "\(name) · verset \(resumeVerse ?? 1)" }
    return "Commencer une sourate"
  }
  var resumeURL: URL {
    if let id = resumeChapterId { return URL(string: "iqra://surah/\(id)?verse=\(resumeVerse ?? 1)")! }
    return URL(string: "iqra://quran")!
  }
}

struct Entry: TimelineEntry {
  let date: Date
  let snapshot: Snapshot?
}

struct Provider: TimelineProvider {
  func placeholder(in context: Context) -> Entry {
    Entry(date: .now, snapshot: Snapshot(displayName: "Iqra", todayXp: 12, goalXp: 30, currentStreak: 3, dueVerses: 2, dueWords: 0, resumeChapterId: 1, resumeChapterName: "Al-Fatihah", resumeVerse: 3, updatedAt: ""))
  }
  func getSnapshot(in context: Context, completion: @escaping (Entry) -> Void) {
    completion(Entry(date: .now, snapshot: Snapshot.load() ?? placeholder(in: context).snapshot))
  }
  func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> Void) {
    // Rafraîchi par l'app à chaque mise à jour ; sinon, relu au prochain jour.
    let tomorrow = Calendar.current.startOfDay(for: .now).addingTimeInterval(86_400)
    completion(Timeline(entries: [Entry(date: .now, snapshot: Snapshot.load())], policy: .after(tomorrow)))
  }
}

private let gold = Color(red: 0.69, green: 0.54, blue: 0.24)
private let green = Color(red: 0.06, green: 0.31, blue: 0.27)

struct IqraWidgetView: View {
  @Environment(\.widgetFamily) private var family
  let entry: Entry

  var body: some View {
    if let s = entry.snapshot {
      content(s)
        .containerBackground(Color("$widgetBackground"), for: .widget)
    } else {
      VStack(alignment: .leading, spacing: 4) {
        Text("Iqra").font(.headline)
        Text("Ouvrez l’app pour voir votre journée.").font(.caption).foregroundStyle(.secondary)
      }
      .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
      .containerBackground(Color("$widgetBackground"), for: .widget)
      .widgetURL(URL(string: "iqra://")!)
    }
  }

  @ViewBuilder
  private func content(_ s: Snapshot) -> some View {
    VStack(alignment: .leading, spacing: 8) {
      HStack(alignment: .firstTextBaseline) {
        VStack(alignment: .leading, spacing: 2) {
          Text("OBJECTIF DU JOUR").font(.system(size: 9, weight: .semibold)).tracking(1.2).foregroundStyle(.secondary)
          Text("\(s.todayXp) / \(s.goalXp) XP")
            .font(.system(size: family == .systemSmall ? 20 : 22, weight: .bold, design: .serif))
            .lineLimit(1).minimumScaleFactor(0.7)
        }
        // Petite taille : la pastille du pourcentage prendrait la place des chiffres.
        if family != .systemSmall {
          Spacer(minLength: 4)
          Text("\(Int(s.progress * 100)) %")
            .font(.system(size: 12, weight: .bold))
            .foregroundStyle(Color("$accent"))
            .padding(.horizontal, 8).padding(.vertical, 4)
            .background(Color("$accent").opacity(0.14), in: Capsule())
        }
      }
      ProgressView(value: s.progress).tint(gold)
      if family == .systemSmall {
        // Deux lignes courtes plutôt qu'une ligne tronquée.
        Text("\(s.currentStreak) jour\(s.currentStreak > 1 ? "s" : "") de suite").font(.system(size: 11)).lineLimit(1)
        Text(s.due > 0 ? "\(s.due) à réviser" : "Rien à réviser")
          .font(.system(size: 11, weight: s.due > 0 ? .semibold : .regular))
          .foregroundStyle(s.due > 0 ? gold : .secondary).lineLimit(1)
      } else {
        HStack(spacing: 6) {
          Text("\(s.currentStreak) jour\(s.currentStreak > 1 ? "s" : "") de suite").font(.system(size: 11))
          Text("·").foregroundStyle(.secondary)
          Text(s.due > 0 ? "\(s.due) à réviser" : "rien à réviser")
            .font(.system(size: 11))
            .foregroundStyle(s.due > 0 ? gold : .secondary)
        }
        .lineLimit(1)
      }
      if family != .systemSmall {
        Spacer(minLength: 0)
        Link(destination: s.resumeURL) {
          HStack {
            VStack(alignment: .leading, spacing: 1) {
              Text("REPRENDRE").font(.system(size: 8, weight: .semibold)).tracking(1.2).foregroundStyle(.white.opacity(0.75))
              Text(s.resumeLabel).font(.system(size: 12, weight: .semibold)).foregroundStyle(.white).lineLimit(1)
            }
            Spacer()
            Image(systemName: "arrow.right").foregroundStyle(.white)
          }
          .padding(.horizontal, 12).padding(.vertical, 8)
          .background(green, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
        }
      }
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    .widgetURL(family == .systemSmall ? s.resumeURL : URL(string: "iqra://")!)
  }
}

@main
struct IqraWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "IqraWidget", provider: Provider()) { entry in
      IqraWidgetView(entry: entry)
    }
    .configurationDisplayName("Aujourd’hui")
    .description("Objectif du jour, série, révisions et reprise de lecture.")
    .supportedFamilies([.systemSmall, .systemMedium])
  }
}
