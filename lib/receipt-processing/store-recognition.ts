/**
 * STORE RECOGNITION & TEMPLATE MATCHING
 * 
 * Intelligently identifies stores and matches receipts to templates.
 * Uses multiple signals: location, QR data, OCR text, and historical patterns.
 */

import { supabase } from '@/lib/supabase/client';
import { templateRegistry, type ReceiptTemplate } from './template-registry';

export interface Store {
  id: string;
  name: string;
  chainName?: string;
  category: string;
  kraPin?: string;
  tillNumber?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  verified: boolean;
}

export interface StoreRecognitionResult {
  storeId?: string;
  storeName?: string;
  chainName?: string;
  confidence: number; // 0-100
  matchedBy: ('location' | 'kra_pin' | 'till_number' | 'name_pattern' | 'qr_data')[];
  suggestedTemplates: ReceiptTemplate[];
}

/**
 * Store Recognition Engine
 */
export class StoreRecognizer {
  private supabaseClient = supabase;
  private storeCache: Map<string, Store> = new Map();
  
  /**
   * Recognize store from receipt data
   */
  async recognize(data: {
    qrData?: any;
    ocrText?: string;
    kraData?: any;
    latitude?: number;
    longitude?: number;
  }): Promise<StoreRecognitionResult> {
    const signals: {
      method: string;
      store?: Store;
      confidence: number;
    }[] = [];
    
    // Signal 1: KRA PIN (highest confidence)
    if (data.kraData?.merchantPIN || data.qrData?.merchantPIN) {
      const pin = data.kraData?.merchantPIN || data.qrData?.merchantPIN;
      const store = await this.findStoreByKRAPin(pin);
      if (store) {
        signals.push({ method: 'kra_pin', store, confidence: 95 });
      }
    }
    
    // Signal 2: Till Number
    if (data.qrData?.tillNumber) {
      const store = await this.findStoreByTillNumber(data.qrData.tillNumber);
      if (store) {
        signals.push({ method: 'till_number', store, confidence: 85 });
      }
    }
    
    // Signal 3: Location-based (geofencing)
    if (data.latitude && data.longitude) {
      const nearbyStores = await this.findNearbyStores(
        data.latitude,
        data.longitude,
        100 // 100 meter radius
      );
      
      // Check merchant name match
      const merchantName = data.kraData?.merchantName || 
                          data.qrData?.merchantName || 
                          this.extractMerchantFromOCR(data.ocrText);
      
      for (const store of nearbyStores) {
        if (merchantName && this.namesMatch(store.name, merchantName)) {
          signals.push({ method: 'location', store, confidence: 80 });
          break;
        }
      }
      
      // If single nearby store, medium confidence
      if (nearbyStores.length === 1 && signals.length === 0) {
        signals.push({ method: 'location', store: nearbyStores[0], confidence: 60 });
      }
    }
    
    // Signal 4: Merchant name pattern matching
    const merchantName = data.kraData?.merchantName || 
                        data.qrData?.merchantName || 
                        this.extractMerchantFromOCR(data.ocrText);
    
    if (merchantName && signals.length === 0) {
      const store = await this.findStoreByName(merchantName);
      if (store) {
        signals.push({ method: 'name_pattern', store, confidence: 70 });
      }
    }
    
    // Signal 5: QR URL pattern
    if (data.qrData?.url && signals.length === 0) {
      const store = await this.findStoreByQRPattern(data.qrData.url);
      if (store) {
        signals.push({ method: 'qr_data', store, confidence: 65 });
      }
    }
    
    // Aggregate signals
    if (signals.length === 0) {
      return {
        confidence: 0,
        matchedBy: [],
        suggestedTemplates: this.getGenericTemplates(),
      };
    }
    
    // Use highest confidence signal
    const bestSignal = signals.reduce((best, current) => 
      current.confidence > best.confidence ? current : best
    );
    
    const store = bestSignal.store!;
    
    // Get suggested templates
    const templates = this.getSuggestedTemplates(store, data);
    
    return {
      storeId: store.id,
      storeName: store.name,
      chainName: store.chainName,
      confidence: bestSignal.confidence,
      matchedBy: signals.map(s => s.method as any),
      suggestedTemplates: templates,
    };
  }
  
  /**
   * Find store by KRA PIN
   */
  private async findStoreByKRAPin(pin: string): Promise<Store | undefined> {
    const cached = Array.from(this.storeCache.values()).find(s => s.kraPin === pin);
    if (cached) return cached;
    
    const { data } = await this.supabase
      .from('stores')
      .select('*')
      .eq('kra_pin', pin)
      .single();
    
    if (data) {
      const store = this.mapStore(data);
      this.storeCache.set(store.id, store);
      return store;
    }
  }
  
  /**
   * Find store by till number
   */
  private async findStoreByTillNumber(tillNumber: string): Promise<Store | undefined> {
    const cached = Array.from(this.storeCache.values()).find(s => s.tillNumber === tillNumber);
    if (cached) return cached;
    
    const { data } = await this.supabase
      .from('stores')
      .select('*')
      .eq('till_number', tillNumber)
      .single();
    
    if (data) {
      const store = this.mapStore(data);
      this.storeCache.set(store.id, store);
      return store;
    }
  }
  
  /**
   * Find stores within radius (geofencing)
   */
  private async findNearbyStores(
    latitude: number,
    longitude: number,
    radiusMeters: number
  ): Promise<Store[]> {
    // Using PostGIS or basic distance calculation
    const { data } = await this.supabaseClient.rpc('find_stores_nearby', {
      lat: latitude,
      lng: longitude,
      radius_m: radiusMeters,
    });
    
    if (!data) {
      // Fallback: Get all stores and filter in memory
      const { data: allStores } = await this.supabase
        .from('stores')
        .select('*')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null);
      
      if (!allStores) return [];
      
      return allStores
        .map(this.mapStore)
        .filter((store: Store) => {
          if (!store.latitude || !store.longitude) return false;
          const distance = this.calculateDistance(
            latitude, longitude,
            store.latitude, store.longitude
          );
          return distance <= radiusMeters;
        });
    }
    
    return data.map(this.mapStore);
  }
  
  /**
   * Find store by merchant name
   */
  private async findStoreByName(name: string): Promise<Store | undefined> {
    // Try exact match first
    const { data: exactMatch } = await this.supabase
      .from('stores')
      .select('*')
      .ilike('name', name)
      .single();
    
    if (exactMatch) return this.mapStore(exactMatch);
    
    // Try fuzzy match on chain name
    const chainName = this.extractChainName(name);
    if (chainName) {
      const { data: chainMatch } = await this.supabase
        .from('stores')
        .select('*')
        .ilike('chain_name', `%${chainName}%`)
        .limit(1)
        .single();
      
      if (chainMatch) return this.mapStore(chainMatch);
    }
  }
  
  /**
   * Find store by QR URL pattern
   */
  private async findStoreByQRPattern(url: string): Promise<Store | undefined> {
    // Extract domain or identifier from URL
    // e.g., itax.kra.go.ke/KRA-Portal/... -> look for KRA PIN in URL
    return undefined; // Implement based on your QR patterns
  }
  
  /**
   * Get suggested templates for a store
   */
  private getSuggestedTemplates(store: Store, data: any): ReceiptTemplate[] {
    const templates: ReceiptTemplate[] = [];
    
    // 1. Store-specific templates
    templates.push(...templateRegistry.getByStore(store.id));
    
    // 2. Chain templates
    if (store.chainName) {
      templates.push(...templateRegistry.getByChain(store.chainName));
    }
    
    // 3. Category templates (if no specific ones found)
    if (templates.length === 0) {
      templates.push(...templateRegistry.getByType(store.category));
    }
    
    // 4. Generic templates (fallback)
    if (templates.length === 0) {
      templates.push(...this.getGenericTemplates());
    }
    
    // Sort by success rate
    return templates.sort((a, b) => (b.successRate || 0) - (a.successRate || 0));
  }
  
  /**
   * Get generic fallback templates
   */
  private getGenericTemplates(): ReceiptTemplate[] {
    return [
      templateRegistry.get('generic-kra-v1'),
      templateRegistry.get('generic-ocr-v1'),
    ].filter(Boolean) as ReceiptTemplate[];
  }
  
  /**
   * Extract merchant name from OCR text (first line heuristic)
   */
  private extractMerchantFromOCR(ocrText?: string): string | undefined {
    if (!ocrText) return undefined;
    
    const lines = ocrText.split('\n').filter(l => l.trim());
    if (lines.length === 0) return undefined;
    
    // First line is usually merchant name
    const firstLine = lines[0].trim();
    
    // Must be reasonable length and not look like other data
    if (firstLine.length > 3 && 
        firstLine.length < 50 &&
        !/^[0-9]+$/.test(firstLine) && // Not just numbers
        !firstLine.includes('RECEIPT') && // Not header
        !firstLine.includes('INVOICE')) {
      return firstLine;
    }
  }
  
  /**
   * Extract chain name from full merchant name
   */
  private extractChainName(name: string): string | undefined {
    const chains = ['Total', 'Shell', 'Carrefour', 'Naivas', 'Quickmart', 'Chandarana'];
    
    for (const chain of chains) {
      if (name.toLowerCase().includes(chain.toLowerCase())) {
        return chain;
      }
    }
  }
  
  /**
   * Check if two store names match (fuzzy)
   */
  private namesMatch(name1: string, name2: string): boolean {
    const normalize = (s: string) => s.toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .trim();
    
    const n1 = normalize(name1);
    const n2 = normalize(name2);
    
    // Exact match
    if (n1 === n2) return true;
    
    // One contains the other
    if (n1.includes(n2) || n2.includes(n1)) return true;
    
    // Levenshtein distance < 3
    return this.levenshteinDistance(n1, n2) < 3;
  }
  
  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  private calculateDistance(
    lat1: number, lon1: number,
    lat2: number, lon2: number
  ): number {
    const R = 6371e3; // Earth radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    return R * c;
  }
  
  /**
   * Levenshtein distance for fuzzy matching
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }
  
  /**
   * Map database row to Store
   */
  private mapStore(row: any): Store {
    return {
      id: row.id,
      name: row.name,
      chainName: row.chain_name,
      category: row.category,
      kraPin: row.kra_pin,
      tillNumber: row.till_number,
      latitude: row.latitude,
      longitude: row.longitude,
      address: row.address,
      verified: row.verified,
    };
  }
}

// Export singleton
export const storeRecognizer = new StoreRecognizer();
