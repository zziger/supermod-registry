import prisma from '@/lib/prisma';
import {randomUUID} from "crypto";
import {env} from "@/lib/env.mjs";
import {cookies} from "next/headers";

interface IAuthRequest {
    id: string,
    token?: string,
    ttl: number,
    redirectUrl?: string
}

declare global {
    var authRequests: Record<string, IAuthRequest>;
}

const requestTtl = 900;
globalThis.authRequests = globalThis.authRequests ?? ({} as Record<string, IAuthRequest>)
const authRequests: Record<string, IAuthRequest> = globalThis.authRequests;

export function createAuthRequest(redirectUrl?: string) {
    const id = randomUUID();
    const now = Date.now();
    const req = { id, ttl: now + requestTtl, redirectUrl };

    for (const [key, value] of Object.entries(authRequests)) {
        if (value.ttl < now)
            delete authRequests[key];
    }

    authRequests[id] = req;

    return req;
}

export function hasAuthRequest(id: string) {
    console.log(authRequests);
    return id in authRequests;
}

export function updateAuthRequest(id: string, token: string) {
    const request = authRequests[id];
    if (!request) return;

    request.token = token;
    return request;
}

export function getDeleteAuthRequest(id: string) {
    console.log(authRequests);
    if (!(id in authRequests)) return null;
    const val = authRequests[id];
    if (val.token) delete authRequests[id];
    return val;
}

export function getAuthToken(request?: Request) {
    if (!request) return cookies().get('AUTH_TOKEN')?.value ?? null;
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) return null;

    const data = authHeader.split(' ');
    if (data.length !== 2) return null;
    if (data[0] !== 'Bearer') return null;

    return data[1];
}

export async function authorize(request?: Request) {
    const token = getAuthToken(request);
    if (!token) return { token: null, userId: null };

    const tokenEntry = await prisma.token.findUnique({
        where: { token },
        select: { expiresAt: true, user: { select: { id: true, role: true } } }
    });

    if (!tokenEntry) return { token: null, userId: null };
    if (tokenEntry.expiresAt && new Date(tokenEntry.expiresAt) < new Date()) {
        await prisma.token.delete({ where: { token } });
        return { token: null, userId: null };
    }

    return { token, user: tokenEntry.user };
}

export async function authorizeWithDiscord(code: string, state: string) {
    if (!hasAuthRequest(state)) return null;

    const discordAuthInfoRes = await fetch('https://discord.com/api/v10/oauth2/token', {
        method: 'POST',
        body: new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            redirect_uri: env.PUBLIC_API_URL + '/api/oauth/discord',
        }),
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${Buffer.from(env.DISCORD_CLIENT_ID + ':' + env.DISCORD_CLIENT_SECRET).toString('base64')}`
        }
    });

    const discordAuthInfo = await discordAuthInfoRes.json();

    const discordUserInfoRes = await fetch('https://discord.com/api/v10/users/@me', {
        headers: {
            'Authorization': `${discordAuthInfo.token_type} ${discordAuthInfo.access_token}`
        }
    });

    const discordUserInfo = await discordUserInfoRes.json();

    let user = await prisma.user.findFirst({
        where: {
            discord: discordUserInfo.id
        }
    });

    if (user && user.name != discordUserInfo.username) {
        await prisma.user.update({
            where: {
                id: user.id
            },
            data: {
                name: discordUserInfo.username
            }
        });
    } else if (!user) {
        user = await prisma.user.create({
            data: {
                discord: discordUserInfo.id,
                name: discordUserInfo.username,
                role: 'USER'
            }
        })
    }

    const tokenValue = randomUUID();
    const ttl = 3 * 86400; // 3 days

    await prisma.token.create({
        data: {
            userId: user.id,
            token: tokenValue,
            expiresAt: new Date(Date.now() + ttl)
        }
    });

    return updateAuthRequest(state, tokenValue);
}

export function getDiscordRedirectData(request: IAuthRequest) {
    const query = new URLSearchParams({
        response_type: 'code',
        client_id: env.DISCORD_CLIENT_ID,
        scope: 'identify',
        state: request.id,
        redirect_uri: env.PUBLIC_API_URL + '/api/oauth/discord',
        prompt: 'none',
    });

    return {
        state: request.id,
        expiresAt: request.ttl,
        url: "https://discord.com/oauth2/authorize?" + query.toString()
    };
}