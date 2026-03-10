import WidgetKit
import SwiftUI

// MARK: - Lock Screen View
struct LockScreenRamadanCountdownView: View {
    let data: RamadanCountdownData
    
    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(data.isDuringRamadan ? 
                 "\(data.daysRemaining) days till end of ramadan" : 
                 "\(data.daysRemaining) days left till ramadan")
                .font(.system(size: 12, weight: .semibold))
                .widgetAccentable()
        }
    }
}

// MARK: - Lock Screen Widget
struct RamadanCountdownLockScreenWidget: Widget {
    let kind: String = "RamadanCountdownLockScreenWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: RamadanCountdownProvider()) { entry in
            let provider = RamadanCountdownProvider()
            let isSubscribed = provider.getSubscriptionStatus()

            if !isSubscribed {
                if #available(iOS 17.0, *) {
                    LockScreenRamadanSubscriptionRequiredView()
                        .containerBackground(.clear, for: .widget)
                } else {
                    LockScreenRamadanSubscriptionRequiredView()
                }
            } else {
                if #available(iOS 17.0, *) {
                    LockScreenRamadanCountdownView(data: entry.data)
                        .containerBackground(.clear, for: .widget)
                } else {
                    LockScreenRamadanCountdownView(data: entry.data)
                }
            }
        }
        .configurationDisplayName("Ramadan Countdown")
        .description("Countdown to Ramadan on your lock screen.")
        .supportedFamilies([.accessoryRectangular])
    }
}

fileprivate struct LockScreenRamadanSubscriptionRequiredView: View {
    @ViewBuilder
    var body: some View {
        if #available(iOS 17.0, *) {
            VStack(spacing: 2) {
                Text("Huda Premium Feature")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundColor(.secondary)
                Text("Subscribe to see the Ramadan countdown")
                    .font(.system(size: 10, weight: .regular))
                    .foregroundColor(.secondary)
            }
            .frame(maxWidth: .infinity, alignment: .center)
            .containerBackground(.clear, for: .widget)
        } else {
            VStack(spacing: 2) {
                Text("Huda Premium Feature")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundColor(.secondary)
                Text("Subscribe to see the Ramadan countdown")
                    .font(.system(size: 10, weight: .regular))
                    .foregroundColor(.secondary)
            }
            .frame(maxWidth: .infinity, alignment: .center)
        }
    }
}

// MARK: - Preview
#Preview("Ramadan Countdown", as: .accessoryRectangular) {
    RamadanCountdownLockScreenWidget()
} timeline: {
    let provider = RamadanCountdownProvider()
    RamadanCountdownEntry(date: Date(), data: provider.getSampleData())
}

