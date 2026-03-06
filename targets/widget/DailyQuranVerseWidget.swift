import WidgetKit
import SwiftUI
import UIKit

// MARK: - Daily Quran Verse Widget (Home Screen + Arabic Lock Screen)
// Lock screen widgets don't use containerBackground - system handles backgrounds automatically

// MARK: - Data Models
struct QuranVerseData: Codable {
    let arabic: String
    let translation: String
    let reference: String
    let surahName: String
    let surahNameArabic: String
    let ayahNumber: Int
    let surahNumber: Int
}

// MARK: - Timeline Provider
struct DailyQuranVerseProvider: TimelineProvider {
    typealias Entry = QuranVerseEntry
    
    func placeholder(in context: Context) -> QuranVerseEntry {
        QuranVerseEntry(date: Date(), data: getSampleData())
    }

    func getSnapshot(in context: Context, completion: @escaping (QuranVerseEntry) -> ()) {
        // Always use sample data for preview/snapshot to ensure widget shows something
        let data = getVerseData()
        let entry = QuranVerseEntry(date: Date(), data: data)
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> ()) {
        var entries: [QuranVerseEntry] = []
        let currentDate = Date()
        
        // Update once per day at midnight
        let calendar = Calendar.current
        let tomorrow = calendar.startOfDay(for: calendar.date(byAdding: .day, value: 1, to: currentDate)!)
        
        let entry = QuranVerseEntry(date: currentDate, data: getVerseData())
        entries.append(entry)
        
        // Add tomorrow's entry
        let tomorrowEntry = QuranVerseEntry(date: tomorrow, data: getVerseData())
        entries.append(tomorrowEntry)

        let timeline = Timeline(entries: entries, policy: .after(tomorrow))
        completion(timeline)
    }
    
    private func getVerseData() -> QuranVerseData {
        // Try to get data from shared container
        if let data = getSharedVerseData(), !data.arabic.isEmpty, !data.translation.isEmpty {
            return data
        }
        
        // Always fallback to sample data to ensure widget shows something
        return getSampleData()
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
    
    private func getSharedVerseData() -> QuranVerseData? {
        guard let userDefaults = UserDefaults(suiteName: "group.com.digaifounder.huda") else {
            return nil
        }
        
        if let jsonString = userDefaults.string(forKey: "daily_quran_verse_widget"),
           let jsonData = jsonString.data(using: .utf8),
           let json = try? JSONSerialization.jsonObject(with: jsonData) as? [String: Any] {
            
            let arabic = json["arabic"] as? String ?? ""
            let translation = json["translation"] as? String ?? ""
            let reference = json["reference"] as? String ?? ""
            let surahName = json["surahName"] as? String ?? ""
            let surahNameArabic = json["surahNameArabic"] as? String ?? ""
            let ayahNumber = json["ayahNumber"] as? Int ?? 0
            let surahNumber = json["surahNumber"] as? Int ?? 0
            
            return QuranVerseData(
                arabic: arabic,
                translation: translation,
                reference: reference,
                surahName: surahName,
                surahNameArabic: surahNameArabic,
                ayahNumber: ayahNumber,
                surahNumber: surahNumber
            )
        }
        
        return nil
    }
    
    func getSampleData() -> QuranVerseData {
        return QuranVerseData(
            arabic: "يَا أَيُّهَا الَّذِينَ آمَنُوا اجْتَنِبُوا كَثِيرًا مِّنَ الظَّنِّ إِنَّ بَعْضَ الظَّنِّ إِثْمٌ",
            translation: "Avoid much [negative] assumption. Indeed, some assumption is sin.",
            reference: "Al-Hujurat 49:12",
            surahName: "Al-Hujurat",
            surahNameArabic: "الحجرات",
            ayahNumber: 12,
            surahNumber: 49
        )
    }
}

// MARK: - Timeline Entry
struct QuranVerseEntry: TimelineEntry {
    let date: Date
    let data: QuranVerseData
}

// MARK: - Widget Views
struct DailyQuranVerseWidgetEntryView : View {
    var entry: DailyQuranVerseProvider.Entry
    @Environment(\.widgetFamily) var family

    // Create URL for deep linking to the verse
    private var verseURL: URL? {
        guard entry.data.surahNumber > 0 && entry.data.ayahNumber > 0 else {
            return nil
        }
        // Create URL: huda://quran?surah=49&ayah=12&surahName=Al-Hujurat&surahNameArabic=الحجرات
        var components = URLComponents()
        components.scheme = "huda"
        components.host = "quran"
        components.queryItems = [
            URLQueryItem(name: "surah", value: String(entry.data.surahNumber)),
            URLQueryItem(name: "ayah", value: String(entry.data.ayahNumber)),
            URLQueryItem(name: "surahName", value: entry.data.surahName),
            URLQueryItem(name: "surahNameArabic", value: entry.data.surahNameArabic)
        ]
        return components.url
    }

    @ViewBuilder
    var body: some View {
        let provider = DailyQuranVerseProvider()
        let isSubscribed = provider.getSubscriptionStatus()
        
        if !isSubscribed {
            // Show "Huda Premium Feature" message if not subscribed
            SubscriptionRequiredView()
                // No widgetURL - clicking does nothing
        } else {
            // Show verse if subscribed (home screen only)
            MediumQuranVerseView(data: entry.data)
                .widgetURL(verseURL)
        }
    }
}

// MARK: - Medium Widget View
struct MediumQuranVerseView: View {
    let data: QuranVerseData
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
            
            // Arabic text - using Arial font to match Quran screen
            Text(data.arabic)
                .font(.custom("Arial", size: 13))
                .foregroundColor(.primary)
                .multilineTextAlignment(.trailing)
                .lineLimit(6)
                .padding(.horizontal, 12)
                .padding(.top, 2)
            
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
// Arabic-only view
struct LockScreenQuranVerseArabicView: View {
    let data: QuranVerseData
    
    private var formattedReference: String {
        if !data.surahName.isEmpty && data.ayahNumber > 0 {
            return "\(data.surahName) \(data.surahNumber):\(data.ayahNumber)"
        }
        return data.reference
    }
    
    var body: some View {
        Group {
            VStack(alignment: .leading, spacing: 4) {
                // Reference at top
                Text(formattedReference)
                    .font(.system(size: 11, weight: .semibold))
                    .widgetAccentable()
                
                // Arabic text only - using Arial font to match Quran screen
                Text(data.arabic)
                    .font(.custom("Arial", size: 11))
                    .multilineTextAlignment(.trailing)
                    .lineLimit(5)
            }
        }
    }
}

// English-only view
struct LockScreenQuranVerseEnglishView: View {
    let data: QuranVerseData
    
    private var formattedReference: String {
        if !data.surahName.isEmpty && data.ayahNumber > 0 {
            return "\(data.surahName) \(data.surahNumber):\(data.ayahNumber)"
        }
        return data.reference
    }
    
    var body: some View {
        Group {
            VStack(alignment: .leading, spacing: 4) {
                // Reference at top
                Text(formattedReference)
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

struct LockScreenInlineQuranVerseView: View {
    let data: QuranVerseData
    
    private var formattedReference: String {
        if !data.surahName.isEmpty && data.ayahNumber > 0 {
            return "\(data.surahName) \(data.surahNumber):\(data.ayahNumber)"
        }
        return data.reference
    }
    
    var body: some View {
        Group {
            Text("\(formattedReference): \(data.translation)")
                .lineLimit(1)
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
            Text("Subscribe to view daily Quran verse")
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
                Text("Subscribe to view daily Quran verse")
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
                Text("Subscribe to view daily Quran verse")
                    .font(.system(size: 10, weight: .regular))
                    .foregroundColor(.secondary)
            }
            .frame(maxWidth: .infinity, alignment: .center)
        }
    }
}

struct LockScreenInlineSubscriptionRequiredView: View {
    var body: some View {
        Group {
            Text("Subscribe to view daily Quran verse")
                .lineLimit(1)
        }
    }
}

// MARK: - Widget Configuration
struct DailyQuranVerseWidget: Widget {
    let kind: String = "DailyQuranVerseWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: DailyQuranVerseProvider()) { entry in
            if #available(iOS 17.0, *) {
                DailyQuranVerseWidgetEntryView(entry: entry)
                    .containerBackground(.clear, for: .widget)
            } else {
                DailyQuranVerseWidgetEntryView(entry: entry)
            }
        }
        .configurationDisplayName("Daily Quran Verse")
        .description("View today's verse from the Holy Quran.")
        .supportedFamilies([.systemMedium])
    }
}

// MARK: - Arabic-Only Lock Screen Widget
struct DailyQuranVerseArabicWidget: Widget {
    let kind: String = "DailyQuranVerseArabicWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: DailyQuranVerseProvider()) { entry in
            let provider = DailyQuranVerseProvider()
            let isSubscribed = provider.getSubscriptionStatus()
            
            if !isSubscribed {
                if #available(iOS 17.0, *) {
                    LockScreenSubscriptionRequiredView()
                        .containerBackground(.clear, for: .widget)
                } else {
                    LockScreenSubscriptionRequiredView()
                }
            } else {
                let verseURL: URL? = {
                    guard entry.data.surahNumber > 0 && entry.data.ayahNumber > 0 else {
                        return nil
                    }
                    var components = URLComponents()
                    components.scheme = "huda"
                    components.host = "quran"
                    components.queryItems = [
                        URLQueryItem(name: "surah", value: String(entry.data.surahNumber)),
                        URLQueryItem(name: "ayah", value: String(entry.data.ayahNumber)),
                        URLQueryItem(name: "surahName", value: entry.data.surahName),
                        URLQueryItem(name: "surahNameArabic", value: entry.data.surahNameArabic)
                    ]
                    return components.url
                }()
                
                if #available(iOS 17.0, *) {
                    LockScreenQuranVerseArabicView(data: entry.data)
                        .widgetURL(verseURL)
                        .containerBackground(.clear, for: .widget)
                } else {
                    LockScreenQuranVerseArabicView(data: entry.data)
                        .widgetURL(verseURL)
                }
            }
        }
        .configurationDisplayName("Quran Verse (Arabic)")
        .description("View today's verse in Arabic.")
        .supportedFamilies([.accessoryRectangular])
    }
}

// MARK: - Preview
#Preview(as: .systemMedium) {
    DailyQuranVerseWidget()
} timeline: {
    let provider = DailyQuranVerseProvider()
    QuranVerseEntry(date: Date(), data: provider.getSampleData())
}

#Preview("Arabic", as: .accessoryRectangular) {
    DailyQuranVerseArabicWidget()
} timeline: {
    let provider = DailyQuranVerseProvider()
    QuranVerseEntry(date: Date(), data: provider.getSampleData())
}


