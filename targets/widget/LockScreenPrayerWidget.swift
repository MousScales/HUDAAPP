import WidgetKit
import SwiftUI

// MARK: - Timeline Provider
struct LockScreenPrayerProvider: TimelineProvider {
    typealias Entry = SimpleEntry
    
    func placeholder(in context: Context) -> SimpleEntry {
        SimpleEntry(date: Date(), data: getSampleData())
    }

    func getSnapshot(in context: Context, completion: @escaping (SimpleEntry) -> ()) {
        let entry = SimpleEntry(date: Date(), data: getPrayerTimesData())
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> ()) {
        var entries: [SimpleEntry] = []
        let currentDate = Date()
        
        // Update every minute for accurate countdown
        for minuteOffset in 0 ..< 60 {
            let entryDate = Calendar.current.date(byAdding: .minute, value: minuteOffset, to: currentDate)!
            let entry = SimpleEntry(date: entryDate, data: getPrayerTimesData())
            entries.append(entry)
        }

        let timeline = Timeline(entries: entries, policy: .atEnd)
        completion(timeline)
    }
    
    private func getPrayerTimesData() -> PrayerTimesData {
        guard let userDefaults = UserDefaults(suiteName: "group.com.digaifounder.huda"),
              let jsonString = userDefaults.string(forKey: "prayer_times_widget"),
              let jsonData = jsonString.data(using: .utf8),
              let json = try? JSONSerialization.jsonObject(with: jsonData) as? [String: Any] else {
            return getSampleData()
        }
        
        var prayers: [PrayerTime] = []
        if let prayerTimesArray = json["prayerTimes"] as? [[String: Any]] {
            for prayerDict in prayerTimesArray {
                if let id = prayerDict["id"] as? String,
                   let name = prayerDict["name"] as? String,
                   let time = prayerDict["time"] as? String {
                    var dateObj = Date()
                    if let dateObjString = prayerDict["dateObj"] as? String,
                       let parsedDate = ISO8601DateFormatter().date(from: dateObjString) {
                        dateObj = parsedDate
                    }
                    let isNext = prayerDict["isNext"] as? Bool ?? false
                    let isCompleted = prayerDict["isCompleted"] as? Bool ?? false
                    prayers.append(PrayerTime(id: id, name: name, time: time, dateObj: dateObj, isNext: isNext, isCompleted: isCompleted))
                }
            }
        }
        
        var nextPrayer: PrayerTime? = nil
        if let nextPrayerDict = json["nextPrayer"] as? [String: Any],
           let id = nextPrayerDict["id"] as? String,
           let name = nextPrayerDict["name"] as? String,
           let time = nextPrayerDict["time"] as? String {
            var dateObj = Date()
            if let dateObjString = nextPrayerDict["dateObj"] as? String,
               let parsedDate = ISO8601DateFormatter().date(from: dateObjString) {
                dateObj = parsedDate
            }
            let isCompleted = nextPrayerDict["isCompleted"] as? Bool ?? false
            nextPrayer = PrayerTime(id: id, name: name, time: time, dateObj: dateObj, isNext: true, isCompleted: isCompleted)
        }
        
        var currentPrayer: PrayerTime? = nil
        if let currentPrayerDict = json["currentPrayer"] as? [String: Any],
           let id = currentPrayerDict["id"] as? String,
           let name = currentPrayerDict["name"] as? String,
           let time = currentPrayerDict["time"] as? String {
            var dateObj = Date()
            if let dateObjString = currentPrayerDict["dateObj"] as? String,
               let parsedDate = ISO8601DateFormatter().date(from: dateObjString) {
                dateObj = parsedDate
            }
            let isCompleted = currentPrayerDict["isCompleted"] as? Bool ?? false
            currentPrayer = PrayerTime(id: id, name: name, time: time, dateObj: dateObj, isNext: false, isCompleted: isCompleted)
        }
        
        let countdown = json["countdown"] as? String ?? ""
        let hijriDate = json["hijriDate"] as? String ?? ""
        let cityName = json["cityName"] as? String ?? ""
        
        return PrayerTimesData(
            prayerTimes: prayers,
            nextPrayer: nextPrayer,
            currentPrayer: currentPrayer,
            countdown: countdown,
            hijriDate: hijriDate,
            cityName: cityName
        )
    }
    
    internal func getSampleData() -> PrayerTimesData {
        let now = Date()
        let calendar = Calendar.current
        
        let prayers = [
            PrayerTime(id: "fajr", name: "Fajr", time: "5:30 AM", dateObj: calendar.date(bySettingHour: 5, minute: 30, second: 0, of: now) ?? now),
            PrayerTime(id: "dhuhr", name: "Dhuhr", time: "12:30 PM", dateObj: calendar.date(bySettingHour: 12, minute: 30, second: 0, of: now) ?? now, isNext: true),
            PrayerTime(id: "asr", name: "Asr", time: "3:45 PM", dateObj: calendar.date(bySettingHour: 15, minute: 45, second: 0, of: now) ?? now),
            PrayerTime(id: "maghrib", name: "Maghrib", time: "6:15 PM", dateObj: calendar.date(bySettingHour: 18, minute: 15, second: 0, of: now) ?? now),
            PrayerTime(id: "isha", name: "Isha", time: "7:45 PM", dateObj: calendar.date(bySettingHour: 19, minute: 45, second: 0, of: now) ?? now)
        ]
        
        let currentPrayer = prayers.first(where: { $0.id == "maghrib" })
        
        let sampleCountdown: String
        if let nextPrayer = prayers.first(where: { $0.isNext }) {
            let timeDiff = nextPrayer.dateObj.timeIntervalSince(now)
            if timeDiff > 0 {
                let hours = Int(timeDiff) / 3600
                let minutes = (Int(timeDiff) % 3600) / 60
                let seconds = Int(timeDiff) % 60
                sampleCountdown = String(format: "%d:%02d:%02d", hours, minutes, seconds)
            } else {
                sampleCountdown = "2:45:30"
            }
        } else {
            sampleCountdown = "2:45:30"
        }
        
        return PrayerTimesData(
            prayerTimes: prayers,
            nextPrayer: prayers.first(where: { $0.isNext }),
            currentPrayer: currentPrayer,
            countdown: sampleCountdown,
            hijriDate: "15 Dhul Hijjah 1445",
            cityName: "Mecca"
        )
    }
}

// MARK: - Widget Entry View
struct LockScreenPrayerWidgetEntryView: View {
    var entry: LockScreenPrayerProvider.Entry
    @Environment(\.widgetFamily) var family

    var body: some View {
        Group {
            switch family {
            case .accessoryRectangular:
                LockScreenRectangularView(data: entry.data)
            case .accessoryInline:
                LockScreenInlineView(data: entry.data)
            default:
                LockScreenRectangularView(data: entry.data)
            }
        }
    }
}

// MARK: - Rectangular View (shows current + next 2 prayers)
struct LockScreenRectangularView: View {
    let data: PrayerTimesData
    
    // Get the 3 prayers to display: current + next 2
    private var displayPrayers: [PrayerTime] {
        var prayers: [PrayerTime] = []
        let now = Date()
        let calendar = Calendar.current
        
        // Find current prayer index
        var currentIndex: Int? = nil
        if let currentPrayer = data.currentPrayer {
            currentIndex = data.prayerTimes.firstIndex(where: { $0.id == currentPrayer.id })
        }
        
        // If no current prayer found, find the last passed prayer
        if currentIndex == nil {
            for (index, prayer) in data.prayerTimes.enumerated() {
                var prayerDate: Date
                if let parsedDate = parseTimeString(prayer.time, for: now) {
                    prayerDate = parsedDate
                } else {
                    prayerDate = prayer.dateObj
                }
                
                if prayerDate < now {
                    currentIndex = index
                } else {
                    break
                }
            }
        }
        
        // If still no current, use the last prayer
        if currentIndex == nil {
            currentIndex = data.prayerTimes.count - 1
        }
        
        guard let startIndex = currentIndex else {
            return Array(data.prayerTimes.prefix(3))
        }
        
        // Get current prayer and next 2
        for i in 0..<3 {
            let index = (startIndex + i) % data.prayerTimes.count
            if index < data.prayerTimes.count {
                prayers.append(data.prayerTimes[index])
            }
        }
        
        return prayers
    }
    
    // Helper to parse time string
    private func parseTimeString(_ timeString: String, for date: Date) -> Date? {
        let calendar = Calendar.current
        let components = calendar.dateComponents([.year, .month, .day], from: date)
        
        let trimmed = timeString.trimmingCharacters(in: .whitespaces)
        let parts = trimmed.components(separatedBy: " ")
        
        guard parts.count >= 1 else { return nil }
        
        let timePart = parts[0]
        let period = parts.count > 1 ? parts[1].uppercased() : ""
        
        let timeComponents = timePart.components(separatedBy: ":")
        guard timeComponents.count >= 2,
              var hour = Int(timeComponents[0]),
              let minute = Int(timeComponents[1]) else {
            return nil
        }
        
        if period == "PM" && hour != 12 {
            hour += 12
        } else if period == "AM" && hour == 12 {
            hour = 0
        }
        
        var dateComponents = components
        dateComponents.hour = hour
        dateComponents.minute = minute
        dateComponents.second = 0
        
        return calendar.date(from: dateComponents)
    }
    
    var body: some View {
        HStack(spacing: 6) {
            ForEach(displayPrayers, id: \.id) { prayer in
                LockScreenPrayerCard(
                    prayer: prayer,
                    isCurrent: data.currentPrayer?.id == prayer.id
                )
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

// MARK: - Prayer Card
struct LockScreenPrayerCard: View {
    let prayer: PrayerTime
    let isCurrent: Bool
    
    private var abbreviation: String {
        switch prayer.id.lowercased() {
        case "fajr": return "FJR"
        case "dhuhr", "zuhr": return "DHR"
        case "asr": return "ASR"
        case "maghrib": return "MGB"
        case "isha": return "ISH"
        default: return String(prayer.name.prefix(3)).uppercased()
        }
    }
    
    private var prayerIcon: String {
        switch prayer.id.lowercased() {
        case "fajr": return "sunrise.fill"
        case "dhuhr", "zuhr": return "sun.max.fill"
        case "asr": return "sun.horizon.fill"
        case "maghrib": return "sunset.fill"
        case "isha": return "moon.stars.fill"
        default: return "clock.fill"
        }
    }
    
    var body: some View {
        VStack(spacing: 2) {
            if isCurrent {
                Text("•")
                    .font(Font.system(size: 8, weight: .bold))
                    .widgetAccentable()
                    .padding(.bottom, -2)
            }
            
            if isCurrent {
                Text(abbreviation)
                    .font(Font.system(size: 9, weight: .semibold))
                    .widgetAccentable()
            } else {
                Text(abbreviation)
                    .font(Font.system(size: 9, weight: .semibold))
            }
            
            if isCurrent {
                Image(systemName: prayerIcon)
                    .font(Font.system(size: 12))
                    .widgetAccentable()
            } else {
                Image(systemName: prayerIcon)
                    .font(Font.system(size: 12))
            }
            
            if isCurrent {
                Text(prayer.time)
                    .font(Font.system(size: 8, weight: .medium))
                    .widgetAccentable()
            } else {
                Text(prayer.time)
                    .font(Font.system(size: 8, weight: .medium))
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 6)
        .padding(.horizontal, 4)
        .background(
            Group {
                if isCurrent {
                    RoundedRectangle(cornerRadius: 8)
                        .fill(Color.white.opacity(0.15))
                } else {
                    Color.clear
                }
            }
        )
    }
}

// MARK: - Inline View
struct LockScreenInlineView: View {
    let data: PrayerTimesData
    
    var body: some View {
        Group {
            if let nextPrayer = data.nextPrayer {
                Text("Next: \(nextPrayer.name) in \(data.countdown)")
                    .lineLimit(1)
            } else {
                Text("Prayer Times")
                    .lineLimit(1)
            }
        }
    }
}

// MARK: - Next Prayer Countdown View
struct NextPrayerCountdownView: View {
    let data: PrayerTimesData
    
    private func getCountdown() -> String {
        if !data.countdown.isEmpty && data.countdown.contains(":") {
            return data.countdown
        }
        
        if let nextPrayer = data.nextPrayer {
            let now = Date()
            let timeDiff = nextPrayer.dateObj.timeIntervalSince(now)
            
            if timeDiff > 0 {
                let hours = Int(timeDiff) / 3600
                let minutes = (Int(timeDiff) % 3600) / 60
                let seconds = Int(timeDiff) % 60
                return String(format: "%d:%02d:%02d", hours, minutes, seconds)
            }
        }
        
        return "0:00:00"
    }
    
    var body: some View {
        Group {
            if let nextPrayer = data.nextPrayer {
                HStack(spacing: 0) {
                    Text(nextPrayer.name)
                        .font(.system(size: 14, weight: .semibold))
                    Spacer()
                    Text(getCountdown())
                        .font(.system(size: 14, weight: .regular))
                        .foregroundColor(.secondary)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            } else {
                Text("No upcoming prayer")
                    .font(.system(size: 14))
                    .foregroundColor(.secondary)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
    }
}


// MARK: - Widget Configuration
struct LockScreenPrayerWidget: Widget {
    let kind: String = "LockScreenPrayerWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: LockScreenPrayerProvider()) { entry in
            if #available(iOS 17.0, *) {
                LockScreenPrayerWidgetEntryView(entry: entry)
                    .containerBackground(.clear, for: .widget)
            } else {
                LockScreenPrayerWidgetEntryView(entry: entry)
            }
        }
        .configurationDisplayName("Prayer Times")
        .description("View prayer times on your lock screen.")
        .supportedFamilies([.accessoryRectangular, .accessoryInline])
    }
}

// MARK: - Next Prayer Countdown Widget
struct NextPrayerCountdownWidget: Widget {
    let kind: String = "NextPrayerCountdownWidget"
    
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: LockScreenPrayerProvider()) { entry in
            if #available(iOS 17.0, *) {
                NextPrayerCountdownView(data: entry.data)
                    .containerBackground(.clear, for: .widget)
            } else {
                NextPrayerCountdownView(data: entry.data)
            }
        }
        .configurationDisplayName("Next Prayer")
        .description("View next prayer with countdown on your lock screen.")
        .supportedFamilies([.accessoryRectangular])
    }
}

// MARK: - Preview
#Preview("Lock Screen Prayer Widget", as: .accessoryRectangular) {
    LockScreenPrayerWidget()
} timeline: {
    let provider = LockScreenPrayerProvider()
    let sampleData = provider.getSampleData()
    SimpleEntry(date: Date(), data: sampleData)
}

#Preview("Next Prayer Countdown", as: .accessoryRectangular) {
    NextPrayerCountdownWidget()
} timeline: {
    let provider = LockScreenPrayerProvider()
    let sampleData = provider.getSampleData()
    SimpleEntry(date: Date(), data: sampleData)
}

