import { NextResponse } from "next/server";

/**
 * GET /api/docs — OpenAPI 3.0.3 specification for CourtVision AI API
 *
 * Returns the full API specification as JSON.
 * Can be imported into Swagger UI, Postman, Redoc, etc.
 */
export async function GET() {
  const spec = {
    openapi: "3.0.3",
    info: {
      title: "CourtVision AI API",
      version: "1.0.0",
      description:
        "CourtVision AI is a basketball training platform that uses AI-powered coaching, video analysis, form checking, and personalized training plans. This API covers health checks, authentication, player management, drills, video analysis, AI coaching, training sessions, social features, teams, challenges, leaderboards, achievements, notifications, admin operations, feature flags, and billing.",
      contact: {
        name: "CourtVision AI Support",
        email: "support@courtvision.ai",
        url: "https://courtvision.ai",
      },
      license: {
        name: "Proprietary",
        url: "https://courtvision.ai/license",
      },
    },
    servers: [
      {
        url: "https://courtvision.ai",
        description: "Production",
      },
      {
        url: "http://localhost:3000",
        description: "Development",
      },
    ],
    tags: [
      { name: "Health", description: "Service health and readiness checks" },
      { name: "Auth", description: "User authentication and account management" },
      { name: "Player", description: "Player profile, stats, and onboarding" },
      { name: "Drills", description: "Basketball drill library and custom drills" },
      { name: "Videos", description: "Video upload, analysis, and highlights" },
      { name: "AI", description: "AI coaching, chat, form analysis, and insights" },
      { name: "AI Coach", description: "AI Coach streaming endpoint" },
      { name: "Training", description: "Training sessions and workout plans" },
      { name: "Social", description: "Social feed, friends, and interactions" },
      { name: "Teams", description: "Team management" },
      { name: "Challenges", description: "Basketball challenges and progress tracking" },
      { name: "Leaderboard", description: "Player rankings and leaderboards" },
      { name: "Achievements", description: "Player achievements and badges" },
      { name: "Notifications", description: "Push and in-app notifications" },
      { name: "Admin", description: "Admin dashboard and audit logs" },
      { name: "Feature Flags", description: "Feature flag management" },
      { name: "Billing", description: "Stripe checkout and webhooks" },
    ],

    paths: {
      // ─── Health ──────────────────────────────────────────────────────────────────
      "/api/health": {
        get: {
          operationId: "getHealth",
          summary: "Health check",
          description:
            "Returns the health status of the service. Use for load balancer probes and uptime monitoring. Supports `?detailed=true` for full diagnostics including alerts.",
          tags: ["Health"],
          parameters: [
            {
              name: "detailed",
              in: "query",
              required: false,
              schema: { type: "boolean", default: false },
              description: "Return full diagnostics including all subsystem checks and alerts.",
            },
          ],
          responses: {
            "200": {
              description: "Service is healthy (or degraded but operational)",
              content: {
                "application/json": {
                  schema: {
                    oneOf: [
                      { $ref: "#/components/schemas/HealthSimple" },
                      { $ref: "#/components/schemas/HealthDetailed" },
                    ],
                  },
                },
              },
            },
            "503": {
              description: "Service is unhealthy",
              content: { "application/json": { schema: { $ref: "#/components/schemas/HealthDetailed" } } },
            },
          },
        },
      },
      "/api/v1/health": {
        get: {
          operationId: "getHealthV1",
          summary: "Health check (v1)",
          description: "Versioned health check endpoint for backward compatibility.",
          tags: ["Health"],
          responses: {
            "200": {
              description: "Service is healthy",
              content: { "application/json": { schema: { $ref: "#/components/schemas/HealthSimple" } } },
            },
          },
        },
      },

      // ─── Auth ────────────────────────────────────────────────────────────────────
      "/api/auth/signup": {
        post: {
          operationId: "signup",
          summary: "Create a new account",
          description:
            "Registers a new user with email, password, and name. The email is auto-confirmed. Returns a 409 if the email is already registered.",
          tags: ["Auth"],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/SignupRequest" },
              },
            },
          },
          responses: {
            "201": {
              description: "User created successfully",
              content: { "application/json": { schema: { $ref: "#/components/schemas/SignupResponse" } } },
            },
            "400": { $ref: "#/components/responses/BadRequest" },
            "409": {
              description: "Email already registered",
              content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
            },
            "413": { description: "Request body too large" },
            "500": { $ref: "#/components/responses/InternalServerError" },
          },
        },
      },
      "/api/auth/reset-password": {
        post: {
          operationId: "resetPassword",
          summary: "Request a password reset",
          description: "Sends a password reset link to the user's email address.",
          tags: ["Auth"],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["email"],
                  properties: {
                    email: { type: "string", format: "email", example: "player@example.com" },
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Password reset email sent",
              content: { "application/json": { schema: { type: "object", properties: { message: { type: "string" } } } } },
            },
            "400": { $ref: "#/components/responses/BadRequest" },
            "500": { $ref: "#/components/responses/InternalServerError" },
          },
        },
      },

      // ─── Player ──────────────────────────────────────────────────────────────────
      "/api/player/stats": {
        get: {
          operationId: "getPlayerStats",
          summary: "Get player statistics",
          description:
            "Returns the authenticated player's stats including XP, level, skill DNA (shooting, handling, finishing, defense, IQ), streak, workout count, and recent activity.",
          tags: ["Player"],
          security: [{ bearerAuth: [] }],
          responses: {
            "200": {
              description: "Player stats retrieved successfully",
              content: { "application/json": { schema: { $ref: "#/components/schemas/PlayerStats" } } },
            },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "404": { description: "No player profile found for this user" },
            "500": { $ref: "#/components/responses/InternalServerError" },
          },
        },
      },
      "/api/player/profile": {
        get: {
          operationId: "getPlayerProfile",
          summary: "Get player profile",
          description: "Returns the authenticated player's full profile including personal info and preferences.",
          tags: ["Player"],
          security: [{ bearerAuth: [] }],
          responses: {
            "200": {
              description: "Player profile",
              content: { "application/json": { schema: { $ref: "#/components/schemas/Player" } } },
            },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "404": { description: "Player not found" },
            "500": { $ref: "#/components/responses/InternalServerError" },
          },
        },
      },
      "/api/player/onboard": {
        post: {
          operationId: "onboardPlayer",
          summary: "Complete player onboarding",
          description:
            "Creates or updates the player profile with onboarding data (position, skill level, goals, etc.). Called after initial signup to set up the player profile.",
          tags: ["Player"],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["position", "skillLevel"],
                  properties: {
                    position: {
                      type: "string",
                      enum: ["PG", "SG", "SF", "PF", "C"],
                      description: "Primary basketball position",
                    },
                    skillLevel: {
                      type: "string",
                      enum: ["beginner", "intermediate", "advanced", "elite"],
                      description: "Self-assessed skill level",
                    },
                    goals: {
                      type: "array",
                      items: { type: "string" },
                      description: "Training goals (e.g., shooting, ball handling)",
                    },
                    experience: {
                      type: "string",
                      description: "Years of basketball experience",
                    },
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Onboarding completed",
              content: { "application/json": { schema: { $ref: "#/components/schemas/Player" } } },
            },
            "400": { $ref: "#/components/responses/BadRequest" },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "500": { $ref: "#/components/responses/InternalServerError" },
          },
        },
      },

      // ─── Drills ──────────────────────────────────────────────────────────────────
      "/api/drills": {
        get: {
          operationId: "listDrills",
          summary: "List drills",
          description:
            "Returns a paginated list of drills. Supports filtering by category, difficulty, and search. Uses cursor-based pagination. Includes the authenticated user's custom drills and favorites.",
          tags: ["Drills"],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: "cursor", in: "query", required: false, schema: { type: "string" }, description: "Pagination cursor (drill ID)" },
            { name: "limit", in: "query", required: false, schema: { type: "integer", minimum: 1, maximum: 100, default: 20 }, description: "Items per page" },
            { name: "category", in: "query", required: false, schema: { type: "string", enum: ["shooting", "handling", "finishing", "defense", "iq", "conditioning"] }, description: "Filter by category" },
            { name: "difficulty", in: "query", required: false, schema: { type: "string", enum: ["beginner", "intermediate", "advanced"] }, description: "Filter by difficulty" },
            { name: "search", in: "query", required: false, schema: { type: "string" }, description: "Search by name or description" },
            { name: "favoritesOnly", in: "query", required: false, schema: { type: "boolean", default: false }, description: "Only show favorited drills" },
            { name: "customOnly", in: "query", required: false, schema: { type: "boolean", default: false }, description: "Only show user-created custom drills" },
          ],
          responses: {
            "200": {
              description: "Paginated drill list",
              content: { "application/json": { schema: { $ref: "#/components/schemas/DrillListResponse" } } },
            },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "429": { $ref: "#/components/responses/RateLimited" },
            "500": { $ref: "#/components/responses/InternalServerError" },
          },
        },
      },
      "/api/drills/{id}": {
        get: {
          operationId: "getDrill",
          summary: "Get a drill by ID",
          description: "Returns the full details of a specific drill including instructions.",
          tags: ["Drills"],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string" }, description: "Drill ID" },
          ],
          responses: {
            "200": {
              description: "Drill details",
              content: { "application/json": { schema: { $ref: "#/components/schemas/Drill" } } },
            },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "404": { description: "Drill not found" },
            "500": { $ref: "#/components/responses/InternalServerError" },
          },
        },
      },
      "/api/drills/create": {
        post: {
          operationId: "createDrill",
          summary: "Create a custom drill",
          description: "Creates a new custom drill owned by the authenticated player.",
          tags: ["Drills"],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["name", "category", "difficulty", "instructions"],
                  properties: {
                    name: { type: "string", example: "Crossover into Pull-up Jumper" },
                    category: { type: "string", enum: ["shooting", "handling", "finishing", "defense", "iq", "conditioning"] },
                    difficulty: { type: "string", enum: ["beginner", "intermediate", "advanced"] },
                    description: { type: "string" },
                    instructions: { type: "string", description: "Step-by-step instructions" },
                    durationSec: { type: "integer", description: "Estimated duration in seconds" },
                    targetReps: { type: "integer", description: "Target number of repetitions" },
                    icon: { type: "string", description: "Emoji icon for the drill" },
                  },
                },
              },
            },
          },
          responses: {
            "201": {
              description: "Drill created",
              content: { "application/json": { schema: { $ref: "#/components/schemas/Drill" } } },
            },
            "400": { $ref: "#/components/responses/BadRequest" },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "500": { $ref: "#/components/responses/InternalServerError" },
          },
        },
      },

      // ─── Videos ──────────────────────────────────────────────────────────────────
      "/api/videos": {
        get: {
          operationId: "listVideos",
          summary: "List user videos",
          description: "Returns a paginated list of the authenticated user's uploaded basketball videos.",
          tags: ["Videos"],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: "cursor", in: "query", required: false, schema: { type: "string" }, description: "Pagination cursor" },
            { name: "limit", in: "query", required: false, schema: { type: "integer", minimum: 1, maximum: 50, default: 20 } },
          ],
          responses: {
            "200": {
              description: "Paginated video list",
              content: { "application/json": { schema: { $ref: "#/components/schemas/PaginatedResponse" } } },
            },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "500": { $ref: "#/components/responses/InternalServerError" },
          },
        },
        post: {
          operationId: "uploadVideo",
          summary: "Upload a video",
          description: "Uploads a basketball training video for AI analysis. Accepts multipart/form-data with the video file and optional metadata.",
          tags: ["Videos"],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "multipart/form-data": {
                schema: {
                  type: "object",
                  required: ["file"],
                  properties: {
                    file: { type: "string", format: "binary", description: "Video file (MP4, MOV, AVI)" },
                    title: { type: "string", description: "Video title" },
                    tags: { type: "string", description: "Comma-separated tags" },
                  },
                },
              },
            },
          },
          responses: {
            "201": {
              description: "Video uploaded and processing started",
              content: { "application/json": { schema: { $ref: "#/components/schemas/Video" } } },
            },
            "400": { $ref: "#/components/responses/BadRequest" },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "413": { description: "File too large" },
            "500": { $ref: "#/components/responses/InternalServerError" },
          },
        },
      },
      "/api/videos/{id}": {
        get: {
          operationId: "getVideo",
          summary: "Get a video by ID",
          description: "Returns video details including AI analysis results, annotations, and highlights.",
          tags: ["Videos"],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string" }, description: "Video ID" },
          ],
          responses: {
            "200": {
              description: "Video details",
              content: { "application/json": { schema: { $ref: "#/components/schemas/Video" } } },
            },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "404": { description: "Video not found" },
            "500": { $ref: "#/components/responses/InternalServerError" },
          },
        },
      },

      // ─── AI ──────────────────────────────────────────────────────────────────────
      "/api/ai/chat": {
        post: {
          operationId: "aiChat",
          summary: "Chat with AI Coach",
          description:
            "Send a message to the CourtVision AI Coach for basketball training advice. Supports streaming via `?stream=true` query parameter or `Accept: text/event-stream` header. Rate limited to 20 requests per minute per user.",
          tags: ["AI"],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: "stream", in: "query", required: false, schema: { type: "boolean", default: false }, description: "Enable SSE streaming response" },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AIChatRequest" },
              },
            },
          },
          responses: {
            "200": {
              description: "AI response (JSON or SSE stream depending on stream param)",
              content: {
                "application/json": { schema: { $ref: "#/components/schemas/AIChatResponse" },
                },
                "text/event-stream": {
                  schema: {
                    type: "string",
                    description: "SSE stream with `data: {\"content\":\"...\"}` events, terminated by `data: [DONE]`",
                  },
                },
              },
            },
            "400": { $ref: "#/components/responses/BadRequest" },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "429": { $ref: "#/components/responses/RateLimited" },
            "500": { $ref: "#/components/responses/InternalServerError" },
          },
        },
      },
      "/api/ai/form/analyze": {
        post: {
          operationId: "analyzeForm",
          summary: "Analyze basketball form from video/image",
          description: "Analyzes a basketball player's shooting or movement form from uploaded media. Returns detailed feedback on mechanics, posture, and improvement suggestions.",
          tags: ["AI"],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["mediaUrl"],
                  properties: {
                    mediaUrl: { type: "string", format: "uri", description: "URL of the video or image to analyze" },
                    formType: { type: "string", enum: ["shooting", "dribbling", "defensive_stance", "layup"], default: "shooting" },
                    feedbackLevel: { type: "string", enum: ["brief", "detailed"], default: "detailed" },
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Form analysis results",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      score: { type: "number", minimum: 0, maximum: 100, description: "Overall form score" },
                      feedback: { type: "string", description: "Detailed feedback text" },
                      suggestions: { type: "array", items: { type: "string" }, description: "Specific improvement suggestions" },
                      keyPoints: { type: "array", items: { type: "object", properties: { label: { type: "string" }, status: { type: "string", enum: ["good", "needs_improvement", "poor"] } } } },
                    },
                  },
                },
              },
            },
            "400": { $ref: "#/components/responses/BadRequest" },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "429": { $ref: "#/components/responses/RateLimited" },
            "500": { $ref: "#/components/responses/InternalServerError" },
          },
        },
      },
      "/api/ai/insights": {
        post: {
          operationId: "getAIInsights",
          summary: "Get AI-powered training insights",
          description:
            "Generates personalized training insights based on the player's recent performance data, skill DNA, and workout history. Provides actionable recommendations.",
          tags: ["AI"],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: false,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    focusArea: { type: "string", enum: ["shooting", "handling", "finishing", "defense", "iq"], description: "Optional focus area for insights" },
                    period: { type: "string", enum: ["week", "month", "quarter"], default: "week", description: "Time period for analysis" },
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Training insights generated",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      insights: { type: "array", items: { type: "object", properties: { title: { type: "string" }, description: { type: "string" }, priority: { type: "string", enum: ["high", "medium", "low"] } } } },
                      recommendations: { type: "array", items: { type: "string" } },
                      trend: { type: "string", enum: ["improving", "stable", "declining"] },
                    },
                  },
                },
              },
            },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "429": { $ref: "#/components/responses/RateLimited" },
            "500": { $ref: "#/components/responses/InternalServerError" },
          },
        },
      },

      // ─── AI Coach (streaming) ────────────────────────────────────────────────────
      "/api/ai-coach": {
        post: {
          operationId: "aiCoachChat",
          summary: "Send a message to the AI Coach (streaming)",
          description:
            "Interactive AI coaching endpoint. Accepts a message and streams back a real-time coaching response via Server-Sent Events. Supports conversation history for context.",
          tags: ["AI Coach"],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AIChatRequest" },
              },
            },
          },
          responses: {
            "200": {
              description: "SSE stream of AI coach response",
              content: {
                "text/event-stream": {
                  schema: {
                    type: "string",
                    description: "SSE stream with `data: {\"content\":\"...\"}` events, terminated by `data: [DONE]`",
                  },
                },
              },
            },
            "400": { $ref: "#/components/responses/BadRequest" },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "429": { $ref: "#/components/responses/RateLimited" },
            "500": { $ref: "#/components/responses/InternalServerError" },
          },
        },
        get: {
          operationId: "getAICoach",
          summary: "Get AI Coach session (streaming)",
          description: "Initiates or resumes an AI Coach session, streaming the opening response.",
          tags: ["AI Coach"],
          security: [{ bearerAuth: [] }],
          responses: {
            "200": {
              description: "SSE stream of AI coach greeting",
              content: {
                "text/event-stream": {
                  schema: { type: "string" },
                },
              },
            },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "500": { $ref: "#/components/responses/InternalServerError" },
          },
        },
      },

      // ─── Training ────────────────────────────────────────────────────────────────
      "/api/sessions": {
        get: {
          operationId: "listSessions",
          summary: "List training sessions",
          description: "Returns a paginated list of the authenticated player's workout sessions with scores and drill breakdowns.",
          tags: ["Training"],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: "cursor", in: "query", required: false, schema: { type: "string" } },
            { name: "limit", in: "query", required: false, schema: { type: "integer", minimum: 1, maximum: 50, default: 20 } },
            { name: "from", in: "query", required: false, schema: { type: "string", format: "date" }, description: "Start date filter (ISO 8601)" },
            { name: "to", in: "query", required: false, schema: { type: "string", format: "date" }, description: "End date filter (ISO 8601)" },
          ],
          responses: {
            "200": {
              description: "Paginated session list",
              content: { "application/json": { schema: { $ref: "#/components/schemas/PaginatedResponse" } } },
            },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "500": { $ref: "#/components/responses/InternalServerError" },
          },
        },
      },
      "/api/plans": {
        post: {
          operationId: "createPlan",
          summary: "Generate a training plan",
          description:
            "Creates a personalized training plan based on the player's skill DNA, goals, and availability. May use AI to optimize drill selection and progression.",
          tags: ["Training"],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["focusAreas", "duration"],
                  properties: {
                    focusAreas: {
                      type: "array",
                      items: { type: "string", enum: ["shooting", "handling", "finishing", "defense", "iq", "conditioning"] },
                      description: "Skill areas to focus on",
                    },
                    duration: { type: "string", enum: ["1_week", "2_weeks", "4_weeks", "8_weeks"], description: "Plan duration" },
                    sessionsPerWeek: { type: "integer", minimum: 1, maximum: 7, default: 3 },
                    skillLevel: { type: "string", enum: ["beginner", "intermediate", "advanced", "elite"] },
                  },
                },
              },
            },
          },
          responses: {
            "201": {
              description: "Training plan created",
              content: { "application/json": { schema: { $ref: "#/components/schemas/Plan" } } },
            },
            "400": { $ref: "#/components/responses/BadRequest" },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "429": { $ref: "#/components/responses/RateLimited" },
            "500": { $ref: "#/components/responses/InternalServerError" },
          },
        },
      },

      // ─── Social ──────────────────────────────────────────────────────────────────
      "/api/feed": {
        get: {
          operationId: "getFeed",
          summary: "Get social feed",
          description: "Returns a paginated feed of posts from the player's network including workout completions, achievements, and challenge updates.",
          tags: ["Social"],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: "cursor", in: "query", required: false, schema: { type: "string" } },
            { name: "limit", in: "query", required: false, schema: { type: "integer", minimum: 1, maximum: 50, default: 20 } },
          ],
          responses: {
            "200": {
              description: "Paginated feed",
              content: { "application/json": { schema: { $ref: "#/components/schemas/PaginatedResponse" } } },
            },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "500": { $ref: "#/components/responses/InternalServerError" },
          },
        },
        post: {
          operationId: "createFeedPost",
          summary: "Create a feed post",
          description: "Publish a new post to the social feed (e.g., workout completion, achievement share).",
          tags: ["Social"],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/FeedPost" },
              },
            },
          },
          responses: {
            "201": {
              description: "Post created",
              content: { "application/json": { schema: { $ref: "#/components/schemas/FeedPost" } } },
            },
            "400": { $ref: "#/components/responses/BadRequest" },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "500": { $ref: "#/components/responses/InternalServerError" },
          },
        },
      },
      "/api/friends": {
        get: {
          operationId: "listFriends",
          summary: "List friends",
          description: "Returns the authenticated player's friend list with online status and basic stats.",
          tags: ["Social"],
          security: [{ bearerAuth: [] }],
          responses: {
            "200": {
              description: "Friend list",
              content: {
                "application/json": {
                  schema: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        name: { type: "string" },
                        avatarUrl: { type: "string", nullable: true },
                        level: { type: "integer" },
                        online: { type: "boolean" },
                      },
                    },
                  },
                },
              },
            },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "500": { $ref: "#/components/responses/InternalServerError" },
          },
        },
      },

      // ─── Teams ───────────────────────────────────────────────────────────────────
      "/api/teams": {
        get: {
          operationId: "listTeams",
          summary: "List teams",
          description: "Returns teams the authenticated player belongs to or can see.",
          tags: ["Teams"],
          security: [{ bearerAuth: [] }],
          responses: {
            "200": {
              description: "Team list",
              content: {
                "application/json": {
                  schema: { type: "array", items: { $ref: "#/components/schemas/Team" } },
                },
              },
            },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "500": { $ref: "#/components/responses/InternalServerError" },
          },
        },
        post: {
          operationId: "createTeam",
          summary: "Create a team",
          description: "Creates a new team with the authenticated player as captain.",
          tags: ["Teams"],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["name"],
                  properties: {
                    name: { type: "string", minLength: 2, maxLength: 50 },
                    description: { type: "string" },
                    sport: { type: "string", default: "basketball" },
                    isPrivate: { type: "boolean", default: false },
                  },
                },
              },
            },
          },
          responses: {
            "201": {
              description: "Team created",
              content: { "application/json": { schema: { $ref: "#/components/schemas/Team" } } },
            },
            "400": { $ref: "#/components/responses/BadRequest" },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "500": { $ref: "#/components/responses/InternalServerError" },
          },
        },
      },
      "/api/teams/{id}": {
        get: {
          operationId: "getTeam",
          summary: "Get team by ID",
          description: "Returns team details including member list and stats.",
          tags: ["Teams"],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string" }, description: "Team ID" },
          ],
          responses: {
            "200": {
              description: "Team details",
              content: { "application/json": { schema: { $ref: "#/components/schemas/Team" } } },
            },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "404": { description: "Team not found" },
            "500": { $ref: "#/components/responses/InternalServerError" },
          },
        },
      },

      // ─── Challenges ──────────────────────────────────────────────────────────────
      "/api/challenges": {
        get: {
          operationId: "listChallenges",
          summary: "List available challenges",
          description: "Returns a list of active basketball challenges available to join, along with the player's current challenge progress.",
          tags: ["Challenges"],
          security: [{ bearerAuth: [] }],
          responses: {
            "200": {
              description: "Challenge list",
              content: {
                "application/json": {
                  schema: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        title: { type: "string" },
                        description: { type: "string" },
                        difficulty: { type: "string", enum: ["beginner", "intermediate", "advanced"] },
                        xpReward: { type: "integer" },
                        startDate: { type: "string", format: "date-time" },
                        endDate: { type: "string", format: "date-time" },
                        joined: { type: "boolean" },
                        progress: { type: "number", minimum: 0, maximum: 100 },
                      },
                    },
                  },
                },
              },
            },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "500": { $ref: "#/components/responses/InternalServerError" },
          },
        },
      },
      "/api/challenges/{id}/join": {
        post: {
          operationId: "joinChallenge",
          summary: "Join a challenge",
          description: "Joins the authenticated player into a challenge. Returns the challenge details with initial progress.",
          tags: ["Challenges"],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string" }, description: "Challenge ID" },
          ],
          responses: {
            "200": {
              description: "Challenge joined",
              content: {
                "application/json": {
                  schema: { type: "object", properties: { message: { type: "string" }, challengeId: { type: "string" } } },
                },
              },
            },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "404": { description: "Challenge not found" },
            "409": { description: "Already joined this challenge" },
            "500": { $ref: "#/components/responses/InternalServerError" },
          },
        },
      },

      // ─── Leaderboard ─────────────────────────────────────────────────────────────
      "/api/leaderboard": {
        get: {
          operationId: "getLeaderboard",
          summary: "Get leaderboard rankings",
          description: "Returns the global or friend-based leaderboard ranked by XP, with optional filtering by time period.",
          tags: ["Leaderboard"],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: "type", in: "query", required: false, schema: { type: "string", enum: ["global", "friends", "weekly", "monthly"], default: "global" } },
            { name: "limit", in: "query", required: false, schema: { type: "integer", minimum: 1, maximum: 100, default: 50 } },
          ],
          responses: {
            "200": {
              description: "Leaderboard rankings",
              content: {
                "application/json": {
                  schema: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        rank: { type: "integer" },
                        playerId: { type: "string" },
                        name: { type: "string" },
                        avatarUrl: { type: "string", nullable: true },
                        xp: { type: "integer" },
                        level: { type: "integer" },
                        isCurrentUser: { type: "boolean" },
                      },
                    },
                  },
                },
              },
            },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "500": { $ref: "#/components/responses/InternalServerError" },
          },
        },
      },

      // ─── Achievements ────────────────────────────────────────────────────────────
      "/api/achievements": {
        get: {
          operationId: "listAchievements",
          summary: "List achievements",
          description: "Returns all available achievements and the authenticated player's unlocked status for each.",
          tags: ["Achievements"],
          security: [{ bearerAuth: [] }],
          responses: {
            "200": {
              description: "Achievement list",
              content: {
                "application/json": {
                  schema: {
                    type: "array",
                    items: { $ref: "#/components/schemas/Achievement" },
                  },
                },
              },
            },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "500": { $ref: "#/components/responses/InternalServerError" },
          },
        },
      },

      // ─── Notifications ───────────────────────────────────────────────────────────
      "/api/notifications": {
        get: {
          operationId: "listNotifications",
          summary: "List notifications",
          description: "Returns the authenticated user's notifications with pagination and unread count.",
          tags: ["Notifications"],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: "cursor", in: "query", required: false, schema: { type: "string" } },
            { name: "limit", in: "query", required: false, schema: { type: "integer", minimum: 1, maximum: 100, default: 20 } },
            { name: "unreadOnly", in: "query", required: false, schema: { type: "boolean", default: false } },
          ],
          responses: {
            "200": {
              description: "Notifications list with metadata",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      notifications: { type: "array", items: { $ref: "#/components/schemas/Notification" } },
                      unreadCount: { type: "integer" },
                      nextCursor: { type: "string", nullable: true },
                    },
                  },
                },
              },
            },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "500": { $ref: "#/components/responses/InternalServerError" },
          },
        },
      },
      "/api/notifications/subscribe": {
        post: {
          operationId: "subscribeNotifications",
          summary: "Subscribe to push notifications",
          description: "Registers a push notification subscription (web push) for the authenticated user.",
          tags: ["Notifications"],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["endpoint", "keys"],
                  properties: {
                    endpoint: { type: "string", format: "uri", description: "Push subscription endpoint URL" },
                    keys: {
                      type: "object",
                      required: ["p256dh", "auth"],
                      properties: {
                        p256dh: { type: "string", description: "Public key" },
                        auth: { type: "string", description: "Auth secret" },
                      },
                    },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "Subscription saved" },
            "400": { $ref: "#/components/responses/BadRequest" },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "500": { $ref: "#/components/responses/InternalServerError" },
          },
        },
      },

      // ─── Admin ───────────────────────────────────────────────────────────────────
      "/api/admin/stats": {
        get: {
          operationId: "getAdminStats",
          summary: "Get admin dashboard stats",
          description: "Returns platform-wide statistics including user counts, activity metrics, and system health. Requires admin role.",
          tags: ["Admin"],
          security: [{ bearerAuth: [], adminAuth: [] }],
          responses: {
            "200": {
              description: "Admin stats",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      totalUsers: { type: "integer" },
                      activeUsers: { type: "integer" },
                      totalSessions: { type: "integer" },
                      totalVideos: { type: "integer" },
                      aiCallsToday: { type: "integer" },
                    },
                  },
                },
              },
            },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "403": { $ref: "#/components/responses/Forbidden" },
            "500": { $ref: "#/components/responses/InternalServerError" },
          },
        },
      },
      "/api/admin/audit": {
        get: {
          operationId: "getAuditLog",
          summary: "Get audit log",
          description: "Returns the platform audit log with filtering. Requires admin role.",
          tags: ["Admin"],
          security: [{ bearerAuth: [], adminAuth: [] }],
          parameters: [
            { name: "cursor", in: "query", required: false, schema: { type: "string" } },
            { name: "limit", in: "query", required: false, schema: { type: "integer", minimum: 1, maximum: 200, default: 50 } },
            { name: "action", in: "query", required: false, schema: { type: "string" }, description: "Filter by action type" },
            { name: "userId", in: "query", required: false, schema: { type: "string" } },
            { name: "from", in: "query", required: false, schema: { type: "string", format: "date-time" } },
            { name: "to", in: "query", required: false, schema: { type: "string", format: "date-time" } },
          ],
          responses: {
            "200": {
              description: "Audit log entries",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      entries: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            id: { type: "string" },
                            action: { type: "string" },
                            userId: { type: "string" },
                            details: { type: "object" },
                            createdAt: { type: "string", format: "date-time" },
                            ip: { type: "string" },
                          },
                        },
                      },
                      nextCursor: { type: "string", nullable: true },
                    },
                  },
                },
              },
            },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "403": { $ref: "#/components/responses/Forbidden" },
            "500": { $ref: "#/components/responses/InternalServerError" },
          },
        },
      },

      // ─── Feature Flags ───────────────────────────────────────────────────────────
      "/api/feature-flags/public": {
        get: {
          operationId: "getPublicFeatureFlags",
          summary: "Get public feature flags",
          description: "Returns feature flags that are safe to expose to the client (no admin-only flags). Used by the frontend to conditionally render features.",
          tags: ["Feature Flags"],
          responses: {
            "200": {
              description: "Public feature flags",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    additionalProperties: {
                      type: "object",
                      properties: {
                        enabled: { type: "boolean" },
                        value: {},
                      },
                    },
                    example: {
                      "ai-form-analysis": { enabled: true, value: null },
                      "social-feed": { enabled: false, value: null },
                      "video-highlights": { enabled: true, value: { maxPerDay: 5 } },
                    },
                  },
                },
              },
            },
            "500": { $ref: "#/components/responses/InternalServerError" },
          },
        },
      },

      // ─── Billing ─────────────────────────────────────────────────────────────────
      "/api/stripe/checkout": {
        post: {
          operationId: "createCheckoutSession",
          summary: "Create a Stripe checkout session",
          description: "Creates a Stripe Checkout session for subscription or one-time purchase. Returns the session URL for client-side redirect.",
          tags: ["Billing"],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["priceId"],
                  properties: {
                    priceId: { type: "string", description: "Stripe price ID" },
                    mode: { type: "string", enum: ["subscription", "payment"], default: "subscription" },
                    successUrl: { type: "string", format: "uri" },
                    cancelUrl: { type: "string", format: "uri" },
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Checkout session created",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      url: { type: "string", format: "uri", description: "Stripe Checkout URL" },
                      sessionId: { type: "string" },
                    },
                  },
                },
              },
            },
            "400": { $ref: "#/components/responses/BadRequest" },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "500": { $ref: "#/components/responses/InternalServerError" },
          },
        },
      },
      "/api/stripe/webhook": {
        post: {
          operationId: "stripeWebhook",
          summary: "Stripe webhook handler",
          description:
            "Receives and processes Stripe webhook events (e.g., checkout.session.completed, customer.subscription.updated, invoice.payment_failed). Verifies the Stripe signature before processing. This endpoint is called by Stripe, not by client applications.",
          tags: ["Billing"],
          parameters: [],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { type: "object" },
              },
            },
          },
          responses: {
            "200": { description: "Webhook processed successfully" },
            "400": { description: "Invalid payload or signature" },
            "500": { $ref: "#/components/responses/InternalServerError" },
          },
        },
      },
    },

    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description:
            "JSON Web Token obtained from Supabase authentication. Pass as `Authorization: Bearer <token>`.",
        },
        adminAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "JWT token with admin role claims. Requires `user_role: 'admin'` in the token payload.",
        },
      },

      responses: {
        BadRequest: {
          description: "Bad request — invalid or missing parameters",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
              example: { error: "Invalid request", code: "BAD_REQUEST", statusCode: 400 },
            },
          },
        },
        Unauthorized: {
          description: "Unauthorized — missing or invalid authentication token",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
              example: { error: "Unauthorized", code: "UNAUTHORIZED", statusCode: 401 },
            },
          },
        },
        Forbidden: {
          description: "Forbidden — insufficient permissions (e.g., non-admin accessing admin endpoints)",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
              example: { error: "Forbidden", code: "FORBIDDEN", statusCode: 403 },
            },
          },
        },
        RateLimited: {
          description: "Too many requests — rate limit exceeded. Check `Retry-After` header.",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
              example: { error: "Too many requests. Please try again later.", code: "RATE_LIMITED", statusCode: 429 },
            },
          },
          headers: {
            "Retry-After": {
              description: "Seconds until the rate limit resets",
              schema: { type: "integer" },
            },
          },
        },
        InternalServerError: {
          description: "Internal server error",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
              example: { error: "Internal server error", code: "INTERNAL_ERROR", statusCode: 500 },
            },
          },
        },
      },

      schemas: {
        // ─── Core Error ─────────────────────────────────────────────────────────
        Error: {
          type: "object",
          required: ["error"],
          properties: {
            error: { type: "string", description: "Human-readable error message" },
            code: { type: "string", description: "Machine-readable error code" },
            statusCode: { type: "integer", description: "HTTP status code" },
          },
          example: { error: "Resource not found", code: "NOT_FOUND", statusCode: 404 },
        },

        // ─── Health ─────────────────────────────────────────────────────────────
        HealthSimple: {
          type: "object",
          properties: {
            status: { type: "string", enum: ["ok", "error"] },
            timestamp: { type: "string", format: "date-time" },
            uptime: { type: "number", description: "Server uptime in seconds" },
            version: { type: "string" },
            db: { type: "string", enum: ["connected", "error"] },
          },
        },
        HealthDetailed: {
          type: "object",
          properties: {
            status: { type: "string", enum: ["healthy", "degraded", "unhealthy"] },
            timestamp: { type: "string", format: "date-time" },
            uptime: { type: "number" },
            version: { type: "string" },
            checks: {
              type: "object",
              properties: {
                database: { type: "object", properties: { status: { type: "string" }, latencyMs: { type: "number" } } },
                cache: { type: "object", properties: { status: { type: "string" }, latencyMs: { type: "number" } } },
                ai: { type: "object", properties: { status: { type: "string" } } },
              },
            },
            alerts: {
              type: "array",
              items: { type: "object", properties: { level: { type: "string" }, message: { type: "string" } } },
            },
          },
        },

        // ─── Auth ──────────────────────────────────────────────────────────────
        SignupRequest: {
          type: "object",
          required: ["email", "password", "name"],
          properties: {
            email: { type: "string", format: "email", example: "player@courtvision.ai" },
            password: { type: "string", format: "password", minLength: 8, description: "At least 8 characters" },
            name: { type: "string", minLength: 2, maxLength: 100, example: "LeBron James" },
          },
        },
        SignupResponse: {
          type: "object",
          properties: {
            id: { type: "string", description: "User ID (UUID)" },
            email: { type: "string", format: "email" },
            name: { type: "string" },
          },
        },

        // ─── Player ────────────────────────────────────────────────────────────
        Player: {
          type: "object",
          properties: {
            id: { type: "string" },
            userId: { type: "string" },
            name: { type: "string" },
            email: { type: "string", format: "email" },
            avatarUrl: { type: "string", nullable: true },
            position: { type: "string", enum: ["PG", "SG", "SF", "PF", "C"], nullable: true },
            skillLevel: { type: "string", enum: ["beginner", "intermediate", "advanced", "elite"], nullable: true },
            xp: { type: "integer", description: "Total experience points" },
            shooting: { type: "number", description: "Shooting skill rating" },
            handling: { type: "number", description: "Ball handling skill rating" },
            finishing: { type: "number", description: "Finishing skill rating" },
            defense: { type: "number", description: "Defensive skill rating" },
            iq: { type: "number", description: "Basketball IQ rating" },
            currentStreak: { type: "integer", description: "Current consecutive workout days" },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        PlayerStats: {
          type: "object",
          properties: {
            totalXP: { type: "integer" },
            level: {
              type: "object",
              properties: {
                level: { type: "integer" },
                title: { type: "string", example: "Rising Star" },
                currentXP: { type: "integer" },
                xpToNext: { type: "integer" },
                progress: { type: "number", description: "Percentage progress to next level" },
              },
            },
            streak: { type: "integer" },
            skillDNA: {
              type: "object",
              properties: {
                shooting: { type: "number" },
                handling: { type: "number" },
                finishing: { type: "number" },
                defense: { type: "number" },
                iq: { type: "number" },
              },
              description: "Five-dimensional skill profile",
            },
            totalWorkouts: { type: "integer" },
            totalMatches: { type: "integer" },
            winRate: { type: "number" },
            recentActivity: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  type: { type: "string", enum: ["workout"] },
                  id: { type: "string" },
                  date: { type: "string", format: "date-time" },
                  totalDurationSec: { type: "integer" },
                  totalScore: { type: "number" },
                  avgScore: { type: "number" },
                  totalDrills: { type: "integer" },
                },
              },
            },
          },
        },

        // ─── Drills ────────────────────────────────────────────────────────────
        Drill: {
          type: "object",
          properties: {
            id: { type: "string" },
            name: { type: "string" },
            nameEn: { type: "string" },
            category: { type: "string", enum: ["shooting", "handling", "finishing", "defense", "iq", "conditioning"] },
            difficulty: { type: "string", enum: ["beginner", "intermediate", "advanced"] },
            description: { type: "string" },
            descriptionEn: { type: "string" },
            instructions: { type: "string" },
            instructionsEn: { type: "string" },
            durationSec: { type: "integer" },
            targetReps: { type: "integer" },
            icon: { type: "string", description: "Emoji icon" },
            isCustom: { type: "boolean" },
            isFavorite: { type: "boolean" },
          },
        },
        DrillListResponse: {
          type: "object",
          properties: {
            drills: { type: "array", items: { $ref: "#/components/schemas/Drill" } },
            nextCursor: { type: "string", nullable: true },
            total: { type: "integer", nullable: true },
          },
        },

        // ─── Videos ────────────────────────────────────────────────────────────
        Video: {
          type: "object",
          properties: {
            id: { type: "string" },
            playerId: { type: "string" },
            title: { type: "string" },
            url: { type: "string", format: "uri" },
            thumbnailUrl: { type: "string", format: "uri", nullable: true },
            durationSec: { type: "integer" },
            status: { type: "string", enum: ["processing", "ready", "error"] },
            tags: { type: "array", items: { type: "string" } },
            analysis: {
              type: "object",
              nullable: true,
              properties: {
                formScore: { type: "number" },
                shotCount: { type: "integer" },
                highlights: { type: "array", items: { type: "object", properties: { timestamp: { type: "number" }, label: { type: "string" } } } },
              },
            },
            createdAt: { type: "string", format: "date-time" },
          },
        },

        // ─── AI ────────────────────────────────────────────────────────────────
        AIChatRequest: {
          type: "object",
          required: ["message"],
          properties: {
            message: { type: "string", maxLength: 4000, description: "User's message to the AI Coach", example: "How can I improve my three-point shooting?" },
            history: {
              type: "array",
              description: "Conversation history (last 20 messages max)",
              items: {
                type: "object",
                properties: {
                  role: { type: "string", enum: ["user", "assistant"] },
                  content: { type: "string" },
                },
              },
            },
          },
        },
        AIChatResponse: {
          type: "object",
          properties: {
            response: { type: "string", description: "AI Coach's reply" },
            history: {
              type: "array",
              description: "Updated conversation history",
              items: {
                type: "object",
                properties: {
                  role: { type: "string", enum: ["user", "assistant"] },
                  content: { type: "string" },
                },
              },
            },
          },
        },

        // ─── Sessions ──────────────────────────────────────────────────────────
        Session: {
          type: "object",
          properties: {
            id: { type: "string" },
            playerId: { type: "string" },
            startedAt: { type: "string", format: "date-time" },
            endedAt: { type: "string", format: "date-time", nullable: true },
            totalDurationSec: { type: "integer" },
            totalScore: { type: "number" },
            avgScore: { type: "number" },
            totalDrills: { type: "integer" },
            notes: { type: "string", nullable: true },
          },
        },

        // ─── Plans ─────────────────────────────────────────────────────────────
        Plan: {
          type: "object",
          properties: {
            id: { type: "string" },
            playerId: { type: "string" },
            name: { type: "string" },
            focusAreas: { type: "array", items: { type: "string" } },
            duration: { type: "string", enum: ["1_week", "2_weeks", "4_weeks", "8_weeks"] },
            sessions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  day: { type: "integer" },
                  drills: { type: "array", items: { $ref: "#/components/schemas/Drill" } },
                },
              },
            },
            createdAt: { type: "string", format: "date-time" },
          },
        },

        // ─── Social ────────────────────────────────────────────────────────────
        FeedPost: {
          type: "object",
          properties: {
            id: { type: "string" },
            playerId: { type: "string" },
            playerName: { type: "string" },
            playerAvatar: { type: "string", nullable: true },
            type: { type: "string", enum: ["workout", "achievement", "challenge", "general"] },
            content: { type: "string" },
            mediaUrl: { type: "string", format: "uri", nullable: true },
            likes: { type: "integer" },
            comments: { type: "integer" },
            isLiked: { type: "boolean" },
            createdAt: { type: "string", format: "date-time" },
          },
        },

        // ─── Teams ─────────────────────────────────────────────────────────────
        Team: {
          type: "object",
          properties: {
            id: { type: "string" },
            name: { type: "string" },
            description: { type: "string", nullable: true },
            sport: { type: "string", default: "basketball" },
            isPrivate: { type: "boolean" },
            memberCount: { type: "integer" },
            captainId: { type: "string" },
            createdAt: { type: "string", format: "date-time" },
          },
        },

        // ─── Achievements ──────────────────────────────────────────────────────
        Achievement: {
          type: "object",
          properties: {
            id: { type: "string" },
            name: { type: "string" },
            description: { type: "string" },
            icon: { type: "string" },
            xpReward: { type: "integer" },
            category: { type: "string", enum: ["streak", "workout", "social", "challenge", "special"] },
            unlocked: { type: "boolean" },
            unlockedAt: { type: "string", format: "date-time", nullable: true },
            progress: { type: "number", minimum: 0, maximum: 100, nullable: true },
          },
        },

        // ─── Notifications ─────────────────────────────────────────────────────
        Notification: {
          type: "object",
          properties: {
            id: { type: "string" },
            type: { type: "string", enum: ["achievement", "challenge", "social", "system", "reminder"] },
            title: { type: "string" },
            body: { type: "string" },
            data: { type: "object", additionalProperties: {}, nullable: true },
            read: { type: "boolean" },
            createdAt: { type: "string", format: "date-time" },
          },
        },

        // ─── Generic ───────────────────────────────────────────────────────────
        PaginatedResponse: {
          type: "object",
          properties: {
            data: { type: "array", items: {}, description: "Array of items (type depends on endpoint)" },
            nextCursor: { type: "string", nullable: true, description: "Cursor for the next page" },
            total: { type: "integer", nullable: true, description: "Total count (only on first page)" },
          },
        },
      },
    },
  };

  return NextResponse.json(spec, {
    headers: {
      "Cache-Control": "public, max-age=300, s-maxage=300",
      "Access-Control-Allow-Origin": "*",
    },
  });
}