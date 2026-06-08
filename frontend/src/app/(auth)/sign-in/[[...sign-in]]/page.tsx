import { SignIn } from "@clerk/nextjs";

export default function Page() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--cp-bg, #0a0e1a)",
      }}
    >
      <SignIn />
    </div>
  );
}
