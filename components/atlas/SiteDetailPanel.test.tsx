import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SiteDetailPanel } from "./SiteDetailPanel";
import type { SiteCurrent } from "../../lib/types";

const bannack: SiteCurrent = {
  id: "1", slug: "bannack-montana", name: "Bannack", state: "Montana",
  region: "mountain_west", longitude: -112.99, latitude: 45.16,
  record: {
    yearSettled: 1862, yearAbandoned: 1970, peakPopulation: 10000,
    commodities: ["gold"], mineSize: 108, townAreaAcres: null,
    notes: null, verificationStatus: "presumed",
  },
};

describe("SiteDetailPanel", () => {
  it("renders name, state, and known facts", () => {
    render(<SiteDetailPanel site={bannack} onClose={() => {}} />);
    expect(screen.getByText("Bannack")).toBeInTheDocument();
    expect(screen.getByText(/Montana/)).toBeInTheDocument();
    expect(screen.getByText("1862")).toBeInTheDocument();
    expect(screen.getByText("10,000")).toBeInTheDocument();
  });

  it("shows 'unrecorded' for missing facts", () => {
    render(<SiteDetailPanel site={bannack} onClose={() => {}} />);
    expect(screen.getByText(/unrecorded/i)).toBeInTheDocument(); // town area
  });

  it("shows the presumed/unverified status badge", () => {
    render(<SiteDetailPanel site={bannack} onClose={() => {}} />);
    expect(screen.getByText(/presumed/i)).toBeInTheDocument();
  });

  it("calls onClose when the close control is clicked", () => {
    const onClose = vi.fn();
    render(<SiteDetailPanel site={bannack} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: /close/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
