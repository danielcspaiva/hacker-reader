import { TabStackLayout } from "@/components/navigation/tab-stack-layout";
import { isLiquidGlassAvailable } from "expo-glass-effect";

export default function Layout() {
  return (
    <TabStackLayout
      screens={[{ name: "index", title: "Settings" }]}
      screenOptions={{ headerTransparent: isLiquidGlassAvailable() }}
    />
  );
}
