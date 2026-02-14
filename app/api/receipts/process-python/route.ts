import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { imageData } = await req.json();

    if (!imageData) {
      return NextResponse.json({ error: 'No image data provided' }, { status: 400 });
    }

    // Path to Python processor wrapper
    const wrapperPath = path.join(
      process.cwd(),
      'lib/receipt-processing/python-processor/processor-wrapper.py'
    );

    // Execute Python processor via wrapper
    const { stdout, stderr } = await execAsync(
      `python3 "${wrapperPath}" '${imageData}'`,
      { maxBuffer: 10 * 1024 * 1024 } // 10MB buffer for large responses
    );

    if (stderr) {
      console.error('Python stderr:', stderr);
    }

    const result = JSON.parse(stdout);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error, errorType: result.error_type },
        { status: 500 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Python processor error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
