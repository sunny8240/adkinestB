export type SeoMetaInput = {
  title?: string;
  description?: string;
  slug?: string;
  baseUrl?: string;
  focusKeyword?: string;
  seoTitle?: string;
  seoDescription?: string;
  socialTitle?: string;
  socialDescription?: string;
  socialImage?: string;
  canonicalUrl?: string;
};

export const toSlug = (value: string) => {
  const cleaned = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned
    .split(" ")
    .filter(Boolean)
    .join("-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
};

export const buildCanonicalUrl = (baseUrl: string, slug: string) => {
  const sanitizedBase = (baseUrl || "https://www.adkinest.tech").trim().replace(/\/+$/, "");
  const sanitizedSlug = (slug || "blog-post").trim().replace(/^\/+/, "").replace(/\/+$/, "");
  return `${sanitizedBase}/blog/${sanitizedSlug}`;
};

export const buildSeoMeta = ({
  title,
  description,
  slug,
  baseUrl,
  focusKeyword,
  seoTitle,
  seoDescription,
  socialTitle,
  socialDescription,
  socialImage,
  canonicalUrl,
}: SeoMetaInput) => {
  const finalTitle = (seoTitle && seoTitle.trim()) || title || "Adkinest";
  const finalDescription = (seoDescription && seoDescription.trim()) || description || "Adkinest helps businesses grow with strategy, digital marketing and website experience design.";
  const normalizedSlug = toSlug(slug || title || focusKeyword || "blog-post") || "blog-post";

  return {
    title: finalTitle,
    description: finalDescription,
    canonicalUrl: (canonicalUrl && canonicalUrl.trim()) || buildCanonicalUrl(baseUrl || "https://www.adkinest.tech", normalizedSlug),
    socialTitle: (socialTitle && socialTitle.trim()) || finalTitle,
    socialDescription: (socialDescription && socialDescription.trim()) || finalDescription,
    socialImage: socialImage || "",
    slug: normalizedSlug,
  };
};
