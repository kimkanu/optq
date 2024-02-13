import { focusManager, onlineManager } from "@tanstack/query-core";
import { AppState } from "react-native";
import NetInfo from "@react-native-community/netinfo";

export function patchOptqForReactNative() {
  // Patch focusManager
  focusManager.setEventListener((handleFocus) => {
    const subscription = AppState.addEventListener("change", (state) => {
      handleFocus(state === "active");
    });

    return subscription.remove;
  });

  // Patch onlineManager
  onlineManager.setEventListener((setOnline) => {
    return NetInfo.addEventListener((state) => {
      setOnline(!!state.isConnected);
    });
  });
}
