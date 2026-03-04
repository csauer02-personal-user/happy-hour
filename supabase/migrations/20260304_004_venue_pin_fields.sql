-- Add deal_highlight and category_emoji columns for rich map pins
ALTER TABLE venues ADD COLUMN deal_highlight TEXT;
ALTER TABLE venues ADD COLUMN category_emoji TEXT DEFAULT '🍽️';
