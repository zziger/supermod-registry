import {getDeleteAuthRequest, hasAuthRequest} from "@/lib/auth";

export async function GET(request: Request, { params }: { params: { state: string } }) {
    if (!hasAuthRequest(params.state)) return new Response(null, { status: 404 });
    const info = getDeleteAuthRequest(params.state);
    if (!info) return new Response(null, { status: 204 });
    return Response.json({
        token: info.token ?? null
    });
}