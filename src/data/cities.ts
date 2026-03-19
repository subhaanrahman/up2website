// Hardcoded city list — replace with Google Places API before launch (see docs/PLATFORM_TODOS.md)

export const CITIES = [
  // Australia
  "Sydney",
  "Melbourne",
  "Brisbane",
  "Perth",
  "Adelaide",
  "Gold Coast",
  "Canberra",
  "Hobart",
  "Darwin",
  "Newcastle",
  "Wollongong",
  "Cairns",
  "Townsville",
  "Geelong",
  "Sunshine Coast",
  // United States
  "New York",
  "Los Angeles",
  "Chicago",
  "Houston",
  "Phoenix",
  "Philadelphia",
  "San Antonio",
  "San Diego",
  "Dallas",
  "San Francisco",
  "Austin",
  "Seattle",
  "Denver",
  "Nashville",
  "Miami",
  "Atlanta",
  "Boston",
  "Las Vegas",
  "Portland",
  "Charlotte",
  // United Kingdom
  "London",
  "Manchester",
  "Birmingham",
  "Edinburgh",
] as const;

export type City = (typeof CITIES)[number];
