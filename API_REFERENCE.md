# Sweet Suite AAC API Reference

This document provides a reference for the APIs available in the Sweet Suite AAC (CoughDrop) application. All API endpoints are prefixed with `/api/v1/`.

## Authentication

Most API endpoints require an API token passed via the `Authorization` header. Tokens are obtained via the OAuth2 flow or the session endpoints below.

### OAuth2 / Session

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/oauth2/token` | OAuth2 token info |
| `POST` | `/oauth2/token` | Exchange credentials for a token |
| `POST` | `/oauth2/token/login` | OAuth2 login |
| `DELETE` | `/oauth2/token` | Revoke a token (logout) |
| `GET` | `/oauth2/token/status` | Check local token status |
| `POST` | `/api/v1/token/refresh` | Refresh an OAuth2 token |
| `POST` | `/api/v1/auth/admin` | Admin authentication |
| `POST` | `/api/v1/status` | Post status |
| `GET` | `/api/v1/status` | Get status |
| `GET` | `/api/v1/status/heartbeat` | Heartbeat check |
| `GET` | `/api/v1/token_check` | Validate a token |

---

## Boards (`/api/v1/boards`)

Boards represent AAC communication boards containing buttons and grid layouts.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/boards` | List/search boards. Supports `q`, `locale`, `sort`, `user_id`, `public`, `starred`, `tag`, `category`, `shared`, `include_shared` query params. |
| `POST` | `/api/v1/boards` | Create a new board |
| `GET` | `/api/v1/boards/:id` | Get a specific board |
| `PUT` | `/api/v1/boards/:id` | Update a board |
| `DELETE` | `/api/v1/boards/:id` | Delete a board |
| `GET` | `/api/v1/boards/:id/stats` | Get usage statistics for a board |
| `GET` | `/api/v1/boards/:id/simple.obf` | Download board in Open Board Format (OBF) |
| `GET` | `/api/v1/boards/:id/copies` | List copies of a board |
| `POST` | `/api/v1/boards/:id/stars` | Star a board |
| `DELETE` | `/api/v1/boards/:id/stars` | Unstar a board |
| `POST` | `/api/v1/boards/:id/download` | Schedule a board download (PDF, OBF, OBZ, etc.) |
| `POST` | `/api/v1/boards/:id/rename` | Rename a board |
| `POST` | `/api/v1/boards/:id/share_response` | Approve or reject a board share request |
| `POST` | `/api/v1/boards/:id/translate` | Translate board content |
| `POST` | `/api/v1/boards/:id/swap_images` | Swap images across a board set |
| `POST` | `/api/v1/boards/:id/privacy` | Update privacy settings for a board and its downstream boards |
| `POST` | `/api/v1/boards/:id/tag` | Tag or untag a board |
| `POST` | `/api/v1/boards/:id/slice_locales` | Slice locale data from a board |
| `POST` | `/api/v1/boards/:id/rollback` | Roll back a board to a previous version by date |
| `POST` | `/api/v1/boards/imports` | Import a board from a URL or OBF/OBZ file upload |
| `POST` | `/api/v1/boards/unlink` | Unlink, unstar, or untag a board from a user |

---

## Users (`/api/v1/users`)

Users include communicators, supervisors, and administrators.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/users` | Search users (admin or org managers only). Supports `q` param. |
| `POST` | `/api/v1/users` | Create a new user |
| `GET` | `/api/v1/users/:id` | Get a specific user |
| `PUT` | `/api/v1/users/:id` | Update a user |
| `GET` | `/api/v1/users/:id/supervisors` | List a user's supervisors |
| `GET` | `/api/v1/users/:id/supervisees` | List a user's supervisees |
| `GET` | `/api/v1/users/:id/stats/daily` | Get daily usage statistics |
| `GET` | `/api/v1/users/:id/stats/hourly` | Get hourly usage statistics |
| `GET` | `/api/v1/users/:id/alerts` | Get uncleared note alerts for a user |
| `GET` | `/api/v1/users/:id/sync_stamp` | Get the user's sync stamp and badge update timestamp |
| `GET` | `/api/v1/users/:id/board_revisions` | Get current revision hashes for all of a user's boards |
| `GET` | `/api/v1/users/:id/boards` | Get specific boards by ID for a user (up to 25 via `ids` param) |
| `GET` | `/api/v1/users/:id/places` | Get nearby places by latitude/longitude |
| `GET` | `/api/v1/users/:id/daily_use` | Get the user's daily use log (admin only) |
| `GET` | `/api/v1/users/:id/core_lists` | Get core and fringe word lists for a user |
| `GET` | `/api/v1/users/:id/message_bank_suggestions` | Get message bank suggestions |
| `GET` | `/api/v1/users/:id/word_map` | Get a word map for a user's board set |
| `GET` | `/api/v1/users/:id/word_activities` | Get word activity suggestions for a user |
| `GET` | `/api/v1/users/:id/valet_credentials` | Get temporary valet login credentials |
| `GET` | `/api/v1/users/:id/ws_settings` | Get WebSocket room settings and verifier token |
| `GET` | `/api/v1/users/:id/ws_lookup` | Look up a user from an obfuscated WebSocket device ID |
| `GET` | `/api/v1/users/:id/protected_image/:library/:image_id` | Proxy a protected symbol image |
| `GET` | `/api/v1/users/:id/external_nonce/:nonce_id` | Get an external encryption nonce for a log session |
| `POST` | `/api/v1/users/:id/confirm_registration` | Confirm or resend a registration confirmation |
| `POST` | `/api/v1/users/:id/password_reset` | Validate a password reset code and return a reset token |
| `POST` | `/api/v1/users/:id/subscription` | Subscribe a user (process payment token or apply override) |
| `DELETE` | `/api/v1/users/:id/subscription` | Unsubscribe a user |
| `POST` | `/api/v1/users/:id/verify_receipt` | Verify an in-app purchase receipt |
| `POST` | `/api/v1/users/:id/replace_board` | Replace one board with another across a user's board set |
| `POST` | `/api/v1/users/:id/copy_board_links` | Copy board links from one board to another |
| `POST` | `/api/v1/users/:id/claim_voice` | Claim a premium voice for a user |
| `POST` | `/api/v1/users/:id/start_code` | Generate or delete a supervisor start code |
| `POST` | `/api/v1/users/:id/rename` | Rename a user (support action) |
| `POST` | `/api/v1/users/:id/activate_button` | Trigger a button integration action |
| `POST` | `/api/v1/users/:id/translate` | Translate a batch of words |
| `POST` | `/api/v1/users/:id/ws_encrypt` | Encrypt a string for WebSocket transmission |
| `POST` | `/api/v1/users/:id/ws_decrypt` | Decrypt a WebSocket-encrypted string |
| `POST` | `/api/v1/users/:id/flush/logs` | Schedule deletion of all logs for a user |
| `POST` | `/api/v1/users/:id/flush/user` | Schedule deletion of a user account |
| `POST` | `/api/v1/users/:id/evals/transfer` | Transfer an eval account to another user |
| `POST` | `/api/v1/users/:id/evals/reset` | Reset an eval account |
| `POST` | `/api/v1/users/:id/2fa` | Enable, disable, or confirm two-factor authentication |
| `PUT` | `/api/v1/users/:id/core_list` | Update a user's custom core word list |
| `PUT` | `/api/v1/users/:id/devices/:device_id` | Rename a device |
| `DELETE` | `/api/v1/users/:id/devices/:device_id` | Hide a device |

---

## Organizations (`/api/v1/organizations`)

Organizations group users and manage licenses, supervisors, and reporting.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/organizations` | List all organizations (admin only) |
| `POST` | `/api/v1/organizations` | Create an organization (admin only) |
| `GET` | `/api/v1/organizations/:id` | Get a specific organization |
| `PUT` | `/api/v1/organizations/:id` | Update an organization |
| `DELETE` | `/api/v1/organizations/:id` | Delete an organization |
| `GET` | `/api/v1/organizations/:id/users` | List organization users |
| `GET` | `/api/v1/organizations/:id/supervisors` | List organization supervisors |
| `GET` | `/api/v1/organizations/:id/managers` | List organization managers |
| `GET` | `/api/v1/organizations/:id/evals` | List evaluation accounts in the organization |
| `GET` | `/api/v1/organizations/:id/extras` | List users with extras enabled |
| `GET` | `/api/v1/organizations/:id/logs` | List log sessions for the organization |
| `GET` | `/api/v1/organizations/:id/stats` | Get usage statistics for the organization |
| `GET` | `/api/v1/organizations/:id/admin_reports` | Run an admin report (requires `report` param) |
| `GET` | `/api/v1/organizations/:id/blocked_emails` | List blocked email addresses (admin org only) |
| `GET` | `/api/v1/organizations/:id/blocked_cells` | List blocked cell numbers (admin org only) |
| `POST` | `/api/v1/organizations/:id/extra_action` | Perform an admin extra action (e.g. block email) |
| `POST` | `/api/v1/organizations/:id/alias` | Link a SAML alias to a user |
| `POST` | `/api/v1/organizations/:id/start_code` | Generate or delete an organization start code |
| `POST` | `/api/v1/organizations/:id/status/:user_id` | Set a user's status within the organization |

---

## Logs (`/api/v1/logs`)

Logs record AAC usage sessions, notes, assessments, and evaluations.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/logs` | List logs for a user. Requires `user_id` param. Supports filtering by `type`, `start`, `end`, `goal_id`, `device_id`, `highlighted`. |
| `POST` | `/api/v1/logs` | Create a new log session |
| `GET` | `/api/v1/logs/:id` | Get a specific log |
| `PUT` | `/api/v1/logs/:id` | Update a log |
| `GET` | `/api/v1/logs/:id/lam` | Download a log in LAM (Language Acquisition Monitor) format |
| `GET` | `/api/v1/logs/obl` | Export a log or user's logs in OBL format. Requires `log_id` or `user_id` param. |
| `POST` | `/api/v1/logs/import` | Import logs from a URL or file upload (OBL or LAM format) |
| `POST` | `/api/v1/logs/code_check` | Validate a user's private logging code |
| `GET` | `/api/v1/logs/trends` | Get global usage trends |
| `GET` | `/api/v1/logs/trends_slice` | Get usage trends for a specific set of users (requires integration credentials) |
| `GET` | `/api/v1/logs/anonymous_logs` | Get anonymized log data |

---

## Search (`/api/v1/search`)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/search/symbols` | Search for symbols by keyword |
| `GET` | `/api/v1/search/protected_symbols` | Search for symbols from protected/licensed libraries |
| `GET` | `/api/v1/search/external_resources` | Search for external resources |
| `GET` | `/api/v1/search/proxy` | Proxy an external search request |
| `GET` | `/api/v1/search/parts_of_speech` | Look up parts of speech for a word |
| `GET` | `/api/v1/search/apps` | Search for AAC-related apps |
| `GET` | `/api/v1/search/audio` | Search for audio clips |
| `GET` | `/api/v1/search/focus` | Search for focus/activity configurations |

---

## Images (`/api/v1/images`)

Button images used on boards.

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/images` | Create/upload a new image |
| `GET` | `/api/v1/images/:id` | Get a specific image |
| `PUT` | `/api/v1/images/:id` | Update an image |
| `GET` | `/api/v1/images/batch` | Batch fetch multiple images |
| `GET` | `/api/v1/images/:id/upload_success` | Confirm a successful remote upload |

---

## Sounds (`/api/v1/sounds`)

Button sounds used on boards.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/sounds` | List sounds for a user (requires `user_id` param) |
| `POST` | `/api/v1/sounds` | Create/upload a new sound |
| `GET` | `/api/v1/sounds/:id` | Get a specific sound |
| `PUT` | `/api/v1/sounds/:id` | Update a sound |
| `DELETE` | `/api/v1/sounds/:id` | Delete a sound |
| `POST` | `/api/v1/sounds/imports` | Import sounds from a ZIP file or URL |
| `GET` | `/api/v1/sounds/:id/upload_success` | Confirm a successful remote upload |

---

## Videos (`/api/v1/videos`)

User-recorded videos attached to logs or buttons.

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/videos` | Create/upload a new video |
| `GET` | `/api/v1/videos/:id` | Get a specific video |
| `PUT` | `/api/v1/videos/:id` | Update a video |
| `GET` | `/api/v1/videos/:id/upload_success` | Confirm a successful remote upload |

---

## Goals (`/api/v1/goals`)

User goals for tracking vocabulary and communication progress.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/goals` | List goals. Supports `user_id`, `template_header`, `global`, `template_header_id`, `active` params. |
| `POST` | `/api/v1/goals` | Create a new goal |
| `GET` | `/api/v1/goals/:id` | Get a specific goal |
| `PUT` | `/api/v1/goals/:id` | Update a goal |
| `DELETE` | `/api/v1/goals/:id` | Delete a goal |

---

## Badges (`/api/v1/badges`)

Badges awarded for achieving goals.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/badges` | List badges for a user. Supports `user_id`, `goal_id`, `highlighted`, `earned`, `recent` params. |
| `GET` | `/api/v1/badges/:id` | Get a specific badge |
| `PUT` | `/api/v1/badges/:id` | Update a badge |

---

## Profiles (`/api/v1/profiles`)

Profile templates and completed profile sessions.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/profiles` | List available profile templates for a user (requires `user_id` param) |
| `GET` | `/api/v1/profiles/:id` | Get a specific profile template |
| `GET` | `/api/v1/profiles/latest` | Get the most recent profile sessions for a user (requires `user_id` param) |

---

## Units (`/api/v1/units`)

Organization units (rooms/classrooms) grouping communicators and supervisors.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/units` | List units for an organization (requires `organization_id` param) |
| `POST` | `/api/v1/units` | Create a new unit |
| `GET` | `/api/v1/units/:id` | Get a specific unit |
| `PUT` | `/api/v1/units/:id` | Update a unit |
| `DELETE` | `/api/v1/units/:id` | Delete a unit |
| `GET` | `/api/v1/units/:id/stats` | Get usage statistics for a unit |
| `GET` | `/api/v1/units/:id/log_stats` | Get word and modeling statistics for a unit |
| `GET` | `/api/v1/units/:id/logs` | List log sessions for communicators in a unit |
| `POST` | `/api/v1/units/:id/note` | Send a note/message to all members of a unit |

---

## Snapshots (`/api/v1/snapshots`)

Log snapshots capturing a point-in-time summary of usage data.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/snapshots` | List snapshots for a user (requires `user_id` param) |
| `POST` | `/api/v1/snapshots` | Create a new snapshot |
| `GET` | `/api/v1/snapshots/:id` | Get a specific snapshot |
| `PUT` | `/api/v1/snapshots/:id` | Update a snapshot |
| `DELETE` | `/api/v1/snapshots/:id` | Delete a snapshot |

---

## Lessons (`/api/v1/lessons`)

Lessons and training activities that can be assigned to users or organizations.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/lessons` | List lessons. Supports `user_id`, `organization_id`, `organization_unit_id` params. |
| `POST` | `/api/v1/lessons` | Create a new lesson |
| `GET` | `/api/v1/lessons/:id` | Get a specific lesson |
| `PUT` | `/api/v1/lessons/:id` | Update a lesson |
| `DELETE` | `/api/v1/lessons/:id` | Delete a lesson |
| `POST` | `/api/v1/lessons/:id/assign` | Assign a lesson to a user, organization, or unit |
| `POST` | `/api/v1/lessons/:id/unassign` | Unassign a lesson |
| `POST` | `/api/v1/lessons/:id/complete` | Mark a lesson as complete for a user |

---

## Utterances (`/api/v1/utterances`)

Utterances are recorded phrases spoken by a communicator, optionally shared with others.

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/utterances` | Create a new utterance |
| `GET` | `/api/v1/utterances/:id` | Get a specific utterance |
| `PUT` | `/api/v1/utterances/:id` | Update an utterance |
| `POST` | `/api/v1/utterances/:id/share` | Share an utterance with one or more contacts |
| `POST` | `/api/v1/utterances/:id/reply` | Reply to a shared utterance |

---

## Webhooks (`/api/v1/webhooks`)

Webhooks deliver event notifications to external URLs.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/webhooks` | List webhooks for a user (requires `user_id` param) |
| `POST` | `/api/v1/webhooks` | Create a new webhook |
| `GET` | `/api/v1/webhooks/:id` | Get a specific webhook |
| `PUT` | `/api/v1/webhooks/:id` | Update a webhook |
| `DELETE` | `/api/v1/webhooks/:id` | Delete a webhook |
| `POST` | `/api/v1/webhooks/:id/test` | Send a test notification to a webhook |

---

## Integrations (`/api/v1/integrations`)

Third-party integrations and button action configurations.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/integrations` | List integrations. Supports `user_id`, `for_button` params. |
| `POST` | `/api/v1/integrations` | Create a new integration |
| `GET` | `/api/v1/integrations/:id` | Get a specific integration |
| `PUT` | `/api/v1/integrations/:id` | Update an integration |
| `DELETE` | `/api/v1/integrations/:id` | Delete an integration |

---

## Tags (`/api/v1/tags`)

NFC tags that can trigger board actions.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/tags` | List NFC tags for a user |
| `POST` | `/api/v1/tags` | Create a new NFC tag |
| `GET` | `/api/v1/tags/:id` | Get a specific tag (also supports lookup by hardware tag ID) |
| `PUT` | `/api/v1/tags/:id` | Update a tag |
| `DELETE` | `/api/v1/tags/:id` | Delete a tag |

---

## Words (`/api/v1/words`)

Word data and vocabulary utilities.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/words` | List word data records (admin only) |
| `PUT` | `/api/v1/words/:id` | Update a word data record (admin only) |
| `GET` | `/api/v1/words/reachable_core` | Get the list of core words reachable from a user's board set |
| `GET` | `/api/v1/lang/:locale` | Get inflection rules and contraction data for a locale |

---

## Gifts (`/api/v1/gifts`)

Gift codes for granting subscriptions.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/gifts` | List all gift codes (admin only) |
| `POST` | `/api/v1/gifts` | Create a new gift code (admin only) |
| `GET` | `/api/v1/gifts/:id` | Get a specific gift |
| `DELETE` | `/api/v1/gifts/:id` | Deactivate a gift code (admin only) |
| `GET` | `/api/v1/gifts/code_check` | Check whether a gift code is valid |

---

## Button Sets (`/api/v1/buttonsets`)

Precomputed downstream button sets for a board tree.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/buttonsets` | List button sets |
| `GET` | `/api/v1/buttonsets/:id` | Get a specific button set |
| `POST` | `/api/v1/buttonsets/:id/generate` | Trigger generation of a button set |

---

## Progress (`/api/v1/progress`)

Background job progress tracking.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/progress/:id` | Get the status and result of a background job |

---

## Miscellaneous

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/forgot_password` | Request a password reset email |
| `POST` | `/api/v1/messages` | Send a contact message |
| `POST` | `/api/v1/callback` | Handle an external callback |
| `GET` | `/api/v1/domain_settings` | Get domain-specific configuration overrides |
| `GET` | `/api/v1/start_code` | Look up and validate a start code |
| `POST` | `/api/v1/focus/usage` | Track focus/activity usage for an integration |
| `GET` | `/api/v1/boardversions` | Get version history for boards |
| `GET` | `/api/v1/userversions` | Get version history for users |
| `POST` | `/api/v1/purchasing_event` | Handle a purchasing webhook event |
| `POST` | `/api/v1/purchase_gift` | Purchase a gift subscription |
