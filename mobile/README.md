# Authblock Mobile App

Flutter mobile client for [Authblock](https://authblock.onrender.com) — blockchain-based academic credential verification.

## Project Structure

```
mobile/
├── lib/
│   ├── main.dart                        # App entry, routing, Firebase init
│   ├── firebase_options.dart            # ⚠️ Must be regenerated (see Setup)
│   ├── config/api_config.dart           # All API endpoint URLs
│   ├── models/                          # Data models
│   │   ├── user_model.dart
│   │   └── marksheet_model.dart
│   ├── services/
│   │   ├── api_service.dart             # Dio HTTP client + cookie jar
│   │   └── auth_service.dart            # SharedPreferences session store
│   ├── providers/
│   │   └── auth_provider.dart           # ChangeNotifier auth state
│   ├── theme/app_theme.dart             # Design system (Inter, Slate palette)
│   ├── widgets/
│   │   └── marksheet_card.dart          # Reusable credential card
│   └── screens/
│       ├── splash_screen.dart           # Animated launch + session check
│       ├── role_select_screen.dart      # Student / Admin picker
│       ├── login_screen.dart            # Student PRN + Name login
│       ├── dashboard_screen.dart        # Student credentials + QR
│       ├── qr_display_screen.dart       # Full-screen QR for scanning
│       ├── scanner_screen.dart          # Camera QR scanner
│       ├── scan_result_screen.dart      # Post-scan verification
│       ├── verify_screen.dart           # Certificate blockchain verify
│       └── admin/
│           ├── admin_login_screen.dart  # Google Sign-In (whitelist check)
│           ├── admin_dashboard_screen.dart
│           ├── admin_marksheets_screen.dart
│           └── admin_users_screen.dart
└── android/
    └── app/
        ├── google-services.json         # ⚠️ Must be replaced (see Setup)
        └── src/main/AndroidManifest.xml
```

## Prerequisites

- Flutter SDK ≥ 3.0 ([install](https://docs.flutter.dev/get-started/install/windows))
- Android Studio or VS Code with Flutter extension
- Firebase project (same one used by the web app)

## Setup

### 1. Install Flutter dependencies
```bash
cd mobile
flutter pub get
```

### 2. Configure Firebase (Required for Admin Google Sign-In)

```bash
# Install FlutterFire CLI
dart pub global activate flutterfire_cli

# Login (uses the same Firebase project as the web app)
firebase login

# Configure — this auto-generates firebase_options.dart AND google-services.json
flutterfire configure --project=YOUR_FIREBASE_PROJECT_ID
```

> ⚠️ Replace both `lib/firebase_options.dart` and `android/app/google-services.json`
> with the auto-generated versions from the command above.

### 3. Enable Google Sign-In in Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project → **Authentication** → **Sign-in method**
3. Enable **Google**
4. Add your Android app's **SHA-1** certificate fingerprint:
   ```bash
   keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
   ```
5. Add the SHA-1 to **Project Settings** → **Your apps** → **Android app**

### 4. Run the app
```bash
cd mobile
flutter run
```

## API Endpoints Consumed

| Endpoint | Purpose |
|----------|---------|
| `POST /api/auth/login` | Student login (PRN + Name) |
| `GET /api/auth/session` | Session check |
| `GET /api/auth/logout` | Logout |
| `POST /api/qr/generate` | Generate QR token |
| `POST /api/qr/scan` | Scan QR → blockchain log |
| `GET /api/verify/certificate` | Certificate blockchain verify |
| `POST /api/admin/check-email` | Admin email whitelist check |
| `POST /api/admin/link-firebase` | Link Firebase UID to DB |
| `GET /api/admin/me` | Fetch admin profile |
| `GET /api/admin/dashboard-stats` | Dashboard statistics |
| `GET /api/admin/marksheets` | All issued certificates |
| `POST /api/admin/marksheets/issue` | Issue new certificate |
| `GET /api/admin/users` | All admin accounts |

## User Flows

### Student
1. App opens → Splash → Role Select → **Student Portal**
2. Enter PRN + Full Name → Dashboard
3. View QR code → tap to expand to full-screen
4. Browse marksheet cards with blockchain records

### Admin
1. App opens → Splash → Role Select → **Admin Portal**
2. Google Sign-In → email whitelist check → Dashboard
3. Issue certificates (manual form)
4. View history, browse all marksheets
5. Manage admin accounts
6. Use QR Scanner to verify students

### QR Scanning (no login required)
1. From Role Select → "Scan a QR Code"
2. Point at student's Authblock QR
3. Instant verification + blockchain log

## Design System

- **Font**: Google Fonts Inter
- **Primary**: `#2563EB` (Blue-600)
- **Success**: `#059669` (Emerald-600)
- **Admin Accent**: `#7C3AED` (Violet-600)
- **Surface**: `#F8FAFC` (Slate-50)
- **Border Radius**: 20px cards, 14px inputs
