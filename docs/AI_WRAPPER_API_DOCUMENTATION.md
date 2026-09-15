# Actifyr AI Wrapper — Frontend API Documentation

Complete documentation for the AI Content Generation endpoints exposed by the Actifyr API (`/client/ai/*`). These endpoints authenticate via JWT and proxy requests to the internal `actiyr_ai_services` microservice.

---

## Overview

The Actifyr API wraps the internal AI service so the frontend only needs to talk to a single authenticated API. Three capabilities are available:

| Module              | Purpose                                                                       |
| ------------------- | ----------------------------------------------------------------------------- |
| **Token Estimate**  | Pre-calculate token usage and cost before committing to AI generation         |
| **Table of Contents (TOC)** | Generate and manage AI-created program schedules (day plans)        |
| **Daywise Content** | Generate, list, update, regenerate, and delete AI-generated day content items |

---

## Base URL & Authentication

- **Base path:** `/client/ai`
- **Authentication:** All endpoints require a valid JWT **Bearer** token issued by the Actifyr API.

```
Authorization: Bearer <access_token>
```

> **Important:** The `user_id` is extracted from the JWT token on the server. The frontend does **not** send `user_id` in request bodies or query parameters.

---

## Recommended Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          RECOMMENDED FLOW                                        │
└─────────────────────────────────────────────────────────────────────────────────┘

  ┌──────────────────┐
  │ 1. Token         │   POST /client/ai/token-estimate
  │    Estimate      │   → Returns program_config_id, cost estimates
  │    (optional)    │
  └────────┬─────────┘
           │
           ▼
  ┌──────────────────┐
  │ 2. Generate TOC  │   POST /client/ai/toc/generate
  │                  │   → Creates TableOfContent items
  │                  │   → Returns program_config_id, items[]
  └────────┬─────────┘
           │
           ▼
  ┌──────────────────┐
  │ 3. Generate      │   POST /client/ai/daywise-content/generate
  │    Daywise       │   → AI generates content per TOC item
  │    Content       │   → Returns generated_count, items[]
  └────────┬─────────┘
           │
           ▼
  ┌──────────────────┐
  │ 4. List / Update │   GET  /client/ai/daywise-content (list)
  │    / Regenerate  │   PATCH /client/ai/daywise-content/{id} (update)
  │                  │   POST /client/ai/daywise-content/regenerate (with feedback)
  └──────────────────┘
```

---

## Endpoints Summary

| Method | Endpoint                                              | Description                      |
| ------ | ----------------------------------------------------- | -------------------------------- |
| POST   | `/client/ai/token-estimate`                           | Full estimate (TOC + content)    |
| GET    | `/client/ai/toc/configs`                              | List all TOC configs             |
| GET    | `/client/ai/toc`                                      | List TOC items                   |
| POST   | `/client/ai/toc/generate`                             | Generate TOC                     |
| GET    | `/client/ai/toc/{toc_config_id}/items/{toc_item_id}`  | Get single TOC item              |
| PATCH  | `/client/ai/toc/{toc_config_id}/items/{toc_item_id}`  | Update TOC item                  |
| DELETE | `/client/ai/toc/{toc_config_id}/items/{toc_item_id}`  | Delete TOC item                  |
| GET    | `/client/ai/daywise-content`                          | List content                     |
| POST   | `/client/ai/daywise-content/generate`                 | Generate content                 |
| POST   | `/client/ai/daywise-content/regenerate`               | Regenerate with feedback         |
| GET    | `/client/ai/daywise-content/{content_id}`             | Get single content item          |
| PATCH  | `/client/ai/daywise-content/{content_id}`             | Update content item              |
| DELETE | `/client/ai/daywise-content/{content_id}`             | Delete content item              |

---

## 1. Token Estimate API

Tag: `Client - AI Content Generation`  
Purpose: Estimate token usage and cost before generating TOC or content.

### 1.1 POST `/client/ai/token-estimate`

**Description:** Full token estimate for both TOC generation and program content.

**Request body:** JSON

| Field                      | Type      | Required | Description                                                  |
| -------------------------- | --------- | -------- | ------------------------------------------------------------ |
| program_config_id          | int       | ✗        | Reuse existing config. Omit to create a new one from body fields. |
| program_duration           | int       | ✓*       | Days (e.g. 7, 15, 30). *Required if creating a new config.  |
| start_date                 | str       | ✗        | `"DD-MM-YYYY"`                                               |
| program_title              | str       | ✓*       | *Required when `program_config_id` is omitted.               |
| program_context            | str       | ✗        | Program context                                              |
| program_objective          | str       | ✗        | Objectives                                                   |
| expected_outcome           | str       | ✗        | Expected outcome                                             |
| participant_context        | str       | ✗        | Learner context                                              |
| output_guidelines          | str       | ✗        | Quality guidelines                                           |
| content_frequent_days      | list[str] | ✗        | e.g. `["monday","friday"]`                                   |
| pre_work                   | str       | ✗        | Pre-work description                                         |
| prework_days               | dict/list | ✗        | Pre-work days (e.g. `{"days_before_start": 3}`)              |
| skills_percentage          | int       | ✗        | Develop skills %                                             |
| awareness_percentage       | int       | ✗        | Create awareness %                                           |
| tone                       | str       | ✗        | Tone                                                         |
| context_type               | str       | ✗        | e.g. `"text"`, `"video"`, `"Mixed (text and video)"`         |
| number_of_words            | int       | ✗        | Words per content item (default 700–800)                     |
| include_assessment         | bool      | ✗        | Include assessment                                           |
| assessment_frequent        | str       | ✗        | Assessment frequency                                         |
| assessment_type            | str       | ✗        | Assessment type                                              |
| proof_of_work              | bool      | ✗        |                                                              |
| proof_of_action            | bool      | ✗        |                                                              |
| proof_of_intent            | bool      | ✗        |                                                              |
| general_evidence           | str       | ✗        |                                                              |
| include_group_discussion   | bool      | ✗        |                                                              |
| group_discussion_frequency | str       | ✗        |                                                              |

**Example request:**

```json
POST /client/ai/token-estimate
Authorization: Bearer <token>
Content-Type: application/json

{
  "program_duration": 30,
  "start_date": "01-03-2026",
  "program_title": "Design Thinking for Product Teams",
  "program_context": "Corporate L&D program for product and design roles.",
  "program_objective": "Apply empathy mapping and prototype solutions with real users.",
  "expected_outcome": "Participants deliver a user-validated prototype.",
  "participant_context": "Mid-level product managers, 3–5 years experience.",
  "output_guidelines": "Practical, workplace-relevant, clear language. No jargon.",
  "content_frequent_days": ["monday", "friday"],
  "skills_percentage": 60,
  "awareness_percentage": 40,
  "tone": "Professional and practical",
  "number_of_words": 700,
  "include_assessment": true,
  "assessment_frequent": "Weekly",
  "assessment_type": "MCQs and short reflections",
  "include_group_discussion": true,
  "group_discussion_frequency": "Weekly"
}
```

**Response:** `200 OK`

```json
{
  "program_config_id": 1,
  "total_token": 15000,
  "total_cost_usd": 0.012345,
  "toc_estimate": {
    "program_config_id": 1,
    "estimate_type": "toc",
    "estimate_token_total": 3000,
    "estimate_input_tokens": 2000,
    "estimate_output_tokens": 1000,
    "estimated_cost_usd": 0.002
  },
  "content_estimate": {
    "program_config_id": 1,
    "estimate_type": "program_content",
    "estimate_token_total": 12000,
    "estimate_input_tokens": 8000,
    "estimate_output_tokens": 4000,
    "estimated_cost_usd": 0.010345
  }
}
```

**Errors:**

| Status | Cause                                        |
| ------ | -------------------------------------------- |
| 400    | Missing required fields for new config       |
| 401    | Missing or invalid JWT token                 |
| 404    | Program config not found or access denied    |
| 502    | AI service unavailable or returned an error  |

---

## 2. Table of Contents (TOC) API

### 2.1 GET `/client/ai/toc/configs`

**Description:** List all TOC program configs owned by the authenticated user.

**Query parameters:** *(none — user is identified from JWT)*

**Example request:**

```
GET /client/ai/toc/configs
Authorization: Bearer <token>
```

**Response:** `200 OK`

```json
[
  { "id": 1, "program_title": "Leadership Program" },
  { "id": 2, "program_title": "Sales Training" }
]
```

**Errors:** `401` — Missing or invalid JWT token.

---

### 2.2 GET `/client/ai/toc`

**Description:** List TOC items for a specific program config.

**Query parameters:**

| Name          | Type | Required | Description           |
| ------------- | ---- | -------- | --------------------- |
| toc_config_id | int  | ✓        | TOC program config ID |

**Example request:**

```
GET /client/ai/toc?toc_config_id=1
Authorization: Bearer <token>
```

**Response:** `200 OK`

```json
[
  {
    "id": 1,
    "day_number": 1,
    "day": "Day 1",
    "date": "01-03-2026",
    "time": "09:00",
    "topic": "Introduction to Design Thinking",
    "objective": "Understand the design thinking framework",
    "description": "Overview of empathy, define, ideate, prototype, and test stages."
  }
]
```

**Errors:**

| Status | Cause                                     |
| ------ | ----------------------------------------- |
| 401    | Missing or invalid JWT token              |
| 404    | Program config not found or access denied |

---

### 2.3 POST `/client/ai/toc/generate`

**Description:** Generate a Table of Contents via AI. Uses the same request body as token-estimate.

Pass `program_config_id` alone to generate from an existing config (e.g. one returned by `/token-estimate`), or supply full program parameters to create a new config and generate simultaneously.

**Request body:** Same fields as `POST /client/ai/token-estimate` (see section 1.1).

**Example (from existing config):**

```json
POST /client/ai/toc/generate
Authorization: Bearer <token>
Content-Type: application/json

{
  "program_config_id": 1
}
```

**Example (full new config):**

```json
POST /client/ai/toc/generate
Authorization: Bearer <token>
Content-Type: application/json

{
  "program_duration": 30,
  "program_title": "Design Thinking for Product Teams",
  "program_context": "Corporate L&D program.",
  "tone": "Professional and practical",
  "number_of_words": 700
}
```

**Response:** `200 OK`

```json
{
  "program_config_id": 1,
  "items": [
    {
      "id": 1,
      "day_number": 1,
      "day": "Day 1",
      "date": "01-03-2026",
      "time": "09:00",
      "topic": "Introduction to Design Thinking",
      "objective": "Understand the design thinking framework",
      "description": "Overview of all five stages."
    }
  ]
}
```

**Errors:**

| Status | Cause                                          |
| ------ | ---------------------------------------------- |
| 400    | Missing required fields (e.g. program_title)   |
| 401    | Missing or invalid JWT token                   |
| 502    | AI generation failed                           |

---

### 2.4 GET `/client/ai/toc/{toc_config_id}/items/{toc_item_id}`

**Description:** Retrieve a single TOC item.

**Path parameters:**

| Name          | Type | Description           |
| ------------- | ---- | --------------------- |
| toc_config_id | int  | TOC program config ID |
| toc_item_id   | int  | TOC item ID           |

**Example request:**

```
GET /client/ai/toc/1/items/5
Authorization: Bearer <token>
```

**Response:** `200 OK`

```json
{
  "id": 5,
  "day_number": 5,
  "day": "Day 5",
  "date": "05-03-2026",
  "time": "09:00",
  "topic": "Ideation Techniques",
  "objective": "Generate diverse solution concepts",
  "description": "Brainstorming, SCAMPER, and How Might We methods."
}
```

**Errors:** `401` | `404` — Config or item not found.

---

### 2.5 PATCH `/client/ai/toc/{toc_config_id}/items/{toc_item_id}`

**Description:** Update a TOC item. At least one of `topic`, `objective`, or `description` must be provided.

**Path parameters:** Same as GET single TOC item.

**Request body:**

| Field       | Type | Required | Description          |
| ----------- | ---- | -------- | -------------------- |
| topic       | str  | ✗        | Updated topic        |
| objective   | str  | ✗        | Updated objective    |
| description | str  | ✗        | Updated description  |

**Example request:**

```json
PATCH /client/ai/toc/1/items/5
Authorization: Bearer <token>
Content-Type: application/json

{
  "topic": "Advanced Ideation Techniques",
  "objective": "Apply SCAMPER and HMW to real design challenges",
  "description": "Hands-on ideation session with product team case studies."
}
```

**Response:** `200 OK` — Updated `TocItemResponse` (same shape as GET).

**Errors:**

| Status | Cause                                              |
| ------ | -------------------------------------------------- |
| 400    | None of topic/objective/description were provided  |
| 401    | Missing or invalid JWT token                       |
| 404    | Config or item not found                           |

---

### 2.6 DELETE `/client/ai/toc/{toc_config_id}/items/{toc_item_id}`

**Description:** Delete a TOC item permanently.

**Path parameters:** Same as GET single TOC item.

**Example request:**

```
DELETE /client/ai/toc/1/items/5
Authorization: Bearer <token>
```

**Response:** `200 OK`

```json
{
  "message": "Table of Contents deleted successfully"
}
```

**Errors:** `401` | `404` — Config or item not found.

---

## 3. Daywise Content API

### 3.1 GET `/client/ai/daywise-content`

**Description:** List generated daywise content. Optionally filter by TOC config.

**Query parameters:**

| Name          | Type | Required | Description                                           |
| ------------- | ---- | -------- | ----------------------------------------------------- |
| toc_config_id | int  | ✗        | Filter by TOC config. Omit to return all user content |

**Example request (all content):**

```
GET /client/ai/daywise-content
Authorization: Bearer <token>
```

**Example request (filtered):**

```
GET /client/ai/daywise-content?toc_config_id=1
Authorization: Bearer <token>
```

**Response:** `200 OK`

```json
{
  "response": [
    {
      "id": 1,
      "table_of_content_id": 10,
      "day_number": 1,
      "title": "Introduction to Design Thinking",
      "introduction": "Design thinking is a human-centered approach...",
      "video_script": "Welcome to Day 1. Today we explore...",
      "mcqs": [
        {
          "question": "Which stage comes first in design thinking?",
          "options": ["a) Ideate", "b) Empathize", "c) Prototype", "d) Test"],
          "correct_answer": "b"
        }
      ],
      "actions": "Conduct an empathy interview with a colleague.",
      "resources": "IDEO Design Thinking Guide (link)",
      "created_at": "2026-03-01T10:00:00",
      "updated_at": "2026-03-01T10:00:00"
    }
  ]
}
```

**Errors:** `401` | `404` — Config not found (when filtering).

---

### 3.2 POST `/client/ai/daywise-content/generate`

**Description:** Generate AI content for TOC items.

**Request body:**

| Field                | Type      | Required | Description                                          |
| -------------------- | --------- | -------- | ---------------------------------------------------- |
| toc_config_id        | int       | ✓        | TOC program config ID                                |
| table_of_content_ids | list[int] | ✗        | Specific TOC item IDs. Omit or leave empty for all.  |

**Example (generate for all items):**

```json
POST /client/ai/daywise-content/generate
Authorization: Bearer <token>
Content-Type: application/json

{
  "toc_config_id": 1
}
```

**Example (generate for specific items):**

```json
POST /client/ai/daywise-content/generate
Authorization: Bearer <token>
Content-Type: application/json

{
  "toc_config_id": 1,
  "table_of_content_ids": [31, 32, 33]
}
```

**Response:** `200 OK`

```json
{
  "program_config_id": 1,
  "generated_count": 3,
  "items": [
    { "id": 1, "table_of_content_id": 31, "day_number": 1, "title": "Introduction" },
    { "id": 2, "table_of_content_id": 32, "day_number": 2, "title": "Empathy Mapping" },
    { "id": 3, "table_of_content_id": 33, "day_number": 3, "title": "Problem Definition" }
  ]
}
```

**Errors:**

| Status | Cause                                          |
| ------ | ---------------------------------------------- |
| 400    | No TOC items found; generate TOC first         |
| 401    | Missing or invalid JWT token                   |
| 404    | Config or specified TOC item IDs not found     |
| 502    | AI content generation failed                   |

---

### 3.3 POST `/client/ai/daywise-content/regenerate`

**Description:** Regenerate a single content item using written user feedback.

**Request body:**

| Field              | Type | Required | Description                        |
| ------------------ | ---- | -------- | ---------------------------------- |
| program_content_id | int  | ✓        | GeneratedProgramContent ID         |
| feedback           | str  | ✓        | User feedback (minimum 1 character)|

**Example request:**

```json
POST /client/ai/daywise-content/regenerate
Authorization: Bearer <token>
Content-Type: application/json

{
  "program_content_id": 42,
  "feedback": "Make the introduction shorter and add more examples in the video script."
}
```

**Response:** `200 OK` — `ContentGenerateResponse` with 1 item (same shape as generate).

**Errors:**

| Status | Cause                                    |
| ------ | ---------------------------------------- |
| 401    | Missing or invalid JWT token             |
| 404    | Content not found or access denied       |
| 502    | AI regeneration failed                   |

---

### 3.4 GET `/client/ai/daywise-content/{content_id}`

**Description:** Retrieve a single generated content item.

**Path parameters:**

| Name       | Type | Description                |
| ---------- | ---- | -------------------------- |
| content_id | int  | GeneratedProgramContent ID |

**Example request:**

```
GET /client/ai/daywise-content/42
Authorization: Bearer <token>
```

**Response:** `200 OK` — Full `ContentItemDetail` object (same shape as items in list response).

**Errors:** `401` | `404` — Content not found or access denied.

---

### 3.5 PATCH `/client/ai/daywise-content/{content_id}`

**Description:** Update a generated content item. At least one field must be provided.

**Path parameters:**

| Name       | Type | Description                |
| ---------- | ---- | -------------------------- |
| content_id | int  | GeneratedProgramContent ID |

**Request body:**

| Field        | Type       | Required | Description                       |
| ------------ | ---------- | -------- | --------------------------------- |
| title        | str        | ✗        | Day/session title (max 500 chars) |
| introduction | str        | ✗        | Introduction section              |
| video_script | str        | ✗        | Video script                      |
| mcqs         | list[dict] | ✗        | MCQ objects                       |
| actions      | str        | ✗        | Actions section                   |
| resources    | str        | ✗        | Resources section                 |

**Example request:**

```json
PATCH /client/ai/daywise-content/42
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Updated Day 1: Introduction to Design Thinking",
  "introduction": "Revised introduction focusing on real-world examples...",
  "mcqs": [
    {
      "question": "What is the first stage of design thinking?",
      "options": ["a) Ideate", "b) Empathize", "c) Prototype", "d) Define"],
      "correct_answer": "b"
    }
  ]
}
```

**Response:** `200 OK` — Updated `ContentItemDetail`.

**Errors:**

| Status | Cause                                |
| ------ | ------------------------------------ |
| 400    | No updatable fields provided         |
| 401    | Missing or invalid JWT token         |
| 404    | Content not found or access denied   |

---

### 3.6 DELETE `/client/ai/daywise-content/{content_id}`

**Description:** Delete a generated content item permanently.

**Path parameters:**

| Name       | Type | Description                |
| ---------- | ---- | -------------------------- |
| content_id | int  | GeneratedProgramContent ID |

**Example request:**

```
DELETE /client/ai/daywise-content/42
Authorization: Bearer <token>
```

**Response:** `200 OK`

```json
{
  "message": "Content deleted successfully"
}
```

**Errors:** `401` | `404` — Content not found or access denied.

---

## Error Responses

All endpoints may return standard HTTP errors:

| Status | Meaning                                                                     |
| ------ | --------------------------------------------------------------------------- |
| 400    | Bad Request — validation error, missing fields, or business rule violation  |
| 401    | Unauthorized — missing, expired, or invalid JWT token                       |
| 403    | Forbidden — authenticated user does not have the required role              |
| 404    | Not Found — resource not found or user lacks access                         |
| 502    | Bad Gateway — AI service unavailable or returned an invalid response        |

Error body format:

```json
{
  "detail": "Error message string"
}
```

---

## Data Models

### TocItemResponse

```json
{
  "id": 1,
  "day_number": 1,
  "day": "Day 1",
  "date": "01-03-2026",
  "time": "09:00",
  "topic": "string",
  "objective": "string",
  "description": "string"
}
```

### ContentItemDetail

```json
{
  "id": 1,
  "table_of_content_id": 10,
  "day_number": 1,
  "title": "string",
  "introduction": "string",
  "video_script": "string",
  "mcqs": [
    {
      "question": "string",
      "options": ["a) ...", "b) ...", "c) ...", "d) ..."],
      "correct_answer": "a"
    }
  ],
  "actions": "string",
  "resources": "string",
  "created_at": "2026-03-01T10:00:00",
  "updated_at": "2026-03-01T10:00:00"
}
```

### TokenEstimateResponse

```json
{
  "program_config_id": 1,
  "total_token": 15000,
  "total_cost_usd": 0.012345,
  "toc_estimate": {
    "program_config_id": 1,
    "estimate_type": "toc",
    "estimate_token_total": 3000,
    "estimate_input_tokens": 2000,
    "estimate_output_tokens": 1000,
    "estimated_cost_usd": 0.002
  },
  "content_estimate": {
    "program_config_id": 1,
    "estimate_type": "program_content",
    "estimate_token_total": 12000,
    "estimate_input_tokens": 8000,
    "estimate_output_tokens": 4000,
    "estimated_cost_usd": 0.010345
  }
}
```

---

## Configuration

The AI service base URL is configured via the `ACTIFYR_AI_SERVICE_BASE_URL` environment variable (default: `http://localhost:8001/api`). Set this in `.env` or your deployment environment.

---

*Generated from Actifyr API — AI wrapper implementation.*
