import { useThemeColor } from '@/hooks/use-theme-color';
import { Stack, useRouter } from 'expo-router';

export default function Layout() {
  const router = useRouter();
  const tintColor = useThemeColor({}, 'tint');
  const textColor = useThemeColor({}, 'text');
  const placeholderColor = useThemeColor({ light: '#9ca3af', dark: '#6b7280' }, 'icon');

  return (
    <Stack
      screenOptions={{
        headerTransparent: true,
        headerLargeTitle: true,
        headerLargeTitleShadowVisible: false,
        headerTintColor: tintColor,
        headerSearchBarOptions: {
          headerIconColor: tintColor,
          tintColor,
          textColor,
          hintTextColor: placeholderColor,
          placeholder: 'Search stories',
          hideWhenScrolling: false,
          onChangeText: (event) => {
            router.setParams({ q: event.nativeEvent.text });
          },
        },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Search',
          headerLargeTitleStyle: {
            color: tintColor,
          },
        }}
      />
    </Stack>
  );
}
