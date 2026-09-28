/**
 * Calibration set for `npx convex run evalActions:runGolden`.
 * Each site has the score range a fair human reviewer would accept.
 * Add every URL where Slopcheck got it clearly wrong — that's how the rubric
 * stays honest over prompt/model changes.
 */
export type GoldenSite = {
  url: string;
  min: number;
  max: number;
  note: string;
};

export const GOLDEN_SITES: GoldenSite[] = [
  {
    url: "https://cognicon-studios.com",
    min: 65,
    max: 100,
    note: "Pill badge, gradient headline, stat strip, scroll hint — textbook slop",
  },
  {
    url: "https://therift.chat",
    min: 30,
    max: 65,
    note: "Default dark slate + Inter, but real product UI and a voice",
  },
  {
    url: "https://stripe.com",
    min: 0,
    max: 35,
    note: "Distinctive, heavily branded",
  },
  {
    url: "https://www.apple.com",
    min: 0,
    max: 25,
    note: "Product imagery everywhere, own type",
  },
  {
    url: "https://www.berkshirehathaway.com",
    min: 0,
    max: 30,
    note: "Ugly-but-human: plain is not slop",
  },
  {
    url: "https://slopcheck.dev",
    min: 0,
    max: 35,
    note: "Our own comic UI",
  },
];
