import { Link } from "expo-router";
import { marketingHighlights } from "@soji/domain";
import { Text, View } from "react-native";
import { ScreenShell } from "../src/components/screen-shell";

export default function HomeScreen() {
  return (
    <ScreenShell
      eyebrow="Mobile"
      title="Soji membership app"
      description="This Expo shell shares plans, entitlements, and content models with the web app."
    >
      <View style={{ gap: 12 }}>
        {marketingHighlights.map((item) => (
          <View
            key={item}
            style={{
              borderRadius: 24,
              backgroundColor: "#fffaf4",
              padding: 18,
              borderWidth: 1,
              borderColor: "#d6c2ac"
            }}
          >
            <Text style={{ color: "#20150d", fontSize: 16 }}>{item}</Text>
          </View>
        ))}
      </View>
      <View style={{ flexDirection: "row", gap: 12 }}>
        <Link href="/membership" style={{ color: "#d86b3d", fontWeight: "700" }}>
          Membership
        </Link>
        <Link href="/library" style={{ color: "#20150d", fontWeight: "700" }}>
          Library
        </Link>
      </View>
    </ScreenShell>
  );
}
