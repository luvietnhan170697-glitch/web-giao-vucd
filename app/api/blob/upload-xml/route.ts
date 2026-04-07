import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json(
        { error: "Thiếu BLOB_READ_WRITE_TOKEN trên server." },
        { status: 500 }
      );
    }

    const body = (await request.json()) as HandleUploadBody;

    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        return {
          allowedContentTypes: ["text/xml", "application/xml"],
          maximumSizeInBytes: 1024 * 1024 * 1024,
          addRandomSuffix: false,
          pathname,
          tokenPayload: JSON.stringify({
            uploadedAt: Date.now(),
          }),
        };
      },
      onUploadCompleted: async () => {},
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    console.error("POST /api/blob/upload-xml error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Blob upload route error",
      },
      { status: 400 }
    );
  }
}