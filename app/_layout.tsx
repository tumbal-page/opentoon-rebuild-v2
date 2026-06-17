import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#0b1120" },
        headerTintColor: "#fff",
        contentStyle: { backgroundColor: "#0b1120" },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="capture" options={{ title: "Scan Chapter" }} />
      <Stack.Screen name="chapters" options={{ title: "My Chapters" }} />
      <Stack.Screen name="viewer" options={{ title: "Chapter Viewer" }} />
      <Stack.Screen name="settings" options={{ title: "Settings" }} />
    </Stack>
  );
}
