import { focusManager } from "@tanstack/query-core";
import { AppState } from "react-native";

export function installFocusManager() {
  focusManager.setEventListener((handleFocus) => {
    const subscription = AppState.addEventListener("change", (state) => {
      handleFocus(state === "active");
    });

    return () => {
      subscription.remove();
    };
  });
}
