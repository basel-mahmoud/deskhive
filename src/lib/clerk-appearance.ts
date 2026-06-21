/** Clerk <SignIn>/<SignUp> styling tuned to DeskHive's dark identity. */
export const clerkAppearance = {
  variables: {
    colorPrimary: "#ff6a45",
    colorBackground: "#131918",
    colorText: "#ece8df",
    colorTextSecondary: "#868d84",
    colorInputBackground: "#1a221f",
    colorInputText: "#ece8df",
    colorNeutral: "#ece8df",
    borderRadius: "10px",
    fontFamily: "var(--font-inter), system-ui, sans-serif",
  },
  elements: {
    rootBox: "w-full",
    cardBox: "w-full shadow-none",
    card: "bg-transparent shadow-none border-0 p-0",
    headerTitle: "font-display",
    socialButtonsBlockButton:
      "border-line-strong hover:bg-surface-2 text-ink",
    formButtonPrimary:
      "bg-accent text-accent-ink hover:brightness-110 normal-case font-medium",
    footerActionLink: "text-accent hover:text-accent-soft",
    formFieldInput: "bg-surface-2 border-line-strong",
    dividerLine: "bg-line",
    dividerText: "text-muted",
  },
} as const;
