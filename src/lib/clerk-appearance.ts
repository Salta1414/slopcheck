import type { ComponentProps } from "react";
import type { ClerkProvider } from "@clerk/nextjs";

type Appearance = NonNullable<
  ComponentProps<typeof ClerkProvider>["appearance"]
>;

const comicElements = {
  rootBox: "cl-slop-root font-[family-name:var(--font-display)]",
  cardBox: "cl-slop-card-box",
  card: "cl-slop-card !shadow-none",
  headerTitle:
    "!font-[family-name:var(--font-display)] !text-2xl !font-extrabold !text-[var(--ink)]",
  headerSubtitle: "!font-semibold !text-[var(--ink)]/60",
  socialButtonsBlockButton: "cl-slop-btn-secondary !font-extrabold",
  formFieldLabel: "!font-extrabold !text-[var(--ink)]",
  formFieldInput: "cl-slop-input !font-semibold !text-[var(--ink)]",
  formButtonPrimary: "cl-slop-btn-primary !font-black !text-[var(--ink)]",
  footer: "!hidden",
  footerAction: "!hidden",
  identityPreviewEditButton: "!font-bold",
  formFieldInputShowPasswordButton: "!text-[var(--ink)]",
  dividerLine: "!bg-[var(--ink)]/20",
  dividerText: "!font-bold !text-[var(--ink)]/45",
  modalCloseButton:
    "cl-slop-close !text-[var(--ink)] hover:!bg-[var(--accent-3)]",
  logoBox: "cl-slop-logo",
  logoImage: "!h-14 !w-14",
} as const;

/**
 * Comic / squishy Clerk chrome — auth modals, user button, account profile.
 */
export const clerkAppearance = {
  variables: {
    colorPrimary: "#2EE6A6",
    colorPrimaryForeground: "#1A1523",
    colorDanger: "#FF5A7A",
    colorSuccess: "#2EE6A6",
    colorWarning: "#FFE566",
    colorBackground: "#FFF8F0",
    colorForeground: "#1A1523",
    colorMutedForeground: "rgba(26, 21, 35, 0.62)",
    colorNeutral: "#1A1523",
    colorInput: "#FFFFFF",
    colorInputForeground: "#1A1523",
    colorBorder: "#1A1523",
    colorShadow: "#1A1523",
    colorModalBackdrop: "rgba(26, 21, 35, 0.55)",
    borderRadius: "1.35rem",
    fontFamily: "var(--font-display), system-ui, sans-serif",
    fontFamilyButtons: "var(--font-display), system-ui, sans-serif",
  },
  options: {
    logoImageUrl: "/brand/icon-512.png",
    logoLinkUrl: "/",
    logoPlacement: "inside",
    socialButtonsVariant: "blockButton",
    socialButtonsPlacement: "bottom",
    showOptionalFields: false,
  },
  elements: comicElements,
  userButton: {
    elements: {
      rootBox: "cl-slop-user-root",
      userButtonTrigger: "cl-slop-user-trigger focus:shadow-none",
      userButtonAvatarBox: "cl-slop-avatar",
      userButtonPopoverRootBox: "cl-slop-popover-root !mt-3",
      userButtonPopoverCard: "cl-slop-popover !shadow-none",
      userButtonPopoverMain: "!bg-transparent",
      userButtonPopoverActions: "!gap-1 !p-1",
      userButtonPopoverActionButton:
        "cl-slop-menu-item !font-extrabold !text-[var(--ink)]",
      userButtonPopoverActionButtonIconBox: "!text-[var(--ink)]",
      userButtonPopoverActionButtonIcon: "!text-[var(--ink)]",
      userButtonPopoverFooter: "!hidden",
      userPreviewMainIdentifier:
        "!font-[family-name:var(--font-display)] !font-extrabold !text-[var(--ink)]",
      userPreviewSecondaryIdentifier: "!font-semibold !text-[var(--ink)]/55",
    },
  },
  userProfile: {
    elements: {
      rootBox: "cl-slop-profile-root font-[family-name:var(--font-display)]",
      cardBox: "cl-slop-profile-card-box",
      card: "cl-slop-profile-card !shadow-none",
      navbar: "cl-slop-navbar",
      navbarButton:
        "!font-extrabold !rounded-2xl !border-[3px] !border-transparent",
      navbarButtonIcon: "!text-[var(--ink)]",
      scrollBox: "cl-slop-scroll",
      pageScrollBox: "!bg-[var(--bg)]",
      profileSectionTitleText:
        "!font-[family-name:var(--font-display)] !font-extrabold !text-[var(--ink)]",
      profileSectionPrimaryButton: "!font-extrabold !text-[var(--ink)]",
      footer: "!hidden",
      headerTitle:
        "!font-[family-name:var(--font-display)] !font-extrabold !text-[var(--ink)]",
      headerSubtitle: "!font-semibold !text-[var(--ink)]/60",
      modalCloseButton:
        "cl-slop-close !text-[var(--ink)] hover:!bg-[var(--accent-3)]",
      avatarBox: "cl-slop-avatar",
      formButtonPrimary: "cl-slop-btn-primary !font-black !text-[var(--ink)]",
      formFieldInput: "cl-slop-input !font-semibold",
      badge: "cl-slop-badge",
    },
  },
} satisfies Appearance;
