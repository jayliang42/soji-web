import { hasEntitlement } from "@soji/domain";
import { Text, View } from "react-native";
import { ScreenShell } from "../src/components/screen-shell";
import { getAppSession } from "../src/lib/mock-session";

export default function LibraryScreen() {
  const { entitlements, library } = getAppSession();

  return (
    <ScreenShell
      eyebrow="Library"
      title="Synced member content"
      description="The same content model can drive native screens, deep links, and downloads."
    >
      <View style={{ gap: 12 }}>
        {library.map((item) => {
          const unlocked = hasEntitlement(entitlements, item.requiredEntitlements);
          return (
            <View
              key={item.id}
              style={{
                borderRadius: 24,
                backgroundColor: "#fffaf4",
                padding: 18,
                borderWidth: 1,
                borderColor: "#d6c2ac"
              }}
            >
              <Text style={{ fontSize: 20, fontWeight: "700", color: "#20150d" }}>
                {item.title}
              </Text>
              <Text style={{ color: "#6d5547", marginTop: 8 }}>{item.summary}</Text>
              <Text style={{ color: unlocked ? "#d86b3d" : "#9d8476", marginTop: 12 }}>
                {unlocked ? "Unlocked" : "Locked"}
              </Text>
            </View>
          );
        })}
      </View>
    </ScreenShell>
  );
}
