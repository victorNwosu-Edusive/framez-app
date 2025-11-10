# Framez - Mobile Social App

A React Native social media app built with Expo, allowing users to share posts with text and images.

## Features

- **User Authentication**: Sign up, login, and logout with Firebase Auth
- **Persistent Sessions**: Stay logged in after app restart
- **Create Posts**: Share text and images
- **Feed**: View all posts in chronological order
- **Profile**: View your own posts and user information

## Tech Stack

- **Framework**: React Native with Expo
- **Backend**: Firebase (Authentication, Firestore, Storage)
- **Navigation**: React Navigation
- **State Management**: React Context API

## Setup Instructions

### Prerequisites

- Node.js (v14 or later)
- Expo CLI: `npm install -g @expo/cli`
- Firebase account and project

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

3. Set up Firebase:
   - Create a new Firebase project at https://console.firebase.google.com/
   - Enable Authentication (Email/Password)
   - Enable Firestore Database
   - Enable Storage
   - Get your Firebase config from Project Settings

4. Update Firebase config:
   - Open `config/firebase.js`
   - Replace the placeholder values with your Firebase config

5. Start the development server:
   ```bash
   npx expo start
   ```

6. Run on device/simulator:
   - Install Expo Go app on your device
   - Scan the QR code from the terminal
   - Or press 'a' for Android emulator, 'i' for iOS simulator

## Project Structure

```
framez-app/
├── assets/                 # App assets (icons, splash screens)
├── components/             # Reusable components
│   └── PostItem.js         # Post display component
├── config/                 # Configuration files
│   └── firebase.js         # Firebase configuration
├── contexts/               # React contexts
│   └── AuthContext.js      # Authentication context
├── screens/                # App screens
│   ├── LoginScreen.js      # Login screen
│   ├── SignupScreen.js     # Signup screen
│   ├── FeedScreen.js       # Main feed
│   ├── ProfileScreen.js    # User profile
│   └── CreatePostScreen.js # Create new post
├── App.js                  # Main app component
├── app.json                # Expo configuration
├── package.json            # Dependencies
└── README.md               # This file
```

## Usage

1. **Sign Up**: Create a new account with email and password
2. **Login**: Sign in with your credentials
3. **View Feed**: See all posts from all users
4. **Create Post**: Tap the + button to create a new post with text and/or image
5. **View Profile**: Switch to Profile tab to see your posts and logout

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