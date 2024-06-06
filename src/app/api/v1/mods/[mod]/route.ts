import prisma from "@/lib/prisma";
import {filterModUnverifiedVersions, prepareModVersion} from "@/lib/mods";
import {authorize} from "@/lib/auth";

export async function GET(request: Request, { params }: { params: { mod: string } }) {
    const { user } = await authorize(request);

    const mod = await prisma.mod.findUnique({
        where: { id: params.mod },
        include: {
            versions: {
                select: {
                    version: true,
                    prerelease: true,
                    verified: true,
                }
            },
            latestVersion: true,
            uploader: {
                select: {
                    id: true,
                    name: true,
                    role: true
                }
            }
        }
    });
    if (!mod) return new Response(null, { status: 404 });

    const showUnverified = user && (user.role === 'ADMIN' || user.id === mod.uploaderId);
    if (!showUnverified)
        filterModUnverifiedVersions(mod);

    if (!mod.versions) {
        return new Response(null, { status: 404 });
    }

    mod.latestVersion = mod.latestVersion ? prepareModVersion(mod.latestVersion) : null;

    return Response.json(mod);
}

export async function DELETE(request: Request, { params }: { params: { mod: string } }) {
    const { user } = await authorize(request);
    if (!user) return new Response(null, { status: 401 });

    const mod = await prisma.mod.findUnique({ where: { id: params.mod } });
    if (!mod) return new Response(null, { status: 404 });

    if (user.role !== 'ADMIN' && mod.uploaderId !== user.id) return new Response(null, { status: 403 });

    await prisma.modVersion.deleteMany({ where: { modId: params.mod } });
    await prisma.mod.delete({ where: { id: params.mod } });
}

export async function PATCH(request: Request, { params }: { params: { mod: string } }) {
    const { user } = await authorize(request);
    if (!user) return new Response(null, { status: 401 });

    if (user.role !== 'ADMIN') return new Response(null, { status: 403 });

    const { uploaderId } = await request.json();
    if (typeof uploaderId !== 'number') return new Response(null, { status: 400 });

    await prisma.mod.update({
        where: { id: params.mod },
        data: { uploaderId }
    });
}