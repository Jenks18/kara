package com.mafutapass.app.util

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.util.Log
import androidx.exifinterface.media.ExifInterface
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream

private const val TAG = "ImageUtils"

/**
 * Normalises JPEG bytes so the pixel orientation matches the EXIF metadata.
 *
 * CameraX saves photos with EXIF rotation tags but does NOT physically rotate
 * the pixels.  [BitmapFactory.decodeByteArray] ignores EXIF, so downstream
 * code (ML Kit OCR, display) gets a rotated image.  This function reads the
 * EXIF orientation, applies the rotation to the pixel data, and returns new
 * JPEG bytes with orientation reset to NORMAL.
 *
 * If the image is already upright (orientation == 1) or EXIF cannot be parsed,
 * the original bytes are returned unchanged.
 */
fun correctExifOrientation(jpegBytes: ByteArray): ByteArray {
    return try {
        val exif = ExifInterface(ByteArrayInputStream(jpegBytes))
        val orientation = exif.getAttributeInt(
            ExifInterface.TAG_ORIENTATION,
            ExifInterface.ORIENTATION_NORMAL
        )

        val degrees = when (orientation) {
            ExifInterface.ORIENTATION_ROTATE_90  -> 90f
            ExifInterface.ORIENTATION_ROTATE_180 -> 180f
            ExifInterface.ORIENTATION_ROTATE_270 -> 270f
            else -> 0f
        }

        if (degrees == 0f) {
            Log.d(TAG, "EXIF orientation is NORMAL — no rotation needed")
            return jpegBytes
        }

        Log.i(TAG, "Correcting EXIF orientation: rotating ${degrees.toInt()}° CW")

        val bitmap = BitmapFactory.decodeByteArray(jpegBytes, 0, jpegBytes.size) ?: return jpegBytes
        val matrix = Matrix().apply { postRotate(degrees) }
        val rotated = Bitmap.createBitmap(bitmap, 0, 0, bitmap.width, bitmap.height, matrix, true)

        val out = ByteArrayOutputStream()
        rotated.compress(Bitmap.CompressFormat.JPEG, 90, out)

        if (rotated !== bitmap) rotated.recycle()
        bitmap.recycle()

        out.toByteArray()
    } catch (e: Exception) {
        Log.e(TAG, "EXIF correction failed: ${e.message}")
        jpegBytes
    }
}

/**
 * Rotate a JPEG image by [degrees] clockwise (90, 180, 270).
 * Returns the rotated JPEG bytes.
 */
fun rotateJpeg(jpegBytes: ByteArray, degrees: Float): ByteArray {
    return try {
        val bitmap = BitmapFactory.decodeByteArray(jpegBytes, 0, jpegBytes.size) ?: return jpegBytes
        val matrix = Matrix().apply { postRotate(degrees) }
        val rotated = Bitmap.createBitmap(bitmap, 0, 0, bitmap.width, bitmap.height, matrix, true)

        val out = ByteArrayOutputStream()
        rotated.compress(Bitmap.CompressFormat.JPEG, 90, out)

        if (rotated !== bitmap) rotated.recycle()
        bitmap.recycle()

        out.toByteArray()
    } catch (e: Exception) {
        Log.e(TAG, "Rotate failed: ${e.message}")
        jpegBytes
    }
}
