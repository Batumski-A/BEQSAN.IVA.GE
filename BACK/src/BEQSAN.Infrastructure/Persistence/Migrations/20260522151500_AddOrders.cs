using BEQSAN.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BEQSAN.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    [DbContext(typeof(BeqsanDbContext))]
    [Migration("20260522151500_AddOrders")]
    public partial class AddOrders : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "orders",
                columns: table => new
                {
                    id = table.Column<System.Guid>(type: "TEXT", nullable: false),
                    order_number = table.Column<string>(type: "TEXT", maxLength: 32, nullable: false),
                    customer_name = table.Column<string>(type: "TEXT", maxLength: 128, nullable: false),
                    customer_phone = table.Column<string>(type: "TEXT", maxLength: 20, nullable: false),
                    customer_email = table.Column<string>(type: "TEXT", maxLength: 254, nullable: true),
                    customer_address = table.Column<string>(type: "TEXT", maxLength: 512, nullable: true),
                    notes = table.Column<string>(type: "TEXT", maxLength: 2000, nullable: true),
                    configuration_json = table.Column<string>(type: "TEXT", nullable: false),
                    total_price_minor = table.Column<long>(type: "INTEGER", nullable: false),
                    currency = table.Column<string>(type: "TEXT", maxLength: 8, nullable: false),
                    status = table.Column<int>(type: "INTEGER", nullable: false),
                    status_history_json = table.Column<string>(type: "TEXT", nullable: false),
                    created_at_utc = table.Column<System.DateTime>(type: "TEXT", nullable: false),
                    updated_at_utc = table.Column<System.DateTime>(type: "TEXT", nullable: false),
                },
                constraints: table => table.PrimaryKey("pk_orders", x => x.id));

            migrationBuilder.CreateIndex(name: "ix_orders_order_number", table: "orders", column: "order_number", unique: true);
            migrationBuilder.CreateIndex(name: "ix_orders_status", table: "orders", column: "status");
            migrationBuilder.CreateIndex(name: "ix_orders_created_at_utc", table: "orders", column: "created_at_utc");
            migrationBuilder.CreateIndex(name: "ix_orders_customer_phone", table: "orders", column: "customer_phone");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "orders");
        }
    }
}
