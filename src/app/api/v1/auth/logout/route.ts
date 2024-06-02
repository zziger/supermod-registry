import {authorize} from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
    const { token } = await authorize(request);
    if (!token) return new Response(null, { status: 401 });

    await prisma.token.delete({ where: { token } });
    return Response.json(true);
}