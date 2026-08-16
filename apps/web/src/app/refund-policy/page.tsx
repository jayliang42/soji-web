import Link from "next/link";
import type { Metadata } from "next";
import { PolicyLayout } from "@/components/policy-layout";

export const metadata: Metadata = {
  title: "退款政策",
  description:
    "GS学院电子产品的退款政策：付款完成后不支持退款，付款即表示同意本政策。",
  alternates: { canonical: "/refund-policy" }
};

export default function RefundPolicyPage() {
  return (
    <PolicyLayout
      eyebrow="购买政策"
      title="退款政策"
      summary="GS学院提供的案例、资料和其他下载内容均为电子产品。付款完成后，订单即视为最终完成且不予退款；付款即表示你已阅读并同意本政策。"
      updatedAt="August 16, 2026"
      sections={[
        {
          id: "digital-products",
          title: "电子产品不予退款",
          content: (
            <>
              <p>
                GS学院销售的真实录取案例、资料、模板和其他下载内容均为电子产品。付款完成后，所有订单均为最终订单，不支持退款、退换或因改变主意、未使用内容等原因取消付款。
              </p>
              <p>
                该政策适用于单篇案例和55篇案例合集。请在付款前确认账号、购买内容和价格信息。
              </p>
            </>
          )
        },
        {
          id: "payment-consent",
          title: "付款即表示同意",
          content: (
            <p>
              在支付页面完成付款，即表示你已阅读、理解并同意{" "}
              <Link href="/terms">GS学院条款</Link>和本
              <Link href="/refund-policy">退款政策</Link>，并接受电子产品付款后不予退款的规则。
            </p>
          )
        },
        {
          id: "access",
          title: "交付与账号访问",
          content: (
            <p>
              付款后，内容会绑定到付款时使用的GS学院账号。如果遇到账号登录、内容交付或文件访问问题，请联系{" "}
              <Link href="/support">Support</Link>，我们会协助核查和解决访问问题；这不改变电子产品不予退款的政策。
            </p>
          )
        },
        {
          id: "legal-rights",
          title: "法律规定的权利",
          content: (
            <p>
              如果适用法律明确要求提供退款或其他消费者救济措施，本政策不限制这些法定权利。除法律强制要求外，GS学院不提供电子产品退款。
            </p>
          )
        }
      ]}
    />
  );
}
