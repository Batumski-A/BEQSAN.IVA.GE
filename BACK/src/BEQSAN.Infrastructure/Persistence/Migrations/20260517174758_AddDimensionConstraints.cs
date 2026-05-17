using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BEQSAN.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddDimensionConstraints : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "max_height_cm",
                table: "product_types",
                type: "INTEGER",
                nullable: false,
                defaultValue: 400);

            migrationBuilder.AddColumn<int>(
                name: "max_width_cm",
                table: "product_types",
                type: "INTEGER",
                nullable: false,
                defaultValue: 400);

            migrationBuilder.AddColumn<int>(
                name: "min_height_cm",
                table: "product_types",
                type: "INTEGER",
                nullable: false,
                defaultValue: 30);

            migrationBuilder.AddColumn<int>(
                name: "min_width_cm",
                table: "product_types",
                type: "INTEGER",
                nullable: false,
                defaultValue: 30);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "max_height_cm",
                table: "product_types");

            migrationBuilder.DropColumn(
                name: "max_width_cm",
                table: "product_types");

            migrationBuilder.DropColumn(
                name: "min_height_cm",
                table: "product_types");

            migrationBuilder.DropColumn(
                name: "min_width_cm",
                table: "product_types");
        }
    }
}
