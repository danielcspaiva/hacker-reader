import { useEffect, useRef } from "react";

import { LargeTitleStack } from "@/components/navigation/large-title-stack";
import { useThemeColor } from "@/hooks/use-theme-color";
import { Stack, useRouter } from "expo-router";

export default function Layout() {
  const router = useRouter();
  const tintColor = useThemeColor({}, "tint");
  const textColor = useThemeColor({}, "text");
  const placeholderColor = useThemeColor(
    { light: "#9ca3af", dark: "#6b7280" },
    "icon"
  );
  const debounceTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, []);

  const handleSearchChange = (event: { nativeEvent: { text: string } }) => {
    const value = event.nativeEvent.text ?? "";
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }
    debounceTimeout.current = setTimeout(() => {
      router.setParams({ q: value.trim().length > 0 ? value : undefined });
    }, 300);
  };

  return (
    <LargeTitleStack>
      <Stack.Screen
        name="index"
        options={{
          title: "Search",
          headerSearchBarOptions: {
            headerIconColor: tintColor,
            tintColor,
            textColor,
            hintTextColor: placeholderColor,
            placeholder: "Search stories",
            hideWhenScrolling: false,
            onChangeText: handleSearchChange,
          },
        }}
      />
    </LargeTitleStack>
  );
}
