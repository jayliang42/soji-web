import { Text, View } from "react-native";
import { ScreenShell } from "../src/components/screen-shell";
import { getAppSession } from "../src/lib/mock-session";

export default function MembershipScreen() {
  const { plans, user, entitlements } = getAppSession();

  return (
    <ScreenShell
      eyebrow="Access"
      title={`Current tier: ${user.tier}`}
      description="RevenueCat should update the same internal entitlements consumed by web."
    >
      <View style={{ gap: 12 }}>
        {plans.map((plan) => (
          <View
            key={plan.id}
            style={{
              borderRadius: 24,
              backgroundColor: "#fffaf4",
              padding: 18,
              borderWidth: 1,
              borderColor: plan.featured ? "#d86b3d" : "#d6c2ac"
            }}
          >
            <Text style={{ fontSize: 20, fontWeight: "700", color: "#20150d" }}>
              {plan.name} · ${plan.price} one time
            </Text>
            <Text style={{ color: "#6d5547", marginTop: 8 }}>{plan.description}</Text>
          </View>
        ))}
      </View>
      <View style={{ gap: 10 }}>
        <Text style={{ fontSize: 18, fontWeight: "700", color: "#20150d" }}>
          Active entitlements
        </Text>
        {entitlements.map((entitlement) => (
          <Text key={entitlement} style={{ color: "#6d5547" }}>
            {entitlement}
          </Text>
        ))}
      </View>
    </ScreenShell>
  );
}
