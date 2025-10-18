import { ThemedText } from "@/components/themed-text";
import { useThemeColor } from "@/hooks/use-theme-color";
import { parseHTMLWithLinks } from "@/lib/utils/html";
import * as WebBrowser from "expo-web-browser";
import type { StyleProp, TextStyle } from "react-native";

interface HTMLTextProps {
  html?: string;
  style?: StyleProp<TextStyle>;
}

export function HTMLText({ html, style }: HTMLTextProps) {
  const tintColor = useThemeColor({}, "tint");

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
        return <ThemedText key={index}>{part.content}</ThemedText>;
      })}
    </ThemedText>
  );
}
