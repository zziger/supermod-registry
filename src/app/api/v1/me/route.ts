import {authorize} from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
    const { token } = await authorize(request);
    if (!token) return new Response(null, { status: 401 });

    const tokenEntry = await prisma.token.findUnique({
        where: { token },
        select: {
            id: true,
            createdAt: true,
            expiresAt: true,
            user: {
                select: {
                    id: true,
                    name: true,
                    discord: true,
                    role: true
                }
            }
        }
    });

    return Response.json(tokenEntry);
}