import {createAuthRequest, getDiscordRedirectData} from "@/lib/auth";
import {env} from "@/lib/env.mjs";

export async function POST() {
    const request = createAuthRequest();
    return Response.json(getDiscordRedirectData(request));
}