import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

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

    // get decoded token
    const token = await getToken({
        req,
        secret: process.env.NEXTAUTH_SECRET,
    });

    const backendToken = token?.backendToken;

    console.log("backendToken is ....");
    console.log(token);
    console.log("/////////////////////////");

    if (!backendToken) {
        return NextResponse.json(
            { error: "Unauthorized" },
            { status: 401 }
        );
    }

    const { path } = await context.params;

    const pathString = path?.join("/") ?? "";

    const url = `${BACKEND_URL}/${pathString}${req.nextUrl.search}`;

    console.log("Proxying to:", url);

    const backendRes = await fetch(url, {
        method: req.method,
        headers: {
            Authorization: `Bearer ${backendToken}`,
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