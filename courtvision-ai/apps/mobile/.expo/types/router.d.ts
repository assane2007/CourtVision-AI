/* eslint-disable */
import * as Router from 'expo-router';

export * from 'expo-router';

declare module 'expo-router' {
  export namespace ExpoRouter {
    export interface __routes<T extends string = string> extends Record<string, unknown> {
      StaticRoutes: `/` | `/(dashboard)` | `/(dashboard)/` | `/(dashboard)/community` | `/(dashboard)/profile` | `/(dashboard)/twin` | `/(dashboard)/upload` | `/_sitemap` | `/community` | `/live` | `/onboarding2` | `/onboarding3` | `/profile` | `/program` | `/twin` | `/upload`;
      DynamicRoutes: `/analysis/${Router.SingleRoutePart<T>}` | `/highlight/${Router.SingleRoutePart<T>}`;
      DynamicRouteTemplate: `/analysis/[id]` | `/highlight/[id]`;
    }
  }
}
