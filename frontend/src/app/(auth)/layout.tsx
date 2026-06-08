import Providers from "../providers";

export const dynamic = "force-dynamic";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  // Sign-in / sign-up pages need a ClerkProvider (for <SignIn /> / <SignUp />),
  // but we deliberately skip the (app) sidebar and theme chrome.
  return <Providers>{children}</Providers>;
}
