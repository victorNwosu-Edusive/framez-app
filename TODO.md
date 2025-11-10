# TODO: Add Notifications Feature

- [x] Create create_notifications_table.sql: Database schema for notifications table with fields id, user_id, actor_id, post_id, type, message, is_read, created_at, indexes, and RLS policies
- [x] Create screens/NotificationsScreen.js: Component to display notifications list with real-time subscription, mark as read functionality, and empty state
- [x] Update App.js: Add Notifications tab to TabNavigator with notification icon and badge showing unread count
- [x] Update components/PostItem.js: Add notification creation logic when someone likes a post (if not self-like)
- [x] Update screens/PostDetailScreen.js: Add notification creation logic when someone comments on a post (if not self-comment)
- [x] Test notification creation for likes and comments
- [x] Test real-time updates across multiple users
- [x] Test badge count updates
- [x] Test mark as read functionality
- [x] Test pull-to-refresh functionality
- [x] Run app to verify no errors
