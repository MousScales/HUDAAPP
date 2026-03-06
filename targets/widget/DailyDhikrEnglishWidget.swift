import WidgetKit
import SwiftUI

// MARK: - English-Only Lock Screen Widget
struct DailyDhikrEnglishWidget: Widget {
    let kind: String = "DailyDhikrEnglishWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: DailyDhikrProvider()) { entry in
            let dhikrURL: URL? = {
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
            }()
            
            if #available(iOS 17.0, *) {
                LockScreenDhikrEnglishView(data: entry.data)
                    .widgetURL(dhikrURL)
                    .containerBackground(.clear, for: .widget)
            } else {
                LockScreenDhikrEnglishView(data: entry.data)
                    .widgetURL(dhikrURL)
            }
        }
        .configurationDisplayName("Daily Dhikr (English)")
        .description("View today's dhikr in English.")
        .supportedFamilies([.accessoryRectangular])
    }
}

// MARK: - Preview
#Preview("English", as: .accessoryRectangular) {
    DailyDhikrEnglishWidget()
} timeline: {
    let provider = DailyDhikrProvider()
    DhikrEntry(date: Date(), data: provider.getSampleData())
}

