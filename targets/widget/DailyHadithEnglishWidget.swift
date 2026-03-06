import WidgetKit
import SwiftUI

// MARK: - Subscription Required View
private struct HadithEnglishSubscriptionRequiredView: View {
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

// MARK: - English-Only Lock Screen Widget
struct DailyHadithEnglishWidget: Widget {
    let kind: String = "DailyHadithEnglishWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: DailyHadithProvider()) { entry in
            let provider = DailyHadithProvider()
            let isSubscribed = provider.getSubscriptionStatus()
            
            if !isSubscribed {
                if #available(iOS 17.0, *) {
                    HadithEnglishSubscriptionRequiredView()
                        .containerBackground(.clear, for: .widget)
                } else {
                    HadithEnglishSubscriptionRequiredView()
                }
            } else {
                let hadithURL: URL? = {
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
                }()
                
                if #available(iOS 17.0, *) {
                    LockScreenHadithEnglishView(data: entry.data)
                        .widgetURL(hadithURL)
                        .containerBackground(.clear, for: .widget)
                } else {
                    LockScreenHadithEnglishView(data: entry.data)
                        .widgetURL(hadithURL)
                }
            }
        }
        .configurationDisplayName("Daily Hadith (English)")
        .description("View today's hadith in English.")
        .supportedFamilies([.accessoryRectangular])
    }
}

// MARK: - Preview
#Preview("English", as: .accessoryRectangular) {
    DailyHadithEnglishWidget()
} timeline: {
    let provider = DailyHadithProvider()
    HadithEntry(date: Date(), data: provider.getSampleData())
}

