import type { PropsWithChildren } from "react";
import { SafeAreaView, ScrollView, Text, View } from "react-native";

export function ScreenShell({
  eyebrow,
  title,
  description,
  children
}: PropsWithChildren<{
  eyebrow: string;
  title: string;
  description: string;
}>) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f6efe6" }}>
      <ScrollView contentContainerStyle={{ padding: 24, gap: 20 }}>
        <View style={{ gap: 12 }}>
          <Text style={{ color: "#d86b3d", textTransform: "uppercase", letterSpacing: 3 }}>
            {eyebrow}
          </Text>
          <Text style={{ color: "#20150d", fontSize: 36, fontWeight: "700" }}>{title}</Text>
          <Text style={{ color: "#6d5547", fontSize: 16 }}>{description}</Text>
        </View>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}
