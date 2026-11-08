# Huda

**Islamic mobile app for prayer, Quran and daily practice. 5,000+ downloads.**
Live: [huda-app.com](https://huda-app.com)

## What it does

- **Prayer tracking**: prayer times, guided prayer, and reminders
- **Quran**: reader, surah selection, and ayah memorization and quizzes
- **Qibla guidance**: compass pointing toward Mecca
- Also: hadith, duas, dhikr/tasbih counter, mosque and halal food finder, wudu/ghusl/Hajj/Umrah guides, lessons
- **iOS extras**: home-screen widget, Live Activities, and a prayer-time app blocker built on Apple's Screen Time APIs

## Screenshots

| Home | Prayer | Quran | Qibla |
|---|---|---|---|
| ![home](docs/home.png) | ![prayer](docs/prayer.png) | ![quran](docs/quran.png) | ![qibla](docs/qibla.png) |

<!-- TODO: add screenshots to /docs -->

## Tech stack

- **App:** React Native (Expo), JavaScript
- **Backend:** Firebase (auth, database, Cloud Functions)
- **Native iOS (Swift):** widget, Live Activities, Screen Time shield extension
- **Payments:** in-app subscriptions (Apple and Google Play)

## Hardest problem: going native

Two of Huda's best features aren't possible in React Native alone: a **prayer-time app blocker** and **home-screen widgets**. Both had to be built as native iOS extensions in Swift and Xcode.

- **Prayer blocker:** uses Apple's Screen Time (FamilyControls) APIs with a custom shield screen. It has to block apps on a schedule set by prayer times, which change every day and differ by location.
- **Widgets:** a separate Swift extension that shows prayer data outside the app.

The hard part was working outside the JavaScript layer: learning Xcode, Apple's extension model and its entitlements, and wiring the native targets back into the Expo app.

## Run locally

```bash
npm install
npx expo run:ios   # or run:android
```
Needs your own Firebase config (not included).
