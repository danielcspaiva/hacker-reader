# Implement Error Boundaries

**Priority**: Short Term (High Impact, Medium Effort)
**Category**: Best Practices / User Experience
**Estimated Time**: 45-60 minutes

## Problem

The app currently has no error boundaries, which means:

**When errors occur**:
- App crashes completely
- User sees blank white screen
- No error information displayed
- No way to recover
- Poor user experience

**Common error scenarios**:
- React Query failures (network errors)
- Component rendering errors
- JSON parsing errors from API
- Image loading failures
- Malformed HTML in comments

Currently, these errors bubble up and crash the entire app.

## Solution

Implement React error boundaries at strategic levels to catch and handle errors gracefully.

### Implementation Steps

#### 1. Create Base Error Boundary Component

**File**: `components/error-boundary.tsx`

```typescript
import React, { Component, ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { TouchableOpacity } from 'react-native';

interface Props {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to error reporting service
    console.error('Error caught by boundary:', error, errorInfo);

    // Call optional error handler
    this.props.onError?.(error, errorInfo);
  }

  resetError = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.resetError);
      }

      // Default error UI
      return (
        <ThemedView style={styles.container}>
          <View style={styles.content}>
            <ThemedText style={styles.title}>Oops! Something went wrong</ThemedText>
            <ThemedText style={styles.message}>
              {this.state.error.message}
            </ThemedText>
            <TouchableOpacity style={styles.button} onPress={this.resetError}>
              <ThemedText style={styles.buttonText}>Try Again</ThemedText>
            </TouchableOpacity>
          </View>
        </ThemedView>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    maxWidth: 400,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    opacity: 0.7,
    textAlign: 'center',
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#ff6600',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
```

#### 2. Create React Query Error Boundary

**File**: `components/query-error-boundary.tsx`

```typescript
import { ReactNode } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { useQueryErrorResetBoundary } from '@tanstack/react-query';
import { ErrorBoundary } from './error-boundary';

interface Props {
  children: ReactNode;
}

export function QueryErrorBoundary({ children }: Props) {
  const { reset } = useQueryErrorResetBoundary();

  return (
    <ErrorBoundary
      onError={(error) => {
        console.error('[Query Error]:', error);
      }}
      fallback={(error, resetError) => (
        <ThemedView style={styles.container}>
          <View style={styles.content}>
            <ThemedText style={styles.icon}>⚠️</ThemedText>
            <ThemedText style={styles.title}>Failed to load data</ThemedText>
            <ThemedText style={styles.message}>
              {error.message || 'An unexpected error occurred'}
            </ThemedText>
            <TouchableOpacity
              style={styles.button}
              onPress={() => {
                reset();
                resetError();
              }}
            >
              <ThemedText style={styles.buttonText}>Retry</ThemedText>
            </TouchableOpacity>
          </View>
        </ThemedView>
      )}
    >
      {children}
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    maxWidth: 400,
    alignItems: 'center',
  },
  icon: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    opacity: 0.7,
    textAlign: 'center',
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#ff6600',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
```

#### 3. Wrap App Root

**File**: `app/_layout.tsx`

```typescript
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { ErrorBoundary } from "@/components/error-boundary";
import { QueryErrorBoundary } from "@/components/query-error-boundary";

export const unstable_settings = {
  anchor: "(tabs)",
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <QueryErrorBoundary>
          <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
            <Stack
              screenOptions={{
                headerShown: false,
              }}
            >
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen
                name="modal"
                options={{ presentation: "modal", title: "Modal" }}
              />
            </Stack>
            <StatusBar style="auto" />
          </ThemeProvider>
        </QueryErrorBoundary>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
```

#### 4. Add Error Boundaries to Individual Screens (Optional)

For more granular error handling:

**File**: `app/story/[id].tsx`

```typescript
import { ErrorBoundary } from '@/components/error-boundary';

export default function StoryDetailScreen() {
  // ... existing code ...

  return (
    <ErrorBoundary
      fallback={(error, reset) => (
        <>
          <Stack.Screen options={{ title: 'Error' }} />
          <ThemedView style={styles.centered}>
            <ThemedText style={styles.errorTitle}>
              Failed to load story
            </ThemedText>
            <ThemedText style={styles.errorMessage}>
              {error.message}
            </ThemedText>
            <TouchableOpacity style={styles.retryButton} onPress={reset}>
              <ThemedText style={styles.retryText}>Try Again</ThemedText>
            </TouchableOpacity>
          </ThemedView>
        </>
      )}
    >
      {/* ... existing screen content ... */}
    </ErrorBoundary>
  );
}
```

#### 5. Add Error States to React Query Hooks

**File**: `components/story-list-screen.tsx`

```typescript
export function StoryListScreen({ title, useStoriesHook }: StoryListScreenProps) {
  const {
    data,
    isLoading,
    isError,
    error,
    isRefetching,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useStoriesHook();

  const stories = useMemo(() => data?.pages.flatMap((page) => page) ?? [], [data]);

  const { bottom } = useSafeAreaInsets();
  const textColor = useThemeColor({}, 'text');

  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ title, headerShown: true }} />
        <ThemedView style={styles.centered}>
          <ActivityIndicator size="large" color={textColor} />
        </ThemedView>
      </>
    );
  }

  if (isError) {
    return (
      <>
        <Stack.Screen options={{ title, headerShown: true }} />
        <ThemedView style={styles.centered}>
          <ThemedText style={styles.errorTitle}>Failed to load stories</ThemedText>
          <ThemedText style={styles.errorMessage}>
            {error?.message || 'An unexpected error occurred'}
          </ThemedText>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <ThemedText style={styles.retryText}>Try Again</ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </>
    );
  }

  // ... rest of component ...
}
```

#### 6. Optional: Error Reporting Integration

**File**: `lib/error-reporting.ts`

```typescript
/**
 * Error reporting service integration
 * Replace with your service (Sentry, Bugsnag, etc.)
 */

export function reportError(error: Error, errorInfo?: React.ErrorInfo) {
  if (__DEV__) {
    console.error('Error reported:', error, errorInfo);
    return;
  }

  // TODO: Send to error reporting service
  // Example with Sentry:
  // Sentry.captureException(error, { contexts: { react: errorInfo } });
}
```

Update error boundaries to use it:

```typescript
import { reportError } from '@/lib/error-reporting';

<ErrorBoundary
  onError={(error, errorInfo) => {
    reportError(error, errorInfo);
  }}
>
```

## Files to Create

- `components/error-boundary.tsx`
- `components/query-error-boundary.tsx`
- `lib/error-reporting.ts` (optional)

## Files to Modify

- `app/_layout.tsx`
- `components/story-list-screen.tsx`
- `app/story/[id].tsx` (optional)

## Benefits

- Graceful error handling
- Better user experience
- App doesn't crash completely
- Users can retry failed operations
- Error tracking/reporting capability
- Localized error impact

## Error Types Handled

1. **React Query errors**: Network failures, API errors
2. **Component errors**: Rendering errors, prop issues
3. **Parse errors**: Malformed JSON, invalid HTML
4. **Image loading errors**: Handled by error boundaries
5. **Async errors**: Caught during data fetching

## Testing Checklist

Test error scenarios:

- [ ] Disconnect network, try to load stories
- [ ] Navigate to invalid story ID
- [ ] Try to load story with malformed data
- [ ] Collapse/expand comments when network fails
- [ ] Retry button works and recovers
- [ ] Error boundary catches component errors
- [ ] App stays functional after error recovery
- [ ] Errors logged correctly (check console)

## Testing During Development

Add intentional errors to test:

```typescript
// Trigger component error
throw new Error('Test error boundary');

// Trigger query error
const { data } = useQuery({
  queryKey: ['test'],
  queryFn: () => Promise.reject(new Error('Test query error')),
});
```

## Future Enhancements

1. **Offline support**: Cache data and show when offline
2. **Error analytics**: Track error rates and types
3. **Custom error messages**: User-friendly messages per error type
4. **Automatic retry**: Retry failed requests automatically
5. **Error reporting**: Integrate Sentry, Bugsnag, etc.
