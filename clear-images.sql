-- Update all expense_items to set image_url to NULL (clearing base64 images)
UPDATE expense_items SET image_url = NULL;

-- Verify the update
SELECT COUNT(*) as total_items, COUNT(image_url) as items_with_images FROM expense_items;
