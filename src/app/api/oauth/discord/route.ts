import {NextRequest} from "next/server";
import {authorizeWithDiscord, getDeleteAuthRequest, hasAuthRequest} from "@/lib/auth";
import {cookies} from "next/headers";

export async function GET(request: NextRequest) {
    const code = request.nextUrl.searchParams.get("code");
    const state = request.nextUrl.searchParams.get("state");

    if (!code || !state) return new Response(null, { status: 400 });
    if (!hasAuthRequest(state)) return new Response("Failed to find state", { status: 404 });

    const authRequest = await authorizeWithDiscord(code, state);
    if (!authRequest?.token) return new Response(null, { status: 401 });

    if (authRequest?.redirectUrl) {
        cookies().set('AUTH_TOKEN', authRequest.token);
        return Response.redirect(new URL(authRequest.redirectUrl, request.url));
    }
    return Response.json(true);
}