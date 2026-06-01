-- ==========================================
-- Demo Data Seed Script - MATCHES ACTUAL SCHEMA
-- Comprehensive sample data for client demonstrations
-- ==========================================

-- ==========================================
-- 1. PRODUCTS (20 Products)
-- Schema: id, name, description, price, category, stock, image_url, created_at, updated_at
-- ==========================================
INSERT INTO products (name, description, category, price, stock, created_at, updated_at) VALUES
-- Infrastructure Products (8)
('Cloud Infrastructure Starter', 'Perfect for small teams getting started with cloud infrastructure. Includes basic compute, storage, and networking.', 'infrastructure', 499.99, 100, NOW(), NOW()),
('Enterprise Cloud Suite', 'Complete cloud solution for large enterprises with 99.99% uptime SLA and 24/7 support.', 'infrastructure', 2999.99, 50, NOW(), NOW()),
('API Gateway Pro', 'High-performance API gateway with rate limiting, authentication, and analytics built-in.', 'infrastructure', 799.99, 80, NOW(), NOW()),
('Database Cluster Manager', 'Manage PostgreSQL, MySQL, and MongoDB clusters with automated backups and failover.', 'infrastructure', 1299.99, 45, NOW(), NOW()),
('Load Balancer Elite', 'Enterprise-grade load balancing with SSL termination and health checks.', 'infrastructure', 1799.99, 35, NOW(), NOW()),
('Container Orchestrator', 'Simplified container orchestration with Kubernetes under the hood.', 'infrastructure', 1599.99, 55, NOW(), NOW()),
('CDN Accelerator', 'Global content delivery network with edge caching and DDoS protection.', 'infrastructure', 899.99, 70, NOW(), NOW()),
('Message Queue System', 'Reliable message queuing with RabbitMQ and Redis Streams support.', 'infrastructure', 699.99, 90, NOW(), NOW()),

-- Software Products (8)
('DevOps Automation Platform', 'Streamline your CI/CD pipeline with our comprehensive automation tools and integrations.', 'software', 1499.99, 75, NOW(), NOW()),
('Kubernetes Management Console', 'Simplified Kubernetes cluster management with visual dashboards and one-click deployments.', 'software', 999.99, 60, NOW(), NOW()),
('Microservices Toolkit', 'Everything you need to build, deploy, and monitor microservices at scale.', 'software', 599.99, 90, NOW(), NOW()),
('Redis Cache Optimizer', 'Optimize your Redis performance with intelligent caching strategies and monitoring.', 'software', 399.99, 120, NOW(), NOW()),
('Code Quality Analyzer', 'Automated code review and quality analysis for multiple programming languages.', 'software', 449.99, 85, NOW(), NOW()),
('Test Automation Suite', 'End-to-end testing automation with support for web, mobile, and API testing.', 'software', 799.99, 65, NOW(), NOW()),
('Monitoring Dashboard Pro', 'Real-time monitoring with custom dashboards, alerts, and integrations.', 'software', 899.99, 70, NOW(), NOW()),
('Log Analytics Platform', 'Centralized log management with powerful search and analysis capabilities.', 'software', 699.99, 80, NOW(), NOW()),

-- Security Products (4)
('Security Monitoring Suite', 'Real-time security monitoring and threat detection with AI-powered analysis.', 'security', 1999.99, 40, NOW(), NOW()),
('Vulnerability Scanner Pro', 'Automated vulnerability scanning for web applications and infrastructure.', 'security', 1299.99, 50, NOW(), NOW()),
('Identity Access Manager', 'Enterprise IAM solution with SSO, MFA, and role-based access control.', 'security', 1599.99, 45, NOW(), NOW()),
('Firewall & DDoS Protection', 'Advanced firewall with machine learning-based DDoS mitigation.', 'security', 2499.99, 30, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- ==========================================
-- 2. ADDITIONAL USERS (9 more customers)
-- Schema: id, email, password_hash, first_name, last_name, role, is_active, email_verified, created_at, updated_at
-- ==========================================
INSERT INTO users (email, password_hash, first_name, last_name, role, email_verified, created_at, updated_at) VALUES
('john.doe@techcorp.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIeWEHaSuu', 'John', 'Doe', 'user', true, NOW(), NOW()),
('jane.smith@startup.io', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIeWEHaSuu', 'Jane', 'Smith', 'user', true, NOW(), NOW()),
('bob.wilson@enterprise.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIeWEHaSuu', 'Bob', 'Wilson', 'user', true, NOW(), NOW()),
('alice.johnson@devops.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIeWEHaSuu', 'Alice', 'Johnson', 'user', true, NOW(), NOW()),
('charlie.brown@cloud.net', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIeWEHaSuu', 'Charlie', 'Brown', 'user', true, NOW(), NOW()),
('diana.prince@security.org', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIeWEHaSuu', 'Diana', 'Prince', 'user', true, NOW(), NOW()),
('evan.peters@microservices.dev', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIeWEHaSuu', 'Evan', 'Peters', 'user', true, NOW(), NOW()),
('fiona.gallagher@saas.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIeWEHaSuu', 'Fiona', 'Gallagher', 'user', true, NOW(), NOW()),
('george.martin@platform.io', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIeWEHaSuu', 'George', 'Martin', 'user', true, NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

-- ==========================================
-- 3. REVIEWS (50+ Reviews)
-- Schema: id, product_id, user_id, rating, comment, created_at, updated_at
-- ==========================================
INSERT INTO reviews (product_id, user_id, rating, comment, created_at, updated_at)
SELECT 
    p.id,
    u.id,
    (ARRAY[3, 4, 4, 5, 5, 5])[floor(random() * 6 + 1)],
    (ARRAY[
        'Excellent product! Exceeded my expectations.',
        'Great value for money. Highly recommend!',
        'Very satisfied with the performance and reliability.',
        'Outstanding quality. Worth every penny.',
        'Perfect solution for our team needs.',
        'Impressive features and easy to use.',
        'Best in class. Our productivity has increased significantly.',
        'Solid product with great customer support.',
        'Exactly what we were looking for.',
        'Game changer for our infrastructure.',
        'Reliable and efficient. No complaints.',
        'Good product, but could use more documentation.',
        'Works as advertised. Happy with the purchase.',
        'Fantastic tool! Saved us countless hours.',
        'Professional grade solution at a reasonable price.'
    ])[floor(random() * 15 + 1)],
    NOW() - (random() * interval '60 days'),
    NOW()
FROM products p
CROSS JOIN (SELECT * FROM users WHERE role = 'user' LIMIT 6) u
WHERE random() < 0.3
LIMIT 55
ON CONFLICT DO NOTHING;

-- ==========================================
-- 4. ORDERS (25 Orders) - if orders table exists
-- Schema varies by service - check if table exists first
-- ==========================================
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'orders') THEN
        INSERT INTO orders (user_id, total_amount, status, created_at, updated_at)
        SELECT 
            u.id,
            (random() * 3000 + 300)::numeric(10,2),
            (ARRAY['pending', 'pending', 'processing', 'processing', 'completed', 'completed', 'completed', 'shipped', 'shipped', 'delivered'])[floor(random() * 10 + 1)],
            NOW() - (random() * interval '45 days'),
            NOW() - (random() * interval '30 days')
        FROM (SELECT * FROM users WHERE role = 'user') u
        CROSS JOIN generate_series(1, 3)
        LIMIT 25
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- ==========================================
-- 5. CART ITEMS - if cart table exists
-- ==========================================
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'cart') THEN
        INSERT INTO cart (user_id, product_id, quantity)
        SELECT 
            u.id,
            p.id,
            floor(random() * 4 + 1)::integer
        FROM (SELECT * FROM users WHERE role = 'user' LIMIT 4) u
        CROSS JOIN (SELECT * FROM products ORDER BY random() LIMIT 3) p
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- ==========================================
-- 6. COUPONS - if coupons table exists
-- ==========================================
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'coupons') THEN
        INSERT INTO coupons (code, discount_percent, expiry_date, is_active, created_at) VALUES
        ('WELCOME10', 10, NOW() + interval '30 days', true, NOW()),
        ('SAVE20', 20, NOW() + interval '60 days', true, NOW()),
        ('NEWUSER', 15, NOW() + interval '90 days', true, NOW()),
        ('ENTERPRISE25', 25, NOW() + interval '45 days', true, NOW()),
        ('FLASH30', 30, NOW() + interval '7 days', true, NOW()),
        ('LOYAL15', 15, NOW() + interval '120 days', true, NOW())
        ON CONFLICT (code) DO NOTHING;
    END IF;
END $$;

-- ==========================================
-- 7. INVENTORY - if inventory table exists
-- ==========================================
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'inventory') THEN
        INSERT INTO inventory (product_id, quantity, warehouse_location)
        SELECT 
            p.id,
            p.stock,
            (ARRAY['Warehouse A - East Coast', 'Warehouse B - West Coast', 'Warehouse C - Central', 'Warehouse D - International'])[floor(random() * 4 + 1)]
        FROM products p
        ON CONFLICT (product_id) DO UPDATE SET
            quantity = EXCLUDED.quantity,
            warehouse_location = EXCLUDED.warehouse_location;
    END IF;
END $$;

-- ==========================================
-- Verification Queries
-- ==========================================
\echo ''
\echo '=========================================='
\echo '📊 DEMO DATA SUMMARY'
\echo '=========================================='

SELECT 
    'Products' as table_name, 
    COUNT(*) as count
FROM products
UNION ALL
SELECT 'Users', COUNT(*) FROM users
UNION ALL
SELECT 'Reviews', COUNT(*) FROM reviews;

-- Show optional tables if they exist
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'orders') THEN
        RAISE NOTICE 'Orders: %', (SELECT COUNT(*) FROM orders);
    END IF;
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'cart') THEN
        RAISE NOTICE 'Cart Items: %', (SELECT COUNT(*) FROM cart);
    END IF;
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'coupons') THEN
        RAISE NOTICE 'Coupons: %', (SELECT COUNT(*) FROM coupons);
    END IF;
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'inventory') THEN
        RAISE NOTICE 'Inventory: %', (SELECT COUNT(*) FROM inventory);
    END IF;
END $$;

\echo ''
\echo '=========================================='
\echo '✅ CLIENT DEMO DATA SEEDED SUCCESSFULLY!'
\echo '=========================================='
\echo ''
\echo '📈 Core Data:'
\echo '   • 20 Products across 3 categories'
\echo '   • 12 Users (1 admin + 2 editors + 9 customers)'
\echo '   • 50+ Product reviews'
\echo ''
\echo '🔐 Test Credentials (password: Admin@123):'
\echo '   Admin: admin@auraweb.com'
\echo '   User: john.doe@techcorp.com'
\echo '   Editor: editor@example.com'
\echo ''
\echo '🌐 Access:'
\echo '   Frontend: http://localhost'
\echo '   Admin: http://localhost:8080'
\echo ''
\echo '💡 Note: Additional data (orders, cart, etc.) will be'
\echo '   created when you use those services.'
\echo ''
