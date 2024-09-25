import {parse} from "yaml";
import {z} from "zod";
import prisma from "@/lib/prisma";
import {authorize} from "@/lib/auth";
import {parseVersion, updateLatestModVersion} from "@/lib/mods";
import semver from "semver";
import AdmZip from "adm-zip";
import {createS3Client} from "@/lib/storage";
import {PutObjectCommand} from "@aws-sdk/client-s3";
import {env} from "@/lib/env.mjs";

const manifestScheme = z.object({
    id: z.string().min(2).max(32).regex(/^[a-zA-Z0-9_-]{2,32}$/),
    title: z.string().optional(),
    author: z.string().optional(),
    version: z.string().optional().refine((val) => !val || semver.valid(parseVersion(val))),
    sdkVersion: z.string().optional(),
    description: z.string().optional(),
    gameVersions: z.array(z.number()).optional(),
});

export async function POST(request: Request) {
    const { token, user } = await authorize(request);
    if (!token) return new Response(null, { status: 401 });

    const verified = user.role === 'ADMIN' || user.role === 'TRUSTED';

    const content = await request.blob().then(d => d.arrayBuffer());
    if (content.byteLength > 100e6) Response.json({ code: "DATA_TOO_BIG" }, { status: 400 }); // 100mb
    const zip = new AdmZip(Buffer.from(content));

    const manifestEntry = zip.getEntry("manifest.yml");
    if (!manifestEntry) return Response.json({ code: "INVALID_MOD_ZIP" }, { status: 400 });

    const manifest = manifestEntry.getData().toString('utf8');
    const { id: modId, ...parsedData } = manifestScheme.parse(parse(manifest));

    const existingMod = await prisma.mod.findUnique({ where: { id: modId } });
    if (existingMod && existingMod.uploaderId != user.id && user.role !== 'ADMIN') {
        return new Response(null, { status: 403 });
    }

    const parsedVersion = parseVersion(parsedData.version || '0.0.0')!;
    const parsedVersionStr = parsedVersion.toString();

    const existingVersion = await prisma.modVersion.findFirst({
       where: { modId, version: parsedVersionStr }
    });
    if (existingVersion) {
        return new Response(null, { status: 409 });
    }

    const cdnRootPath = `mods/${modId}/${parsedVersionStr}`;
    const cdnContentPath = `${cdnRootPath}/content.zip`;
    let cdnIconPath: string | null = null;

    const client = createS3Client();
    await client.send(new PutObjectCommand({
        Bucket: env.R2_BUCKET,
        Key: `${cdnRootPath}/content.zip`,
        ContentType: 'application/zip',
        Body: Buffer.from(content)
    }));

    const iconEntry = zip.getEntry("icon.png");
    if (iconEntry) {
        cdnIconPath = `${cdnRootPath}/icon.png`;

        const icon = iconEntry.getData();
        await client.send(new PutObjectCommand({
            Bucket: env.R2_BUCKET,
            Key: cdnIconPath,
            ContentType: 'image/png',
            Body: icon
        }));
    }

    if (!existingMod) {
        await prisma.mod.create({
            data: {
                uploaderId: user.id,
                id: modId
            }
        });
    }

    const version = await prisma.modVersion.create({
        data: {
            modId,
            ...parsedData,
            cdnContentPath,
            version: parsedVersionStr,
            cdnIconPath,
            prerelease: !!semver.prerelease(parsedVersion),
            verified,
        },
        include: {
            mod: true
        }
    });

    await updateLatestModVersion(modId);

    return Response.json(version);
}