import { clerkMiddleware } from "@clerk/nextjs/server";

// Minimal middleware: let Clerk set up its request state, do not protect any routes.
// Page-level <SignedIn>/<SignedOut> guards in the (app) layout handle redirect logic.
export default clerkMiddleware(() => {
  // No-op: we deliberately do NOT call auth().protect() here.
  // Doing so in dev triggers Clerk's `dev-browser-missing` 500 when a request
  // comes from a non-browser (curl). Public routes pass through unchanged.
});

export const config = {
  matcher: [
    "/((?!_next|.*\\..*).*)",
    "/(api|trpc)(.*)",
  ],
};
