import WidgetKit
import SwiftUI

@main
struct exportWidgets: WidgetBundle {
    @WidgetBundleBuilder
    var body: some Widget {
        PrayerTimesWidget()
        LockScreenPrayerWidget()
        NextPrayerCountdownWidget()
        HijriCalendarLockScreenWidget()
        DailyQuranVerseWidget()
        DailyQuranVerseArabicWidget()
        DailyQuranVerseEnglishWidget()
        DailyHadithWidget()
        DailyHadithArabicWidget()
        DailyHadithEnglishWidget()
        DailyDuaWidget()
        DailyDuaArabicWidget()
        DailyDuaEnglishWidget()
        DailyDhikrWidget()
        DailyDhikrArabicWidget()
        DailyDhikrEnglishWidget()
        RamadanCountdownWidget()
        RamadanCountdownLockScreenWidget()
        TasbihCounterWidget()
        // COMMENTED OUT: Live Activity disabled until further implementation
        // if #available(iOS 16.2, *) {
        //     PrayerTimesLiveActivity()
        // }
    }
}

