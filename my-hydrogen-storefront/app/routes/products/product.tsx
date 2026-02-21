import { Gift, Package, ShieldCheck, Truck } from "@phosphor-icons/react";
import {
  Analytics,
  getAdjacentAndFirstAvailableVariants,
  getSeoMeta,
  useOptimisticVariant,
} from "@shopify/hydrogen";
import { getSelectedProductOptions } from "@weaverse/hydrogen";
import { type ReactNode, useEffect } from "react";
import type { LoaderFunctionArgs, MetaArgs } from "react-router";
import { useLoaderData } from "react-router";
import type { ProductQuery } from "storefront-api.generated";
import invariant from "tiny-invariant";
import {
  redirectIfCombinedListing,
  redirectIfHandleIsLocalized,
} from "~/.server/redirect";
import { seoPayload } from "~/.server/seo";
import { PRODUCT_QUERY } from "~/graphql/queries";
import { routeHeaders } from "~/utils/cache";
import {
  COMBINED_LISTINGS_CONFIGS,
  isCombinedListing,
} from "~/utils/combined-listings";
import { WeaverseContent } from "~/weaverse";
import { getRecommendedProducts } from "./recommended-product";

export const headers = routeHeaders;

export async function loader({ params, request, context }: LoaderFunctionArgs) {
  const { productHandle: handle } = params;

  invariant(handle, "Missing productHandle param, check route filename");

  const { storefront, weaverse } = context;
  const selectedOptions = getSelectedProductOptions(request);
  const [{ shop, product }, weaverseData] = await Promise.all([
    storefront.query<ProductQuery>(PRODUCT_QUERY, {
      variables: {
        handle,
        selectedOptions,
        country: storefront.i18n.country,
        language: storefront.i18n.language,
      },
    }),
    weaverse.loadPage({ type: "PRODUCT", handle }),
    // Add other queries here, so that they are loaded in parallel
  ]);

  if (!product?.id) {
    throw new Response("product", { status: 404 });
  }
  redirectIfHandleIsLocalized(request, { handle, data: product });

  if (COMBINED_LISTINGS_CONFIGS.redirectToFirstVariant) {
    redirectIfCombinedListing(request, product);
  }

  // Use Hydrogen/Remix streaming for recommended products
  const recommended = getRecommendedProducts(storefront, product.id);

  return {
    shop,
    product,
    weaverseData,
    storeDomain: shop.primaryDomain.url,
    seo: seoPayload.product({ product, url: request.url }),
    recommended,
    selectedOptions,
  };
}

export const meta = ({ matches }: MetaArgs<typeof loader>) => {
  return getSeoMeta(
    ...matches.map((match) => (match.data as any)?.seo).filter(Boolean),
  );
};

export default function Product() {
  const { product } = useLoaderData<typeof loader>();
  const combinedListing = isCombinedListing(product);

  // Optimistically selects a variant with given available variant information
  const selectedVariant = useOptimisticVariant(
    product.selectedOrFirstAvailableVariant,
    getAdjacentAndFirstAvailableVariants(product),
  );

  // Sets the search param to the selected variant without navigation
  // when no search params are set or when variant options don't match
  useEffect(() => {
    if (!selectedVariant?.selectedOptions || combinedListing) {
      return;
    }

    const currentParams = new URLSearchParams(window.location.search);
    let needsUpdate = false;

    // If no search params exist, we need to add them
    if (window.location.search === "") {
      needsUpdate = true;
    } else {
      // Check if any of the selected variant options differ from current params
      for (const option of selectedVariant.selectedOptions) {
        const currentValue = currentParams.get(option.name);
        if (currentValue !== option.value) {
          needsUpdate = true;
          break;
        }
      }
    }

    if (needsUpdate) {
      // Preserve existing non-variant-related params
      const updatedParams = new URLSearchParams(currentParams);

      // Update or add variant option params
      for (const option of selectedVariant.selectedOptions) {
        updatedParams.set(option.name, option.value);
      }

      const newSearch = updatedParams.toString();
      if (newSearch !== window.location.search.slice(1)) {
        window.history.replaceState(
          {},
          "",
          `${location.pathname}?${newSearch}`,
        );
      }
    }
  }, [selectedVariant?.selectedOptions, combinedListing]);

  return (
    <>
      <WeaverseContent />
      <section className="mx-auto mt-8 mb-16 w-full max-w-(--page-width) px-4 md:px-6">
        <div className="grid gap-4 rounded-2xl border border-(--color-line-subtle) bg-white/70 p-5 md:grid-cols-4 md:gap-6 md:p-6">
          <TasteePromiseItem
            icon={<Truck className="h-5 w-5" />}
            title="Fast U.S. shipping"
            description="Free shipping on orders over $75."
          />
          <TasteePromiseItem
            icon={<ShieldCheck className="h-5 w-5" />}
            title="Freshness promise"
            description="Small-batch products prepared for each drop."
          />
          <TasteePromiseItem
            icon={<Gift className="h-5 w-5" />}
            title="Gift-ready options"
            description="Great for birthdays, thank-yous, and holidays."
          />
          <TasteePromiseItem
            icon={<Package className="h-5 w-5" />}
            title="Secure delivery"
            description="Carefully packed to arrive in perfect condition."
          />
        </div>
      </section>
      {selectedVariant && (
        <Analytics.ProductView
          data={{
            products: [
              {
                id: product.id,
                title: product.title,
                price: selectedVariant?.price.amount || "0",
                vendor: product.vendor,
                variantId: selectedVariant?.id || "",
                variantTitle: selectedVariant?.title || "",
                quantity: 1,
              },
            ],
          }}
        />
      )}
    </>
  );
}

function TasteePromiseItem({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 rounded-full bg-[#F7E7DA] p-2 text-[#A64B2A]">
        {icon}
      </div>
      <div>
        <p className="font-medium text-[#2D221A]">{title}</p>
        <p className="text-sm text-[#6D5442]">{description}</p>
      </div>
    </div>
  );
}
