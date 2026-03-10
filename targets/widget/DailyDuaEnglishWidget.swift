import WidgetKit
import SwiftUI

// MARK: - English-Only Lock Screen Widget
struct DailyDuaEnglishWidget: Widget {
    let kind: String = "DailyDuaEnglishWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: DailyDuaProvider()) { entry in
            let duaURL: URL? = {
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
            }()
            
            if #available(iOS 17.0, *) {
                LockScreenDuaEnglishView(data: entry.data)
                    .widgetURL(duaURL)
                    .containerBackground(.clear, for: .widget)
            } else {
                LockScreenDuaEnglishView(data: entry.data)
                    .widgetURL(duaURL)
            }
        }
        .configurationDisplayName("Daily Dua (English)")
        .description("View today's dua in English.")
        .supportedFamilies([.accessoryRectangular])
    }
}

// MARK: - Preview
#Preview("English", as: .accessoryRectangular) {
    DailyDuaEnglishWidget()
} timeline: {
    let provider = DailyDuaProvider()
    DuaEntry(date: Date(), data: provider.getSampleData())
}

