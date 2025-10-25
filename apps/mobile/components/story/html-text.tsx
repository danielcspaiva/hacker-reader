import { ThemedText } from "@/components/themed-text";
import { useThemeColor } from "@/hooks/use-theme-color";
import { parseHTMLWithLinks } from "@hn/shared";
import * as WebBrowser from "expo-web-browser";
import type { StyleProp, TextStyle } from "react-native";
import { View } from "react-native";

interface HTMLTextProps {
  html?: string;
  style?: StyleProp<TextStyle>;
}

export function HTMLText({ html, style }: HTMLTextProps) {
  const tintColor = useThemeColor({}, "tint");
  const backgroundColor = useThemeColor({}, "codeBackground");

  if (!html) return null;

  const parts = parseHTMLWithLinks(html);

  if (!parts) return null;

  return (
    <ThemedText style={style}>
      {parts.map((part, index) => {
        if (part.type === "link") {
          return (
            <ThemedText
              key={index}
              style={{ color: tintColor }}
              onPress={() => part.url && WebBrowser.openBrowserAsync(part.url)}
            >
              {part.content}
            </ThemedText>
          );
        }
        if (part.type === "code") {
          return (
            <View
              key={index}
              style={{
                backgroundColor,
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 4,
                alignSelf: "flex-start",
                marginVertical: 2,
              }}
            >
              <ThemedText
                style={{
                  fontFamily: "monospace",
                  fontSize: 13,
                }}
              >
                {part.content}
              </ThemedText>
            </View>
          );
        }
        return <ThemedText key={index}>{part.content}</ThemedText>;
      })}
    </ThemedText>
  );
}
