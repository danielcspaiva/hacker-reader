# Sentry Setup Guide

This project uses [Sentry](https://sentry.io) for error tracking and performance monitoring in production.

## Security Notice

**IMPORTANT**: The Sentry configuration requires two types of credentials with different security levels:

1. **Sentry DSN** (semi-public) - Used in client-side code to send errors
2. **Sentry Auth Token** (highly sensitive) - Used during builds to upload source maps

**NEVER commit the auth token to version control.** It has write access to your Sentry organization.

## Initial Setup

### 1. Get Your Sentry Credentials

If you don't have a Sentry account yet:
1. Sign up at [sentry.io](https://sentry.io)
2. Create a new project for your React Native app
3. Note down your organization and project names

#### Get Your DSN
1. Go to **Settings** → **Projects** → **[Your Project]** → **Client Keys (DSN)**
2. Copy the DSN (looks like: `https://xxxxx@xxxxx.ingest.sentry.io/xxxxx`)

#### Get Your Auth Token
1. Go to **Settings** → **Account** → **API** → **Auth Tokens**
2. Click **Create New Token**
3. Required scopes:
   - `project:releases` (for creating releases)
   - `org:read` (for reading organization data)
4. Copy the token immediately (you won't be able to see it again)

### 2. Configure Environment Variables

Copy the example environment file:
```bash
cp .env.example .env.local
```

Edit `.env.local` and replace the placeholder values:
```bash
EXPO_PUBLIC_SENTRY_DSN=https://your-public-key@your-sentry-instance.ingest.sentry.io/your-project-id
SENTRY_AUTH_TOKEN=sntrys_your_actual_token_here
```

**Note**: `.env.local` is already gitignored and will never be committed.

### 3. Configure Sentry Properties (iOS & Android)

For **iOS**:
```bash
cp ios/sentry.properties.example ios/sentry.properties
```

For **Android**:
```bash
cp android/sentry.properties.example android/sentry.properties
```

Edit both `sentry.properties` files and replace `YOUR_SENTRY_AUTH_TOKEN_HERE` with your actual auth token.

**Note**: `sentry.properties` files are gitignored and will never be committed.

### 4. Update Organization/Project Names (if different)

If your Sentry organization or project names differ from the defaults, update the following in both `sentry.properties` files:

```properties
defaults.org=your-org-name
defaults.project=your-project-name
```

## How It Works

### Runtime Error Tracking
- The app uses `EXPO_PUBLIC_SENTRY_DSN` from environment variables
- Errors are automatically sent to Sentry in production builds
- The DSN is embedded in the client bundle (this is expected and safe)

### Build-Time Source Map Upload
- During native builds, the Sentry CLI reads `sentry.properties`
- Source maps are uploaded so you can see readable stack traces in Sentry
- The auth token is only used during build time, never in the app

## Testing Sentry Integration

To verify Sentry is working:

```typescript
import * as Sentry from '@sentry/react-native';

// Trigger a test error
Sentry.captureException(new Error('Test error from development'));
```

Check your Sentry dashboard to see if the error appears.

## Security Best Practices

✅ **DO**:
- Keep `.env.local` and `sentry.properties` files local only
- Rotate your auth token if it's ever exposed
- Use different Sentry projects for development/staging/production

❌ **DON'T**:
- Commit `.env.local` or `sentry.properties` to version control
- Share your auth token in Slack, Discord, or other chat platforms
- Include auth tokens in screenshots or screen recordings

## Troubleshooting

### Source maps not uploading
- Verify `sentry.properties` exists in both `ios/` and `android/`
- Check that your auth token has the correct scopes
- Look for Sentry CLI output during the build process

### Errors not appearing in Sentry
- Confirm `EXPO_PUBLIC_SENTRY_DSN` is set in `.env.local`
- Restart the Metro bundler after changing environment variables
- Check that Sentry is initialized before other code runs (it's in `app/_layout.tsx`)

## Additional Resources

- [Sentry React Native Docs](https://docs.sentry.io/platforms/react-native/)
- [Expo + Sentry Guide](https://docs.expo.dev/guides/using-sentry/)
- [Sentry Auth Token Management](https://docs.sentry.io/api/auth/)
