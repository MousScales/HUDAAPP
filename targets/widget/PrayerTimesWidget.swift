import WidgetKit
import SwiftUI
import UIKit

// MARK: - Data Models
// Note: PrayerTime, PrayerTimesData, and SimpleEntry are defined in PrayerWidgetModels.swift

// MARK: - Timeline Provider
struct Provider: TimelineProvider {
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
        
        // Update every minute for continuous countdown
        for minuteOffset in 0 ..< 60 {
            let entryDate = Calendar.current.date(byAdding: .minute, value: minuteOffset, to: currentDate)!
            let entry = SimpleEntry(date: entryDate, data: getPrayerTimesData())
            entries.append(entry)
        }

        let timeline = Timeline(entries: entries, policy: .atEnd)
        completion(timeline)
    }
    
    private func getPrayerTimesData() -> PrayerTimesData {
        // Try to get data from shared container
        if let data = getSharedPrayerTimes(), !data.prayerTimes.isEmpty {
            return data
        }
        
        // Fallback to sample data
        return getSampleData()
    }
    
    private func getSharedPrayerTimes() -> PrayerTimesData? {
        guard let userDefaults = UserDefaults(suiteName: "group.com.digaifounder.huda") else {
            return nil
        }
        
        // Try to get as data first (if stored as JSON string)
        if let jsonString = userDefaults.string(forKey: "prayer_times_widget"),
           let jsonData = jsonString.data(using: .utf8),
           let json = try? JSONSerialization.jsonObject(with: jsonData) as? [String: Any] {
                // Parse prayer times
                var prayers: [PrayerTime] = []
                if let prayerTimesArray = json["prayerTimes"] as? [[String: Any]] {
                    for prayerDict in prayerTimesArray {
                        if let id = prayerDict["id"] as? String,
                           let name = prayerDict["name"] as? String,
                           let time = prayerDict["time"] as? String {
                            // Try to parse date, fallback to current date if parsing fails
                            var dateObj = Date()
                            if let dateObjString = prayerDict["dateObj"] as? String {
                                if let parsedDate = ISO8601DateFormatter().date(from: dateObjString) {
                                    dateObj = parsedDate
                                }
                            }
                            let isNext = prayerDict["isNext"] as? Bool ?? false
                            let isCompleted = prayerDict["isCompleted"] as? Bool ?? false
                            prayers.append(PrayerTime(id: id, name: name, time: time, dateObj: dateObj, isNext: isNext, isCompleted: isCompleted))
                        }
                    }
                }
                
                // Parse next prayer
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
                
                // Parse current prayer
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
        
        // Fallback: try to get as data directly
        if let data = userDefaults.data(forKey: "prayer_times_widget"),
           let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
            // Same parsing logic as above
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
        
        return nil
    }
    
    func getSampleData() -> PrayerTimesData {
        let now = Date()
        let calendar = Calendar.current
        
        let prayers = [
            PrayerTime(id: "fajr", name: "Fajr", time: "5:30 AM", dateObj: calendar.date(bySettingHour: 5, minute: 30, second: 0, of: now) ?? now),
            PrayerTime(id: "dhuhr", name: "Dhuhr", time: "12:30 PM", dateObj: calendar.date(bySettingHour: 12, minute: 30, second: 0, of: now) ?? now, isNext: true),
            PrayerTime(id: "asr", name: "Asr", time: "3:45 PM", dateObj: calendar.date(bySettingHour: 15, minute: 45, second: 0, of: now) ?? now),
            PrayerTime(id: "maghrib", name: "Maghrib", time: "6:15 PM", dateObj: calendar.date(bySettingHour: 18, minute: 15, second: 0, of: now) ?? now),
            PrayerTime(id: "isha", name: "Isha", time: "7:45 PM", dateObj: calendar.date(bySettingHour: 19, minute: 45, second: 0, of: now) ?? now)
        ]
        
        return PrayerTimesData(
            prayerTimes: prayers,
            nextPrayer: prayers.first(where: { $0.isNext }),
            currentPrayer: nil,
            countdown: "2:45:30",
            hijriDate: "15 Dhul Hijjah 1445",
            cityName: "Mecca"
        )
    }
}

// MARK: - Widget Views
struct PrayerTimesWidgetEntryView : View {
    var entry: Provider.Entry
    @Environment(\.widgetFamily) var family

    var body: some View {
        switch family {
        case .systemMedium:
            MediumPrayerTimesView(data: entry.data)
        case .systemLarge:
            LargePrayerTimesView(data: entry.data, entryDate: entry.date)
        default:
            MediumPrayerTimesView(data: entry.data)
        }
    }
}

// MARK: - Small Widget View
struct SmallPrayerTimesView: View {
    let data: PrayerTimesData
    
    var body: some View {
        VStack(spacing: 8) {
            // Header
            HStack {
                Image(systemName: "moon.stars.fill")
                    .foregroundColor(.orange)
                    .font(.system(size: 16))
                Text("Prayer Times")
                    .font(.caption)
                    .fontWeight(.semibold)
                Spacer()
            }
            .padding(.horizontal, 12)
            .padding(.top, 8)
            
            // Next prayer with countdown
            if let nextPrayer = data.nextPrayer {
                VStack(spacing: 4) {
                    Text("Next Prayer")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                    
                    Text(nextPrayer.name)
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundColor(.orange)
                    
                    Text(nextPrayer.time)
                        .font(.caption)
                        .foregroundColor(.primary)
                    
                    Text(data.countdown)
                        .font(.caption2)
                        .foregroundColor(.secondary)
                        .padding(.top, 2)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 8)
                .background(Color.orange.opacity(0.1))
                .cornerRadius(8)
                .padding(.horizontal, 12)
            }
            
            Spacer()
            
            // Location and date
            VStack(spacing: 2) {
                Text(data.cityName)
                    .font(.caption2)
                    .foregroundColor(.secondary)
                Text(data.hijriDate)
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }
            .padding(.bottom, 8)
        }
        .containerBackground(.fill.tertiary, for: .widget)
    }
}

// MARK: - Medium Widget View
struct MediumPrayerTimesView: View {
    let data: PrayerTimesData
    @Environment(\.colorScheme) var colorScheme
    
    var body: some View {
        VStack(spacing: 0) {
            // Header with icon and next prayer info
            HStack {
                // App logo (switches based on color scheme - light mode uses black logo, dark mode uses normal logo)
                Image(colorScheme == .dark ? "logo-rounded" : "blacklogo-rounded")
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .frame(width: 20, height: 20)
                    .clipShape(Circle())
                
                Spacer()
                
                // Next prayer info on the right
                if let nextPrayer = data.nextPrayer {
                    HStack(spacing: 4) {
                        Text("Next Prayer")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                        Text("-")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                        Text(nextPrayer.name)
                            .font(.caption2)
                            .fontWeight(.medium)
                            .foregroundColor(.primary)
                        Text(nextPrayer.time)
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                }
            }
            .padding(.horizontal, 12)
            .padding(.top, 8)
            .padding(.bottom, 4)
            
            // All 5 prayer times in horizontal layout
            if data.prayerTimes.isEmpty {
                // Fallback if no data
                Text("Loading prayer times...")
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                HStack(spacing: 8) {
                    ForEach(data.prayerTimes, id: \.id) { prayer in
                        PrayerTimeCompactCard(
                            prayer: prayer,
                            isCurrent: data.currentPrayer?.id == prayer.id
                        )
                    }
                }
                .padding(.horizontal, 12)
                .padding(.bottom, 12)
            }
        }
        .containerBackground(.fill.tertiary, for: .widget)
    }
}

// MARK: - Large Widget View
struct LargePrayerTimesView: View {
    let data: PrayerTimesData
    let entryDate: Date
    @Environment(\.colorScheme) var colorScheme
    
    // Parse time string like "5:51 AM" or "11:51 AM" to Date
    private func parseTimeString(_ timeString: String, for date: Date) -> Date? {
        let calendar = Calendar.current
        let components = calendar.dateComponents([.year, .month, .day], from: date)
        
        // Parse time string (e.g., "5:51 AM" or "11:51 AM")
        let trimmed = timeString.trimmingCharacters(in: .whitespaces)
        let parts = trimmed.components(separatedBy: " ")
        
        guard parts.count >= 1 else { return nil }
        
        let timePart = parts[0] // "5:51" or "11:51"
        let period = parts.count > 1 ? parts[1].uppercased() : "" // "AM" or "PM"
        
        let timeComponents = timePart.components(separatedBy: ":")
        guard timeComponents.count >= 2,
              var hour = Int(timeComponents[0]),
              let minute = Int(timeComponents[1]) else {
            return nil
        }
        
        // Convert to 24-hour format
        if period == "PM" && hour != 12 {
            hour += 12
        } else if period == "AM" && hour == 12 {
            hour = 0
        }
        
        // Create date with today's date and parsed time
        var dateComponents = components
        dateComponents.hour = hour
        dateComponents.minute = minute
        dateComponents.second = 0
        
        return calendar.date(from: dateComponents)
    }
    
    // Find the next prayer time and calculate countdown
    private func getNextPrayerAndCountdown() -> (prayer: PrayerTime, countdown: String) {
        let calendar = Calendar.current
        let now = entryDate
        
        // Try to find the next prayer from all prayer times
        var nextPrayer: PrayerTime? = nil
        var minTimeDiff: TimeInterval = Double.greatestFiniteMagnitude
        
        // Check all prayer times to find the next one
        for prayer in data.prayerTimes {
            // Parse the time string to get today's prayer time
            var prayerDate: Date
            if let parsedDate = parseTimeString(prayer.time, for: now) {
                prayerDate = parsedDate
            } else {
                // If parsing fails, try using dateObj
                prayerDate = prayer.dateObj
            }
            
            // If the prayer time has passed today, use tomorrow's time
            if prayerDate < now {
                if let tomorrow = calendar.date(byAdding: .day, value: 1, to: prayerDate) {
                    prayerDate = tomorrow
                } else {
                    continue // Skip if we can't calculate tomorrow
                }
            }
            
            let timeDiff = prayerDate.timeIntervalSince(now)
            
            // If this prayer is in the future and closer than the current next prayer
            if timeDiff > 0 && timeDiff < minTimeDiff {
                minTimeDiff = timeDiff
                nextPrayer = PrayerTime(
                    id: prayer.id,
                    name: prayer.name,
                    time: prayer.time,
                    dateObj: prayerDate,
                    isNext: true,
                    isCompleted: false
                )
            }
        }
        
        // If we found a next prayer, calculate countdown
        if let next = nextPrayer {
            let timeDiff = next.dateObj.timeIntervalSince(now)
            if timeDiff > 0 {
                let hours = Int(timeDiff) / 3600
                let minutes = (Int(timeDiff) % 3600) / 60
                let seconds = Int(timeDiff) % 60
                let countdown = String(format: "%d:%02d:%02d", hours, minutes, seconds)
                return (next, countdown)
            }
        }
        
        // Fallback: use the stored nextPrayer if available
        if let storedNext = data.nextPrayer {
            // Try to parse the time string
            var prayerDate: Date?
            if let parsed = parseTimeString(storedNext.time, for: now) {
                prayerDate = parsed
            } else {
                prayerDate = storedNext.dateObj
            }
            
            if var date = prayerDate {
                if date < now {
                    if let tomorrow = calendar.date(byAdding: .day, value: 1, to: date) {
                        date = tomorrow
                    }
                }
                let timeDiff = date.timeIntervalSince(now)
                if timeDiff > 0 {
                    let hours = Int(timeDiff) / 3600
                    let minutes = (Int(timeDiff) % 3600) / 60
                    let seconds = Int(timeDiff) % 60
                    let countdown = String(format: "%d:%02d:%02d", hours, minutes, seconds)
                    return (storedNext, countdown)
                }
            }
        }
        
        // Last resort: return first prayer with default countdown
        if let firstPrayer = data.prayerTimes.first {
            return (firstPrayer, "0:00:00")
        }
        
        // Ultimate fallback
        return (PrayerTime(id: "unknown", name: "Unknown", time: "--:--", dateObj: now), "0:00:00")
    }
    
    var body: some View {
        VStack(spacing: 12) {
            // Header - Huda logo
            HStack {
                // Huda logo (switches based on color scheme - light mode uses black logo, dark mode uses normal logo)
                Image(colorScheme == .dark ? "logo-rounded" : "blacklogo-rounded")
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .frame(width: 32, height: 32)
                    .clipShape(Circle())
                
                Spacer()
            }
            .padding(.horizontal, 16)
            .padding(.top, 12)
            
            // All prayer times
            if data.prayerTimes.isEmpty {
                VStack {
                    Spacer()
                    Text("Loading prayer times...")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                    Spacer()
                }
            } else {
                VStack(spacing: 6) {
                    ForEach(data.prayerTimes, id: \.id) { prayer in
                        PrayerTimeRow(prayer: prayer)
                    }
                }
                .padding(.horizontal, 16)
            }
            
            Spacer()
            
            // Next prayer countdown - adapts to color scheme
            let (nextPrayer, countdownString) = getNextPrayerAndCountdown()
            
            // Determine colors based on color scheme
            let countdownTextColor: Color = colorScheme == .dark ? .white : .primary
            let countdownLabelColor: Color = colorScheme == .dark ? .white.opacity(0.8) : .secondary
            let countdownBackgroundColor: Color = colorScheme == .dark ? Color.white.opacity(0.2) : Color.gray.opacity(0.3)
            
            VStack(spacing: 4) {
                Text("Next Prayer")
                    .font(.caption)
                    .foregroundColor(countdownLabelColor)
                Text("\(nextPrayer.name) in \(countdownString)")
                    .font(.headline)
                    .fontWeight(.bold)
                    .foregroundColor(countdownTextColor)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 12)
            .background(countdownBackgroundColor)
            .cornerRadius(12)
            .padding(.horizontal, 16)
            .padding(.bottom, 12)
        }
        .containerBackground(.fill.tertiary, for: .widget)
    }
}

// MARK: - Supporting Views
struct PrayerTimeCompactCard: View {
    let prayer: PrayerTime
    let isCurrent: Bool
    @Environment(\.colorScheme) var colorScheme
    
    // Get prayer abbreviation
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
    
    // Get icon for prayer time
    private var prayerIcon: String {
        switch prayer.id.lowercased() {
        case "fajr": return "sunrise.fill" // Sunrise
        case "dhuhr", "zuhr": return "sun.max.fill" // Sun at peak
        case "asr": return "sun.horizon.fill" // Afternoon sun
        case "maghrib": return "sunset.fill" // Sunset
        case "isha": return "moon.stars.fill" // Moon and stars
        default: return "clock.fill"
        }
    }
    
    var body: some View {
        // Determine colors based on color scheme
        let currentTextColor: Color = colorScheme == .dark ? .white : .primary
        let currentBackgroundColor: Color = colorScheme == .dark ? Color.white.opacity(0.2) : Color.gray.opacity(0.3)
        
        return VStack(spacing: 4) {
            // Letter indicator for current prayer (shown above name)
            if isCurrent {
                Text("•")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(currentTextColor)
                    .padding(.bottom, -4)
            }
            
            // Prayer abbreviation
            Text(abbreviation)
                .font(.system(size: 10, weight: .semibold))
                .foregroundColor(isCurrent ? currentTextColor : .primary)
                .padding(.top, isCurrent ? 0 : 2)
            
            // Icon for time of day with arrow indicator
            ZStack {
                Image(systemName: prayerIcon)
                    .font(.system(size: 18))
                    .foregroundColor(isCurrent ? currentTextColor : .primary)
                
                // Add arrow for sunrise/sunset
                if prayer.id.lowercased() == "fajr" {
                    Image(systemName: "arrow.up")
                        .font(.system(size: 8))
                        .foregroundColor(isCurrent ? currentTextColor : .primary)
                        .offset(y: -12)
                } else if prayer.id.lowercased() == "maghrib" {
                    Image(systemName: "arrow.down")
                        .font(.system(size: 8))
                        .foregroundColor(isCurrent ? currentTextColor : .primary)
                        .offset(y: -12)
                }
            }
            .frame(height: 20)
            .padding(.vertical, 2)
            
            // Prayer time - smaller font to prevent wrapping
            Text(prayer.time)
                .font(.system(size: 8, weight: .medium))
                .foregroundColor(isCurrent ? currentTextColor : .primary)
                .lineLimit(1)
                .minimumScaleFactor(0.8)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 10)
        .padding(.horizontal, 6)
        .background(
            Group {
                if isCurrent {
                    RoundedRectangle(cornerRadius: 10)
                        .fill(currentBackgroundColor)
                } else {
                    Color.clear
                }
            }
        )
    }
}

struct PrayerTimeCard: View {
    let prayer: PrayerTime
    
    var body: some View {
        VStack(spacing: 4) {
            Text(prayer.name)
                .font(.caption)
                .fontWeight(prayer.isNext ? .bold : .medium)
                .foregroundColor(prayer.isNext ? .orange : .primary)
            
            Text(prayer.time)
                .font(.caption)
                .fontWeight(prayer.isNext ? .bold : .medium)
                .foregroundColor(prayer.isNext ? .orange : .secondary)
            
            if prayer.isCompleted {
                Image(systemName: "checkmark.circle.fill")
                    .foregroundColor(.green)
                    .font(.caption)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 8)
        .background(prayer.isNext ? Color.orange.opacity(0.1) : Color.clear)
        .cornerRadius(6)
    }
}

struct PrayerTimeRow: View {
    let prayer: PrayerTime
    
    var body: some View {
        HStack {
            Text(prayer.name)
                .font(.body)
                .fontWeight(prayer.isNext ? .bold : .medium)
                .foregroundColor(.primary)
            
            Spacer()
            
            Text(prayer.time)
                .font(.body)
                .fontWeight(prayer.isNext ? .bold : .medium)
                .foregroundColor(prayer.isNext ? .primary : .secondary)
            
            if prayer.isCompleted {
                Image(systemName: "checkmark.circle.fill")
                    .foregroundColor(.green)
                    .font(.caption)
            }
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(prayer.isNext ? Color.white.opacity(0.15) : Color.clear)
        .cornerRadius(8)
    }
}

// MARK: - Widget Configuration
struct PrayerTimesWidget: Widget {
    let kind: String = "PrayerTimesWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            PrayerTimesWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Prayer Times")
        .description("View your daily prayer times and countdown to next prayer.")
        .supportedFamilies([.systemMedium, .systemLarge])
    }
}

// MARK: - Preview
#Preview(as: .systemMedium) {
    PrayerTimesWidget()
} timeline: {
    let provider = Provider()
    SimpleEntry(date: Date(), data: provider.getSampleData())
}

#Preview(as: .systemLarge) {
    PrayerTimesWidget()
} timeline: {
    let provider = Provider()
    SimpleEntry(date: Date(), data: provider.getSampleData())
}

