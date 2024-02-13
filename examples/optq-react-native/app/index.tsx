import { OptqProvider, useOptq, useOptqRequestStats } from "@optq/react";
import { StatusBar } from "expo-status-bar";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { optq, type Api, databaseInstallationPromise } from "@/optq";
import { useEffect, useState } from "react";
import { Picker } from "@react-native-picker/picker";
import RequestProgress from "@/components/RequestProgress";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { onlineManager } from "@tanstack/react-query";

export default function App() {
  const [database, setDatabase] = useState<Awaited<typeof databaseInstallationPromise> | undefined>(
    undefined,
  );
  useEffect(() => {
    databaseInstallationPromise.then(setDatabase);
  }, []);

  useEffect(() => {
    if (!database) return;

    database.getMetadata().then((metadata) => console.log("Metadata:", metadata));
  }, [database]);

  return (
    !!database && (
      <SafeAreaProvider>
        <OptqProvider value={optq}>
          <Page />
        </OptqProvider>
      </SafeAreaProvider>
    )
  );
}

const USERS = ["1", "2", "3"];

function Page() {
  const insets = useSafeAreaInsets();

  const [userId, setUserId] = useState(USERS[0]);

  const optq = useOptq<Api>();
  const requestStats = useOptqRequestStats(optq);

  const { data } = optq.useQuery({
    resourceId: "/users/:userId/version",
    params: { userId },
  });

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />

      <View
        style={{
          position: "absolute",
          top: insets.top,
          right: 16,
        }}
      >
        <RequestProgress stats={requestStats} />
      </View>

      <Picker
        selectedValue={userId}
        onValueChange={setUserId}
        style={{
          width: "100%",
          padding: 8,
          borderColor: "#e2e8f0",
          borderWidth: 1,
          borderRadius: 16,
        }}
      >
        {USERS.map((userId) => (
          <Picker.Item key={userId} label={`User ${userId}`} value={userId} />
        ))}
      </Picker>

      <View
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          width: "100%",
          gap: 12,
        }}
      >
        <Text style={{ fontSize: 24 }}>
          Version:{" "}
          {data ? (
            data.version
          ) : (
            <Text
              style={{
                fontSize: 20,
                letterSpacing: -0.2,
                color: "#9ca3af",
              }}
            >
              Missing
            </Text>
          )}
        </Text>
        <Pressable
          onPress={async () => {
            await optq.mutate({
              apiId: "POST /users/:userId/version/increase",
              params: { userId },
              headers: { "x-user-credential": "correct" },
              body: { increaseBy: 1 },
            });
          }}
          style={{
            paddingHorizontal: 16,
            paddingVertical: 8,
            backgroundColor: "#e2e8f0",
            borderRadius: 12,
          }}
        >
          <Text style={{ fontSize: 20, color: "#2563eb" }}>Increase</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    gap: 32,
  },
});
