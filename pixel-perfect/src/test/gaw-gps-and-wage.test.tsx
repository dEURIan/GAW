import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    Link: ({
      children,
      to,
      params: _params,
      ...rest
    }: {
      children?: ReactNode;
      to?: string;
      params?: Record<string, string>;
      [k: string]: unknown;
    }) => (
      <a href={typeof to === "string" ? to : "#"} {...rest}>
        {children}
      </a>
    ),
  };
});
import {
  calculateJobDistanceKm,
  calculateWorkerNetPayout,
  estimateDavaoJobPricing,
  estimateTravelMinutes,
  formatDistanceBadge,
  JOBS,
  WORKERS,
} from "@/lib/gaw/data";
import { filterAndSortJobs, filterWorkers } from "@/lib/gaw/filter";
import { GawProvider } from "@/lib/gaw/store";
import {
  LiveGpsTracker,
  projectDavaoCoord,
  unprojectDavaoCoord,
} from "@/components/gaw/LiveGpsTracker";
import { PostGigCard } from "@/components/gaw/PostGigCard";

describe("Davao GPS, Wage Policy & Fee Economics", () => {
  it("computes Haversine distances and travel ETAs for Davao City gigs", () => {
    const bajadaPin = { lat: 7.085, lng: 125.61 };
    const bajadaJob = JOBS.find((j) => j.id === "j-1")!;
    const torilJob = JOBS.find((j) => j.id === "j-7")!;

    const nearKm = calculateJobDistanceKm(
      bajadaPin.lat,
      bajadaPin.lng,
      bajadaJob.lat,
      bajadaJob.lng,
    );
    const farKm = calculateJobDistanceKm(bajadaPin.lat, bajadaPin.lng, torilJob.lat, torilJob.lng);

    expect(nearKm).toBeLessThan(1.5);
    expect(farKm).toBeGreaterThan(10);
    expect(formatDistanceBadge(0.45)).toBe("450 m away");
    expect(formatDistanceBadge(2.34)).toBe("2.3 km away");

    const eta = estimateTravelMinutes(nearKm);
    expect(eta.rideMin).toBeGreaterThanOrEqual(2);
    expect(eta.walkMin).toBeGreaterThan(eta.rideMin);
  });

  it("enforces Davao Region XI minimum wage floor (₱63.50/hr) and protects worker payouts", () => {
    const standard = estimateDavaoJobPricing("Cleaning", 4, false);
    const urgent = estimateDavaoJobPricing("Electrical", 4, true);

    expect(standard.hourlyFloorPhp).toBe(63.5);
    expect(standard.minimumRequiredPhp).toBe(254);
    expect(standard.aiRecommendedPhp).toBeGreaterThanOrEqual(standard.minimumRequiredPhp);
    expect(urgent.aiRecommendedPhp).toBeGreaterThan(standard.aiRecommendedPhp);

    // At exact minimum wage floor, 5% Free worker fee is waived so payout stays >= ₱254
    const floorPayout = calculateWorkerNetPayout(254, 4, false);
    expect(floorPayout.feePhp).toBe(0);
    expect(floorPayout.netPayoutPhp).toBe(254);
    expect(floorPayout.feeProtectedByMinWage).toBe(true);

    // Pro worker always pays 0% fee
    const proPayout = calculateWorkerNetPayout(1000, 4, true);
    expect(proPayout.feePhp).toBe(0);
    expect(proPayout.netPayoutPhp).toBe(1000);
  });

  it("projects and unprojects Davao coordinates and sorts filtered jobs by nearest GPS pin", () => {
    const pt = projectDavaoCoord(7.085, 125.61);
    expect(pt.x).toBeGreaterThan(10);
    expect(pt.y).toBeGreaterThan(10);

    const roundTrip = unprojectDavaoCoord(pt.x, pt.y);
    expect(Math.abs(roundTrip.lat - 7.085)).toBeLessThan(0.002);
    expect(Math.abs(roundTrip.lng - 125.61)).toBeLessThan(0.002);

    const sorted = filterAndSortJobs(JOBS, {
      category: "all",
      barangayId: "all",
      query: "",
      sortBy: "nearest",
      userGps: { lat: 7.0202, lng: 125.4995 }, // Toril
    });
    expect(sorted[0]?.id).toBe("j-7");
  });

  it("updates live GPS pin distance when switching Davao barangays in LiveGpsTracker", () => {
    const sorted = filterAndSortJobs(JOBS, {
      category: "all",
      barangayId: "all",
      query: "",
      sortBy: "nearest",
      userGps: { lat: 7.085, lng: 125.61 },
    });

    render(
      <GawProvider>
        <LiveGpsTracker jobs={sorted} selectedJobId={sorted[0]?.id} singleJobMode />
      </GawProvider>,
    );

    expect(screen.getByText(/Bajada \(J\.P\. Laurel Ave\)/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Pinpoint My GPS/i })).toBeInTheDocument();
    const demoBtn = screen.getByRole("button", { name: /Worker Walk Demo/i });
    fireEvent.click(demoBtn);
    expect(screen.getByRole("button", { name: /Pause Sim/i })).toBeInTheDocument();
    expect(screen.getByText(/Worker Walk Sim/i)).toBeInTheDocument();
  });

  it("auto-tracks real browser watchPosition GPS and switches smoothly to simulated locations", () => {
    const originalGeo = navigator.geolocation;
    let watchCb: ((pos: GeolocationPosition) => void) | null = null;
    const clearWatch = vi.fn();

    const makePos = (lat: number, lng: number, accuracy = 9): GeolocationPosition =>
      ({
        coords: {
          latitude: lat,
          longitude: lng,
          accuracy,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: 1.5,
          toJSON: () => ({}),
        },
        timestamp: Date.now(),
        toJSON: () => ({}),
      }) as GeolocationPosition;

    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition: vi.fn((success: PositionCallback) => {
          success(makePos(7.0731, 125.6126, 11));
        }),
        watchPosition: vi.fn((success: PositionCallback) => {
          watchCb = success;
          return 42;
        }),
        clearWatch,
      },
    });

    try {
      const sorted = filterAndSortJobs(JOBS, {
        category: "all",
        barangayId: "all",
        query: "",
        sortBy: "nearest",
        userGps: { lat: 7.085, lng: 125.61 },
      });

      render(
        <GawProvider>
          <LiveGpsTracker jobs={sorted} selectedJobId={sorted[0]?.id} />
        </GawProvider>,
      );

      expect(screen.getByText(/Live GPS Active/i)).toBeInTheDocument();
      expect(screen.getByText(/7\.0731°N, 125\.6126°E/i)).toBeInTheDocument();

      // Emit a real watchPosition movement update
      act(() => {
        watchCb?.(makePos(7.0644, 125.6081, 8));
      });
      expect(screen.getByText(/7\.0644°N, 125\.6081°E/i)).toBeInTheDocument();

      // Switch to Simulated Location via Barangay preset + Nudge + Route Stop
      fireEvent.click(screen.getByRole("button", { name: /^Toril$/ }));
      expect(clearWatch).toHaveBeenCalledWith(42);
      expect(screen.getByText(/Simulated Location/i)).toBeInTheDocument();
      expect(screen.getAllByText(/7\.0180°N, 125\.4980°E/i).length).toBeGreaterThan(0);

      fireEvent.click(screen.getByRole("button", { name: /Step North/i }));
      expect(screen.getAllByText(/7\.0202°N, 125\.4980°E/i).length).toBeGreaterThan(0);

      fireEvent.click(screen.getByRole("button", { name: /Next Route Stop/i }));
      expect(screen.getByText(/Simulated Location/i)).toBeInTheDocument();
      expect(screen.getByText(/Simulated stop:/i)).toBeInTheDocument();
    } finally {
      Object.defineProperty(navigator, "geolocation", {
        configurable: true,
        value: originalGeo,
      });
    }
  });

  it("filters and ranks nearby workers by live GPS origin coordinates", () => {
    const nearPoblacion = filterWorkers(WORKERS, {
      barangayId: "toril",
      origin: { lat: 7.0718, lng: 125.6102 },
      category: "all",
      query: "",
      radius: 3,
      availableOnly: false,
    });
    expect(nearPoblacion[0]?.id).toBe("w-dodong");
    expect(nearPoblacion[0]?.distance).toBe(0);

    const nearToril = filterWorkers(WORKERS, {
      barangayId: "poblacion",
      origin: { lat: 7.0195, lng: 125.4995 },
      category: "all",
      query: "",
      radius: 3,
      availableOnly: false,
    });
    expect(nearToril[0]?.id).toBe("w-lito");
    expect(nearToril[0]?.distance).toBe(0);
  });

  it("omits AI Pricing + Min Wage Guard banner and enforces minimum wage during Manual Pricing", () => {
    const onPosted = vi.fn();
    render(
      <GawProvider>
        <PostGigCard onPosted={onPosted} />
      </GawProvider>,
    );

    expect(screen.queryByText(/AI Pricing \+ Min Wage Guard/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/minimum wage floor/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Post a Gig/i }));
    expect(screen.queryByText(/AI Pricing \+ Min Wage Guard/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Minimum wage floor/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Legal Davao Min Floor/i)).not.toBeInTheDocument();

    expect(screen.getByRole("button", { name: /Use AI Rate/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Manual Pricing/i }));
    expect(screen.queryByRole("button", { name: /Use AI Rate/i })).not.toBeInTheDocument();
    expect(screen.getByText(/Enter your custom PHP offer \(min\. ₱254\.00/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Gig Title/i), {
      target: { value: "Fix Matina kitchen sink" },
    });
    fireEvent.change(screen.getByLabelText(/Job Description/i), {
      target: { value: "Tighten sink pipe and seal leak today." },
    });
    fireEvent.change(screen.getByLabelText(/Your Offer \(PHP\)/i), {
      target: { value: "150" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Publish Davao Gig Now/i }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      /below Davao Region XI minimum floor ₱254\.00/i,
    );
    expect(onPosted).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText(/Your Offer \(PHP\)/i), {
      target: { value: "300" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Publish Davao Gig Now/i }));
    expect(onPosted).toHaveBeenCalledTimes(1);
  });
});
