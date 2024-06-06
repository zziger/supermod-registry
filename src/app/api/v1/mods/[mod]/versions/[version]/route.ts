import prisma from "@/lib/prisma";
import {deleteModVersion, prepareModVersion, updateLatestModVersion} from "@/lib/mods";
import {authorize} from "@/lib/auth";

export async function GET(request: Request, { params }: { params: { mod: string, version: string } }) {
    const { user } = await authorize(request);

    const mod = await prisma.mod.findUnique({
        where: { id: params.mod },
        select: { uploaderId: true }
    });
    if (!mod) return new Response(null, { status: 404 });

    const version = await prisma.modVersion.findUnique({
        where: { id: { modId: params.mod, version: params.version } }
    });
    if (!version) return new Response(null, { status: 404 });

    const showUnverified = user && (user.role === 'ADMIN' || user.id === mod.uploaderId);
    if (!showUnverified && !version.verified) return new Response(null, {status: 404});

    return Response.json(prepareModVersion(version));
}

export async function DELETE(request: Request, { params }: { params: { mod: string, version: string }}) {
    const { token, user } = await authorize(request);
    if (!token) return new Response(null, { status: 401 });

    const version = await prisma.modVersion.findUnique({
        where: { id: { modId: params.mod, version: params.version } },
        include: { mod: { select: { uploaderId: true } } }
    });
    if (!version) return new Response(null, { status: 404 });

    if (user.role !== 'ADMIN' && version.mod.uploaderId !== user.id) return new Response(null, { status: 403 });

    await deleteModVersion(params.mod, params.version);

    return new Response(null, { status: 204 });
}

export async function PATCH(request: Request, { params }: { params: { mod: string, version: string } }) {
    const { user } = await authorize(request);
    if (!user) return new Response(null, { status: 401 });
    if (user.role !== 'ADMIN') return new Response(null, { status: 403 });

    const { verified } = await request.json();
    if (typeof verified !== 'boolean') return new Response(null, { status: 400 });

    const version = await prisma.modVersion.findUnique({
        where: { id: { modId: params.mod, version: params.version } }
    });
    if (!version) return new Response(null, { status: 404 });

    await prisma.modVersion.update({
        where: { id: { modId: params.mod, version: params.version } },
        data: { verified }
    });

    await updateLatestModVersion(params.mod);

    return new Response(null, { status: 204 });
}