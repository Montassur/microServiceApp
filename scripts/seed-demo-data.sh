#!/bin/bash

# ==========================================
# Seed Demo Data Script
# Populates database with sample data for testing
# ==========================================

echo "🌱 Seeding demo data into database..."

# Run the SQL seed script
docker compose exec -T database psql -U auraweb_user -d auraweb_db < database/seed_demo_data.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Demo data seeded successfully!"
    echo ""
    echo "📊 You now have:"
    echo "   • 10 Products (various categories)"
    echo "   • 4 Users (1 admin, 3 customers)"
    echo "   • 15 Product Reviews"
    echo "   • 10 Orders"
    echo "   • Cart items for testing"
    echo "   • Wishlist items"
    echo "   • Shipping records"
    echo "   • 4 Discount coupons"
    echo "   • Inventory records"
    echo "   • Audit logs"
    echo ""
    echo "🔐 Test Credentials:"
    echo "   Email: admin@auraweb.com"
    echo "   Password: Admin@123"
    echo ""
    echo "🌐 Access your app:"
    echo "   Frontend: http://localhost"
    echo "   Admin: http://localhost:8080"
    echo ""
else
    echo "❌ Failed to seed data. Check if database is running:"
    echo "   docker compose ps database"
fi
