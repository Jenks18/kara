#!/usr/bin/env python3
"""
Production-grade receipt processor using OpenCV, Tesseract, and pyzbar.
Handles image segmentation, QR code detection, OCR, and table extraction.
"""

import cv2
import numpy as np
import pytesseract
from pyzbar import pyzbar
from PIL import Image
import json
import sys
import base64
from io import BytesIO
from typing import Dict, List, Any, Optional, Tuple


class ReceiptProcessor:
    """Professional receipt processor with computer vision."""
    
    def __init__(self):
        # Configure Tesseract (adjust path if needed)
        # pytesseract.pytesseract.tesseract_cmd = '/usr/local/bin/tesseract'
        pass
    
    def decode_base64_image(self, base64_str: str) -> np.ndarray:
        """Decode base64 image to OpenCV format."""
        # Remove data URL prefix if present
        if ',' in base64_str:
            base64_str = base64_str.split(',')[1]
        
        img_data = base64.b64decode(base64_str)
        nparr = np.frombuffer(img_data, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        return img
    
    def preprocess_image(self, img: np.ndarray) -> np.ndarray:
        """Apply preprocessing to enhance text and QR code detection."""
        # Convert to grayscale
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # Apply adaptive thresholding
        binary = cv2.adaptiveThreshold(
            gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
        )
        
        # Denoise
        denoised = cv2.fastNlMeansDenoising(binary, None, 10, 7, 21)
        
        return denoised
    
    def detect_qr_codes(self, img: np.ndarray) -> List[Dict[str, Any]]:
        """Detect all QR codes in image using pyzbar."""
        qr_codes = []
        
        # Try multiple preprocessing strategies
        strategies = [
            ('original', img),
            ('grayscale', cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)),
            ('preprocessed', self.preprocess_image(img)),
        ]
        
        for strategy_name, processed_img in strategies:
            detected = pyzbar.decode(processed_img)
            
            for qr in detected:
                data = qr.data.decode('utf-8')
                qr_type = qr.type
                
                # Get bounding box
                rect = qr.rect
                polygon = qr.polygon
                
                qr_codes.append({
                    'data': data,
                    'type': qr_type,
                    'strategy': strategy_name,
                    'rect': {
                        'x': rect.left,
                        'y': rect.top,
                        'width': rect.width,
                        'height': rect.height
                    },
                    'polygon': [(p.x, p.y) for p in polygon],
                    'url': data if data.startswith('http') else None,
                    'is_kra': 'kra.go.ke' in data.lower() if data else False
                })
            
            # If we found QR codes, no need to try other strategies
            if qr_codes:
                break
        
        return qr_codes
    
    def extract_text_ocr(self, img: np.ndarray) -> Dict[str, Any]:
        """Extract text using Tesseract OCR with advanced configuration."""
        # Preprocess for better OCR
        preprocessed = self.preprocess_image(img)
        
        # Custom Tesseract config for receipts
        custom_config = r'--oem 3 --psm 6 -c preserve_interword_spaces=1'
        
        # Get detailed data
        data = pytesseract.image_to_data(
            preprocessed, 
            output_type=pytesseract.Output.DICT,
            config=custom_config
        )
        
        # Get plain text
        text = pytesseract.image_to_string(preprocessed, config=custom_config)
        
        # Calculate average confidence
        confidences = [int(conf) for conf in data['conf'] if conf != '-1']
        avg_confidence = sum(confidences) / len(confidences) if confidences else 0
        
        # Extract lines of text
        lines = []
        current_line = []
        current_line_num = -1
        
        for i in range(len(data['text'])):
            if int(data['conf'][i]) > 30:  # Filter low confidence
                if data['line_num'][i] != current_line_num:
                    if current_line:
                        lines.append(' '.join(current_line))
                    current_line = [data['text'][i]]
                    current_line_num = data['line_num'][i]
                else:
                    current_line.append(data['text'][i])
        
        if current_line:
            lines.append(' '.join(current_line))
        
        return {
            'full_text': text,
            'lines': lines,
            'confidence': avg_confidence,
            'word_count': len([w for w in data['text'] if w.strip()])
        }
    
    def segment_receipt_regions(self, img: np.ndarray) -> Dict[str, np.ndarray]:
        """Segment receipt into regions (header, items, footer, QR area)."""
        height, width = img.shape[:2]
        
        regions = {
            'full': img,
            'top_third': img[0:height//3, :],
            'middle_third': img[height//3:2*height//3, :],
            'bottom_third': img[2*height//3:, :],
            'qr_region': img[int(height*0.6):, :],  # Bottom 40% for QR
        }
        
        return regions
    
    def parse_receipt_fields(self, text: str, lines: List[str]) -> Dict[str, Any]:
        """Parse structured fields from OCR text."""
        import re
        
        fields = {
            'merchant_name': None,
            'total_amount': None,
            'date': None,
            'items': []
        }
        
        # Merchant name (usually first non-empty line)
        for line in lines:
            if line.strip():
                fields['merchant_name'] = line.strip()
                break
        
        # Total amount
        total_patterns = [
            r'TOTAL[:\s]+(?:KES|KSH)?\s*([\d,]+\.?\d*)',
            r'(?:KES|KSH)\s*([\d,]+\.?\d*)',
            r'(?:AMOUNT|AMT)[:\s]+([\d,]+\.?\d*)'
        ]
        
        for pattern in total_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                amount_str = match.group(1).replace(',', '')
                try:
                    fields['total_amount'] = float(amount_str)
                    break
                except ValueError:
                    continue
        
        # Date
        date_patterns = [
            r'(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})',
            r'(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})'
        ]
        
        for pattern in date_patterns:
            match = re.search(pattern, text)
            if match:
                fields['date'] = match.group(1)
                break
        
        # Extract line items (simple heuristic)
        for line in lines:
            # Look for lines with amounts
            if re.search(r'\d+\.?\d*', line):
                amount_match = re.search(r'([\d,]+\.?\d*)$', line)
                if amount_match:
                    item_name = line[:amount_match.start()].strip()
                    amount_str = amount_match.group(1).replace(',', '')
                    try:
                        amount = float(amount_str)
                        if item_name and amount > 0:
                            fields['items'].append({
                                'name': item_name,
                                'amount': amount
                            })
                    except ValueError:
                        continue
        
        return fields
    
    def detect_tables(self, img: np.ndarray) -> List[Dict[str, Any]]:
        """Detect table structures in receipt."""
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        binary = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 11, 2)
        
        # Detect horizontal and vertical lines
        horizontal_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (40, 1))
        vertical_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, 40))
        
        horizontal_lines = cv2.morphologyEx(binary, cv2.MORPH_OPEN, horizontal_kernel, iterations=2)
        vertical_lines = cv2.morphologyEx(binary, cv2.MORPH_OPEN, vertical_kernel, iterations=2)
        
        # Combine lines
        table_mask = cv2.addWeighted(horizontal_lines, 0.5, vertical_lines, 0.5, 0.0)
        
        # Find contours
        contours, _ = cv2.findContours(table_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        tables = []
        for contour in contours:
            x, y, w, h = cv2.boundingRect(contour)
            if w > 100 and h > 50:  # Filter small noise
                tables.append({
                    'x': int(x),
                    'y': int(y),
                    'width': int(w),
                    'height': int(h)
                })
        
        return tables
    
    def process_receipt(self, image_data: str) -> Dict[str, Any]:
        """
        Main processing pipeline.
        
        Args:
            image_data: Base64 encoded image string
            
        Returns:
            Comprehensive receipt data
        """
        try:
            # Decode image
            img = self.decode_base64_image(image_data)
            height, width = img.shape[:2]
            
            # Segment regions
            regions = self.segment_receipt_regions(img)
            
            # Detect QR codes (try QR region first, then full image)
            qr_codes = self.detect_qr_codes(regions['qr_region'])
            if not qr_codes:
                qr_codes = self.detect_qr_codes(img)
            
            # Extract text via OCR
            ocr_result = self.extract_text_ocr(img)
            
            # Parse structured fields
            parsed_fields = self.parse_receipt_fields(
                ocr_result['full_text'], 
                ocr_result['lines']
            )
            
            # Detect tables
            tables = self.detect_tables(img)
            
            # Build result
            result = {
                'success': True,
                'image': {
                    'width': int(width),
                    'height': int(height)
                },
                'qr_codes': qr_codes,
                'ocr': {
                    'full_text': ocr_result['full_text'],
                    'lines': ocr_result['lines'],
                    'confidence': float(ocr_result['confidence']),
                    'word_count': ocr_result['word_count']
                },
                'extracted_fields': parsed_fields,
                'tables': tables,
                'processing_notes': {
                    'qr_found': len(qr_codes) > 0,
                    'ocr_confidence': f"{ocr_result['confidence']:.1f}%",
                    'tables_detected': len(tables)
                }
            }
            
            return result
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'error_type': type(e).__name__
            }


def main():
    """CLI entry point."""
    if len(sys.argv) < 2:
        print(json.dumps({'error': 'No image data provided'}))
        sys.exit(1)
    
    image_data = sys.argv[1]
    
    processor = ReceiptProcessor()
    result = processor.process_receipt(image_data)
    
    # Output JSON
    print(json.dumps(result, indent=2))


if __name__ == '__main__':
    main()
