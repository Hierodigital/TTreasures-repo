import type { SeoConfig } from "@shopify/hydrogen";
import { AnalyticsPageType, getSeoMeta } from "@shopify/hydrogen";
import type { PageType } from "@weaverse/hydrogen";
import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import type { ShopQuery } from "storefront-api.generated";
import { seoPayload } from "~/.server/seo";
import Link from "~/components/link";
import { routeHeaders } from "~/utils/cache";
import { validateWeaverseData, WeaverseContent } from "~/weaverse";

export const headers = routeHeaders;

export async function loader(args: LoaderFunctionArgs) {
  const { params, context } = args;
  const { pathPrefix } = context.storefront.i18n;
  const locale = pathPrefix?.slice(1) || "";
  let type: PageType = "INDEX";

  if (params.locale && params.locale.toLowerCase() !== locale) {
    // Update for Weaverse: if it not locale, it probably is a custom page handle
    type = "CUSTOM";
  }

  // Calculate seo payload synchronously
  const seo = seoPayload.home();

  // Load async data in parallel for better performance
  const [weaverseData, { shop }] = await Promise.all([
    context.weaverse.loadPage({ type }),
    context.storefront.query<ShopQuery>(SHOP_QUERY),
  ]);

  // Check weaverseData after parallel loading
  validateWeaverseData(weaverseData);

  return {
    shop,
    weaverseData,
    analytics: {
      pageType: AnalyticsPageType.home,
    },
    seo,
  };
}

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  return getSeoMeta(data?.seo as SeoConfig);
};

const RAMP_CARDS = [
  {
    title: "Shop Best Sellers",
    body: "Start with our most-loved picks and signature crowd favorites.",
    to: "/collections/all?sort=best-selling",
    cta: "Browse best sellers",
  },
  {
    title: "Build A Gift Box",
    body: "Choose from seasonal treats and create a gift-ready bundle in minutes.",
    to: "/collections/all",
    cta: "Build your box",
  },
  {
    title: "Try New Drops",
    body: "Catch limited weekly releases before they sell out.",
    to: "/collections/all?sort=created-descending",
    cta: "Shop new drops",
  },
] as const;

export default function Homepage() {
  return (
    <>
      <WeaverseContent />
      <section className="mx-auto mb-16 w-full max-w-(--page-width) px-4 md:mb-20 md:px-6">
        <div className="overflow-hidden rounded-3xl border border-(--color-line-subtle) bg-linear-to-br from-[#FFF3E8] to-[#FFFDF9] p-6 md:p-8">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4 md:mb-8">
            <div>
              <p className="mb-2 text-sm font-medium tracking-wide text-[#A64B2A] uppercase">
                Tastee Conversion Ramp
              </p>
              <h2 className="text-2xl leading-tight font-semibold md:text-3xl">
                Find your perfect treat in 3 quick paths
              </h2>
            </div>
            <Link
              to="/collections/all"
              className="inline-flex items-center rounded-full bg-[#A64B2A] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#8E3F22]"
            >
              Shop all products
            </Link>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {RAMP_CARDS.map((card) => (
              <article
                key={card.title}
                className="flex h-full flex-col rounded-2xl border border-(--color-line-subtle) bg-white/80 p-5"
              >
                <h3 className="mb-2 text-lg font-semibold text-[#2D221A]">{card.title}</h3>
                <p className="mb-5 flex-1 text-sm text-[#6D5442]">{card.body}</p>
                <Link
                  to={card.to}
                  className="inline-flex items-center text-sm font-medium text-[#A64B2A] hover:text-[#8E3F22]"
                >
                  {card.cta}
                </Link>
              </article>
            ))}
          </div>

          <div className="mt-6 grid gap-3 text-sm text-[#6D5442] md:mt-8 md:grid-cols-3">
            <p>Free U.S. shipping over $75</p>
            <p>Small-batch made fresh weekly</p>
            <p>Gift-ready options available</p>
          </div>
        </div>
      </section>
    </>
  );
}

const SHOP_QUERY = `#graphql
  query shop($country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    shop {
      name
      description
    }
  }
` as const;
