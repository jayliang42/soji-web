export type LoginPageCopy = {
  destinationDescription: string;
  destinationLabel: string;
  description: string;
  panelDescription: string;
  panelTitle: string;
  title: string;
};

const defaultCopy: LoginPageCopy = {
  destinationDescription:
    "GS学院 will return you to the guide or library view that brought you here.",
  destinationLabel: "your reading",
  description:
    "Sign in to keep your purchases, content access, and account history together.",
  panelDescription:
    "Use email or Google to access previews, member essays, templates, and account history.",
  panelTitle: "Unlock the library",
  title: "Sign in to continue reading"
};

export function getLoginPageCopy(nextPath: string): LoginPageCopy {
  const pathname = nextPath.split(/[?#]/u, 1)[0] || "/";

  if (pathname === "/checkout/claim") {
    return {
      destinationDescription:
        "登录后，我们会使用账号邮箱查找并绑定刚完成的购买。",
      destinationLabel: "购买领取页面",
      description:
        "请使用付款时填写的邮箱登录或创建账号。登录后，购买内容会自动加入你的账号。",
      panelDescription:
        "使用付款邮箱继续。我们不会要求你再次付款或输入订单号。",
      panelTitle: "登录并领取",
      title: "登录并领取你的购买"
    };
  }

  if (pathname === "/pricing") {
    return {
      destinationDescription:
        "You will return to the membership comparison and can continue from the same decision.",
      destinationLabel: "membership options",
      description:
        "Use one account for checkout, subscription management, and member access.",
      panelDescription:
        "Sign in with email or Google, then return to the membership options you were reviewing.",
      panelTitle: "Continue to membership",
      title: "Sign in to choose your membership"
    };
  }

  if (pathname === "/products" || pathname.startsWith("/products/")) {
    return {
      destinationDescription:
        "You will return to the shop, where your receipt and download can stay with this account.",
      destinationLabel: "the shop",
      description:
        "Your receipt, download access, and purchase history stay attached to this account.",
      panelDescription:
        "Sign in with email or Google, then return to the product you selected.",
      panelTitle: "Continue to checkout",
      title: "Sign in to complete your purchase"
    };
  }

  if (pathname === "/account") {
    return {
      destinationDescription:
        "You will continue to memberships, purchases, downloads, and profile details in one place.",
      destinationLabel: "your account",
      description:
        "Review memberships, purchases, downloads, and billing controls in one place.",
      panelDescription: "Use the email or Google account connected to your purchases.",
      panelTitle: "Open your account",
      title: "Sign in to your GS学院 account"
    };
  }

  if (pathname === "/office-hours") {
    return {
      destinationDescription:
        "You will return to the session schedule and see the access available to your membership.",
      destinationLabel: "Office Hours",
      description:
        "Use the account connected to your membership to view eligible sessions and replays.",
      panelDescription:
        "Sign in with email or Google, then return to the Office Hours schedule.",
      panelTitle: "Continue to Office Hours",
      title: "Sign in to view Office Hours"
    };
  }

  if (pathname === "/reset-password") {
    return {
      destinationDescription:
        "A new recovery email will bring you back to choose a replacement password.",
      destinationLabel: "password recovery",
      description:
        "Request a fresh link if the previous recovery email expired or could not be completed.",
      panelDescription:
        "Enter the email connected to your account and we will send a new recovery link.",
      panelTitle: "Start password recovery",
      title: "Request a new password link"
    };
  }

  if (pathname === "/admin") {
    return {
      destinationDescription:
        "You will return to the requested publisher workspace after your assigned role is confirmed.",
      destinationLabel: "the Admin workspace",
      description:
        "Publisher and administrator tools remain protected by your assigned account roles.",
      panelDescription: "Use the account that has editor or administrator access.",
      panelTitle: "Open the workspace",
      title: "Sign in to access Admin"
    };
  }

  return defaultCopy;
}
