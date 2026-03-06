import WidgetKit
import SwiftUI

// MARK: - Subscription Required View
private struct QuranVerseEnglishSubscriptionRequiredView: View {
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

// MARK: - English-Only Lock Screen Widget
struct DailyQuranVerseEnglishWidget: Widget {
    let kind: String = "DailyQuranVerseEnglishWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: DailyQuranVerseProvider()) { entry in
            let provider = DailyQuranVerseProvider()
            let isSubscribed = provider.getSubscriptionStatus()
            
            if !isSubscribed {
                if #available(iOS 17.0, *) {
                    QuranVerseEnglishSubscriptionRequiredView()
                        .containerBackground(.clear, for: .widget)
                } else {
                    QuranVerseEnglishSubscriptionRequiredView()
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
                    LockScreenQuranVerseEnglishView(data: entry.data)
                        .widgetURL(verseURL)
                        .containerBackground(.clear, for: .widget)
                } else {
                    LockScreenQuranVerseEnglishView(data: entry.data)
                        .widgetURL(verseURL)
                }
            }
        }
        .configurationDisplayName("Quran Verse (English)")
        .description("View today's verse in English.")
        .supportedFamilies([.accessoryRectangular])
    }
}

// MARK: - Preview
#Preview("English", as: .accessoryRectangular) {
    DailyQuranVerseEnglishWidget()
} timeline: {
    let provider = DailyQuranVerseProvider()
    QuranVerseEntry(date: Date(), data: provider.getSampleData())
}

