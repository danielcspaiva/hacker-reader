import { router } from "expo-router";

export function useHNLogin() {
  return {
    handleLogin: () => {
      router.push("/auth/login");
    },
  };
}
