export async function GET() {
    return Response.json({
        versions: {
            v1: {
                path: "/api/v1",
                active: true,
                deprecated: false,
                default: true
            }
        }
    })
}