import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  AdminLaunchChecklist,
  filterLaunchChecklistItems
} from "@/components/admin-launch-checklist";
import { AdminWorkspaceGuide } from "@/components/admin-workspace-guide";
import type { LaunchChecklistItem } from "@/lib/admin-launch-checklist";

const checklistItems: LaunchChecklistItem[] = [
  {
    detail: "Ready detail",
    label: "Ready item",
    status: "ready"
  },
  {
    detail: "Missing detail",
    label: "Missing item",
    status: "missing"
  },
  {
    detail: "Invalid detail",
    label: "Invalid item",
    status: "invalid"
  },
  {
    detail: "Manual detail",
    label: "Manual item",
    status: "manual"
  },
  {
    detail: "Owner detail",
    label: "Owner item",
    status: "needs_owner_input"
  }
];

describe("Admin overview experience", () => {
  it("groups release checks into useful operator views", () => {
    expect(
      filterLaunchChecklistItems(checklistItems, "open").map(
        (item) => item.label
      )
    ).toEqual([
      "Missing item",
      "Invalid item",
      "Manual item",
      "Owner item"
    ]);
    expect(
      filterLaunchChecklistItems(checklistItems, "needs-work").map(
        (item) => item.label
      )
    ).toEqual(["Missing item", "Invalid item"]);
    expect(
      filterLaunchChecklistItems(checklistItems, "confirm").map(
        (item) => item.label
      )
    ).toEqual(["Manual item", "Owner item"]);
    expect(
      filterLaunchChecklistItems(checklistItems, "ready").map(
        (item) => item.label
      )
    ).toEqual(["Ready item"]);
  });

  it("starts with open checks while keeping every status reachable", () => {
    const html = renderToStaticMarkup(
      <AdminLaunchChecklist items={checklistItems} />
    );

    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain("Showing 4 of 5 checklist items");
    expect(html).toContain("Missing item");
    expect(html).toContain("Manual item");
    expect(html).not.toContain("Ready detail");
    expect(html).toContain(">Ready<");
    expect(html).toContain(">All<");
  });

  it("links permitted publishing workspaces and labels Admin-only work", () => {
    const html = renderToStaticMarkup(
      <AdminWorkspaceGuide
        canInspectBilling={false}
        canPublish
        contentCount={1}
        officeHourCount={2}
        productCount={3}
      />
    );

    expect(html).toContain('href="/admin?view=content"');
    expect(html).toContain('href="/admin?view=products"');
    expect(html).toContain('href="/admin?view=office-hours"');
    expect(html).not.toContain('href="/admin?view=users"');
    expect(html).not.toContain('href="/admin?view=billing"');
    expect(html.match(/Admin role required/g)).toHaveLength(2);
    expect(html).toContain("1 item");
    expect(html).toContain("2 sessions");
    expect(html).toContain("3 products");
  });
});
