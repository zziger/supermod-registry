import prisma from "@/lib/prisma";
import {authorize} from "@/lib/auth";
import {filterModUnverifiedVersions, prepareModVersion} from "@/lib/mods";

export async function GET(request: Request) {
    const { user } = await authorize(request);

    let where: { OR: any[] } | undefined = { OR: [ { latestVersion: { verified: true } } ] }
    if (user?.role === 'ADMIN') where = undefined;
    else if (user) where.OR.push({ uploaderId: user.id });

    const mods = await prisma.mod.findMany({
        where,
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

    for (const mod of mods) {
        const showUnverified = user && (user.role === 'ADMIN' || user.id === mod.uploaderId);
        if (!showUnverified) filterModUnverifiedVersions(mod);

        mod.latestVersion = mod.latestVersion ? prepareModVersion(mod.latestVersion) : null;
    }

    return Response.json(mods);
}