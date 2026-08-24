import Link from "next/link";
import type { Metadata } from "next";
import { PolicyLayout } from "@/components/policy-layout";

export const metadata: Metadata = {
  title: "使用条款",
  description:
    "使用 GS学院教育内容、会员、线上答疑和电子产品的条款。",
  alternates: { canonical: "/terms" }
};

export default function TermsPage() {
  return (
    <PolicyLayout
      eyebrow="客户政策"
      title="使用条款"
      summary="本审核草案说明 GS学院当前提供的教育内容服务，以及使用账号时需要承担的责任。"
      updatedAt="2026-07-27"
      sections={[
        {
          id: "service",
          title: "服务内容",
          content: (
            <p>
              GS学院发布关于理财决策的一般教育内容。账号可能包含公开阅读权限、仅限本人且不可转让的会员权限、参加线上答疑的资格，或已购电子产品的交付权限。功能和发布安排可能会调整。
            </p>
          )
        },
        {
          id: "account",
          title: "你的账号",
          content: (
            <p>
              请妥善保管账号凭据并提供准确信息。访问权限仅属于账号持有人，不得共享、转售、批量抓取，也不得用于绕过权限限制。除非你及时报告未经授权的访问，否则你需要对通过该账号进行的活动负责。
            </p>
          )
        },
        {
          id: "billing",
          title: "Full Access 付款与访问",
          content: (
            <>
              <p>
                Full Access 为一次性支付 99 美元，不会自动续费。访问权限会绑定到完成购买的账号，并受已公布退款政策的约束。
              </p>
              <p>
                付款失败、全额退款或尚未解决的付款争议，可能导致访问权限暂停或结束。当前规则请参阅
                <Link href="/refund-policy">退款政策</Link>。
              </p>
            </>
          )
        },
        {
          id: "acceptable-use",
          title: "合理使用与知识产权",
          content: (
            <p>
              GS学院的内容、设计、下载文件和原创资料受适用的知识产权法律保护。你可以个人使用已购内容或会员资料，但不得重新发布、出售、分发、自动化提取、干扰或滥用本服务。
            </p>
          )
        },
        {
          id: "education",
          title: "一般教育，不构成个性化建议",
          content: (
            <p>
              GS学院提供一般教育内容，不构成针对个人的投资、法律、税务或会计建议。网站内容和线上答疑无法涵盖每个人的具体情况，也不承诺任何财务结果。当决策需要结合你的个人情况时，请考虑咨询具备相应资质的专业人士。
            </p>
          )
        },
        {
          id: "availability",
          title: "服务可用性与变更",
          content: (
            <p>
              随着内容服务的发展，网站可能进行更新或更正，也可能因安全或维护需要暂停，或调整现有功能。本条款如有重大变化，应以新的更新日期重新发布。你使用本服务时依法享有且不能被排除的权利不受影响。
            </p>
          )
        }
      ]}
    />
  );
}
