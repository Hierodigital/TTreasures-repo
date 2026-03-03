import { redirect } from "react-router";
import type { LoaderFunctionArgs } from "react-router";

/**
 * /collections/all redirects to /products (the all-products page)
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  // Preserve any query params (sort, filters, etc.)
  const destination = "/products" + (url.search || "");
  return redirect(destination, { status: 301 });
}
