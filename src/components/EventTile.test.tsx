import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";
import { EventTile } from "./EventTile";

const baseEvent = {
  id: "ev-1",
  title: "Summer Fest",
};

describe("EventTile", () => {
  it("renders event title", () => {
    renderWithProviders(<EventTile event={baseEvent} />);
    expect(screen.getByText("Summer Fest")).toBeInTheDocument();
  });

  it("renders TBD when no date", () => {
    renderWithProviders(<EventTile event={baseEvent} />);
    expect(screen.getByText(/TBD/i)).toBeInTheDocument();
  });

  it("renders formatted date when event_date provided", () => {
    renderWithProviders(
      <EventTile event={{ ...baseEvent, event_date: "2025-06-15T20:00:00Z" }} />
    );
    expect(screen.getByText(/Jun 1[56]/)).toBeInTheDocument();
  });

  it("renders venue when venue_name provided", () => {
    renderWithProviders(
      <EventTile event={{ ...baseEvent, venue_name: "The Ritz" }} />
    );
    expect(screen.getByText(/The Ritz/)).toBeInTheDocument();
  });

  it("renders venue from venueName", () => {
    renderWithProviders(
      <EventTile event={{ ...baseEvent, venueName: "Grand Hall" }} />
    );
    expect(screen.getByText(/Grand Hall/)).toBeInTheDocument();
  });

  it("renders venue from location", () => {
    renderWithProviders(
      <EventTile event={{ ...baseEvent, location: "Main Street" }} />
    );
    expect(screen.getByText(/Main Street/)).toBeInTheDocument();
  });

  it("renders extraBadges", () => {
    renderWithProviders(
      <EventTile event={baseEvent} extraBadges={<span data-testid="extra">Past</span>} />
    );
    expect(screen.getByTestId("extra")).toBeInTheDocument();
  });

  it("renders trailing content with wrapper=link", () => {
    renderWithProviders(
      <EventTile event={baseEvent} trailing={<span data-testid="trail">→</span>} />
    );
    expect(screen.getByTestId("trail")).toBeInTheDocument();
  });

  it("renders trailing content with wrapper=div", () => {
    renderWithProviders(
      <EventTile
        event={baseEvent}
        wrapper="div"
        trailing={<span data-testid="trail-div">→</span>}
      />
    );
    expect(screen.getByTestId("trail-div")).toBeInTheDocument();
  });

  it("uses custom to prop for link href", () => {
    const { container } = renderWithProviders(
      <EventTile event={baseEvent} to="/custom/ev-1" />
    );
    const link = container.querySelector('a[href="/custom/ev-1"]');
    expect(link).toBeInTheDocument();
  });

  it("defaults link to /events/:id when to omitted", () => {
    const { container } = renderWithProviders(<EventTile event={baseEvent} />);
    const link = container.querySelector('a[href="/events/ev-1"]');
    expect(link).toBeInTheDocument();
  });

  it("applies isPast styling", () => {
    const { container } = renderWithProviders(<EventTile event={baseEvent} isPast />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain("opacity-60");
  });
});
