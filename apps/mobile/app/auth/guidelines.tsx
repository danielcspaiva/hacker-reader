import { GuidelinesContent } from "@/components/guidelines-content";
import { GUIDELINES_ACCEPTED_KEY } from "@/constants/app-config";
import { reportError } from "@/lib/observability";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";

export default function GuidelinesScreen() {
  const handleAccept = async () => {
    try {
      await AsyncStorage.setItem(GUIDELINES_ACCEPTED_KEY, "true");
    } catch (error) {
      reportError(error, { operation: "saveGuidelinesAcceptance" });
    }
    router.push("/auth/login");
  };

  return (
    <GuidelinesContent
      onAccept={() => {
        void handleAccept();
      }}
      onCancel={() => router.back()}
    />
  );
}
