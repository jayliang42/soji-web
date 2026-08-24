import type { Metadata } from "next";
import { PolicyLayout } from "@/components/policy-layout";

export const metadata: Metadata = {
  title: "隐私政策",
  description:
    "GS学院目前如何收集、使用和共享账号、账单、客服及运营数据。",
  alternates: { canonical: "/privacy" }
};

export default function PrivacyPage() {
  return (
    <PolicyLayout
      eyebrow="客户政策"
      title="隐私政策"
      summary="本草案说明 GS学院当前网站服务使用的数据，不包含尚未上线的功能。"
      updatedAt="2026-07-27"
      sections={[
        {
          id: "data-we-use",
          title: "本服务使用的信息",
          content: (
            <>
              <p>
                Supabase 存储运行账号所需的账号标识、你提供的资料、角色、权限、内容访问记录，以及产品或订阅记录。
              </p>
              <p>
                Stripe 负责处理付款信息，并返回结账、权限开通、退款、付款争议和账号支持所需的账单标识、状态、金额及有限交易信息。GS学院不会存储完整银行卡号。
              </p>
            </>
          )
        },
        {
          id: "how-we-use-data",
          title: "我们如何使用信息",
          content: (
            <ul>
              <li>验证账号并保护登录会话。</li>
              <li>交付符合权限的文章、线上答疑访问权和已购内容。</li>
              <li>同步账单状态并回复帮助请求。</li>
              <li>为保障可靠性，保留范围有限的运营和安全日志。</li>
            </ul>
          )
        },
        {
          id: "storage-and-sharing",
          title: "数据存储与服务提供商",
          content: (
            <p>
              GS学院使用 Supabase 存储应用数据并完成身份验证，使用 Stripe 处理付款和账单。必要的会话与安全存储用于维持登录状态并帮助防止滥用。帮助沟通记录会由你联系我们时使用的渠道保留。为遵守适用法律，或保护本服务及其用户，数据也可能依法披露。
            </p>
          )
        },
        {
          id: "current-limits",
          title: "GS学院目前不会进行的处理",
          content: (
            <p>
              我们不会出售个人信息。当前网站服务不运营广告网络，也不会运行尚未实施的营销分析。如果产品功能发生变化，本页面应在新的数据处理开始前更新。
            </p>
          )
        },
        {
          id: "choices",
          title: "你的选择",
          content: (
            <p>
              你可以通过帮助中心询问账号信息，或申请更正、删除相关信息。出于正常服务、防止欺诈或履行法律义务的需要，部分账单、安全、争议和运营记录可能必须保留。你的请求不会更改依法或因服务要求必须由 Stripe 保留的服务商记录。
            </p>
          )
        }
      ]}
    />
  );
}
