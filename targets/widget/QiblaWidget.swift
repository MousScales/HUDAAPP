import WidgetKit
import SwiftUI
import CoreLocation

// MARK: - Data Models
struct QiblaData: Codable {
    let qiblaDirection: Double
    let heading: Double
    let locationName: String
    let isFacingQibla: Bool
    let instruction: String
}

// MARK: - Timeline Provider
struct QiblaProvider: TimelineProvider {
    func placeholder(in context: Context) -> QiblaEntry {
        QiblaEntry(date: Date(), data: getSampleData())
    }

    func getSnapshot(in context: Context, completion: @escaping (QiblaEntry) -> ()) {
        let entry = QiblaEntry(date: Date(), data: getQiblaData())
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> ()) {
        var entries: [QiblaEntry] = []
        let currentDate = Date()
        
        // Update every minute for accurate direction
        for minuteOffset in 0 ..< 60 {
            let entryDate = Calendar.current.date(byAdding: .minute, value: minuteOffset, to: currentDate)!
            let entry = QiblaEntry(date: entryDate, data: getQiblaData())
            entries.append(entry)
        }

        let timeline = Timeline(entries: entries, policy: .atEnd)
        completion(timeline)
    }
    
    private func getQiblaData() -> QiblaData {
        // Try to get data from shared container
        if let data = getSharedQiblaData() {
            return data
        }
        
        // Fallback to sample data
        return getSampleData()
    }
    
    private func getSharedQiblaData() -> QiblaData? {
        guard let userDefaults = UserDefaults(suiteName: "group.com.digaifounder.huda") else {
            return nil
        }
        
        if let jsonString = userDefaults.string(forKey: "qibla_widget"),
           let jsonData = jsonString.data(using: .utf8),
           let json = try? JSONSerialization.jsonObject(with: jsonData) as? [String: Any] {
            
            let qiblaDirection = json["qiblaDirection"] as? Double ?? 0.0
            let heading = json["heading"] as? Double ?? 0.0
            let locationName = json["locationName"] as? String ?? "Unknown"
            let isFacingQibla = json["isFacingQibla"] as? Bool ?? false
            let instruction = json["instruction"] as? String ?? "Finding Qibla..."
            
            return QiblaData(
                qiblaDirection: qiblaDirection,
                heading: heading,
                locationName: locationName,
                isFacingQibla: isFacingQibla,
                instruction: instruction
            )
        }
        
        return nil
    }
    
    func getSampleData() -> QiblaData {
        return QiblaData(
            qiblaDirection: 120.0,
            heading: 0.0,
            locationName: "Mecca",
            isFacingQibla: false,
            instruction: "Turn right"
        )
    }
}

// MARK: - Timeline Entry
struct QiblaEntry: TimelineEntry {
    let date: Date
    let data: QiblaData
}

// MARK: - Widget Views
struct QiblaWidgetEntryView : View {
    var entry: QiblaProvider.Entry
    @Environment(\.widgetFamily) var family

    var body: some View {
        switch family {
        case .systemSmall:
            SmallQiblaView(data: entry.data)
        case .systemMedium:
            MediumQiblaView(data: entry.data)
        case .systemLarge:
            LargeQiblaView(data: entry.data)
        default:
            SmallQiblaView(data: entry.data)
        }
    }
}

// MARK: - Small Widget View
struct SmallQiblaView: View {
    let data: QiblaData
    
    // Calculate rotation like QiblaScreen: (360 - heading) + qiblaDirection
    private var kaabaRotation: Double {
        return (360 - data.heading) + data.qiblaDirection
    }
    
    var body: some View {
        VStack(spacing: 6) {
            // Location name at top
            Text(data.locationName)
                .font(.caption)
                .fontWeight(.semibold)
                .foregroundColor(.primary)
                .lineLimit(1)
                .padding(.horizontal, 8)
                .padding(.top, 8)
            
            // Compass circle with Kaaba pointer
            ZStack {
                // Outer circle (compass border)
                Circle()
                    .stroke(data.isFacingQibla ? Color.white : Color.blue.opacity(0.5), lineWidth: 4)
                    .frame(width: 90, height: 90)
                
                // North pointer (compass needle pointing up)
                Rectangle()
                    .fill(data.isFacingQibla ? Color.white : Color.blue.opacity(0.5))
                    .frame(width: 3, height: 25)
                    .offset(y: -32)
                
                // Kaaba pointer (rotates to show Qibla direction)
                Image(systemName: "location.fill")
                    .foregroundColor(data.isFacingQibla ? Color.white : Color.orange)
                    .font(.system(size: 18))
                    .rotationEffect(.degrees(kaabaRotation))
                    .offset(y: -32)
            }
            
            // Instruction text at bottom
            Text(data.instruction)
                .font(.caption2)
                .fontWeight(.medium)
                .foregroundColor(data.isFacingQibla ? .green : .primary)
                .lineLimit(2)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 8)
                .padding(.bottom, 8)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .containerBackground(.fill.tertiary, for: .widget)
    }
}

// MARK: - Medium Widget View
struct MediumQiblaView: View {
    let data: QiblaData
    
    // Calculate rotation like QiblaScreen: (360 - heading) + qiblaDirection
    private var kaabaRotation: Double {
        return (360 - data.heading) + data.qiblaDirection
    }
    
    var body: some View {
        HStack(spacing: 16) {
            // Compass circle with Kaaba pointer
            ZStack {
                // Outer circle (compass border)
                Circle()
                    .stroke(data.isFacingQibla ? Color.white : Color.blue.opacity(0.5), lineWidth: 6)
                    .frame(width: 140, height: 140)
                
                // North pointer (compass needle pointing up)
                Rectangle()
                    .fill(data.isFacingQibla ? Color.white : Color.blue.opacity(0.5))
                    .frame(width: 4, height: 35)
                    .offset(y: -50)
                
                // Kaaba pointer (rotates to show Qibla direction)
                Image(systemName: "location.fill")
                    .foregroundColor(data.isFacingQibla ? Color.white : Color.orange)
                    .font(.system(size: 28))
                    .rotationEffect(.degrees(kaabaRotation))
                    .offset(y: -50)
            }
            
            // Info section
            VStack(alignment: .leading, spacing: 10) {
                // Location
                Text(data.locationName)
                    .font(.headline)
                    .fontWeight(.bold)
                    .foregroundColor(.primary)
                
                // Instruction
                Text(data.instruction)
                    .font(.body)
                    .foregroundColor(data.isFacingQibla ? .green : .primary)
                    .fontWeight(.semibold)
                    .lineLimit(3)
                    .multilineTextAlignment(.leading)
            }
            
            Spacer()
        }
        .padding(16)
        .containerBackground(.fill.tertiary, for: .widget)
    }
}

// MARK: - Large Widget View
struct LargeQiblaView: View {
    let data: QiblaData
    
    // Calculate rotation like QiblaScreen: (360 - heading) + qiblaDirection
    private var kaabaRotation: Double {
        return (360 - data.heading) + data.qiblaDirection
    }
    
    var body: some View {
        VStack(spacing: 20) {
            // Location header
            Text(data.locationName)
                .font(.title2)
                .fontWeight(.bold)
                .foregroundColor(.primary)
                .padding(.top, 16)
            
            // Large compass circle with Kaaba pointer
            ZStack {
                // Outer circle (compass border)
                Circle()
                    .stroke(data.isFacingQibla ? Color.white : Color.blue.opacity(0.5), lineWidth: 8)
                    .frame(width: 200, height: 200)
                
                // North pointer (compass needle pointing up)
                Rectangle()
                    .fill(data.isFacingQibla ? Color.white : Color.blue.opacity(0.5))
                    .frame(width: 5, height: 45)
                    .offset(y: -80)
                
                // Kaaba pointer (rotates to show Qibla direction)
                Image(systemName: "location.fill")
                    .foregroundColor(data.isFacingQibla ? Color.white : Color.orange)
                    .font(.system(size: 36))
                    .rotationEffect(.degrees(kaabaRotation))
                    .offset(y: -80)
            }
            
            // Instruction text
            Text(data.instruction)
                .font(.title3)
                .foregroundColor(data.isFacingQibla ? .green : .primary)
                .fontWeight(.semibold)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 16)
                .padding(.bottom, 16)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .containerBackground(.fill.tertiary, for: .widget)
    }
}

// MARK: - Widget Configuration
struct QiblaWidget: Widget {
    let kind: String = "QiblaWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: QiblaProvider()) { entry in
            QiblaWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Qibla")
        .description("Find the direction to Mecca for prayer.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}

// MARK: - Preview
#Preview(as: .systemSmall) {
    QiblaWidget()
} timeline: {
    let provider = QiblaProvider()
    QiblaEntry(date: Date(), data: provider.getSampleData())
}

