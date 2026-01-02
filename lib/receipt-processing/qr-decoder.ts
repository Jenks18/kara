import { BrowserQRCodeReader } from '@zxing/library';

export async function decodeQRFromImage(imageBuffer: Buffer): Promise<string> {
  const codeReader = new BrowserQRCodeReader();

  // Convert buffer to base64 data URL
  const base64 = imageBuffer.toString('base64');
  const dataUrl = `data:image/jpeg;base64,${base64}`;

  try {
    const result = await codeReader.decodeFromImageUrl(dataUrl);
    const qrText = result.getText();

    // Validate it's a KRA URL
    if (!qrText.includes('itax.kra.go.ke')) {
      throw new Error('Not a KRA fiscal receipt QR code');
    }

    return qrText;
  } catch (error: any) {
    throw new Error('No QR code found on receipt');
  }
}
