# 📱 CourtVision Mobile (v2.0)

Elite Athlete Tracking and AR Training. This application transforms standard smartphone video into a high-fidelity sports analytics engine.

## 🚀 Key Features

*   **Ghost Mode AR**: Interactive skeletal analysis overlays.
*   **Live AI Playbook**: Real-time training objectives and progress tracking.
*   **Cinematic Highlights**: AI-edited game reels with biometric HUDs.
*   **Shadow League Reports**: Push-notifications with tactical simulations from the morning simulation engine.

## 🛠️ Local Development

1.  **Environment**: Ensure you have Expo SDK 50+ installed.
2.  **Dependencies**: `npm install`
3.  **Start**: `npx expo start`
4.  **Connect**: Point the app to your local/prod API URL in `lib/api/client.ts`.

## 🤖 TFLite Release Setup

1.  **Bundled model**: `assets/models/pose_landmark_lite.tflite` must be present in the mobile app bundle.
2.  **Runtime source**: `EXPO_PUBLIC_TFLITE_POSE_MODEL=assets/models/pose_landmark_lite.tflite`.
3.  **EAS profiles**: `development`, `preview`, and `production` already set this env var in `eas.json`.

## 📦 Store Submission
- **Framework**: Expo / React Native
- **Primary Aesthetic**: Dark Arena (OLED optimized)
- **Target Audience**: Elite Basketball Athletes and Coaches

---
**Status: READY FOR PRODUCTION.** 🏀🚀
