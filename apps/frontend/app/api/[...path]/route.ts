import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { convertServerPatchToFullTree } from "next/dist/client/components/segment-cache/navigation";

const BACKEND_URL = process.env.BACKEND_API_URL!;

export async function handler(
    req: NextRequest,
    context: { params: Promise<{ path: string[] }> }
) {

    if (!BACKEND_URL) {
        return NextResponse.json(
            { error: "BACKEND_API_URL not configured" },
            { status: 500 }
        );
    }

    // get token
    const rawToken = await getToken({
        req,
        secret: process.env.NEXTAUTH_SECRET,
        raw: true,
    });

    if (!rawToken) {
        return NextResponse.json(
            { error: "Unauthorized" },
            { status: 401 }
        );
    }

    // FIX 1: await params
    const { path } = await context.params;

    const pathString = path?.join("/") ?? "";

    console.log("////////////")
    console.log(path)
    console.log("////////////")


    // FIX 2: ensure proper URL
    const url = `${BACKEND_URL}/${pathString}${req.nextUrl.search}`;

    console.log("Proxying to:", url);

    const backendRes = await fetch(url, {
        method: req.method,
        headers: {
            Authorization: `Bearer ${rawToken}`,
            "Content-Type": "application/json",
        },
        body:
            req.method !== "GET" && req.method !== "HEAD"
                ? await req.text()
                : undefined,
    });

    return new NextResponse(await backendRes.text(), {
        status: backendRes.status,
        headers: {
            "Content-Type":
                backendRes.headers.get("Content-Type") ||
                "application/json",
        },
    });
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
