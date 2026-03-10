import WidgetKit
import SwiftUI

// MARK: - Daily Hadith Widget (Home Screen + Lock Screen)

// MARK: - Data Models
struct HadithData: Codable {
    let title: String
    let arabic: String
    let translation: String
    let reference: String
    let collection: String?
    let hadithNumber: Int?
}

// MARK: - Timeline Provider
struct DailyHadithProvider: TimelineProvider {
    typealias Entry = HadithEntry
    
    func placeholder(in context: Context) -> HadithEntry {
        HadithEntry(date: Date(), data: getSampleData())
    }

    func getSnapshot(in context: Context, completion: @escaping (HadithEntry) -> ()) {
        let data = getHadithData()
        let entry = HadithEntry(date: Date(), data: data)
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> ()) {
        var entries: [HadithEntry] = []
        let currentDate = Date()
        
        // Update once per day at midnight
        let calendar = Calendar.current
        let tomorrow = calendar.startOfDay(for: calendar.date(byAdding: .day, value: 1, to: currentDate)!)
        
        let entry = HadithEntry(date: currentDate, data: getHadithData())
        entries.append(entry)
        
        // Add tomorrow's entry
        let tomorrowEntry = HadithEntry(date: tomorrow, data: getHadithData())
        entries.append(tomorrowEntry)

        let timeline = Timeline(entries: entries, policy: .after(tomorrow))
        completion(timeline)
    }
    
    // Get subscription status verified by Apple's subscription service
    // This status is saved by the app after verifying with Apple's servers
    func getSubscriptionStatus() -> Bool {
        guard let userDefaults = UserDefaults(suiteName: "group.com.digaifounder.huda") else {
            return false
        }
        
        // Read subscription status that was verified by Apple subscription service
        // The app verifies with Apple's servers and saves the result here
        if let jsonString = userDefaults.string(forKey: "subscription_status_widget"),
           let jsonData = jsonString.data(using: .utf8),
           let json = try? JSONSerialization.jsonObject(with: jsonData) as? [String: Any] {
            // Verify this status came from Apple verification (if metadata exists)
            if let verifiedBy = json["verifiedBy"] as? String, verifiedBy == "apple" {
                return json["isSubscribed"] as? Bool ?? false
            }
            // Fallback for older format (backward compatibility)
            return json["isSubscribed"] as? Bool ?? false
        }
        
        return false
    }
    
    private func getHadithData() -> HadithData {
        // Try to get data from shared container
        if let data = getSharedHadithData(), !data.title.isEmpty {
            return data
        }
        
        // Fallback to sample data
        return getSampleData()
    }
    
    private func getSharedHadithData() -> HadithData? {
        guard let userDefaults = UserDefaults(suiteName: "group.com.digaifounder.huda") else {
            return nil
        }
        
        if let jsonString = userDefaults.string(forKey: "daily_hadith_widget"),
           let jsonData = jsonString.data(using: .utf8),
           let json = try? JSONSerialization.jsonObject(with: jsonData) as? [String: Any] {
            
            let title = json["title"] as? String ?? ""
            let arabic = json["arabic"] as? String ?? ""
            let translation = json["translation"] as? String ?? ""
            let reference = json["reference"] as? String ?? ""
            let collection = json["collection"] as? String
            let hadithNumber = json["hadithNumber"] as? Int
            
            return HadithData(
                title: title,
                arabic: arabic,
                translation: translation,
                reference: reference,
                collection: collection,
                hadithNumber: hadithNumber
            )
        }
        
        return nil
    }
    
    internal func getSampleData() -> HadithData {
        return HadithData(
            title: "The best of you are those who learn the Quran and teach it",
            arabic: "خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ",
            translation: "The best of you are those who learn the Quran and teach it",
            reference: "Sahih al-Bukhari",
            collection: "Sahih al-Bukhari",
            hadithNumber: 5027
        )
    }
}

// MARK: - Timeline Entry
struct HadithEntry: TimelineEntry {
    let date: Date
    let data: HadithData
}

// MARK: - Widget Views
struct DailyHadithWidgetEntryView: View {
    var entry: DailyHadithProvider.Entry
    @Environment(\.widgetFamily) var family

    // Create URL for deep linking to the hadith
    private var hadithURL: URL? {
        var components = URLComponents()
        components.scheme = "huda"
        components.host = "hadith"
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
        if let collection = entry.data.collection {
            queryItems.append(URLQueryItem(name: "collection", value: collection))
        }
        if let hadithNumber = entry.data.hadithNumber {
            queryItems.append(URLQueryItem(name: "hadithNumber", value: String(hadithNumber)))
        }
        
        components.queryItems = queryItems.isEmpty ? nil : queryItems
        return components.url
    }

    @ViewBuilder
    var body: some View {
        let provider = DailyHadithProvider()
        let isSubscribed = provider.getSubscriptionStatus()
        
        if !isSubscribed {
            // Show "Huda Premium Feature" message if not subscribed
            SubscriptionRequiredView()
                // No widgetURL - clicking does nothing
        } else {
            // Show hadith if subscribed (home screen only)
            MediumHadithView(data: entry.data)
                .widgetURL(hadithURL)
        }
    }
}

// MARK: - Medium Widget View (Home Screen)
struct MediumHadithView: View {
    let data: HadithData
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
struct LockScreenHadithView: View {
    let data: HadithData
    
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
struct LockScreenHadithEnglishView: View {
    let data: HadithData
    
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

// MARK: - Subscription Required Views
fileprivate struct SubscriptionRequiredView: View {
    var body: some View {
        VStack(spacing: 4) {
            Spacer()
            Text("Huda Premium Feature")
                .font(.headline)
                .foregroundColor(.secondary)
            Text("Subscribe to see daily Hadith")
                .font(.subheadline)
                .foregroundColor(.secondary)
            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .containerBackground(.fill.tertiary, for: .widget)
    }
}

fileprivate struct LockScreenSubscriptionRequiredView: View {
    @ViewBuilder
    var body: some View {
        if #available(iOS 17.0, *) {
            VStack(spacing: 2) {
                Text("Huda Premium Feature")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundColor(.secondary)
                Text("Subscribe to see daily Hadith")
                    .font(.system(size: 10, weight: .regular))
                    .foregroundColor(.secondary)
            }
            .frame(maxWidth: .infinity, alignment: .center)
            .containerBackground(.clear, for: .widget)
        } else {
            VStack(spacing: 2) {
                Text("Huda Premium Feature")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundColor(.secondary)
                Text("Subscribe to see daily Hadith")
                    .font(.system(size: 10, weight: .regular))
                    .foregroundColor(.secondary)
            }
            .frame(maxWidth: .infinity, alignment: .center)
        }
    }
}

// MARK: - Widget Configuration
struct DailyHadithWidget: Widget {
    let kind: String = "DailyHadithWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: DailyHadithProvider()) { entry in
            if #available(iOS 17.0, *) {
                DailyHadithWidgetEntryView(entry: entry)
                    .containerBackground(.clear, for: .widget)
            } else {
                DailyHadithWidgetEntryView(entry: entry)
            }
        }
        .configurationDisplayName("Daily Hadith")
        .description("View today's hadith on your home screen.")
        .supportedFamilies([.systemMedium])
    }
}

// MARK: - Preview
#Preview(as: .systemMedium) {
    DailyHadithWidget()
} timeline: {
    let provider = DailyHadithProvider()
    HadithEntry(date: Date(), data: provider.getSampleData())
}

