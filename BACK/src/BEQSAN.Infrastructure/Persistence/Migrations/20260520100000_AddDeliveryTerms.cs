using BEQSAN.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BEQSAN.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    [DbContext(typeof(BeqsanDbContext))]
    [Migration("20260520100000_AddDeliveryTerms")]
    public partial class AddDeliveryTerms : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "warranty_months",
                table: "product_types",
                type: "INTEGER",
                nullable: false,
                defaultValue: 36);

            migrationBuilder.AddColumn<int>(
                name: "lead_time_days_min",
                table: "product_types",
                type: "INTEGER",
                nullable: false,
                defaultValue: 10);

            migrationBuilder.AddColumn<int>(
                name: "lead_time_days_max",
                table: "product_types",
                type: "INTEGER",
                nullable: false,
                defaultValue: 14);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn("warranty_months", "product_types");
            migrationBuilder.DropColumn("lead_time_days_min", "product_types");
            migrationBuilder.DropColumn("lead_time_days_max", "product_types");
        }
    }
}
