using System;
using BEQSAN.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BEQSAN.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    [DbContext(typeof(BeqsanDbContext))]
    [Migration("20260518100000_AddColorOptions")]
    public partial class AddColorOptions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "color_options",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "TEXT", nullable: false),
                    slug = table.Column<string>(type: "TEXT", maxLength: 64, nullable: false),
                    name = table.Column<string>(type: "TEXT", nullable: false),
                    short_description = table.Column<string>(type: "TEXT", nullable: false),
                    family = table.Column<int>(type: "INTEGER", nullable: false),
                    hex_code = table.Column<string>(type: "TEXT", maxLength: 7, nullable: false),
                    ral_code = table.Column<string>(type: "TEXT", maxLength: 16, nullable: true),
                    wood_texture_url = table.Column<string>(type: "TEXT", maxLength: 256, nullable: true),
                    surcharge_minor = table.Column<int>(type: "INTEGER", nullable: false),
                    currency = table.Column<string>(type: "TEXT", maxLength: 8, nullable: false),
                    sort_order = table.Column<int>(type: "INTEGER", nullable: false),
                    is_default = table.Column<bool>(type: "INTEGER", nullable: false),
                    is_active = table.Column<bool>(type: "INTEGER", nullable: false),
                    created_at_utc = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_color_options", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "ix_color_options_slug",
                table: "color_options",
                column: "slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_color_options_is_active_sort_order",
                table: "color_options",
                columns: new[] { "is_active", "sort_order" });

            // Many-to-many compatibility — no domain entity, Dapper-only reads.
            migrationBuilder.CreateTable(
                name: "material_color_compatibility",
                columns: table => new
                {
                    material_id = table.Column<Guid>(type: "TEXT", nullable: false),
                    color_option_id = table.Column<Guid>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_material_color_compatibility", x => new { x.material_id, x.color_option_id });
                    table.ForeignKey(
                        name: "fk_material_color_compatibility_materials_material_id",
                        column: x => x.material_id,
                        principalTable: "materials",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_material_color_compatibility_color_options_color_option_id",
                        column: x => x.color_option_id,
                        principalTable: "color_options",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_material_color_compatibility_color_option_id",
                table: "material_color_compatibility",
                column: "color_option_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "material_color_compatibility");
            migrationBuilder.DropTable(name: "color_options");
        }
    }
}
