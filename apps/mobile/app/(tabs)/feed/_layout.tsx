import { TabStackLayout } from "@/components/navigation/tab-stack-layout";

export default function Layout() {
  return <TabStackLayout screens={[{ name: "index", title: "Feed" }]} />;
}
