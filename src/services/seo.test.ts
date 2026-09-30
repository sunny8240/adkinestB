import test from "node:test";
import assert from "node:assert/strict";

import { buildCanonicalUrl, buildSeoMeta, toSlug } from "./seo.js";

test("toSlug keeps readable blog slugs", () => {
  assert.equal(toSlug("How Digital Marketing Helps Small Businesses"), "how-digital-marketing-helps-small-businesses");
  assert.equal(toSlug("   SEO & Google Ads!!!   "), "seo-google-ads");
});

test("buildCanonicalUrl generates a valid canonical for a blog post", () => {
  assert.equal(buildCanonicalUrl("https://www.adkinest.tech", "digital-marketing-for-small-businesses"), "https://www.adkinest.tech/blog/digital-marketing-for-small-businesses");
  assert.equal(buildCanonicalUrl("https://www.adkinest.tech/", "seo-agency-pune"), "https://www.adkinest.tech/blog/seo-agency-pune");
});

test("buildSeoMeta uses SEO defaults while preserving the custom override", () => {
  const meta = buildSeoMeta({
    title: "Digital Marketing for Small Businesses",
    description: "A practical guide for growing a local business with digital marketing.",
    slug: "digital-marketing-for-small-businesses",
    baseUrl: "https://www.adkinest.tech",
    focusKeyword: "digital marketing for small businesses",
    seoTitle: "Digital Marketing for Small Businesses | Adkinest",
    seoDescription: "Adkinest helps small businesses grow with digital marketing strategy and conversion-focused web design.",
  });

  assert.equal(meta.title, "Digital Marketing for Small Businesses | Adkinest");
  assert.equal(meta.description, "Adkinest helps small businesses grow with digital marketing strategy and conversion-focused web design.");
  assert.equal(meta.canonicalUrl, "https://www.adkinest.tech/blog/digital-marketing-for-small-businesses");
  assert.match(meta.socialTitle, /Digital Marketing for Small Businesses/i);
  assert.match(meta.socialDescription, /Adkinest/i);
});
