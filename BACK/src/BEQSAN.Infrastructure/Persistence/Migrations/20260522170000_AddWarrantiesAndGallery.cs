using BEQSAN.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BEQSAN.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    [DbContext(typeof(BeqsanDbContext))]
    [Migration("20260522170000_AddWarrantiesAndGallery")]
    public partial class AddWarrantiesAndGallery : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "warranties",
                columns: table => new
                {
                    id = table.Column<System.Guid>(type: "TEXT", nullable: false),
                    order_id = table.Column<System.Guid>(type: "TEXT", nullable: false),
                    order_number = table.Column<string>(type: "TEXT", maxLength: 32, nullable: false),
                    customer_name = table.Column<string>(type: "TEXT", maxLength: 128, nullable: false),
                    customer_phone = table.Column<string>(type: "TEXT", maxLength: 20, nullable: false),
                    duration_months = table.Column<int>(type: "INTEGER", nullable: false),
                    start_date_utc = table.Column<System.DateTime>(type: "TEXT", nullable: false),
                    end_date_utc = table.Column<System.DateTime>(type: "TEXT", nullable: false),
                    status = table.Column<int>(type: "INTEGER", nullable: false),
                    notes = table.Column<string>(type: "TEXT", maxLength: 2000, nullable: true),
                    created_at_utc = table.Column<System.DateTime>(type: "TEXT", nullable: false),
                    updated_at_utc = table.Column<System.DateTime>(type: "TEXT", nullable: false),
                },
                constraints: table => table.PrimaryKey("pk_warranties", x => x.id));

            migrationBuilder.CreateIndex(name: "ix_warranties_order_id", table: "warranties", column: "order_id", unique: true);
            migrationBuilder.CreateIndex(name: "ix_warranties_status", table: "warranties", column: "status");
            migrationBuilder.CreateIndex(name: "ix_warranties_end_date_utc", table: "warranties", column: "end_date_utc");
            migrationBuilder.CreateIndex(name: "ix_warranties_customer_phone", table: "warranties", column: "customer_phone");

            migrationBuilder.CreateTable(
                name: "gallery_items",
                columns: table => new
                {
                    id = table.Column<System.Guid>(type: "TEXT", nullable: false),
                    title = table.Column<string>(type: "TEXT", maxLength: 256, nullable: false),
                    caption = table.Column<string>(type: "TEXT", maxLength: 1000, nullable: true),
                    image_url = table.Column<string>(type: "TEXT", maxLength: 512, nullable: false),
                    category = table.Column<string>(type: "TEXT", maxLength: 64, nullable: true),
                    sort_order = table.Column<int>(type: "INTEGER", nullable: false),
                    is_active = table.Column<bool>(type: "INTEGER", nullable: false),
                    is_featured = table.Column<bool>(type: "INTEGER", nullable: false),
                    created_at_utc = table.Column<System.DateTime>(type: "TEXT", nullable: false),
                    updated_at_utc = table.Column<System.DateTime>(type: "TEXT", nullable: false),
                },
                constraints: table => table.PrimaryKey("pk_gallery_items", x => x.id));

            migrationBuilder.CreateIndex(name: "ix_gallery_items_is_active_sort_order", table: "gallery_items", columns: new[] { "is_active", "sort_order" });
            migrationBuilder.CreateIndex(name: "ix_gallery_items_category", table: "gallery_items", column: "category");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "gallery_items");
            migrationBuilder.DropTable(name: "warranties");
        }
    }
}
