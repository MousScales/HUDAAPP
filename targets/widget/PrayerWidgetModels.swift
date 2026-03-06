import Foundation
import WidgetKit

// MARK: - Shared Data Models for Prayer Widgets
struct PrayerTime: Codable, Identifiable {
    let id: String
    let name: String
    let time: String
    let dateObj: Date
    let isNext: Bool
    let isCompleted: Bool
    
    init(id: String, name: String, time: String, dateObj: Date, isNext: Bool = false, isCompleted: Bool = false) {
        self.id = id
        self.name = name
        self.time = time
        self.dateObj = dateObj
        self.isNext = isNext
        self.isCompleted = isCompleted
    }
}

struct PrayerTimesData: Codable {
    let prayerTimes: [PrayerTime]
    let nextPrayer: PrayerTime?
    let currentPrayer: PrayerTime?
    let countdown: String
    let hijriDate: String
    let cityName: String
}

struct SimpleEntry: TimelineEntry {
    let date: Date
    let data: PrayerTimesData
}



