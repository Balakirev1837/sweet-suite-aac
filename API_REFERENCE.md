# Sweet Suite AAC API Reference

This document provides an overview of the undocumented APIs available in the Sweet Suite AAC application. All API endpoints are prefixed with `/api/v1/`.

## Authentication

Most API endpoints require an API token. The token can be obtained via the OAuth2 flow or by using the `/api/v1/auth/admin` endpoint.

## Endpoints

### Boards (`/api/v1/boards`)

Boards represent communication boards used in the AAC application.

*   `GET /api/v1/boards` - List boards (supports search, filtering by user, locale, category, etc.)
*   `GET /api/v1/boards/:id` - Get a specific board
*   `POST /api/v1/boards` - Create a new board
*   `PUT /api/v1/boards/:id` - Update a board
*   `DELETE /api/v1/boards/:id` - Delete a board
*   `GET /api/v1/boards/:id/stats` - Get usage statistics for a board
*   `GET /api/v1/boards/:id/simple.obf` - Download board in Open Board Format (OBF)
*   `POST /api/v1/boards/imports` - Import a board from OBF/OBZ format
*   `POST /api/v1/boards/unlink` - Unlink/unstar/untag a board
*   `POST /api/v1/boards/:id/stars` - Star a board
*   `DELETE /api/v1/boards/:id/stars` - Unstar a board
*   `POST /api/v1/boards/:id/slice_locales` - Slice locales for a board
*   `POST /api/v1/boards/:id/download` - Generate a download for a board
*   `POST /api/v1/boards/:id/rename` - Rename a board
*   `POST /api/v1/boards/:id/share_response` - Respond to a board share request
*   `GET /api/v1/boards/:id/copies` - Get copies of a board
*   `POST /api/v1/boards/:id/translate` - Translate a board
*   `POST /api/v1/boards/:id/swap_images` - Swap images in a board
*   `POST /api/v1/boards/:id/privacy` - Update privacy settings for a board
*   `POST /api/v1/boards/:id/tag` - Tag a board
*   `POST /api/v1/boards/:id/rollback` - Rollback a board to a previous version

### Users (`/api/v1/users`)

Users represent the individuals using the AAC application, including communicators and supervisors.

*   `GET /api/v1/users` - List users (supports search by username, email, etc.)
*   `GET /api/v1/users/:id` - Get a specific user
*   `POST /api/v1/users` - Create a new user
*   `PUT /api/v1/users/:id` - Update a user
*   `GET /api/v1/users/:id/stats/daily` - Get daily usage statistics for a user
*   `GET /api/v1/users/:id/stats/hourly` - Get hourly usage statistics for a user
*   `GET /api/v1/users/:id/alerts` - Get alerts for a user
*   `GET /api/v1/users/:id/valet_credentials` - Get valet credentials for a user
*   `POST /api/v1/users/:id/confirm_registration` - Confirm user registration
*   `POST /api/v1/users/:id/password_reset` - Reset user password
*   `POST /api/v1/users/:id/replace_board` - Replace a user's board
*   `POST /api/v1/users/:id/copy_board_links` - Copy board links for a user
*   `POST /api/v1/users/:id/subscription` - Subscribe a user
*   `DELETE /api/v1/users/:id/subscription` - Unsubscribe a user
*   `POST /api/v1/users/:id/verify_receipt` - Verify a purchase receipt
*   `POST /api/v1/users/:id/flush/logs` - Flush user logs
*   `POST /api/v1/users/:id/flush/user` - Flush user data (schedule deletion)
*   `DELETE /api/v1/users/:id/devices/:device_id` - Hide a user's device
*   `PUT /api/v1/users/:id/devices/:device_id` - Rename a user's device
*   `GET /api/v1/users/:id/supervisors` - Get a user's supervisors
*   `GET /api/v1/users/:id/supervisees` - Get a user's supervisees
*   `POST /api/v1/users/:id/claim_voice` - Claim a premium voice
*   `POST /api/v1/users/:id/start_code` - Generate or delete a start code
*   `POST /api/v1/users/:id/rename` - Rename a user
*   `POST /api/v1/users/:id/activate_button` - Activate a button for a user
*   `GET /api/v1/users/:id/sync_stamp` - Get a user's sync stamp
*   `POST /api/v1/users/:id/translate` - Translate words for a user
*   `GET /api/v1/users/:id/board_revisions` - Get board revisions for a user
*   `GET /api/v1/users/:id/boards` - Get boards for a user
*   `GET /api/v1/users/:id/places` - Get places for a user
*   `GET /api/v1/users/:id/ws_settings` - Get websocket settings for a user
*   `GET /api/v1/users/:id/ws_lookup` - Lookup a user via websocket
*   `POST /api/v1/users/:id/ws_encrypt` - Encrypt websocket content
*   `POST /api/v1/users/:id/ws_decrypt` - Decrypt websocket content
*   `GET /api/v1/users/:id/daily_use` - Get daily use logs for a user
*   `GET /api/v1/users/:id/core_lists` - Get core word lists for a user
*   `PUT /api/v1/users/:id/core_list` - Update a core word list
*   `GET /api/v1/users/:id/message_bank_suggestions` - Get message bank suggestions
*   `GET /api/v1/users/:id/protected_image/:library/:image_id` - Get a protected image
*   `GET /api/v1/users/:id/word_map` - Get a word map for a user
*   `GET /api/v1/users/:id/word_activities` - Get word activities for a user
*   `POST /api/v1/users/:id/evals/transfer` - Transfer an evaluation account
*   `POST /api/v1/users/:id/evals/reset` - Reset an evaluation account
*   `POST /api/v1/users/:id/2fa` - Update 2FA settings
*   `GET /api/v1/users/:id/external_nonce/:nonce_id` - Get an external nonce

### Organizations (`/api/v1/organizations`)

Organizations group users and manage settings across multiple accounts.

*   `GET /api/v1/organizations` - List organizations
*   `GET /api/v1/organizations/:id` - Get a specific organization
*   `POST /api/v1/organizations` - Create a new organization
*   `PUT /api/v1/organizations/:id` - Update an organization
*   `DELETE /api/v1/organizations/:id` - Delete an organization
*   `GET /api/v1/organizations/:id/managers` - Get organization managers
*   `GET /api/v1/organizations/:id/evals` - Get organization evaluations
*   `GET /api/v1/organizations/:id/users` - Get organization users
*   `GET /api/v1/organizations/:id/supervisors` - Get organization supervisors
*   `GET /api/v1/organizations/:id/extras` - Get organization extras
*   `GET /api/v1/organizations/:id/logs` - Get organization logs
*   `GET /api/v1/organizations/:id/stats` - Get organization statistics
*   `GET /api/v1/organizations/:id/admin_reports` - Get organization admin reports
*   `GET /api/v1/organizations/:id/blocked_emails` - Get blocked emails
*   `GET /api/v1/organizations/:id/blocked_cells` - Get blocked cell numbers
*   `POST /api/v1/organizations/:id/extra_action` - Perform an extra action
*   `POST /api/v1/organizations/:id/alias` - Create an alias
*   `POST /api/v1/organizations/:id/start_code` - Generate a start code
*   `POST /api/v1/organizations/:id/status/:user_id` - Set user status within an organization

### Logs (`/api/v1/logs`)

Logs track usage and events within the application.

*   `GET /api/v1/logs` - List logs
*   `GET /api/v1/logs/:id` - Get a specific log
*   `POST /api/v1/logs` - Create a new log
*   `PUT /api/v1/logs/:id` - Update a log
*   `DELETE /api/v1/logs/:id` - Delete a log
*   `GET /api/v1/logs/:id/lam` - Get Language Acquisition Motor planning data
*   `GET /api/v1/logs/obl` - Get Open Board Logs
*   `POST /api/v1/logs/import` - Import logs
*   `POST /api/v1/logs/code_check` - Check a log code
*   `GET /api/v1/logs/trends` - Get log trends
*   `GET /api/v1/logs/trends_slice` - Get a slice of log trends
*   `GET /api/v1/logs/anonymous_logs` - Get anonymous logs

### Search (`/api/v1/search`)

Search endpoints for various resources.

*   `GET /api/v1/search/symbols` - Search for symbols
*   `GET /api/v1/search/protected_symbols` - Search for protected symbols
*   `GET /api/v1/search/external_resources` - Search for external resources
*   `GET /api/v1/search/proxy` - Proxy a search request
*   `GET /api/v1/search/parts_of_speech` - Search for parts of speech
*   `GET /api/v1/search/apps` - Search for apps
*   `GET /api/v1/search/audio` - Search for audio
*   `GET /api/v1/search/focus` - Search for focuses

### Other Resources

Standard CRUD operations (`GET`, `POST`, `PUT`, `DELETE`) are available for the following resources:

*   `/api/v1/tags` - Tags for categorizing boards
*   `/api/v1/words` - Words and vocabulary
*   `/api/v1/images` - Images used on boards
*   `/api/v1/sounds` - Sounds used on boards
*   `/api/v1/videos` - Videos used on boards
*   `/api/v1/goals` - User goals
*   `/api/v1/profiles` - User profiles
*   `/api/v1/badges` - User badges
*   `/api/v1/units` - Organizational units
*   `/api/v1/snapshots` - Board snapshots
*   `/api/v1/lessons` - Lessons and activities
*   `/api/v1/utterances` - User utterances
*   `/api/v1/webhooks` - Webhooks for integrations
*   `/api/v1/integrations` - Third-party integrations
*   `/api/v1/gifts` - Gift codes and purchases

### Miscellaneous Endpoints

*   `POST /api/v1/forgot_password` - Request a password reset
*   `POST /api/v1/messages` - Create a message
*   `POST /api/v1/callback` - Handle a callback
*   `GET /api/v1/domain_settings` - Get domain settings
*   `GET /api/v1/start_code` - Lookup a start code
*   `POST /api/v1/focus/usage` - Track focus usage
*   `GET /api/v1/lang/:locale` - Get language data
*   `GET /api/v1/buttonsets/:id` - Get a button set
*   `GET /api/v1/buttonsets` - List button sets
*   `POST /api/v1/buttonsets/:id/generate` - Generate a button set
*   `GET /api/v1/boardversions` - Get board versions history
*   `GET /api/v1/userversions` - Get user versions history
*   `GET /api/v1/gifts/code_check` - Check a gift code
*   `GET /api/v1/progress/:id` - Get progress of a background job
*   `POST /api/v1/purchasing_event` - Handle a purchasing event
*   `POST /api/v1/purchase_gift` - Purchase a gift
