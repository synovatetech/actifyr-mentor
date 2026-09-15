# Content Update API

## Endpoint

| Property       | Value                                       |
|----------------|---------------------------------------------|
| **Method**     | `PUT`                                       |
| **URL**        | `/client/content/{content_id}/update`       |
| **Content-Type** | `multipart/form-data`                     |
| **Auth**       | Bearer token (roles: `client`, `client_admin`) |

> **Note:** The base URL for client admin APIs typically includes the `/client` prefix.

---

## How It Works: ID-Based Patch Logic

This endpoint uses an **ID-based patch** approach for nested entities (media files, tasks, questionnaires, resources).

### Simple Fields (title, content, date, time, status, link_to_previous_content)

- **Not included in payload** = no change (field keeps its current value)
- **Included in payload** = field is updated to the new value

### Nested Entity Lists (media_files_metadata, tasks, questionnaires, resources_metadata)

Each nested list follows three rules:

| Payload Value          | Behavior                                         |
|------------------------|--------------------------------------------------|
| **Not sent** (field omitted) | No changes to this entity type              |
| **Empty list** `[]`    | **Delete all** existing items of this type       |
| **List with items**    | Apply ID-based patch (see below)                 |

### ID-Based Patch for Individual Items

When a list with items is provided:

| `id` Field           | Behavior                                                 |
|----------------------|----------------------------------------------------------|
| **`id` present** (e.g. `"id": 5`) | **Update** the existing item with that ID   |
| **`id` absent or null**            | **Create** a new item                       |
| **Existing item not in payload**   | **Soft-delete** that item                   |

**Example:** Content has media files with IDs `[1, 2, 3]`. You send:

```json
[
  {"id": 1, "type": "video", "name": "updated_video"},
  {"type": "audio", "name": "new_audio", "has_new_file": true}
]
```

Result:
- ID 1 = **updated** (name changed)
- ID 2 = **soft-deleted** (not in payload)
- ID 3 = **soft-deleted** (not in payload)
- New audio item = **created**

---

## Form Fields Reference

### Simple Fields

| Field                    | Type      | Required | Default | Description                          |
|--------------------------|-----------|----------|---------|--------------------------------------|
| `title`                  | `string`  | No       | `null`  | Content title                        |
| `content`                | `string`  | No       | `null`  | HTML body content                    |
| `date`                   | `string`  | No       | `null`  | ISO 8601 format (e.g. `2026-03-15T10:00:00`) |
| `time`                   | `string`  | No       | `null`  | `HH:MM:SS` format (e.g. `14:30:00`) |
| `link_to_previous_content` | `boolean` | No     | `null`  | `true` or `false`                    |
| `content_status`         | `string`  | No       | `null`  | `"draft"` or `"active"`              |

### JSON Metadata Fields (sent as JSON strings)

| Field                    | Type          | Default | Description                                      |
|--------------------------|---------------|---------|--------------------------------------------------|
| `media_files_metadata`   | `JSON string` | `null` (omitted) | Array of media file update objects        |
| `tasks`                  | `JSON string` | `null` (omitted) | Array of task update objects               |
| `questionnaires`         | `JSON string` | `null` (omitted) | Array of questionnaire update objects      |
| `resources_metadata`     | `JSON string` | `null` (omitted) | Array of resource update objects           |

### File Upload Fields

| Field               | Type           | Description                                              |
|---------------------|----------------|----------------------------------------------------------|
| `media_files`       | `File[]`       | New media files (for items with `has_new_file: true`)    |
| `resource_files`    | `File[]`       | New resource files (for FILE-type items with `has_new_file: true`) |
| `task_attachments`  | `File[]`       | New task attachments (for items with `has_new_attachment: true`)    |

> **File ordering matters.** Files must appear in the same order as the items in the corresponding metadata array that have `has_new_file: true` (or `has_new_attachment: true`).

---

## Enum Values

### ContentStatus

| Value     | Description       |
|-----------|-------------------|
| `draft`   | Draft content     |
| `active`  | Published content |

### ContentMediaType

| Value   | Description |
|---------|-------------|
| `video` | Video file  |
| `audio` | Audio file  |

### ContentTaskType

| Value     | Description        |
|-----------|--------------------|
| `general` | General task       |
| `PoW`     | Point of Work      |
| `PoA`     | Point of Action    |
| `PoI`     | Point of Intent    |

### ResourceType

| Value  | Description                    |
|--------|--------------------------------|
| `url`  | URL link resource              |
| `file` | Uploaded file resource         |

### ResourceFrom

| Value     | Description                                    |
|-----------|------------------------------------------------|
| `content` | Resource belongs to a content                  |
| `direct`  | Resource directly added by user                |
| `both`    | Resource from content and also directly accessible |

---

## Nested Object Schemas

### ContentMediaFileUpdateMetadata

```json
{
  "id": 5,
  "type": "video",
  "name": "intro_video",
  "thumbnail_path": "/thumbnails/intro.jpg",
  "duration": 120,
  "has_new_file": false
}
```

| Field            | Type      | Required | Description                                      |
|------------------|-----------|----------|--------------------------------------------------|
| `id`             | `int`     | No       | Existing ID to update; omit/null to create new   |
| `type`           | `string`  | Yes      | `"video"` or `"audio"`                           |
| `name`           | `string`  | No       | Display name (default: `"media_file"`)           |
| `thumbnail_path` | `string`  | No       | Thumbnail URL path                               |
| `duration`       | `int`     | No       | Duration in seconds                              |
| `has_new_file`   | `boolean` | No       | `true` if a new file is uploaded for this item (default: `false`) |

### ContentTaskUpdateRequest

```json
{
  "id": 3,
  "type": "PoW",
  "task": "Complete the survey",
  "action": ["survey", "review"],
  "has_new_attachment": false,
  "point": 10
}
```

| Field                | Type       | Required | Description                                        |
|----------------------|------------|----------|----------------------------------------------------|
| `id`                 | `int`      | No       | Existing ID to update; omit/null to create new     |
| `type`               | `string`   | Yes      | `"general"`, `"PoW"`, `"PoA"`, or `"PoI"`         |
| `task`               | `string`   | No       | Task description text                              |
| `action`             | `string[]` | No       | List of action strings (default: `[]`)             |
| `has_new_attachment` | `boolean`  | No       | `true` if a new attachment file is uploaded (default: `false`) |
| `point`              | `int`      | No       | Points for the task                                |

### QuestionnaireUpdateRequest

```json
{
  "id": 7,
  "question": "What is the capital of France?",
  "option_a": "London",
  "option_b": "Paris",
  "option_c": "Berlin",
  "option_d": "Madrid",
  "right_answer": "B"
}
```

| Field          | Type     | Required | Description                                    |
|----------------|----------|----------|------------------------------------------------|
| `id`           | `int`    | No       | Existing ID to update; omit/null to create new |
| `question`     | `string` | Yes      | The question text                              |
| `option_a`     | `string` | Yes      | Option A text                                  |
| `option_b`     | `string` | Yes      | Option B text                                  |
| `option_c`     | `string` | Yes      | Option C text                                  |
| `option_d`     | `string` | Yes      | Option D text                                  |
| `right_answer` | `string` | Yes      | Correct answer: `"A"`, `"B"`, `"C"`, or `"D"` |

### ResourceUpdateMetadata

```json
{
  "id": 2,
  "type": "url",
  "label": "Reference Article",
  "value": "https://example.com/article",
  "resource_from": "content",
  "is_downloadable": false,
  "has_new_file": false
}
```

| Field             | Type      | Required | Description                                      |
|-------------------|-----------|----------|--------------------------------------------------|
| `id`              | `int`     | No       | Existing ID to update; omit/null to create new   |
| `type`            | `string`  | Yes      | `"url"` or `"file"`                              |
| `label`           | `string`  | Yes      | Display label                                    |
| `value`           | `string`  | No       | URL string for `url` type; auto-set for `file` type |
| `resource_from`   | `string`  | No       | `"content"`, `"direct"`, or `"both"` (default: `"content"`) |
| `is_downloadable` | `boolean` | No       | Whether the resource is downloadable (default: `false`)      |
| `has_new_file`    | `boolean` | No       | `true` if replacing the file for `file` type (default: `false`) |

---

## Response Schema

```json
{
  "content_id": 42,
  "program_id": 1,
  "title": "Updated Title",
  "message": "Content updated successfully",
  "media_file_ids": [5, 12],
  "task_ids": [3, 8],
  "questionnaire_ids": [7, 9],
  "resource_ids": [2, 14]
}
```

The response returns the IDs of **all current** items for each entity type after the update (including existing unchanged items, updated items, and newly created items).

---

## Sample Payloads

All examples assume `content_id = 42` in the URL: `PUT /content/42/update`

---

### 1. Update Only Simple Fields (title, content text, status)

**Form Data:**

| Key              | Value                                      |
|------------------|--------------------------------------------|
| `title`          | `Updated Module Title`                     |
| `content`        | `<p>New HTML body content here.</p>`       |
| `content_status` | `active`                                   |

No files attached. No JSON metadata fields sent. Only the three simple fields are updated; everything else remains unchanged.

---

### 2. Update Only Date and Time

**Form Data:**

| Key    | Value                      |
|--------|----------------------------|
| `date` | `2026-04-01T09:00:00`      |
| `time` | `09:00:00`                 |

---

### 3. Add New Media Files (no existing media changes)

Assume the content currently has media file IDs `[1, 2]`. To **keep all existing** and add a new video:

**Form Data:**

| Key                    | Value |
|------------------------|-------|
| `media_files_metadata` | (see JSON below) |
| `media_files`          | (1 file: `new_video.mp4`) |

**`media_files_metadata` JSON string:**

```json
[
  {"id": 1, "type": "video", "name": "existing_video_1"},
  {"id": 2, "type": "audio", "name": "existing_audio_1"},
  {"type": "video", "name": "brand_new_video", "has_new_file": true, "duration": 300}
]
```

- IDs 1 and 2 are kept (passed with their existing data).
- The third item has no `id`, so it is **created**. Since `has_new_file: true`, the uploaded `new_video.mp4` is paired with it.

---

### 4. Update Existing + Add New Media Files (mixed)

Assume existing media file IDs: `[10, 11, 12]`. We want to update #10's name, delete #11, keep #12, and add a new audio file.

**Form Data:**

| Key                    | Value |
|------------------------|-------|
| `media_files_metadata` | (see JSON below) |
| `media_files`          | (1 file: `new_audio.mp3`) |

**`media_files_metadata` JSON string:**

```json
[
  {"id": 10, "type": "video", "name": "renamed_video", "duration": 180},
  {"id": 12, "type": "audio", "name": "kept_audio"},
  {"type": "audio", "name": "fresh_audio", "has_new_file": true, "duration": 60}
]
```

- ID 10 = **updated** (name changed to `renamed_video`)
- ID 11 = **soft-deleted** (missing from the list)
- ID 12 = **kept** (passed as-is)
- New item = **created** with uploaded `new_audio.mp3`

---

### 5. Delete All Media Files

To remove every media file from the content, send an empty array:

**Form Data:**

| Key                    | Value |
|------------------------|-------|
| `media_files_metadata` | `[]`  |

No files attached.

---

### 6. Update Tasks (update existing + add new + implicit delete)

Assume existing task IDs: `[20, 21, 22]`. We want to update #20, delete #21 and #22, and add one new task.

**Form Data:**

| Key                | Value |
|--------------------|-------|
| `tasks`            | (see JSON below) |
| `task_attachments` | (1 file: `worksheet.pdf`) |

**`tasks` JSON string:**

```json
[
  {
    "id": 20,
    "type": "PoW",
    "task": "Updated task description",
    "action": ["complete", "submit"],
    "point": 15
  },
  {
    "type": "PoA",
    "task": "New action task",
    "action": ["review"],
    "has_new_attachment": true,
    "point": 5
  }
]
```

- ID 20 = **updated**
- IDs 21, 22 = **soft-deleted** (not in payload)
- New PoA task = **created** with uploaded `worksheet.pdf`

---

### 7. Update Questionnaires

Assume existing questionnaire IDs: `[30, 31]`. Update #30, delete #31, add a new one.

**Form Data:**

| Key              | Value |
|------------------|-------|
| `questionnaires` | (see JSON below) |

**`questionnaires` JSON string:**

```json
[
  {
    "id": 30,
    "question": "Updated question text?",
    "option_a": "Option A revised",
    "option_b": "Option B revised",
    "option_c": "Option C revised",
    "option_d": "Option D revised",
    "right_answer": "C"
  },
  {
    "question": "Brand new question?",
    "option_a": "Alpha",
    "option_b": "Beta",
    "option_c": "Gamma",
    "option_d": "Delta",
    "right_answer": "A"
  }
]
```

- ID 30 = **updated**
- ID 31 = **soft-deleted**
- New questionnaire = **created**

---

### 8. Update Resources (URL and FILE types)

Assume existing resource IDs: `[40, 41]` where 40 is a URL resource and 41 is a FILE resource. Update the URL, replace the file, and add a new URL resource.

**Form Data:**

| Key                  | Value |
|----------------------|-------|
| `resources_metadata` | (see JSON below) |
| `resource_files`     | (1 file: `updated_guide.pdf`) |

**`resources_metadata` JSON string:**

```json
[
  {
    "id": 40,
    "type": "url",
    "label": "Updated Reference Link",
    "value": "https://example.com/new-article"
  },
  {
    "id": 41,
    "type": "file",
    "label": "Updated Guide PDF",
    "has_new_file": true,
    "is_downloadable": true
  },
  {
    "type": "url",
    "label": "Additional Resource",
    "value": "https://example.com/extra"
  }
]
```

- ID 40 = **updated** (URL changed)
- ID 41 = **updated** (file replaced with uploaded `updated_guide.pdf`)
- New URL resource = **created**

---

### 9. Full Update (all fields and all nested entities)

A comprehensive update touching every field and every entity type.

**Form Data:**

| Key                        | Value                                        |
|----------------------------|----------------------------------------------|
| `title`                    | `Comprehensive Module Update`                |
| `content`                  | `<h1>Revised</h1><p>Full content body.</p>`  |
| `date`                     | `2026-05-15T14:00:00`                        |
| `time`                     | `14:00:00`                                   |
| `link_to_previous_content` | `true`                                       |
| `content_status`           | `active`                                     |
| `media_files_metadata`     | (see JSON below)                             |
| `tasks`                    | (see JSON below)                             |
| `questionnaires`           | (see JSON below)                             |
| `resources_metadata`       | (see JSON below)                             |
| `media_files`              | (1 file: `overview.mp4`)                     |
| `resource_files`           | (1 file: `handbook.pdf`)                     |
| `task_attachments`         | (1 file: `checklist.pdf`)                    |

**`media_files_metadata`:**

```json
[
  {"id": 1, "type": "video", "name": "existing_intro", "duration": 120},
  {"type": "video", "name": "overview", "has_new_file": true, "duration": 240}
]
```

**`tasks`:**

```json
[
  {"id": 20, "type": "PoW", "task": "Complete exercise", "action": ["do", "submit"], "point": 10},
  {"type": "general", "task": "Read the handbook", "action": ["read"], "has_new_attachment": true, "point": 5}
]
```

**`questionnaires`:**

```json
[
  {
    "id": 30,
    "question": "What is 2+2?",
    "option_a": "3",
    "option_b": "4",
    "option_c": "5",
    "option_d": "6",
    "right_answer": "B"
  }
]
```

**`resources_metadata`:**

```json
[
  {"id": 40, "type": "url", "label": "Wiki Page", "value": "https://wiki.example.com"},
  {"type": "file", "label": "Handbook", "has_new_file": true, "is_downloadable": true}
]
```

---

### 10. Minimal Update (single field only)

Change only the title, nothing else.

**Form Data:**

| Key     | Value              |
|---------|--------------------|
| `title` | `Quick Title Fix`  |

No files. No JSON metadata. Only the title changes.

---

## Error Responses

### 400 Bad Request

**Content not found:**

```json
{
  "detail": "Content with id=999 not found"
}
```

**Invalid date format:**

```json
{
  "detail": "Invalid date format: not-a-date. Expected ISO format."
}
```

**Invalid time format:**

```json
{
  "detail": "Invalid time format: 25:99:99. Expected HH:MM:SS format."
}
```

**Invalid JSON in metadata fields:**

```json
{
  "detail": "Invalid JSON in request: Expecting value: line 1 column 1 (char 0)"
}
```

**Invalid right_answer in questionnaire:**

```json
{
  "detail": "1 validation error for QuestionnaireUpdateRequest\nright_answer\n  Value error, right_answer must be one of: A, B, C, D"
}
```

**Invalid content_status value:**

```json
{
  "detail": "'invalid_status' is not a valid ContentStatus"
}
```

### 500 Internal Server Error

```json
{
  "detail": "An error occurred while updating content"
}
```

---

## Quick Reference: What to Send When

| Goal                                  | Fields to Include                                  |
|---------------------------------------|----------------------------------------------------|
| Change title only                     | `title`                                            |
| Change status to active               | `content_status` = `"active"`                      |
| Reschedule content                    | `date`, `time`                                     |
| Add new media to existing             | `media_files_metadata` (include all existing IDs + new items), `media_files` |
| Remove a specific media file          | `media_files_metadata` (include all IDs **except** the one to remove) |
| Remove all media files                | `media_files_metadata` = `[]`                      |
| Replace a task's attachment           | `tasks` (include task with `has_new_attachment: true`), `task_attachments` |
| Add new questionnaires                | `questionnaires` (include existing IDs + new items) |
| Replace a resource file               | `resources_metadata` (include resource with `has_new_file: true`), `resource_files` |
| Full overhaul                         | All fields + all metadata + all files              |
