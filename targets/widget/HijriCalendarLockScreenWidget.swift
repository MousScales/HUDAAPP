import WidgetKit
import SwiftUI

// MARK: - Hijri Date Converter
struct HijriDateConverter {
    // Convert Gregorian date to Hijri date using standard algorithm
    static func toHijri(year: Int, month: Int, day: Int) -> (hy: Int, hm: Int, hd: Int) {
        let jd = gregorianToJulian(year: year, month: month, day: day)
        return julianToHijri(julianDay: jd)
    }
    
    // Convert Gregorian to Julian Day Number
    private static func gregorianToJulian(year: Int, month: Int, day: Int) -> Int {
        let a = (14 - month) / 12
        let y = year + 4800 - a
        let m = month + 12 * a - 3
        return day + (153 * m + 2) / 5 + 365 * y + y / 4 - y / 100 + y / 400 - 32045
    }
    
    // Convert Julian Day Number to Hijri (Islamic Calendar)
    // Note: This is a fallback calculation. The widget should primarily use
    // the date from UserDefaults which is calculated by hijri-converter in the app.
    private static func julianToHijri(julianDay: Int) -> (hy: Int, hm: Int, hd: Int) {
        // Julian day for 16 July 622 CE (start of Hijri calendar)
        let hijriEpoch = 1948439
        let daysSinceEpoch = julianDay - hijriEpoch
        
        // Calculate Hijri year
        let hy = Int((Double(daysSinceEpoch) * 30.0 + 10646.0) / 10631.0) + 1
        
        // Calculate remaining days in the year
        let yearStart = Int((Double(hy - 1) * 10631.0) / 30.0)
        let dayOfYear = daysSinceEpoch - yearStart
        
        // Calculate Hijri month
        let hm = Int((Double(dayOfYear) * 11.0 + 330.0) / 325.0) + 1
        
        // Calculate Hijri day
        let monthStart = Int((Double(hm - 1) * 325.0) / 11.0)
        let hd = dayOfYear - monthStart + 1
        
        // Ensure valid ranges
        let finalHy = max(1, min(hy, 1500))
        let finalHm = max(1, min(hm, 12))
        let finalHd = max(1, min(hd, 30))
        
        return (hy: finalHy, hm: finalHm, hd: finalHd)
    }
    
    // Get Hijri month name
    static func getHijriMonthName(_ month: Int) -> String {
        let months = [
            "Muharram", "Safar", "Rabi al-Awwal", "Rabi al-Thani",
            "Jumada al-Awwal", "Jumada al-Thani", "Rajab", "Shaban",
            "Ramadan", "Shawwal", "Dhu al-Qadah", "Dhu al-Hijjah"
        ]
        guard month >= 1 && month <= 12 else { return "" }
        return months[month - 1]
    }
}

// MARK: - Timeline Provider
struct HijriCalendarProvider: TimelineProvider {
    typealias Entry = HijriCalendarEntry
    
    func placeholder(in context: Context) -> HijriCalendarEntry {
        HijriCalendarEntry(date: Date(), hijriDate: "15 Ramadan 1445")
    }

    func getSnapshot(in context: Context, completion: @escaping (HijriCalendarEntry) -> ()) {
        let entry = HijriCalendarEntry(date: Date(), hijriDate: getHijriDate())
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<HijriCalendarEntry>) -> ()) {
        var entries: [HijriCalendarEntry] = []
        let currentDate = Date()
        let calendar = Calendar.current
        
        // Get the current Hijri date from UserDefaults (source of truth from the app)
        // This uses hijri-converter which is more accurate than our Swift calculation
        let currentHijriDate = getHijriDate()
        
        // For today, ALWAYS use the date from UserDefaults (calculated by hijri-converter in the app)
        let todayEntry = HijriCalendarEntry(date: currentDate, hijriDate: currentHijriDate)
        entries.append(todayEntry)
        
        // For future dates, calculate based on today's date
        for dayOffset in 1..<7 {
            if let entryDate = calendar.date(byAdding: .day, value: dayOffset, to: currentDate) {
                let components = calendar.dateComponents([.year, .month, .day], from: entryDate)
                if let year = components.year, let month = components.month, let day = components.day {
                    let hijriDate = calculateHijriDate(year: year, month: month, day: day)
                    let entry = HijriCalendarEntry(date: entryDate, hijriDate: hijriDate)
                    entries.append(entry)
                }
            }
        }

        // Refresh more frequently (every hour) to get updated date from UserDefaults
        // This ensures the widget stays in sync with the app
        if let nextHour = calendar.date(byAdding: .hour, value: 1, to: currentDate) {
            let timeline = Timeline(entries: entries, policy: .after(nextHour))
            completion(timeline)
        } else {
            let timeline = Timeline(entries: entries, policy: .atEnd)
            completion(timeline)
        }
    }
    
    private func getHijriDate() -> String {
        // ALWAYS try to get from UserDefaults first (this is the source of truth from the app)
        // The app uses hijri-converter npm package which is more accurate
        if let userDefaults = UserDefaults(suiteName: "group.com.digaifounder.huda"),
           let jsonString = userDefaults.string(forKey: "prayer_times_widget"),
           let jsonData = jsonString.data(using: .utf8),
           let json = try? JSONSerialization.jsonObject(with: jsonData) as? [String: Any],
           let hijriDate = json["hijriDate"] as? String, !hijriDate.isEmpty {
            // Use the date from the app (calculated by hijri-converter)
            return hijriDate
        }
        
        // Only calculate if UserDefaults is not available (should rarely happen)
        // This is a fallback for when the app hasn't run yet
        let now = Date()
        let calendar = Calendar.current
        let components = calendar.dateComponents([.year, .month, .day], from: now)
        if let year = components.year, let month = components.month, let day = components.day {
            return calculateHijriDate(year: year, month: month, day: day)
        }
        
        return "15 Ramadan 1445" // Fallback
    }
    
    private func calculateHijriDate(year: Int, month: Int, day: Int) -> String {
        let hijri = HijriDateConverter.toHijri(year: year, month: month, day: day)
        let monthName = HijriDateConverter.getHijriMonthName(hijri.hm)
        return "\(hijri.hd) \(monthName) \(hijri.hy)"
    }
}

// MARK: - Entry
struct HijriCalendarEntry: TimelineEntry {
    let date: Date
    let hijriDate: String
}

// MARK: - Widget Entry View
struct HijriCalendarLockScreenWidgetEntryView: View {
    var entry: HijriCalendarProvider.Entry
    @Environment(\.widgetFamily) var family

    var body: some View {
        Group {
            switch family {
            case .accessoryInline:
                HijriCalendarInlineView(hijriDate: entry.hijriDate)
            case .accessoryRectangular:
                HijriCalendarRectangularView(hijriDate: entry.hijriDate)
            default:
                HijriCalendarInlineView(hijriDate: entry.hijriDate)
            }
        }
    }
}

// MARK: - Inline View (compact, next to date)
struct HijriCalendarInlineView: View {
    let hijriDate: String
    
    private var compactDate: String {
        // Show full date including year (e.g., "15 Ramadan 1445")
        // The format from the app is typically "Day Month Year H" or "Day Month Year"
        let parts = hijriDate.components(separatedBy: " ")
        if parts.count >= 3 {
            // Show "Day Month Year" format (e.g., "15 Ramadan 1445")
            // Skip the "H" if present at the end
            let yearPart = parts[2].replacingOccurrences(of: "H", with: "").trimmingCharacters(in: .whitespaces)
            return "\(parts[0]) \(parts[1]) \(yearPart)"
        } else if parts.count >= 2 {
            // Fallback: show "Day Month" if year is missing
            return "\(parts[0]) \(parts[1])"
        } else {
            return hijriDate
        }
    }
    
    var body: some View {
        Text(compactDate)
            .lineLimit(1)
    }
}

// MARK: - Rectangular View (full date)
struct HijriCalendarRectangularView: View {
    let hijriDate: String
    
    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text("Hijri")
                .font(.system(size: 10, weight: .medium))
                .foregroundColor(.secondary)
            Text(hijriDate)
                .font(.system(size: 14, weight: .semibold))
                .lineLimit(2)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

// MARK: - Widget Configuration
struct HijriCalendarLockScreenWidget: Widget {
    let kind: String = "HijriCalendarLockScreenWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: HijriCalendarProvider()) { entry in
            if #available(iOS 17.0, *) {
                HijriCalendarLockScreenWidgetEntryView(entry: entry)
                    .containerBackground(.clear, for: .widget)
            } else {
                HijriCalendarLockScreenWidgetEntryView(entry: entry)
            }
        }
        .configurationDisplayName("Hijri Calendar")
        .description("Display the current Hijri (Islamic) calendar date on your lock screen.")
        .supportedFamilies([.accessoryInline, .accessoryRectangular])
    }
}

// MARK: - Preview
#Preview("Hijri Calendar Inline", as: .accessoryInline) {
    HijriCalendarLockScreenWidget()
} timeline: {
    HijriCalendarEntry(date: Date(), hijriDate: "15 Ramadan 1445")
}

#Preview("Hijri Calendar Rectangular", as: .accessoryRectangular) {
    HijriCalendarLockScreenWidget()
} timeline: {
    HijriCalendarEntry(date: Date(), hijriDate: "15 Ramadan 1445")
}

