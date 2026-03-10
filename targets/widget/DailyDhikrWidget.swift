import WidgetKit
import SwiftUI

// MARK: - Daily Dhikr Widget (Home Screen + Lock Screen)

// MARK: - Data Models
struct DhikrData: Codable {
    let title: String
    let arabic: String
    let translation: String
    let reference: String
}

// MARK: - Timeline Provider
struct DailyDhikrProvider: TimelineProvider {
    typealias Entry = DhikrEntry
    
    func placeholder(in context: Context) -> DhikrEntry {
        DhikrEntry(date: Date(), data: getSampleData())
    }

    func getSnapshot(in context: Context, completion: @escaping (DhikrEntry) -> ()) {
        let data = getDhikrData()
        let entry = DhikrEntry(date: Date(), data: data)
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> ()) {
        var entries: [DhikrEntry] = []
        let currentDate = Date()
        
        // Update once per day at midnight
        let calendar = Calendar.current
        let tomorrow = calendar.startOfDay(for: calendar.date(byAdding: .day, value: 1, to: currentDate)!)
        
        let entry = DhikrEntry(date: currentDate, data: getDhikrData())
        entries.append(entry)
        
        // Add tomorrow's entry
        let tomorrowEntry = DhikrEntry(date: tomorrow, data: getDhikrData())
        entries.append(tomorrowEntry)

        let timeline = Timeline(entries: entries, policy: .after(tomorrow))
        completion(timeline)
    }
    
    private func getDhikrData() -> DhikrData {
        // Try to get data from shared container
        if let data = getSharedDhikrData(), !data.title.isEmpty {
            return data
        }
        
        // Fallback to sample data
        return getSampleData()
    }
    
    private func getSharedDhikrData() -> DhikrData? {
        guard let userDefaults = UserDefaults(suiteName: "group.com.digaifounder.huda") else {
            return nil
        }
        
        if let jsonString = userDefaults.string(forKey: "daily_dhikr_widget"),
           let jsonData = jsonString.data(using: .utf8),
           let json = try? JSONSerialization.jsonObject(with: jsonData) as? [String: Any] {
            
            let title = json["title"] as? String ?? ""
            let arabic = json["arabic"] as? String ?? ""
            let translation = json["translation"] as? String ?? ""
            let reference = json["reference"] as? String ?? ""
            
            return DhikrData(
                title: title,
                arabic: arabic,
                translation: translation,
                reference: reference
            )
        }
        
        return nil
    }
    
    internal func getSampleData() -> DhikrData {
        return DhikrData(
            title: "Subhanallah",
            arabic: "سُبْحَانَ اللَّهِ",
            translation: "Glory be to Allah",
            reference: "Prophetic Tradition"
        )
    }
}

// MARK: - Timeline Entry
struct DhikrEntry: TimelineEntry {
    let date: Date
    let data: DhikrData
}

// MARK: - Widget Views
struct DailyDhikrWidgetEntryView: View {
    var entry: DailyDhikrProvider.Entry
    @Environment(\.widgetFamily) var family

    // Create URL for deep linking to the dhikr
    private var dhikrURL: URL? {
        var components = URLComponents()
        components.scheme = "huda"
        components.host = "dhikr"
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
        MediumDhikrView(data: entry.data)
            .widgetURL(dhikrURL)
    }
}

// MARK: - Medium Widget View (Home Screen)
struct MediumDhikrView: View {
    let data: DhikrData
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
struct LockScreenDhikrView: View {
    let data: DhikrData
    
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
struct LockScreenDhikrEnglishView: View {
    let data: DhikrData
    
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
struct DailyDhikrWidget: Widget {
    let kind: String = "DailyDhikrWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: DailyDhikrProvider()) { entry in
            if #available(iOS 17.0, *) {
                DailyDhikrWidgetEntryView(entry: entry)
                    .containerBackground(.clear, for: .widget)
            } else {
                DailyDhikrWidgetEntryView(entry: entry)
            }
        }
        .configurationDisplayName("Daily Dhikr")
        .description("View today's dhikr on your home screen.")
        .supportedFamilies([.systemMedium])
    }
}

// MARK: - Preview
#Preview(as: .systemMedium) {
    DailyDhikrWidget()
} timeline: {
    let provider = DailyDhikrProvider()
    DhikrEntry(date: Date(), data: provider.getSampleData())
}

