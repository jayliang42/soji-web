import type { Metadata } from "next";
import { PolicyLayout } from "@/components/policy-layout";

export const metadata: Metadata = {
  title: "财务免责声明",
  description:
    "说明 GS学院内容和线上答疑的教育范围，以及在财务决策方面的限制。",
  alternates: { canonical: "/financial-disclaimer" }
};

export default function FinancialDisclaimerPage() {
  return (
    <PolicyLayout
      eyebrow="编辑标准"
      title="财务免责声明"
      summary="GS学院帮助读者更清楚地思考理财决策，但不会替读者作出决定。"
      updatedAt="2026-07-27"
      sections={[
        {
          id: "education",
          title: "仅提供一般教育",
          content: (
            <p>
              文章、模板、案例、产品和线上答疑均属于一般教育内容，不构成针对个人的投资、法律、税务、会计、保险或信贷建议，也不会形成专业顾问与客户关系。
            </p>
          )
        },
        {
          id: "decisions",
          title: "决定仍由你自己作出",
          content: (
            <p>
              财务规则、市场、产品和个人情况都会变化。采取行动前，请核实重要事实，并考虑咨询具备相应资质、能够评估你的目标、风险、所在司法辖区和完整财务状况的专业人士。
            </p>
          )
        },
        {
          id: "outcomes",
          title: "不承诺结果",
          content: (
            <p>
              案例和历史观察仅用于说明，并不能预测未来结果。每项财务选择都需要权衡，也可能涉及损失、税务后果、费用或其他风险；一般教育内容无法替你完整评估这些风险。
            </p>
          )
        },
        {
          id: "questions",
          title: "问题与更正",
          content: (
            <p>
              如需报告无障碍访问问题、事实更正、账号问题或账单疑问，请使用帮助中心。请勿发送机密财务记录，也不要要求客服替你选择投资或法律策略。
            </p>
          )
        }
      ]}
    />
  );
}
