import { StyleSheet, View } from "react-native";

import { Icon } from "@/components/ui/icon";
import type { IconName } from "@/components/ui/icon-names";
import { WashAlpha, withAlpha, type TileHue } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

interface IconTileProps {
  name: IconName;
  hue?: TileHue;
  size?: number;
}

/** Tinted wash with the glyph in the hue. Never a solid fill with a white glyph. */
export function IconTile({ name, hue = "orange", size = 30 }: IconTileProps) {
  const { scheme, colors } = useTheme();
  const color = colors.tile[hue];
  return (
    <View
      style={[
        styles.tile,
        {
          width: size,
          height: size,
          borderRadius: size * 0.28,
          backgroundColor: withAlpha(
            color,
            scheme === "dark" ? WashAlpha.tileDark : WashAlpha.tileLight
          ),
        },
      ]}
    >
      <Icon name={name} size={size * 0.56} weight="semibold" color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    alignItems: "center",
    justifyContent: "center",
    borderCurve: "continuous",
  },
});
