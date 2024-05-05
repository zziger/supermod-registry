import prisma from "@/lib/prisma";
import semver from "semver";
import {prepareUrl} from "@/lib/storage";

export function filterModUnverifiedVersions<TInner extends { verified: boolean }, T extends { versions: TInner[] }>(val: T) {
    val.versions = val.versions.filter(v => v.verified);
}

export function prepareModVersion<T extends { cdnContentPath: string }>(val: T): T & { cdnContentUrl: string } {
    return { ...val, cdnContentUrl: prepareUrl(val.cdnContentPath) };
}

export function parseVersion(version: string) {
    // taken from cpp-semver for parsing consistency
    const pattern = /^v?(0|[1-9]\d*)(?:\.(0|[1-9]\d*))?(?:\.(0|[1-9]\d*))?(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;
    const match = version.match(pattern);
    if (!match) return null;

    let major = +(match[1]);
    let minor = +(match[2] || '0');
    let patch = +(match[3] || '0');
    let prerelease = match[4] || null;
    let build = match[5] || null;

    let str = `${major}.${minor}.${patch}`;
    if (prerelease) str += `-${prerelease}`;
    if (build) str += `+${build}`;

    return semver.parse(str);
}

export async function updateLatestModVersion(modId: string) {
    const mod = await prisma.mod.findUnique({ where: { id: modId }, include: { versions: true } });
    if (!mod) return false;

    let versions = mod.versions.filter(v => !v.prerelease && v.verified);
    if (!versions.length) versions = mod.versions.filter(v => v.verified);
    if (!versions.length) versions = mod.versions.filter(v => !v.prerelease);
    if (!versions.length) versions = mod.versions;

    let latestVersionValue;
    if (versions.length) {
        latestVersionValue = versions.sort((a, b) => semver.rcompare(a.version, b.version))[0]!.version;
    } else {
        latestVersionValue = null;
    }

    await prisma.mod.update({
        where: { id: modId },
        data: { latestVersionValue }
    });

    return true;
}

export async function deleteModVersion(modId: string, version: string) {
    await prisma.mod.updateMany({
        where: { id: modId, latestVersionValue: version },
        data: { latestVersionValue: null },
    });
    await prisma.modVersion.delete({ where: { id: { modId, version } } });

    if (!await prisma.modVersion.findFirst({ where: { modId } })) {
        await prisma.mod.delete({ where: { id: modId } });
        return;
    }

    await updateLatestModVersion(modId);
}