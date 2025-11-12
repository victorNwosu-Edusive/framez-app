# Framez - Mobile Social App

A React Native social media app built with Expo, allowing users to share posts with text and images, like posts, and comment on them.

## Features

- **User Authentication**: Sign up, login, and logout with Supabase Auth
- **Persistent Sessions**: Stay logged in after app restart
- **Create Posts**: Share text and images
- **Feed**: View all posts in chronological order
- **Like Posts**: Like and unlike posts
- **Comments**: Add comments to posts
- **Notifications**: Receive notifications for likes and comments
- **Profile**: View your own posts and user information

## Tech Stack

- **Framework**: React Native with Expo
- **Backend**: Supabase (Authentication, Database, Storage)
- **Navigation**: React Navigation
- **State Management**: React Context API
- **UI Components**: React Native Elements

## Setup Instructions

### Prerequisites

- Node.js (v14 or later)
- Expo CLI: `npm install -g @expo/cli`
- Supabase account and project

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd framez-app
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up Supabase:
   - Create a new Supabase project at https://supabase.com/
   - Go to Settings > API to get your project URL and anon key
   - Create the following tables in your Supabase database:

   **posts table:**
   ```sql
   CREATE TABLE posts (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
     content TEXT,
     image_url TEXT,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );
   ```

   **likes table:**
   ```sql
   CREATE TABLE likes (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
     post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     UNIQUE(user_id, post_id)
   );
   ```

   **comments table:**
   ```sql
   CREATE TABLE comments (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
     post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
     content TEXT NOT NULL,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );
   ```

   **notifications table:**
   ```sql
   CREATE TABLE notifications (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
     type TEXT NOT NULL,
     message TEXT NOT NULL,
     post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
     from_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
     read BOOLEAN DEFAULT FALSE,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );
   ```

4. Set up environment variables:
   - Create a `.env` file in the root directory
   - Add your Supabase credentials:
   ```
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

5. Update Supabase config:
   - The config is already set up in `config/supabase.js` to use environment variables

6. Start the development server:
   ```bash
   npx expo start
   ```

7. Run on device/simulator:
   - Install Expo Go app on your device
   - Scan the QR code from the terminal
   - Or press 'a' for Android emulator, 'i' for iOS simulator

## Project Structure

```
framez-app/
├── assets/                 # App assets (icons, splash screens, images)
├── components/             # Reusable components
│   ├── CommentItem.js      # Comment display component
│   └── PostItem.js         # Post display component
├── config/                 # Configuration files
│   └── supabase.js         # Supabase configuration
├── contexts/               # React contexts
│   ├── AuthContext.js      # Authentication context
│   ├── NotificationsContext.js # Notifications context
│   └── ThemeContext.js     # Theme context
├── screens/                # App screens
│   ├── LoginScreen.js      # Login screen
│   ├── SignupScreen.js     # Signup screen
│   ├── FeedScreen.js       # Main feed
│   ├── ProfileScreen.js    # User profile
│   ├── CreatePostScreen.js # Create new post
│   ├── PostDetailScreen.js # Post details with comments
│   └── NotificationsScreen.js # Notifications screen
├── App.js                  # Main app component
├── app.json                # Expo configuration
├── package.json            # Dependencies
├── .env                    # Environment variables (create this)
└── README.md               # This file
```

## Usage

1. **Sign Up**: Create a new account with email and password
2. **Login**: Sign in with your credentials
3. **View Feed**: See all posts from all users, like posts, and tap to view comments
4. **Create Post**: Tap the + button to create a new post with text and/or image
5. **Like Posts**: Tap the heart icon to like/unlike posts
6. **Comments**: Tap on a post to view details and add comments
7. **Notifications**: Check the notifications tab for likes and comments on your posts
8. **View Profile**: Switch to Profile tab to see your posts and logout

## Deployment

To build for production:

```bash
npx expo build:android  # For Android APK
npx expo build:ios      # For iOS (requires Apple Developer account)
```

Host the built app on services like Appetize.io for testing.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.