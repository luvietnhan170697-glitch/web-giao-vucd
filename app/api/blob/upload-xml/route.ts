import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
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
      onUploadCompleted: async () => {
        // Có thể ghi log nếu cần
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    );
  }
}