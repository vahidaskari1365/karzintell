-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  parent_id BIGINT REFERENCES categories(id),
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on categories
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Policy: Categories are viewable by everyone (public catalog)
CREATE POLICY "Categories are viewable by everyone" ON categories
FOR SELECT USING (is_active = true);

-- Policy: Only admins can modify categories (supabase admin operations)
CREATE POLICY "Admins can manage categories" ON categories
USING (false) WITH CHECK (false); -- Disabled for now, controlled via API

-- Create products table
CREATE TABLE IF NOT EXISTS products (
  id BIGSERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  short_description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  compare_at_price DECIMAL(10, 2),
  sku VARCHAR(100) UNIQUE,
  category_id BIGINT REFERENCES categories(id),
  brand VARCHAR(255),
  tags TEXT[] DEFAULT '{}',
  stock_quantity INTEGER DEFAULT 0,
  low_stock_threshold INTEGER DEFAULT 5,
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  rating_avg DECIMAL(3, 2) DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  meta_title VARCHAR(255),
  meta_description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on products
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Policy: Products are viewable by everyone (public catalog)
CREATE POLICY "Products are viewable by everyone" ON products
FOR SELECT USING (is_active = true);

-- Policy: Only admins can modify products
CREATE POLICY "Admins can manage products" ON products
USING (false) WITH CHECK (false);

-- Create product images table
CREATE TABLE IF NOT EXISTS product_images (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT REFERENCES products(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  alt_text VARCHAR(255),
  is_primary BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on product_images
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;

-- Policy: Images viewable with product
CREATE POLICY "Images viewable with product" ON product_images
FOR SELECT USING (true);

-- Create cart table (for guest carts)
CREATE TABLE IF NOT EXISTS cart (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  session_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(session_id)
);

-- Enable RLS on cart
ALTER TABLE cart ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own cart
CREATE POLICy "Users can view own cart" ON cart
FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can create their own cart
CREATE POLICY "Users can create own cart" ON cart
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create cart items table
CREATE TABLE IF NOT EXISTS cart_items (
  id BIGSERIAL PRIMARY KEY,
  cart_id BIGINT REFERENCES cart(id) ON DELETE CASCADE,
  product_id BIGINT REFERENCES products(id),
  variant_id BIGINT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(cart_id, product_id)
);

-- Enable RLS on cart_items
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view items in their own cart
CREATE POLICY "Users can view own cart items" ON cart_items
FOR SELECT USING (
  EXISTS (SELECT 1 FROM cart WHERE cart.id = cart_id AND (auth.uid() = cart.user_id OR cart.user_id IS NULL))
);

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  order_number VARCHAR(50) UNIQUE NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  payment_status VARCHAR(50) DEFAULT 'pending',
  subtotal DECIMAL(10, 2) NOT NULL,
  tax DECIMAL(10, 2) DEFAULT 0,
  discount DECIMAL(10, 2) DEFAULT 0,
  total DECIMAL(10, 2) NOT NULL,
  shipping_address JSONB,
  phone VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on orders
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own orders
CREATE POLICY "Users can view own orders" ON orders
FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can create their own orders
CREATE POLICY "Users can create own orders" ON orders
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Admins can view all orders
CREATE POLICY "Admins can view all orders" ON orders
USING (false) WITH CHECK (false); -- Controlled via API with admin role check

-- Create order items table
CREATE TABLE IF NOT EXISTS order_items (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT REFERENCES orders(id) ON DELETE CASCADE,
  product_id BIGINT REFERENCES products(id),
  variant_id BIGINT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10, 2) NOT NULL,
  total_price DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on order_items
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view items from their own orders
CREATE POLICY "Users can view own order items" ON order_items
FOR SELECT USING (
  EXISTS (SELECT 1 FROM orders WHERE id = order_id AND auth.uid() = user_id)
);

-- Create product reviews table
CREATE TABLE IF NOT EXISTS product_reviews (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title VARCHAR(255),
  review_text TEXT,
  is_verified_purchase BOOLEAN DEFAULT false,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(product_id, user_id)
);

-- Enable RLS on product_reviews
ALTER TABLE product_reviews ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view approved reviews
CREATE POLICY "Reviews viewable by everyone" ON product_reviews
FOR SELECT USING (status = 'approved');

-- Policy: Authenticated users can create reviews
CREATE POLICY "Authenticated users can create reviews" ON product_reviews
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Product owner can view/review their product's reviews
CREATE POLICY "Product owner can manage reviews" ON product_reviews
USING ( EXISTS (SELECT 1 FROM products WHERE id = product_id AND ... ) ) -- Simplified

-- Create site settings table
CREATE TABLE IF NOT EXISTS settings (
  id BIGSERIAL PRIMARY KEY,
  key VARCHAR(255) UNIQUE NOT NULL,
  value TEXT NOT NULL,
  group_name VARCHAR(100) DEFAULT 'general',
  type VARCHAR(50) DEFAULT 'string',
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on settings
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Policy: Public settings are viewable by everyone
CREATE POLICY "Public settings viewable by everyone" ON settings
FOR SELECT USING (is_public = true);

-- Policy: Admin can manage all settings
CREATE POLICY "Admin can manage settings" ON settings
USING (false) WITH CHECK (false); -- Controlled via API

-- Insert default settings (public only)
INSERT INTO settings (key, value, group_name, type, is_public) VALUES
  ('site_name', 'Karzintell', 'general', 'string', true),
  ('site_description', 'Electronic Components Marketplace', 'general', 'string', true),
  ('contact_email', 'support@karzintell.com', 'general', 'string', true),
  ('currency', 'IRT', 'general', 'string', true),
  ('tax_rate', '0.09', 'general', 'decimal', true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_cart_session_id ON cart(session_id);
CREATE INDEX IF NOT EXISTS idx_order_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_order_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_cart_items_cart_id ON cart_items(cart_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_product_id ON product_reviews(product_id);

-- ============================================================
-- SECURITY NOTE: 
-- 1. RLS policies above control data access at database level
-- 2. Actual admin checks must be implemented in NestJS API controllers/services
-- 3. The `auth.uid()` function refers to Supabase Auth user session
-- 4. For non-authenticated (guest) users, cart uses session_id-based logic
-- 5. Update RLS policies according to your exact permission structure
-- ============================================================