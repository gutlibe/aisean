# Firebase Realtime Database: Configs Structure

This document outlines the structure of the `/configs` node in the Firebase Realtime Database. This node stores global application configurations, primarily focused on integrations like the Telegram bot for feedback.

## Data Structure

The `/configs` node is a flat JSON object containing key-value pairs for different configuration settings.

```json
{
  "configs": {
    "botToken": "YOUR_TELEGRAM_BOT_TOKEN",
    "chatId": "YOUR_TELEGRAM_CHAT_ID"
  }
}
```

## Fields

*   **`botToken`** (String):
    *   Description: The authentication token for the Telegram bot used to send feedback messages.
    *   Required: Yes (for feedback functionality on the Help page)
    *   Managed via: Admin Config Page (`/admin/config`)

*   **`chatId`** (String):
    *   Description: The unique identifier for the Telegram chat (user, group, or channel) where the bot should send feedback messages.
    *   Required: Yes (for feedback functionality on the Help page)
    *   Managed via: Admin Config Page (`/admin/config`)

## Usage

*   **Admin Config Page:** Administrators can view and update the `botToken` and `chatId` values through the dedicated interface at `/admin/config`.
*   **Help Page:** The Help page (`/help`) fetches these values from the `/configs` node during its `loadDatabaseContent` phase. It then uses these credentials in the `sendFeedbackToTelegram` method to forward user feedback via the configured Telegram bot.

## Security Considerations

*   **Database Rules:** Ensure appropriate Realtime Database rules are in place. Only authenticated administrators should have write access to the `/configs` node. Public read access might be acceptable depending on the sensitivity of future configuration values, but ideally, even read access should be restricted to authenticated users if the information is not strictly needed by anonymous users.
    ```json
    {
      "rules": {
        "configs": {
          // Allow read access for authenticated users (needed by Help page)
          ".read": "auth != null",
          // Allow write access only for users with admin claims
          ".write": "auth != null && auth.token.isAdmin === true"
        },
        // Other rules...
      }
    }
    ```
*   **Token Security:** The `botToken` is sensitive. Avoid exposing it unnecessarily. The Admin Config Page should treat it like a password field if possible (e.g., using `type="password"` initially, though it needs to be readable for editing).
