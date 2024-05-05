import prisma from '@/lib/prisma';

export function getAuthToken(request: Request) {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) return null;

    const data = authHeader.split(' ');
    if (data.length !== 2) return null;
    if (data[0] !== 'Bearer') return null;

    return data[1];
}

export async function authorize(request: Request) {
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