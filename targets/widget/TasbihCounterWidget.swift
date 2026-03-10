import WidgetKit
import SwiftUI
import AppIntents

// MARK: - Data Models
struct TasbihCounterData: Codable {
    let count: Int
    let selectedDhikr: Int
    let dhikrName: String
    let dhikrArabic: String
    let targetCount: Int
    let allCounts: [String: Int]
}

struct DhikrInfo: Codable {
    let id: Int
    let arabic: String
    let transliteration: String
    let translation: String
    let target: Int
}

// MARK: - App Intent: Increment Tasbih Count
@available(iOS 17.0, *)
struct IncrementTasbihIntent: AppIntent {
    static var title: LocalizedStringResource = "Increment Tasbih Count"
    static var description = IntentDescription("Increment the count for the selected tasbih")
    
    @Parameter(title: "Dhikr ID")
    var dhikrId: Int
    
    init() {
        self.dhikrId = 1
    }
    
    init(dhikrId: Int) {
        self.dhikrId = dhikrId
    }
    
    func perform() async throws -> some IntentResult {
        // Get current counts from UserDefaults
        guard let userDefaults = UserDefaults(suiteName: "group.com.digaifounder.huda") else {
            return .result()
        }
        
        // Load all tasbih data
        var allCounts: [String: Int] = [:]
        var dhikrInfo: DhikrInfo?
        
        if let jsonString = userDefaults.string(forKey: "tasbih_all_dhikrs"),
           let jsonData = jsonString.data(using: .utf8),
           let json = try? JSONSerialization.jsonObject(with: jsonData) as? [String: Any] {
            
            // Get all counts
            if let countsDict = json["allCounts"] as? [String: Int] {
                allCounts = countsDict
            }
            
            // Find the dhikr info
            if let dhikrsArray = json["dhikrs"] as? [[String: Any]] {
                for dhikrDict in dhikrsArray {
                    if let id = dhikrDict["id"] as? Int, id == dhikrId {
                        dhikrInfo = DhikrInfo(
                            id: id,
                            arabic: dhikrDict["arabic"] as? String ?? "",
                            transliteration: dhikrDict["transliteration"] as? String ?? "",
                            translation: dhikrDict["translation"] as? String ?? "",
                            target: dhikrDict["target"] as? Int ?? 33
                        )
                        break
                    }
                }
            }
        }
        
        // Increment count for this dhikr
        let currentCount = allCounts[String(dhikrId)] ?? 0
        var newCount = currentCount + 1
        
        // Reset if target reached
        if let target = dhikrInfo?.target, newCount >= target {
            newCount = 0
        }
        
        // Save updated count
        allCounts[String(dhikrId)] = newCount
        
        // Update UserDefaults
        if let existingJsonString = userDefaults.string(forKey: "tasbih_all_dhikrs"),
           let existingJsonData = existingJsonString.data(using: .utf8),
           var existingJson = try? JSONSerialization.jsonObject(with: existingJsonData) as? [String: Any] {
            existingJson["allCounts"] = allCounts
            if let updatedJsonData = try? JSONSerialization.data(withJSONObject: existingJson),
               let updatedJsonString = String(data: updatedJsonData, encoding: .utf8) {
                userDefaults.set(updatedJsonString, forKey: "tasbih_all_dhikrs")
            }
        }
        
        // Reload widget
        WidgetCenter.shared.reloadTimelines(ofKind: "TasbihCounterWidget")
        
        return .result()
    }
}


// MARK: - Timeline Entry
struct TasbihCounterEntry: TimelineEntry {
    let date: Date
    let count: Int
    let dhikrName: String
    let dhikrArabic: String
    let targetCount: Int
    let dhikrId: Int
}



// MARK: - Widget View
struct TasbihCounterWidgetEntryView: View {
    var entry: TasbihCounterEntry
    @Environment(\.widgetFamily) var family
    
    var body: some View {
        if #available(iOS 17.0, *) {
            switch family {
            case .systemSmall:
                SmallTasbihCounterView(entry: entry)
            default:
                SmallTasbihCounterView(entry: entry)
            }
        } else {
            switch family {
            case .systemSmall:
                SmallTasbihCounterViewLegacy(entry: entry)
            default:
                SmallTasbihCounterViewLegacy(entry: entry)
            }
        }
    }
}

// MARK: - Small Widget View
@available(iOS 17.0, *)
struct SmallTasbihCounterView: View {
    var entry: TasbihCounterEntry
    
    var body: some View {
        Button(intent: IncrementTasbihIntent(dhikrId: entry.dhikrId)) {
            VStack(spacing: 8) {
                // Arabic text
                Text(entry.dhikrArabic)
                    .font(.system(size: 20, weight: .medium))
                    .foregroundColor(.primary)
                    .multilineTextAlignment(.center)
                    .lineLimit(2)
                    .minimumScaleFactor(0.7)
                
                // Count
                Text("\(entry.count)")
                    .font(.system(size: 36, weight: .bold))
                    .foregroundColor(.primary)
                
                // Target
                Text("/ \(entry.targetCount)")
                    .font(.system(size: 14, weight: .regular))
                    .foregroundColor(.secondary)
                
                // Dhikr name
                Text(entry.dhikrName)
                    .font(.system(size: 10, weight: .medium))
                    .foregroundColor(.secondary)
                    .lineLimit(1)
                    .minimumScaleFactor(0.8)
            }
            .padding(12)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .buttonStyle(.plain)
        .containerBackground(.fill.tertiary, for: .widget)
    }
}

// Fallback for iOS 16
struct SmallTasbihCounterViewLegacy: View {
    var entry: TasbihCounterEntry
    
    var body: some View {
        VStack(spacing: 8) {
            // Arabic text
            Text(entry.dhikrArabic)
                .font(.system(size: 20, weight: .medium))
                .foregroundColor(.primary)
                .multilineTextAlignment(.center)
                .lineLimit(2)
                .minimumScaleFactor(0.7)
            
            // Count
            Text("\(entry.count)")
                .font(.system(size: 36, weight: .bold))
                .foregroundColor(.primary)
            
            // Target
            Text("/ \(entry.targetCount)")
                .font(.system(size: 14, weight: .regular))
                .foregroundColor(.secondary)
            
            // Dhikr name
            Text(entry.dhikrName)
                .font(.system(size: 10, weight: .medium))
                .foregroundColor(.secondary)
                .lineLimit(1)
                .minimumScaleFactor(0.8)
        }
        .padding(12)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .containerBackground(.fill.tertiary, for: .widget)
        .widgetURL(URL(string: "huda://tasbih"))
    }
}

// MARK: - Timeline Provider (iOS 16 fallback)
struct TasbihCounterProviderLegacy: TimelineProvider {
    typealias Entry = TasbihCounterEntry
    
    func placeholder(in context: Context) -> TasbihCounterEntry {
        TasbihCounterEntry(
            date: Date(),
            count: 0,
            dhikrName: "Subhanallah",
            dhikrArabic: "سُبْحَانَ اللَّهِ",
            targetCount: 33,
            dhikrId: 1
        )
    }

    func getSnapshot(in context: Context, completion: @escaping (TasbihCounterEntry) -> ()) {
        let entry = getTasbihData()
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<TasbihCounterEntry>) -> ()) {
        var entries: [TasbihCounterEntry] = []
        let currentDate = Date()
        
        let entry = getTasbihData()
        entries.append(entry)
        
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 5, to: currentDate)!
        let nextEntry = TasbihCounterEntry(
            date: nextUpdate,
            count: entry.count,
            dhikrName: entry.dhikrName,
            dhikrArabic: entry.dhikrArabic,
            targetCount: entry.targetCount,
            dhikrId: entry.dhikrId
        )
        entries.append(nextEntry)
        
        let timeline = Timeline(entries: entries, policy: .after(nextUpdate))
        completion(timeline)
    }
    
    private func getTasbihData() -> TasbihCounterEntry {
        guard let userDefaults = UserDefaults(suiteName: "group.com.digaifounder.huda") else {
            return TasbihCounterEntry(
                date: Date(),
                count: 0,
                dhikrName: "Subhanallah",
                dhikrArabic: "سُبْحَانَ اللَّهِ",
                targetCount: 33,
                dhikrId: 1
            )
        }
        
        // Get selected dhikr ID from UserDefaults (saved by the app)
        var selectedDhikrId = userDefaults.integer(forKey: "tasbih_selected_dhikr")
        if selectedDhikrId == 0 {
            selectedDhikrId = 1 // Default to first dhikr if not set
        }
        
        if let jsonString = userDefaults.string(forKey: "tasbih_all_dhikrs"),
           let jsonData = jsonString.data(using: .utf8),
           let json = try? JSONSerialization.jsonObject(with: jsonData) as? [String: Any] {
            
            let allCounts = json["allCounts"] as? [String: Int] ?? [:]
            let count = allCounts[String(selectedDhikrId)] ?? 0
            
            var dhikrName = "Subhanallah"
            var dhikrArabic = "سُبْحَانَ اللَّهِ"
            var targetCount = 33
            
            // Find the selected dhikr or use first one if not found
            if let dhikrsArray = json["dhikrs"] as? [[String: Any]] {
                var foundDhikr: [String: Any]? = nil
                
                // Try to find the selected dhikr by ID
                for dhikrDict in dhikrsArray {
                    if let id = dhikrDict["id"] as? Int, id == selectedDhikrId {
                        foundDhikr = dhikrDict
                        break
                    }
                }
                
                // If not found, use first dhikr
                if foundDhikr == nil, let firstDhikr = dhikrsArray.first {
                    foundDhikr = firstDhikr
                    selectedDhikrId = firstDhikr["id"] as? Int ?? 1
                }
                
                if let dhikr = foundDhikr {
                    dhikrName = dhikr["transliteration"] as? String ?? "Subhanallah"
                    dhikrArabic = dhikr["arabic"] as? String ?? "سُبْحَانَ اللَّهِ"
                    targetCount = dhikr["target"] as? Int ?? 33
                }
            }
            
            return TasbihCounterEntry(
                date: Date(),
                count: count,
                dhikrName: dhikrName,
                dhikrArabic: dhikrArabic,
                targetCount: targetCount,
                dhikrId: selectedDhikrId
            )
        }
        
        return TasbihCounterEntry(
            date: Date(),
            count: 0,
            dhikrName: "Subhanallah",
            dhikrArabic: "سُبْحَانَ اللَّهِ",
            targetCount: 33,
            dhikrId: 1
        )
    }
}

// MARK: - Widget Configuration
// Note: Using StaticConfiguration for both iOS versions to avoid type unification issues.
// iOS 17+ features (App Intents for direct counting) are handled in the view layer.
struct TasbihCounterWidget: Widget {
    let kind: String = "TasbihCounterWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: TasbihCounterProviderLegacy()) { entry in
            TasbihCounterWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Tasbih Counter")
        .description("Quick access to your tasbih counter. Tap to count.")
        .supportedFamilies([.systemSmall])
    }
}

