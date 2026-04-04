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
          maximumSizeInBytes: 1024 * 1024 * 1024, // 1GB
          addRandomSuffix: false,
          pathname,
        };
      },
      onUploadCompleted: async () => {
        // Có thể ghi log DB ở đây nếu muốn
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