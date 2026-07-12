# 🏀 CourtVision AI — Native Mobile App

## React Native + Expo Application

CourtVision AI's native mobile application built with **React Native** and **Expo** (managed workflow), providing a first-class basketball training experience on iOS and Android.

---

## ✨ Features

### Core
- **🔐 Biometric Auth** — Face ID / Touch ID / Fingerprint login
- **📷 Camera Workouts** — Real-time form analysis via native camera
- **🔔 Push Notifications** — Workout reminders, AI insights, social updates
- **🌙 Dark Mode** — System-aware with manual toggle
- **🌐 i18n** — French (default) and English, with `react-i18next`
- **📳 Haptic Feedback** — Context-aware haptics on every interaction

### Screens (14+)
| Screen | Description |
|--------|-------------|
| Login / Signup | Email/password, OAuth (Apple, Google), magic link |
| Onboarding | 4-step wizard (position, goals, experience) |
| Home | Dashboard with XP, streak, quick actions, weekly challenge |
| Training Hub | Category-filtered drill browser with search |
| Drill Detail | Instructions, stats, start workout |
| Camera Workout | Native camera with rep counter, score, timer |
| Stats | Performance cards, weekly chart, links to achievements/leaderboard |
| AI Coach | Chat interface with quick actions, voice input |
| Messages | Conversation list with AI chat integration |
| Profile | User card, theme toggle, language switch, menu |
| Achievements | Unlocked/locked achievement gallery |
| Leaderboard | Period-filtered rankings with podium |
| Settings | Appearance, notifications, account management |
| Notifications | Grouped notification feed |

### Architecture
- **Expo Router** — File-based routing with groups `(auth)` and `(tabs)`
- **Zustand** — Persistent state with `zustand/middleware/persist`
- **TanStack Query** — Server state management with caching
- **Axios** — API client with auth interceptor
- **NativeWind** — Tailwind CSS for React Native

### Native Integrations
- `expo-camera` — Real-time camera for workout analysis
- `expo-haptics` — Haptic feedback (light, medium, heavy, success, warning, error)
- `expo-secure-store` — Secure token storage
- `expo-notifications` — Push notifications with channels
- `expo-biometric-auth` — Face ID / Touch ID
- `expo-screen-orientation` — Portrait lock
- `react-native-reanimated` — Smooth animations
- `@shopify/flash-list` — High-performance lists

---

## 🏗️ Project Structure

```
mobile/
├── app.json              # Expo configuration
├── eas.json              # EAS Build profiles (dev/preview/production)
├── tsconfig.json         # TypeScript config
├── tailwind.config.js    # NativeWind/Tailwind config
├── metro.config.js       # Metro bundler with path aliases
├── global.css            # CSS variables for light/dark theme
├── package.json          # Dependencies
└── src/
    ├── app/
    │   ├── _layout.tsx           # Root layout (providers, theme, i18n)
    │   ├── index.tsx             # Entry redirect (auth vs tabs)
    │   ├── (auth)/
    │   │   ├── _layout.tsx       # Auth stack layout
    │   │   ├── login.tsx         # Login screen
    │   │   ├── signup.tsx        # Signup screen
    │   │   └── onboarding.tsx    # 4-step onboarding wizard
    │   └── (tabs)/
    │       ├── _layout.tsx       # Tab bar layout (5 tabs)
    │       ├── home/index.tsx    # Dashboard
    │       ├── train/
    │       │   ├── _layout.tsx   # Train stack
    │       │   ├── index.tsx     # Drill browser
    │       │   ├── drill/[id].tsx # Drill detail
    │       │   └── camera-workout.tsx # Native camera workout
    │       ├── stats/index.tsx   # Stats dashboard
    │       ├── messages/index.tsx # Chat list
    │       ├── ai-coach/index.tsx # AI chat
    │       └── profile/
    │           ├── index.tsx     # Profile screen
    │           ├── achievements.tsx
    │           ├── leaderboard.tsx
    │           ├── settings.tsx
    │           └── notifications.tsx
    ├── components/ui/        # Reusable UI components
    ├── hooks/
    │   ├── index.ts
    │   ├── use-haptics.ts
    │   ├── use-camera-workout.ts
    │   ├── use-push-notifications.ts
    │   └── use-biometrics.ts
    ├── stores/
    │   ├── app.ts             # Main app store (auth, nav, settings)
    │   ├── auth-store.ts      # Auth loading/error state
    │   └── workout-store.ts   # Workout timer, plan execution
    ├── services/
    │   ├── index.ts
    │   ├── api-client.ts      # Axios with auth interceptor
    │   ├── auth.service.ts    # Login, signup, magic link, onboard
    │   ├── player.service.ts  # Stats, profile, reports
    │   ├── drill.service.ts   # Drills, sessions, favorites
    │   ├── ai.service.ts      # Chat, predictions, workout gen, form analysis
    │   └── social.service.ts  # Leaderboard, achievements, friends, feed
    ├── i18n/
    │   ├── index.ts           # i18next setup
    │   ├── fr.json            # French translations
    │   └── en.json            # English translations
    ├── constants/
    │   └── index.ts           # Categories, colors, API URL
    ├── utils/
    │   ├── cn.ts              # clsx + tailwind-merge
    │   └── formatters.ts      # Duration, score, date formatters
    └── assets/
        └── fonts/             # Inter font family
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Bun or npm
- EAS CLI: `npm install -g eas-cli`
- iOS: Xcode 15+, CocoaPods
- Android: Android Studio, JDK 17+

### Install
```bash
cd mobile
bun install
```

### Development
```bash
# Start Expo dev server
bun run start

# Open in specific platform
bun run ios
bun run android

# Open in web browser
bun run web
```

### Build for Production
```bash
# Build preview (internal distribution)
eas build --platform ios --profile preview
eas build --platform android --profile preview

# Build production
eas build --platform ios --profile production
eas build --platform android --profile production

# Submit to stores
eas submit --platform ios --profile production
eas submit --platform android --profile production
```

---

## 🔗 Backend Connection

The mobile app connects to the Next.js backend via REST API:
- **Base URL**: Configured in `app.json` → `extra.apiBaseUrl` or `EXPO_PUBLIC_API_URL` env var
- **Auth**: JWT token stored in Zustand (persisted via MMKV/AsyncStorage)
- **All 119+ API endpoints** are available through typed service modules

### Environment Variables
```env
EXPO_PUBLIC_API_URL=https://your-courtvision-api.com
```

---

## 📱 Platform-Specific

### iOS
- Minimum: iOS 15.0
- Face ID support via `expo-biometric-auth`
- Push notifications via APNs (configure in EAS)
- App Store: `com.courtvision.ai`

### Android
- Minimum: API 24 (Android 7.0)
- Fingerprint support via `expo-biometric-auth`
- Push notifications via FCM (configure in EAS)
- Package: `com.courtvision.ai`

---

## 🎨 Design System

- **Primary Color**: `#f97316` (orange-500)
- **Dark Mode**: CSS variables + Zustand state
- **Typography**: Inter font family (Regular, Medium, SemiBold, Bold)
- **Icons**: `lucide-react-native`
- **Border Radius**: 0.625rem (10px) default, 2xl for cards
- **Safe Areas**: `react-native-safe-area-context`

---

## 📦 Key Dependencies

| Package | Purpose |
|---------|---------|
| `expo-router` | File-based routing |
| `nativewind` | Tailwind CSS for RN |
| `zustand` | State management |
| `@tanstack/react-query` | Server state |
| `expo-camera` | Native camera |
| `expo-haptics` | Haptic feedback |
| `expo-notifications` | Push notifications |
| `expo-secure-store` | Secure storage |
| `react-native-reanimated` | Animations |
| `@shopify/flash-list` | Performant lists |
| `lucide-react-native` | Icons |
| `i18next` | Internationalization |

---

## 🔄 Sync with Web App

The mobile app shares:
- Same API routes and data models
- Same design language (orange primary, dark mode)
- Same i18n translation keys
- Same drill categories and constants
- Same auth flow (Supabase tokens)

---

Built with ❤️ for basketball players worldwide.