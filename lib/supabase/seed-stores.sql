-- Seed Common Kenyan Stores for Receipt Processing
-- Run this after applying enhanced-receipt-schema.sql

-- ========================================
-- FUEL STATIONS
-- ========================================

-- Total Kenya Stations
INSERT INTO stores (name, chain_name, category, latitude, longitude, address, city, verified) VALUES
  ('Total Westlands', 'Total', 'fuel', -1.2673, 36.8073, 'Waiyaki Way', 'Nairobi', true),
  ('Total Junction', 'Total', 'fuel', -1.2921, 36.8219, 'Ngong Road', 'Nairobi', true),
  ('Total Karen', 'Total', 'fuel', -1.3197, 36.7072, 'Karen Road', 'Nairobi', true),
  ('Total Mombasa Road', 'Total', 'fuel', -1.3097, 36.8822, 'Mombasa Road', 'Nairobi', true);

-- Shell Kenya Stations
INSERT INTO stores (name, chain_name, category, latitude, longitude, address, city, verified) VALUES
  ('Shell Parklands', 'Shell', 'fuel', -1.2617, 36.8172, 'Limuru Road', 'Nairobi', true),
  ('Shell Thika Road', 'Shell', 'fuel', -1.2195, 36.8903, 'Thika Road', 'Nairobi', true),
  ('Shell Kilimani', 'Shell', 'fuel', -1.2921, 36.7833, 'Ngong Road', 'Nairobi', true);

-- Rubis Kenya Stations
INSERT INTO stores (name, chain_name, category, latitude, longitude, address, city, verified) VALUES
  ('Rubis Upperhill', 'Rubis', 'fuel', -1.2903, 36.8219, 'Mombasa Road', 'Nairobi', true),
  ('Rubis Lavington', 'Rubis', 'fuel', -1.2794, 36.7667, 'James Gichuru Road', 'Nairobi', true);

-- Engen Kenya Stations
INSERT INTO stores (name, chain_name, category, latitude, longitude, address, city, verified) VALUES
  ('Engen Riverside', 'Engen', 'fuel', -1.2706, 36.8122, 'Riverside Drive', 'Nairobi', true),
  ('Engen Valley Road', 'Engen', 'fuel', -1.2861, 36.8169, 'Valley Road', 'Nairobi', true);

-- ========================================
-- SUPERMARKETS / GROCERY
-- ========================================

-- Carrefour
INSERT INTO stores (name, chain_name, category, latitude, longitude, address, city, verified) VALUES
  ('Carrefour Junction', 'Carrefour', 'grocery', -1.2921, 36.8219, 'Ngong Road', 'Nairobi', true),
  ('Carrefour Sarit Centre', 'Carrefour', 'grocery', -1.2635, 36.8022, 'Westlands', 'Nairobi', true),
  ('Carrefour Thika Road Mall', 'Carrefour', 'grocery', -1.2198, 36.8883, 'Thika Road', 'Nairobi', true),
  ('Carrefour Hub Karen', 'Carrefour', 'grocery', -1.3197, 36.7072, 'Karen', 'Nairobi', true);

-- Naivas
INSERT INTO stores (name, chain_name, category, latitude, longitude, address, city, verified) VALUES
  ('Naivas Westlands', 'Naivas', 'grocery', -1.2635, 36.8022, 'Westlands', 'Nairobi', true),
  ('Naivas Ngong Road', 'Naivas', 'grocery', -1.3033, 36.8089, 'Ngong Road', 'Nairobi', true),
  ('Naivas Embakasi', 'Naivas', 'grocery', -1.3097, 36.8822, 'Embakasi', 'Nairobi', true);

-- Quickmart
INSERT INTO stores (name, chain_name, category, latitude, longitude, address, city, verified) VALUES
  ('Quickmart Kilimani', 'Quickmart', 'grocery', -1.2921, 36.7833, 'Ngong Road', 'Nairobi', true),
  ('Quickmart Lavington', 'Quickmart', 'grocery', -1.2794, 36.7667, 'James Gichuru Road', 'Nairobi', true);

-- Chandarana
INSERT INTO stores (name, chain_name, category, latitude, longitude, address, city, verified) VALUES
  ('Chandarana Rosebank', 'Chandarana', 'grocery', -1.2794, 36.7667, 'Limuru Road', 'Nairobi', true),
  ('Chandarana Ridgeways', 'Chandarana', 'grocery', -1.2349, 36.8558, 'Kiambu Road', 'Nairobi', true);

-- ========================================
-- RESTAURANTS / FAST FOOD
-- ========================================

-- KFC
INSERT INTO stores (name, chain_name, category, latitude, longitude, address, city, verified) VALUES
  ('KFC Junction', 'KFC', 'restaurant', -1.2921, 36.8219, 'Ngong Road', 'Nairobi', true),
  ('KFC Westgate', 'KFC', 'restaurant', -1.2635, 36.8022, 'Westlands', 'Nairobi', true);

-- Java House
INSERT INTO stores (name, chain_name, category, latitude, longitude, address, city, verified) VALUES
  ('Java House Westlands', 'Java House', 'restaurant', -1.2635, 36.8022, 'Westlands', 'Nairobi', true),
  ('Java House Junction', 'Java House', 'restaurant', -1.2921, 36.8219, 'Ngong Road', 'Nairobi', true),
  ('Java House Karen', 'Java House', 'restaurant', -1.3197, 36.7072, 'Karen Road', 'Nairobi', true);

-- Artcaffe
INSERT INTO stores (name, chain_name, category, latitude, longitude, address, city, verified) VALUES
  ('Artcaffe Westgate', 'Artcaffe', 'restaurant', -1.2635, 36.8022, 'Westlands', 'Nairobi', true),
  ('Artcaffe Village Market', 'Artcaffe', 'restaurant', -1.2349, 36.8039, 'Limuru Road', 'Nairobi', true);

-- ========================================
-- Create Geofences (100m radius)
-- ========================================

-- Create geofences for all stores
INSERT INTO store_geofences (store_id, center_lat, center_lng, radius_meters, active)
SELECT 
  id,
  latitude,
  longitude,
  100, -- 100 meter radius
  true
FROM stores
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- ========================================
-- Statistics
-- ========================================

-- Show summary
SELECT 
  category,
  COUNT(*) as store_count,
  COUNT(DISTINCT chain_name) as chain_count
FROM stores
GROUP BY category
ORDER BY store_count DESC;

-- Verify geofences created
SELECT COUNT(*) as total_geofences FROM store_geofences;

-- Show stores by city
SELECT 
  city,
  COUNT(*) as stores
FROM stores
GROUP BY city
ORDER BY stores DESC;

COMMIT;

-- ========================================
-- NOTES
-- ========================================

/*
To add your own stores:

1. Find GPS coordinates:
   - Google Maps: Right-click → "What's here?"
   - Or use address geocoding API

2. Get KRA PIN (if available):
   - Check physical receipt
   - KRA iTax portal
   - Public business registry

3. Insert store:
   INSERT INTO stores (name, chain_name, category, kra_pin, latitude, longitude, address, city)
   VALUES ('My Store', 'MyChain', 'fuel', 'A001234567X', -1.2921, 36.8219, '123 Street', 'Nairobi');

4. Create geofence:
   INSERT INTO store_geofences (store_id, center_lat, center_lng, radius_meters)
   SELECT id, latitude, longitude, 100 FROM stores WHERE name = 'My Store';
*/
