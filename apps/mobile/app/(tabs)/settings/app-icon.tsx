import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";

import {
  Badge,
  Icon,
  ListRow,
  ListSection,
  ScrollScreen,
} from "@/components/ui";
import { usePro } from "@/contexts/pro-context";
import { useAppIcon } from "@/hooks/use-app-icon";
import { useTheme } from "@/hooks/use-theme";
import {
  APP_ICONS,
  isGatedAppIcon,
  type AppIconId,
} from "@/lib/app-icons/icons";

/** Bundled previews: the generated 1024px icons, and the default artwork. */
const PREVIEWS: Record<AppIconId, number> = {
  default: require("@/assets/images/ybook.png"),
  midnight: require("@/assets/images/alt-icons/midnight.png"),
  ember: require("@/assets/images/alt-icons/ember.png"),
  mono: require("@/assets/images/alt-icons/mono.png"),
};

const PREVIEW_SIZE = 52;

export default function AppIconScreen() {
  const { colors } = useTheme();
  const { isPro } = usePro();
  const { current, selectIcon } = useAppIcon();

  return (
    <ScrollScreen gap={24}>
      <ListSection footer="Alternate icons are a thank-you for Hacker Reader Pro. If Pro ends, the icon you picked stays until you change it. iOS confirms every change with its own alert.">
        {APP_ICONS.map((icon) => {
          const selected = icon.id === current;
          return (
            <ListRow
              key={icon.id}
              leading={
                <View
                  style={[
                    styles.preview,
                    {
                      borderColor: colors.separator,
                      backgroundColor: colors.background,
                    },
                  ]}
                >
                  <Image
                    source={PREVIEWS[icon.id]}
                    contentFit="contain"
                    style={styles.image}
                    accessibilityIgnoresInvertColors
                  />
                </View>
              }
              title={icon.label}
              subtitle={icon.description}
              trailing={
                selected ? (
                  <Icon
                    name="checkmark"
                    size={18}
                    weight="semibold"
                    color={colors.primary}
                    accessibilityLabel="Selected"
                  />
                ) : isGatedAppIcon(icon.id) && !isPro ? (
                  <Badge label="Pro" tone="primary" />
                ) : undefined
              }
              chevron={false}
              accessibilityLabel={`${icon.label} icon${selected ? ", selected" : ""}`}
              onPress={() => void selectIcon(icon.id)}
            />
          );
        })}
      </ListSection>
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  preview: {
    width: PREVIEW_SIZE,
    height: PREVIEW_SIZE,
    borderRadius: PREVIEW_SIZE * 0.225,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  image: { width: "100%", height: "100%" },
});
