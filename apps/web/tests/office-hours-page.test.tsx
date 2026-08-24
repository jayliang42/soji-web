import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const pageMocks = vi.hoisted(() => ({
  getOfficeHourSnapshot: vi.fn(),
  getSessionSnapshot: vi.fn()
}));

vi.mock("@/lib/office-hours", () => ({
  getOfficeHourSnapshot: pageMocks.getOfficeHourSnapshot
}));
vi.mock("@/lib/session", () => ({
  getSessionSnapshot: pageMocks.getSessionSnapshot
}));

import OfficeHoursPage from "@/app/office-hours/page";

const signupTarget = "https://cal.com/soji/PRIVATE-SIGNUP-TARGET";
const replayTarget = "https://vimeo.com/PRIVATE-REPLAY-TARGET";

describe("Office Hours page", () => {
  beforeEach(() => {
    pageMocks.getSessionSnapshot.mockResolvedValue({
      entitlements: ["office_hours.join"],
      source: "supabase",
      user: { id: "member-1" }
    });
    pageMocks.getOfficeHourSnapshot.mockResolvedValue({
      items: [
        {
          id: "upcoming",
          requiredEntitlements: ["office_hours.join"],
          signupUrl: signupTarget,
          startsAt: "2099-07-30T18:00:00.000Z",
          title: "Upcoming family decisions"
        },
        {
          id: "replay",
          replayUrl: replayTarget,
          requiredEntitlements: ["office_hours.join"],
          signupUrl: signupTarget,
          startsAt: "2020-07-20T18:00:00.000Z",
          title: "Recorded family decisions"
        },
        {
          id: "pending",
          requiredEntitlements: ["office_hours.join"],
          signupUrl: signupTarget,
          startsAt: "2020-07-21T18:00:00.000Z",
          title: "Replay being prepared"
        }
      ],
      source: "supabase"
    });
  });

  it("groups upcoming sessions and replays with safe external actions", async () => {
    const html = renderToStaticMarkup(await OfficeHoursPage());

    expect(html).toContain("即将开始");
    expect(html).toContain("回放内容库");
    expect(html).toContain("预约席位");
    expect(html).toContain("观看回放");
    expect(html).toContain("回放即将上线");
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noreferrer noopener"');
    expect(html).toContain("在新标签页中打开");
    expect(html).toContain("一个决定，三个实用步骤");
    expect(html).toContain("明确问题");
    expect(html).toContain("带来背景");
    expect(html).toContain("带走方向");
    expect(html).toContain("复制日期和标题");
    expect(html).toContain(
      'aria-label="将《Upcoming family decisions》添加到日历"'
    );
    expect(html.match(/>添加到日历</gu)).toHaveLength(1);
    expect(html).toContain("开始前先做好准备");
  });

  it("renders no private targets when the signed-in user lacks access", async () => {
    pageMocks.getSessionSnapshot.mockResolvedValue({
      entitlements: ["content.basic"],
      source: "supabase",
      user: { id: "member-2" }
    });

    const html = renderToStaticMarkup(await OfficeHoursPage());

    expect(html).toContain("线上答疑方案包含");
    expect(html).toContain("查看解锁方案");
    expect(html).not.toContain(signupTarget);
    expect(html).not.toContain(replayTarget);
  });

  it("uses one complete recovery panel when schedule and access checks both fail", async () => {
    pageMocks.getSessionSnapshot.mockResolvedValue({
      entitlements: [],
      error: "session_query_failed",
      source: "supabase",
      user: null
    });
    pageMocks.getOfficeHourSnapshot.mockResolvedValue({
      error: "office_hours_query_failed",
      items: [],
      source: "supabase"
    });

    const html = renderToStaticMarkup(await OfficeHoursPage());

    expect(html).toContain("连接暂时中断");
    expect(html).toContain("暂时无法加载线上答疑");
    expect(html).toContain(">重新加载</a>");
    expect(html).toContain(">等待时先阅读指南</a>");
    expect(html).toContain(
      "日程不可用期间，不会显示任何私密场次或回放链接。"
    );
    expect(html.match(/role="alert"/gu)).toHaveLength(1);
    expect(html).not.toContain("暂时无法确认会员访问权限");
    expect(html).not.toContain(signupTarget);
    expect(html).not.toContain(replayTarget);
  });
});
