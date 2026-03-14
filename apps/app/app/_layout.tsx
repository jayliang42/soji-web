import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#f6efe6" },
        headerTintColor: "#20150d",
        contentStyle: { backgroundColor: "#f6efe6" }
      }}
    />
  );
}
