import { createFileRoute } from "@tanstack/react-router";
import { AuthForm } from "@/components/gaw/AuthForm";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Sign up — GAW" },
      {
        name: "description",
        content: "Create a GAW account to hire nearby workers or find work in Davao City.",
      },
      { property: "og:title", content: "Sign up — GAW" },
      {
        property: "og:description",
        content: "Create a GAW account to hire nearby workers or find work in Davao City.",
      },
    ],
  }),
  component: () => (
    <div className="min-h-screen px-5 py-8 md:py-14">
      <AuthForm kind="signup" />
    </div>
  ),
});
