import WidgetKit
import SwiftUI

// MARK: - Arabic-Only Lock Screen Widget
struct DailyDuaArabicWidget: Widget {
    let kind: String = "DailyDuaArabicWidget"

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
                LockScreenDuaView(data: entry.data)
                    .widgetURL(duaURL)
                    .containerBackground(.clear, for: .widget)
            } else {
                LockScreenDuaView(data: entry.data)
                    .widgetURL(duaURL)
            }
        }
        .configurationDisplayName("Daily Dua (Arabic)")
        .description("View today's dua in Arabic.")
        .supportedFamilies([.accessoryRectangular])
    }
}

// MARK: - Preview
#Preview("Arabic", as: .accessoryRectangular) {
    DailyDuaArabicWidget()
} timeline: {
    let provider = DailyDuaProvider()
    DuaEntry(date: Date(), data: provider.getSampleData())
}

