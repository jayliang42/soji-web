export type LoginPageCopy = {
  description: string;
  panelDescription: string;
  panelTitle: string;
  title: string;
};

const defaultCopy: LoginPageCopy = {
  description:
    "Create an account before checkout so your membership, purchases, and content access stay attached to the same profile.",
  panelDescription:
    "Use email or Google to access previews, member essays, templates, and account history.",
  panelTitle: "Unlock the library",
  title: "Sign in to continue reading"
};

export function getLoginPageCopy(nextPath: string): LoginPageCopy {
  if (nextPath === "/pricing") {
    return {
      description:
        "Use one account for checkout, subscription management, and member access.",
      panelDescription:
        "Sign in with email or Google, then return to the membership options you were reviewing.",
      panelTitle: "Continue to membership",
      title: "Sign in to choose your membership"
    };
  }

  if (nextPath === "/products" || nextPath.startsWith("/products/")) {
    return {
      description:
        "Your receipt, download access, and purchase history stay attached to this account.",
      panelDescription:
        "Sign in with email or Google, then return to the product you selected.",
      panelTitle: "Continue to checkout",
      title: "Sign in to complete your purchase"
    };
  }

  if (nextPath === "/account") {
    return {
      description:
        "Review memberships, purchases, downloads, and billing controls in one place.",
      panelDescription: "Use the email or Google account connected to your purchases.",
      panelTitle: "Open your account",
      title: "Sign in to view your account"
    };
  }

  if (nextPath === "/admin" || nextPath.startsWith("/admin?")) {
    return {
      description:
        "Publisher and administrator tools remain protected by your assigned account roles.",
      panelDescription: "Use the account that has editor or administrator access.",
      panelTitle: "Open the workspace",
      title: "Sign in to access Admin"
    };
  }

  return defaultCopy;
}
