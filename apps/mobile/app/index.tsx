import { Redirect } from "expo-router";

// Root entry: send the bare "/" path into the tabs group, landing on the feed
// tab. Lives at the root (not inside "(tabs)") so it's handled by the root Stack
// and never becomes a triggerless route inside NativeTabs.
export default function Index() {
  return <Redirect href="/(tabs)/feed" />;
}
