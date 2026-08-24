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
    "登录后会回到你刚才浏览的指南或内容库页面。",
  destinationLabel: "继续阅读",
  description:
    "登录后可统一管理已购内容、访问权限和账号记录。",
  panelDescription:
    "使用邮箱或 Google 登录，查看预览、会员文章、模板和账号记录。",
  panelTitle: "进入内容库",
  title: "登录后继续阅读"
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
        "登录后会回到解锁方案页面，你可以从刚才的位置继续选择。",
      destinationLabel: "解锁方案",
      description:
        "用同一个账号完成付款、管理购买记录并访问已解锁内容。",
      panelDescription:
        "使用邮箱或 Google 登录，然后返回你刚才查看的解锁方案。",
      panelTitle: "继续选择方案",
      title: "登录后选择解锁方案"
    };
  }

  if (pathname === "/products" || pathname.startsWith("/products/")) {
    return {
      destinationDescription:
        "登录后会回到产品页面，收据和下载权限会保存在当前账号中。",
      destinationLabel: "产品页面",
      description:
        "收据、下载权限和购买记录都会保存在当前账号中。",
      panelDescription:
        "使用邮箱或 Google 登录，然后返回你刚才选择的产品。",
      panelTitle: "继续购买",
      title: "登录后完成购买"
    };
  }

  if (pathname === "/account") {
    return {
      destinationDescription:
        "登录后可在一个页面查看访问权限、购买记录、下载内容和账号资料。",
      destinationLabel: "账号中心",
      description:
        "在一个页面查看访问权限、购买记录、下载内容和付款信息。",
      panelDescription: "请使用与你的购买记录关联的邮箱或 Google 账号。",
      panelTitle: "进入账号中心",
      title: "登录你的 GS学院账号"
    };
  }

  if (pathname === "/office-hours") {
    return {
      destinationDescription:
        "登录后会回到答疑日程，并显示当前账号可参加的场次。",
      destinationLabel: "线上答疑",
      description:
        "请使用与访问权限关联的账号查看可参加的场次和回放。",
      panelDescription:
        "使用邮箱或 Google 登录，然后返回线上答疑日程。",
      panelTitle: "继续查看答疑",
      title: "登录后查看线上答疑"
    };
  }

  if (pathname === "/reset-password") {
    return {
      destinationDescription:
        "新的重置邮件会带你返回网站设置新密码。",
      destinationLabel: "密码重置",
      description:
        "如果之前的重置邮件已过期或无法完成，请申请一个新链接。",
      panelDescription:
        "输入账号邮箱，我们会发送新的密码重置链接。",
      panelTitle: "重置密码",
      title: "申请新的密码重置链接"
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
