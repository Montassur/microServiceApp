# ==========================================
# Seed Demo Data Script (PowerShell)
# Populates database with sample data for testing
# ==========================================

Write-Host "🌱 Seeding demo data into database..." -ForegroundColor Green

# Run the SQL seed script
Get-Content database\seed_demo_data.sql | docker compose exec -T database psql -U auraweb_user -d auraweb_db

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Demo data seeded successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📊 You now have:" -ForegroundColor Cyan
    Write-Host "   • 10 Products (various categories)"
    Write-Host "   • 4 Users (1 admin, 3 customers)"
    Write-Host "   • 15 Product Reviews"
    Write-Host "   • 10 Orders"
    Write-Host "   • Cart items for testing"
    Write-Host "   • Wishlist items"
    Write-Host "   • Shipping records"
    Write-Host "   • 4 Discount coupons"
    Write-Host "   • Inventory records"
    Write-Host "   • Audit logs"
    Write-Host ""
    Write-Host "🔐 Test Credentials:" -ForegroundColor Yellow
    Write-Host "   Email: admin@auraweb.com"
    Write-Host "   Password: Admin@123"
    Write-Host ""
    Write-Host "🌐 Access your app:" -ForegroundColor Cyan
    Write-Host "   Frontend: http://localhost"
    Write-Host "   Admin: http://localhost:8080"
    Write-Host ""
} else {
    Write-Host "❌ Failed to seed data. Check if database is running:" -ForegroundColor Red
    Write-Host "   docker compose ps database"
}
