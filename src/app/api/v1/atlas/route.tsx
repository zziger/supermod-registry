/* eslint-disable @next/next/no-img-element */
import prisma from "@/lib/prisma";
import {ImageResponse} from "next/og";
import {env} from "@/lib/env.mjs";

let cacheUpdate = 0;
let cache: any | null = null;

const cacheRevalidateInterval = process.env.NODE_ENV == 'production' ? 60000 : 0;

export async function GET() {
    if (cache && Date.now() - cacheUpdate < cacheRevalidateInterval) {
        return Response.json(cache);
    }

    const mods = await prisma.mod.findMany({
        where: {
            latestVersion: {
                cdnIconPath: { not: null }
            }
        },
        include: {
            latestVersion: true
        }
    });

    // Placing 128x128 elements on an atlas, with 10 elements max in width
    const iconSize = 128;
    const maxElementsX = 10;

    let width = maxElementsX * iconSize;
    if (mods.length < maxElementsX) width = mods.length * iconSize;

    const height = Math.ceil(mods.length / maxElementsX) * iconSize;

    const icons = Object.fromEntries(mods.map((e, i) => {
        const x = (i % 10) * iconSize;
        const y = (Math.floor(i / 10)) * iconSize;

        const uv = [
            x / width,
            y / height,
            (x + iconSize) / width,
            (y + iconSize) / height
        ];

        return [e.id, uv];
    }));

    const image = new ImageResponse(
        <div style={{ position: 'relative', display: 'flex' }}>
            {mods.map((e, i) => {
                const x = (i % 10) * iconSize;
                const y = (Math.floor(i / 10)) * iconSize;

                return <img
                    style={{ position: 'absolute', top: y, left: x }}
                    width={iconSize} height={iconSize}
                    key={i} alt={''}
                    src={new URL(e.latestVersion!.cdnIconPath!, env.CDN_URL).toString()}/>;
            })}
        </div>,
        {
            width,
            height
        }
    );
    const base64Image = await image.arrayBuffer();

    const data = {
        icons,
        image: {
            width,
            height,
            data: 'data:image/png;base64,' + Buffer.from(base64Image).toString('base64'),
        }
    };

    cache = data;
    cacheUpdate = Date.now();

    return Response.json(data);
}