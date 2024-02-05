import { authMiddleware } from "@clerk/nextjs";
import { NextResponse } from "next/server";

// This example protects all routes including api/trpc routes
// Please edit this to allow other routes to be public as needed.
// See https://clerk.com/docs/references/nextjs/auth-middleware for more information about configuring your Middleware

// we are going to rewrite a user to a particular path... users will be accessing subdomains, we're going to rewrite the url so it looks like a subdomain... if subdomain exists, send user other to that page (in the format of next.js app dir file routing)

export default authMiddleware({
    publicRoutes: ["/site", "/api/uploadthing"],
    async beforeAuth(auth, req) {}, // access to auth and request object
    async afterAuth(auth, req) {
        // rewrite logic for our domains
        const url = req.nextUrl;
        const searchParams = url.searchParams.toString();
        let hostname = req.headers;

        // template literal for constructing url with searchParam query
        const pathWithSearchParams = `${url.pathname}${
            searchParams.length > 0 ? `?${searchParams}` : ""
        }`;

        const customSubDomain = hostname
            .get("host")
            ?.split(`${process.env.NEXT_PUBLIC_DOMAIN}`)
            .filter(Boolean)[0];

        // if the subdomain exists
        if (customSubDomain) {
            return NextResponse.rewrite(
                new URL(`/${customSubDomain}${pathWithSearchParams}`, req.url)
            );
        }

        // if a user is on our auth urls, redirect to /agency/sign-in
        if (url.pathname === "/sign-in" || url.pathname === "/sign-up") {
            return NextResponse.redirect(new URL(`/agency/sign-in`, req.url));
        }

        // if a user is on our landing page, redirect to /site
        if (
            url.pathname === "/" ||
            (url.pathname === "/site" &&
                url.host === process.env.NEXT_PUBLIC_DOMAIN)
        ) {
            return NextResponse.rewrite(new URL("/site", req.url));
        }

        // catch case for either /agency or /subaccount endpoints
        if (
            url.pathname.startsWith("/agency") ||
            url.pathname.startsWith("/subaccount")
        ) {
            return NextResponse.rewrite(
                new URL(`${pathWithSearchParams}`, req.url)
            );
        }
    },
});

export const config = {
    matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};
