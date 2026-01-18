/**
 * API Route Configuration for Vercel Deployment
 * Ensures proper serverless function settings
 */

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
    responseLimit: '10mb',
  },
  maxDuration: 60, // 60 seconds for Pro/Enterprise plans
};

export const runtime = 'nodejs'; // Use Node.js runtime for better compatibility
export const preferredRegion = 'auto'; // Auto-select closest region
