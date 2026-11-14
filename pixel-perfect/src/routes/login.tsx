import { createFileRoute } from "@tanstack/react-router";
import { AuthForm } from "@/components/gaw/AuthForm";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Log in — GAW" },
      { name: "description", content: "Log in to GAW, or try the demo account." },
      { property: "og:title", content: "Log in — GAW" },
      { property: "og:description", content: "Log in to GAW, or try the demo account." },
    ],
  }),
  component: () => (
    <div className="min-h-screen px-5 py-8 md:py-14">
      <AuthForm kind="login" />
    </div>
  ),
});
