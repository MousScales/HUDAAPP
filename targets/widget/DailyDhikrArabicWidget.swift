import WidgetKit
import SwiftUI

// MARK: - Arabic-Only Lock Screen Widget
struct DailyDhikrArabicWidget: Widget {
    let kind: String = "DailyDhikrArabicWidget"

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
                LockScreenDhikrView(data: entry.data)
                    .widgetURL(dhikrURL)
                    .containerBackground(.clear, for: .widget)
            } else {
                LockScreenDhikrView(data: entry.data)
                    .widgetURL(dhikrURL)
            }
        }
        .configurationDisplayName("Daily Dhikr (Arabic)")
        .description("View today's dhikr in Arabic.")
        .supportedFamilies([.accessoryRectangular])
    }
}

// MARK: - Preview
#Preview("Arabic", as: .accessoryRectangular) {
    DailyDhikrArabicWidget()
} timeline: {
    let provider = DailyDhikrProvider()
    DhikrEntry(date: Date(), data: provider.getSampleData())
}

