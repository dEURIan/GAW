import { describe, expect, it } from "vitest";
import { getRouter } from "@/router";

describe("Application routing tree", () => {
  it("exposes all expected hiring, working, gig management, verification, and settings routes", () => {
    const router = getRouter();
    const paths = Object.keys(router.routesById).map((p) => p.replace(/\/$/, "") || "/");

    for (const expected of [
      "/",
      "/login",
      "/signup",
      "/mode",
      "/hire",
      "/find",
      "/gigs",
      "/bookings",
      "/work",
      "/jobs",
      "/jobs/$id",
      "/my-jobs",
      "/pro",
      "/verify",
      "/settings",
      "/requests/$id",
      "/workers/$id",
      "/book/$workerId",
    ]) {
      expect(paths).toContain(expected);
    }
  });
});
