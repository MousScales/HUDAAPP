import WidgetKit
import SwiftUI

// MARK: - Daily Dua Widget (Home Screen + Lock Screen)

// MARK: - Data Models
struct DuaData: Codable {
    let title: String
    let arabic: String
    let translation: String
    let reference: String
}

// MARK: - Timeline Provider
struct DailyDuaProvider: TimelineProvider {
    typealias Entry = DuaEntry
    
    func placeholder(in context: Context) -> DuaEntry {
        DuaEntry(date: Date(), data: getSampleData())
    }

    func getSnapshot(in context: Context, completion: @escaping (DuaEntry) -> ()) {
        let data = getDuaData()
        let entry = DuaEntry(date: Date(), data: data)
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> ()) {
        var entries: [DuaEntry] = []
        let currentDate = Date()
        
        // Update once per day at midnight
        let calendar = Calendar.current
        let tomorrow = calendar.startOfDay(for: calendar.date(byAdding: .day, value: 1, to: currentDate)!)
        
        let entry = DuaEntry(date: currentDate, data: getDuaData())
        entries.append(entry)
        
        // Add tomorrow's entry
        let tomorrowEntry = DuaEntry(date: tomorrow, data: getDuaData())
        entries.append(tomorrowEntry)

        let timeline = Timeline(entries: entries, policy: .after(tomorrow))
        completion(timeline)
    }
    
    private func getDuaData() -> DuaData {
        // Try to get data from shared container
        if let data = getSharedDuaData(), !data.title.isEmpty {
            return data
        }
        
        // Fallback to sample data
        return getSampleData()
    }
    
    private func getSharedDuaData() -> DuaData? {
        guard let userDefaults = UserDefaults(suiteName: "group.com.digaifounder.huda") else {
            return nil
        }
        
        if let jsonString = userDefaults.string(forKey: "daily_dua_widget"),
           let jsonData = jsonString.data(using: .utf8),
           let json = try? JSONSerialization.jsonObject(with: jsonData) as? [String: Any] {
            
            let title = json["title"] as? String ?? ""
            let arabic = json["arabic"] as? String ?? ""
            let translation = json["translation"] as? String ?? ""
            let reference = json["reference"] as? String ?? ""
            
            return DuaData(
                title: title,
                arabic: arabic,
                translation: translation,
                reference: reference
            )
        }
        
        return nil
    }
    
    internal func getSampleData() -> DuaData {
        return DuaData(
            title: "Morning Dua",
            arabic: "اللَّهُمَّ بِكَ أَصْبَحْنَا وَبِكَ أَمْسَيْنَا وَبِكَ نَحْيَا وَبِكَ نَمُوتُ وَإِلَيْكَ النُّشُورُ",
            translation: "O Allah, by You we enter the morning and by You we enter the evening, by You we live and by You we die, and to You is our return.",
            reference: "Prophetic Tradition"
        )
    }
}

// MARK: - Timeline Entry
struct DuaEntry: TimelineEntry {
    let date: Date
    let data: DuaData
}

// MARK: - Widget Views
struct DailyDuaWidgetEntryView: View {
    var entry: DailyDuaProvider.Entry
    @Environment(\.widgetFamily) var family

    // Create URL for deep linking to the dua
    private var duaURL: URL? {
        var components = URLComponents()
        components.scheme = "huda"
        components.host = "dua"
        var queryItems: [URLQueryItem] = []
        
        if !entry.data.title.isEmpty {
            queryItems.append(URLQueryItem(name: "title", value: entry.data.title))
        }
        if !entry.data.arabic.isEmpty {
            queryItems.append(URLQueryItem(name: "arabic", value: entry.data.arabic))
        }
        if !entry.data.translation.isEmpty {
            queryItems.append(URLQueryItem(name: "translation", value: entry.data.translation))
        }
        if !entry.data.reference.isEmpty {
            queryItems.append(URLQueryItem(name: "reference", value: entry.data.reference))
        }
        
        components.queryItems = queryItems.isEmpty ? nil : queryItems
        return components.url
    }

    @ViewBuilder
    var body: some View {
        MediumDuaView(data: entry.data)
            .widgetURL(duaURL)
    }
}

// MARK: - Medium Widget View (Home Screen)
struct MediumDuaView: View {
    let data: DuaData
    @Environment(\.colorScheme) var colorScheme
    
    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            // Header
            HStack(spacing: 6) {
                // App logo (light mode uses black logo, dark mode uses normal logo)
                Image(colorScheme == .dark ? "logo-rounded" : "blacklogo-rounded")
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .frame(width: 20, height: 20)
                    .clipShape(Circle())
                
                Spacer()
                
                Text(data.reference)
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }
            .padding(.horizontal, 12)
            .padding(.top, 8)
            
            // Arabic text - using Arial font to match screens
            if !data.arabic.isEmpty {
                Text(data.arabic)
                    .font(.custom("Arial", size: 13))
                    .foregroundColor(.primary)
                    .multilineTextAlignment(.trailing)
                    .lineLimit(6)
                    .padding(.horizontal, 12)
                    .padding(.top, 2)
            }
            
            // Translation
            Text(data.translation)
                .font(.caption)
                .foregroundColor(.secondary)
                .lineLimit(5)
                .padding(.horizontal, 12)
                .padding(.top, 4)
            
            Spacer(minLength: 4)
        }
        .containerBackground(.fill.tertiary, for: .widget)
    }
}

// MARK: - Lock Screen Views
// Arabic view
struct LockScreenDuaView: View {
    let data: DuaData
    
    var body: some View {
        Group {
            VStack(alignment: .leading, spacing: 4) {
                // Reference at top
                Text(data.reference)
                    .font(.system(size: 11, weight: .semibold))
                    .widgetAccentable()
                
                // Arabic text only
                Text(data.arabic.isEmpty ? data.translation : data.arabic)
                    .font(.custom("Arial", size: 11))
                    .multilineTextAlignment(.trailing)
                    .lineLimit(5)
            }
        }
    }
}

// English-only view
struct LockScreenDuaEnglishView: View {
    let data: DuaData
    
    var body: some View {
        Group {
            VStack(alignment: .leading, spacing: 4) {
                // Reference at top
                Text(data.reference)
                    .font(.system(size: 11, weight: .semibold))
                    .widgetAccentable()
                
                // English translation only
                Text(data.translation)
                    .font(.system(size: 10, weight: .regular))
                    .lineLimit(5)
                    .multilineTextAlignment(.leading)
            }
        }
    }
}

// MARK: - Widget Configuration
struct DailyDuaWidget: Widget {
    let kind: String = "DailyDuaWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: DailyDuaProvider()) { entry in
            if #available(iOS 17.0, *) {
                DailyDuaWidgetEntryView(entry: entry)
                    .containerBackground(.clear, for: .widget)
            } else {
                DailyDuaWidgetEntryView(entry: entry)
            }
        }
        .configurationDisplayName("Daily Dua")
        .description("View today's dua on your home screen.")
        .supportedFamilies([.systemMedium])
    }
}

// MARK: - Preview
#Preview(as: .systemMedium) {
    DailyDuaWidget()
} timeline: {
    let provider = DailyDuaProvider()
    DuaEntry(date: Date(), data: provider.getSampleData())
}

