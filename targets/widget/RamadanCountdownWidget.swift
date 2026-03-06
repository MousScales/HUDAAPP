import WidgetKit
import SwiftUI

// MARK: - Data Models
struct RamadanCountdownData {
    let daysRemaining: Int
    let totalDays: Int
    let isDuringRamadan: Bool
    let targetDate: Date
    let year: Int
}

// MARK: - Timeline Provider
struct RamadanCountdownProvider: TimelineProvider {
    typealias Entry = RamadanCountdownEntry
    
    func placeholder(in context: Context) -> RamadanCountdownEntry {
        RamadanCountdownEntry(date: Date(), data: getSampleData())
    }

    func getSnapshot(in context: Context, completion: @escaping (RamadanCountdownEntry) -> ()) {
        let data = getCountdownData()
        let entry = RamadanCountdownEntry(date: Date(), data: data)
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> ()) {
        var entries: [RamadanCountdownEntry] = []
        let currentDate = Date()
        
        // Update once per day at midnight
        let calendar = Calendar.current
        let tomorrow = calendar.startOfDay(for: calendar.date(byAdding: .day, value: 1, to: currentDate)!)
        
        let entry = RamadanCountdownEntry(date: currentDate, data: getCountdownData())
        entries.append(entry)
        
        // Add tomorrow's entry
        let tomorrowEntry = RamadanCountdownEntry(date: tomorrow, data: getCountdownData())
        entries.append(tomorrowEntry)

        let timeline = Timeline(entries: entries, policy: .after(tomorrow))
        completion(timeline)
    }
    
    // Get subscription status that was verified by the app via Apple's servers
    func getSubscriptionStatus() -> Bool {
        guard let userDefaults = UserDefaults(suiteName: "group.com.digaifounder.huda") else {
            return false
        }

        if let jsonString = userDefaults.string(forKey: "subscription_status_widget"),
           let jsonData = jsonString.data(using: .utf8),
           let json = try? JSONSerialization.jsonObject(with: jsonData) as? [String: Any] {
            if let verifiedBy = json["verifiedBy"] as? String, verifiedBy == "apple" {
                return json["isSubscribed"] as? Bool ?? false
            }
            return json["isSubscribed"] as? Bool ?? false
        }

        return false
    }
    
    private func getCountdownData() -> RamadanCountdownData {
        let calendar = Calendar.current
        let today = calendar.startOfDay(for: Date())
        let currentYear = calendar.component(.year, from: today)
        
        // Ramadan dates (approximate, should match ProfileScreen.js)
        let ramadanDates: [Int: (start: Date, end: Date)] = [
            2024: (start: calendar.date(from: DateComponents(year: 2024, month: 3, day: 11))!,
                   end: calendar.date(from: DateComponents(year: 2024, month: 4, day: 9))!),
            2025: (start: calendar.date(from: DateComponents(year: 2025, month: 2, day: 28))!,
                   end: calendar.date(from: DateComponents(year: 2025, month: 3, day: 29))!),
            2026: (start: calendar.date(from: DateComponents(year: 2026, month: 2, day: 17))!,
                   end: calendar.date(from: DateComponents(year: 2026, month: 3, day: 18))!),
            2027: (start: calendar.date(from: DateComponents(year: 2027, month: 2, day: 6))!,
                   end: calendar.date(from: DateComponents(year: 2027, month: 3, day: 7))!),
            2028: (start: calendar.date(from: DateComponents(year: 2028, month: 1, day: 26))!,
                   end: calendar.date(from: DateComponents(year: 2028, month: 2, day: 24))!)
        ]
        
        // Find current or next Ramadan
        var targetStart: Date?
        var targetEnd: Date?
        var targetYear = currentYear
        
        // Check if we're currently in Ramadan
        for year in currentYear...currentYear+1 {
            if let dates = ramadanDates[year] {
                if today >= dates.start && today <= dates.end {
                    // We're in Ramadan - countdown to end
                    targetStart = dates.start
                    targetEnd = dates.end
                    targetYear = year
                    break
                } else if today < dates.start {
                    // Ramadan hasn't started yet - countdown to start
                    targetStart = dates.start
                    targetEnd = dates.end
                    targetYear = year
                    break
                } else if today > dates.end {
                    // This Ramadan has passed, continue to next year
                    continue
                }
            }
        }
        
        // If no Ramadan found (we're after all known Ramadans), use next available
        if targetStart == nil {
            for year in currentYear+1...currentYear+3 {
                if let dates = ramadanDates[year] {
                    targetStart = dates.start
                    targetEnd = dates.end
                    targetYear = year
                    break
                }
            }
        }
        
        guard let start = targetStart, let end = targetEnd else {
            // Fallback to 2025
            let fallbackStart = calendar.date(from: DateComponents(year: 2025, month: 2, day: 28))!
            let fallbackEnd = calendar.date(from: DateComponents(year: 2025, month: 3, day: 29))!
            let isDuring = today >= fallbackStart && today <= fallbackEnd
            let targetDate = isDuring ? fallbackEnd : fallbackStart
            
            let daysRemaining: Int
            let totalDays: Int
            
            if isDuring {
                daysRemaining = max(0, calendar.dateComponents([.day], from: today, to: fallbackEnd).day ?? 0)
                totalDays = max(1, calendar.dateComponents([.day], from: fallbackStart, to: fallbackEnd).day ?? 30) + 1
            } else {
                daysRemaining = max(0, calendar.dateComponents([.day], from: today, to: targetDate).day ?? 0)
                totalDays = 365
            }
            
            return RamadanCountdownData(
                daysRemaining: daysRemaining,
                totalDays: totalDays,
                isDuringRamadan: isDuring,
                targetDate: targetDate,
                year: 2025
            )
        }
        
        let isDuringRamadan = today >= start && today <= end
        let targetDate = isDuringRamadan ? end : start
        
        // If during Ramadan, count days in Ramadan. Otherwise, count days until next Ramadan (365 days)
        let daysRemaining: Int
        let totalDays: Int
        
        if isDuringRamadan {
            // During Ramadan: show days remaining in Ramadan (typically 30 days)
            daysRemaining = max(0, calendar.dateComponents([.day], from: today, to: end).day ?? 0)
            totalDays = max(1, calendar.dateComponents([.day], from: start, to: end).day ?? 30) + 1 // +1 to include both start and end
        } else {
            // Before or after Ramadan: show 365 days until next Ramadan
            daysRemaining = max(0, calendar.dateComponents([.day], from: today, to: targetDate).day ?? 0)
            totalDays = 365
        }
        
        return RamadanCountdownData(
            daysRemaining: daysRemaining,
            totalDays: totalDays,
            isDuringRamadan: isDuringRamadan,
            targetDate: targetDate,
            year: targetYear
        )
    }
    
    func getSampleData() -> RamadanCountdownData {
        return RamadanCountdownData(
            daysRemaining: 15,
            totalDays: 30,
            isDuringRamadan: false,
            targetDate: Date(),
            year: 2025
        )
    }
}

// MARK: - Timeline Entry
struct RamadanCountdownEntry: TimelineEntry {
    let date: Date
    let data: RamadanCountdownData
}

// MARK: - Widget Views
struct RamadanCountdownWidgetEntryView : View {
    var entry: RamadanCountdownProvider.Entry
    @Environment(\.widgetFamily) var family

    var body: some View {
        let provider = RamadanCountdownProvider()
        let isSubscribed = provider.getSubscriptionStatus()

        if !isSubscribed {
            RamadanSubscriptionRequiredView()
        } else {
        switch family {
        case .systemSmall:
            SmallRamadanCountdownView(data: entry.data)
        case .systemLarge:
            LargeRamadanCountdownView(data: entry.data)
        default:
            LargeRamadanCountdownView(data: entry.data)
        }
        }
    }
}

// MARK: - Small Widget View
struct SmallRamadanCountdownView: View {
    let data: RamadanCountdownData
    @Environment(\.colorScheme) var colorScheme
    
    private let gridSize = 20 // 20x20 = 400 dots (we'll show 365)
    private let dotSize: CGFloat = 2.5
    private let spacing: CGFloat = 2.0
    
    var body: some View {
        VStack(spacing: 0) {
            // Huda logo (top left)
            HStack {
                Image("logo-rounded")
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .frame(width: 16, height: 16)
                    .clipShape(Circle())
                Spacer()
            }
            .padding(.top, 4)
            .padding(.leading, 8)
            
            // Dot grid - white dots represent days remaining (fill from bottom-left)
            // Always show exactly 365 dots (20x20 = 400, so last row has 5 dots hanging off)
            let totalDots = 365
            let gridColumns = 20
            let daysRemaining = min(data.daysRemaining, totalDots)
            
            GeometryReader { geometry in
                let availableWidth = geometry.size.width - 24
                let availableHeight = geometry.size.height - 50
                
                // Calculate spacing
                let calculatedSpacing = min(spacing, (availableWidth - CGFloat(gridColumns) * dotSize) / CGFloat(gridColumns - 1))
                
                // Center the grid horizontally, with incomplete row hanging off bottom-left
                let gridWidth = CGFloat(gridColumns) * dotSize + CGFloat(gridColumns - 1) * calculatedSpacing
                
                HStack {
                    Spacer()
                    VStack {
                        LazyVGrid(columns: Array(repeating: GridItem(.fixed(dotSize), spacing: calculatedSpacing), count: gridColumns), spacing: calculatedSpacing) {
                            ForEach(0..<totalDots, id: \.self) { index in
                                // Reverse index so dots fill from bottom-left
                                let reversedIndex = totalDots - 1 - index
                                Circle()
                                    .fill(reversedIndex < daysRemaining ? 
                                          Color.white : 
                                          Color.gray.opacity(0.3))
                                    .frame(width: dotSize, height: dotSize)
                            }
                        }
                        .frame(width: gridWidth, alignment: .leading)
                        Spacer()
                    }
                    Spacer()
                }
            }
            .padding(.horizontal, 12)
            .padding(.top, 0)
            .padding(.bottom, 4)
            
            // Text at bottom
            Text(data.isDuringRamadan ? 
                 "\(data.daysRemaining) days till end of ramadan" : 
                 "\(data.daysRemaining) days left till ramadan")
                .font(.system(size: 9, weight: .regular))
                .foregroundColor(.white.opacity(0.9))
                .multilineTextAlignment(.center)
                .padding(.top, 4)
                .padding(.bottom, 10)
        }
        .containerBackground(.clear, for: .widget)
    }
}

// MARK: - Large Widget View
struct LargeRamadanCountdownView: View {
    let data: RamadanCountdownData
    @Environment(\.colorScheme) var colorScheme
    
    private let gridSize = 20 // 20x20 = 400 dots for large square widget
    private let dotSize: CGFloat = 6
    private let spacing: CGFloat = 4
    
    var body: some View {
        VStack(spacing: 0) {
            // Huda logo (top left)
            HStack {
                Image("logo-rounded")
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .frame(width: 24, height: 24)
                    .clipShape(Circle())
                Spacer()
            }
            .padding(.top, 10)
            .padding(.leading, 14)
            
            Spacer()
            
            // Dot grid - white dots represent days remaining (fill from bottom-left)
            // Always show exactly 365 dots (20x20 = 400, so last row has 5 dots hanging off)
            let totalDots = 365
            let gridColumns = 20
            let daysRemaining = min(data.daysRemaining, totalDots)
            
            GeometryReader { geometry in
                let availableWidth = geometry.size.width - 28
                let availableHeight = geometry.size.height - 50
                
                // Calculate spacing
                let calculatedSpacing = min(spacing, (availableWidth - CGFloat(gridColumns) * dotSize) / CGFloat(gridColumns - 1))
                
                // Center the grid horizontally, with incomplete row hanging off bottom-left
                let gridWidth = CGFloat(gridColumns) * dotSize + CGFloat(gridColumns - 1) * calculatedSpacing
                
                HStack {
                    Spacer()
                    VStack {
                        Spacer()
                        LazyVGrid(columns: Array(repeating: GridItem(.fixed(dotSize), spacing: calculatedSpacing), count: gridColumns), spacing: calculatedSpacing) {
                            ForEach(0..<totalDots, id: \.self) { index in
                                // Reverse index so dots fill from bottom-left
                                let reversedIndex = totalDots - 1 - index
                                Circle()
                                    .fill(reversedIndex < daysRemaining ? 
                                          Color.white : 
                                          Color.gray.opacity(0.3))
                                    .frame(width: dotSize, height: dotSize)
                            }
                        }
                        .frame(width: gridWidth, alignment: .leading)
                        Spacer()
                    }
                    Spacer()
                }
            }
            .padding(.horizontal, 14)
            .padding(.bottom, 10)
            
            // Text at bottom
            Text(data.isDuringRamadan ? 
                 "\(data.daysRemaining) days till end of ramadan" : 
                 "\(data.daysRemaining) days left till ramadan")
                .font(.system(size: 12, weight: .regular))
                .foregroundColor(.white.opacity(0.9))
                .multilineTextAlignment(.center)
                .padding(.bottom, 14)
        }
        .containerBackground(.clear, for: .widget)
    }
}

// MARK: - Widget Configuration
struct RamadanCountdownWidget: Widget {
    let kind: String = "RamadanCountdownWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: RamadanCountdownProvider()) { entry in
            RamadanCountdownWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Ramadan Countdown")
        .description("Countdown to Ramadan with a visual dot grid.")
        .supportedFamilies([.systemSmall, .systemLarge])
    }
}

// MARK: - Subscription Required Views
fileprivate struct RamadanSubscriptionRequiredView: View {
    var body: some View {
        VStack(spacing: 4) {
            Spacer()
            Text("Huda Premium Feature")
                .font(.headline)
                .foregroundColor(.secondary)
            Text("Subscribe to see the Ramadan countdown")
                .font(.subheadline)
                .foregroundColor(.secondary)
            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .containerBackground(.fill.tertiary, for: .widget)
    }
}

