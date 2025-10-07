# Jai AI Web Dashboard - Advisor Portal

A comprehensive web-based dashboard for advisors to manage chat requests, handle authentication, and communicate with users in real-time.

## 🚀 Features

- **🔐 Secure Authentication**: Firebase Auth with email/password
- **📊 Advisor Dashboard**: Real-time chat request management  
- **💬 Live Chat Interface**: Direct communication with users
- **🎯 Availability Management**: Toggle busy/available status
- **📱 Responsive Design**: Works on desktop and mobile browsers
- **⚡ Real-time Updates**: Firebase Firestore listeners for live data

## 🛠️ Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Backend**: Firebase (Auth, Firestore, Functions)
- **Real-time**: Firestore listeners
- **Build Tool**: Turbopack

## 📦 Installation

1. **Clone and install dependencies**:
   ```bash
   cd jaiai-web
   npm install
   ```

2. **Firebase Configuration**:
   - Firebase config is already set up in `lib/firebase.ts`
   - Uses the same Firebase project as the mobile app
   - Connects to `asia-south1` region for Functions

3. **Set up Authentication**:
   - Enable Email/Password authentication in Firebase Console
   - Update Firestore security rules (see `firestore-security-rules.txt`)

4. **Run development server**:
   ```bash
   npm run dev
   ```

5. **Access the application**:
   - Open [http://localhost:3000](http://localhost:3000)
   - You'll be redirected to sign up/signin

## 🔐 Authentication Flow

### For New Advisors:
1. Visit `/signup` to create an account
2. Fill in name, email, expertise areas, and password
3. System creates Firebase Auth user + Firestore advisor document
4. Automatically redirected to dashboard

### For Existing Advisors:
1. Visit `/signin` with email and password
2. Authenticated users are redirected to `/advisor` dashboard
3. Non-authenticated users are redirected to `/signin`

## 🎛️ Dashboard Features

### Advisor Dashboard (`/advisor`)
- **Profile Display**: Shows advisor name and current status
- **Availability Toggle**: Switch between busy/available
- **Chat Requests**: Real-time list of incoming requests
- **Request Actions**: Accept & Chat / End Chat buttons
- **Sign Out**: Secure logout functionality

### Chat Interface (`/chat/[roomId]`)
- **Real-time Messaging**: Instant message exchange
- **Message History**: Persistent chat history
- **Timestamps**: Message timing information
- **User Identification**: User avatar and ID display

## 📁 Project Structure

```
jaiai-web/
├── app/
│   ├── page.tsx                    # Home (auth redirect)
│   ├── signin/page.tsx             # Advisor signin
│   ├── signup/page.tsx            # Advisor registration
│   ├── advisor/page.tsx           # Main dashboard
│   └── chat/[roomId]/page.tsx     # Chat interface
├── lib/
│   └── firebase.ts               # Firebase configuration
├── firestore-security-rules.txt  # Security rules reference
└── setup-sample-data.ts         # Sample data creation
```

## 🗄️ Database Integration

### Firestore Collections:

1. **`advisors/{userId}`**:
   ```typescript
   {
     name: string;
     email: string;
     expertise: string[];
     busy: boolean;
     rating: number;
     totalChats: number;
     createdAt: Date;
     userId: string;
   }
   ```

2. **`chatRequests/{requestId}`**:
   ```typescript
   {
     userId: string;
     advisorId: string;
     roomId: string;
     status: 'active' | 'accepted' | 'completed';
     createdAt: Date;
     payment: { sessionId: string; paymentId: string; };
   }
   ```

3. **`chatRooms/{roomId}`**:
   ```typescript
   {
     userId: string;
     advisorId: string;
     status: string;
     createdAt: Date;
   }
   ```

4. **`chatRooms/{roomId}/messages/{messageId}`**:
   ```typescript
   {
     text: string;
     senderId: string;
     senderType: 'user' | 'advisor';
     timestamp: Date;
   }
   ```

## 🔒 Security Rules

Update your Firestore security rules using the content in `firestore-security-rules.txt`:

```bash
# Deploy rules to Firebase
firebase deploy --only firestore:rules
```

Key security features:
- Advisors can only access their own data
- Chat access restricted to participants
- Authentication required for all operations
- User data readable by advisors for customer service

## 🚀 Deployment

### Build for Production:
```bash
npm run build
npm start
```

### Deploy to Vercel:
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### Deploy to Netlify:
```bash
# Build the app
npm run build

# Upload the .next folder to Netlify
```

## 🔄 Integration with Mobile App

The web dashboard integrates seamlessly with the mobile app:

- **Shared Database**: Same Firestore collections
- **Real-time Sync**: Changes reflect instantly across platforms  
- **Payment Integration**: Handles chat requests from mobile payments
- **User Management**: Sees users from mobile app registrations

## 🐛 Troubleshooting

### Common Issues:

1. **"Advisor Profile Not Found"**:
   - Ensure advisor document exists in Firestore
   - Check that `userId` matches Firebase Auth UID

2. **Authentication Redirect Loop**:
   - Clear browser cache and cookies
   - Check Firebase Auth configuration

3. **Firestore Permission Denied**:
   - Update security rules as per `firestore-security-rules.txt`
   - Ensure user is properly authenticated

4. **Real-time Updates Not Working**:
   - Check browser console for errors
   - Verify Firestore connection and rules

## 📞 Support

For technical issues:
1. Check browser console for errors
2. Verify Firebase project configuration
3. Ensure security rules are properly deployed
4. Test authentication flow step by step

## 🔮 Future Enhancements

- **Multi-language Support**: Internationalization
- **Advanced Analytics**: Chat metrics and performance
- **File Sharing**: Document and image support in chats
- **Video/Voice Calls**: WebRTC integration
- **Push Notifications**: Browser notifications for new requests
