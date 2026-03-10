/*
 * COMMENTED OUT: Live Activities functionality disabled until further implementation
 * This file is kept for reference but the widget is not registered in index.swift
 * 
 * To re-enable:
 * 1. Uncomment the PrayerTimesLiveActivity registration in targets/widget/index.swift
 * 2. Ensure the native module (PrayerTimesLiveActivityModule.swift) is properly registered
 * 3. Uncomment the import and usage in services/widgetService.js
 * 4. Restore services/prayerTimesLiveActivity.js from the .COMMENTED file
 */

/*
import ActivityKit
import WidgetKit
import SwiftUI

// MARK: - Activity Attributes
struct PrayerTimesActivityAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        // Dynamic stateful properties about your activity go here!
        var prayerName: String
        var prayerTime: String
    }

    // Fixed non-changing properties about your activity go here!
    var id: String
}

// MARK: - Live Activity Widget
@available(iOS 16.2, *)
struct PrayerTimesLiveActivity: Widget {
    let kind: String = "PrayerTimesLiveActivity"
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: PrayerTimesActivityAttributes.self) { context in
            // Lock screen/banner UI goes here
            VStack(alignment: .leading, spacing: 4) {
                Text(context.state.prayerName)
                    .font(.headline)
                    .fontWeight(.semibold)
                Text(context.state.prayerTime)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .activityBackgroundTint(Color.black.opacity(0.1))
            .activitySystemActionForegroundColor(Color.primary)

        } dynamicIsland: { context in
            DynamicIsland {
                // Expanded UI goes here.  Compose the expanded UI through
                // various regions, like leading/trailing/center/bottom
                DynamicIslandExpandedRegion(.leading) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Next Prayer")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        Text(context.state.prayerName)
                            .font(.headline)
                            .fontWeight(.semibold)
                    }
                    .padding(.leading, 16)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    VStack(alignment: .trailing, spacing: 4) {
                        Text("Time")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        Text(context.state.prayerTime)
                            .font(.headline)
                            .fontWeight(.semibold)
                    }
                    .padding(.trailing, 16)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    // Additional content can go here if needed
                    EmptyView()
                }
            } compactLeading: {
                // Prayer name on the left in compact mode
                Text(context.state.prayerName)
                    .font(.system(size: 14, weight: .semibold))
                    .lineLimit(1)
                    .minimumScaleFactor(0.8)
            } compactTrailing: {
                // Prayer time on the right in compact mode
                Text(context.state.prayerTime)
                    .font(.system(size: 14, weight: .regular))
                    .foregroundColor(.secondary)
            } minimal: {
                // Minimal view - just show prayer time
                Text(context.state.prayerTime)
                    .font(.system(size: 14, weight: .regular))
                    .foregroundColor(.secondary)
            }
            .widgetURL(URL(string: "huda://prayer"))
            .keylineTint(Color.blue)
        }
    }
}

// MARK: - Preview Extensions
extension PrayerTimesActivityAttributes {
    fileprivate static var preview: PrayerTimesActivityAttributes {
        PrayerTimesActivityAttributes(id: "preview")
    }
}

extension PrayerTimesActivityAttributes.ContentState {
    fileprivate static var preview: PrayerTimesActivityAttributes.ContentState {
        PrayerTimesActivityAttributes.ContentState(
            prayerName: "Dhuhr",
            prayerTime: "12:30 PM"
        )
    }
}

// MARK: - Preview
@available(iOS 16.2, *)
struct PrayerTimesLiveActivity_Previews: PreviewProvider {
    static var previews: some View {
        PrayerTimesActivityAttributes.preview
            .previewContext(PrayerTimesActivityAttributes.ContentState.preview, viewKind: .dynamicIsland(.compact))
            .previewDisplayName("Compact")
        
        PrayerTimesActivityAttributes.preview
            .previewContext(PrayerTimesActivityAttributes.ContentState.preview, viewKind: .dynamicIsland(.expanded))
            .previewDisplayName("Expanded")
        
        PrayerTimesActivityAttributes.preview
            .previewContext(PrayerTimesActivityAttributes.ContentState.preview, viewKind: .dynamicIsland(.minimal))
            .previewDisplayName("Minimal")
    }
}
*/

