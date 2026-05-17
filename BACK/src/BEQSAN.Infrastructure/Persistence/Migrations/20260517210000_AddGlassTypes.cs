using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BEQSAN.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    [Migration("20260517210000_AddGlassTypes")]
    public partial class AddGlassTypes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "glass_types",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "TEXT", nullable: false),
                    slug = table.Column<string>(type: "TEXT", maxLength: 64, nullable: false),
                    name = table.Column<string>(type: "TEXT", nullable: false),
                    short_description = table.Column<string>(type: "TEXT", nullable: false),
                    pane_count = table.Column<int>(type: "INTEGER", nullable: false),
                    surcharge_per_sqm_minor = table.Column<int>(type: "INTEGER", nullable: false),
                    currency = table.Column<string>(type: "TEXT", maxLength: 8, nullable: false),
                    u_value = table.Column<string>(type: "TEXT", nullable: false),
                    sort_order = table.Column<int>(type: "INTEGER", nullable: false),
                    is_default = table.Column<bool>(type: "INTEGER", nullable: false),
                    is_active = table.Column<bool>(type: "INTEGER", nullable: false),
                    created_at_utc = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_glass_types", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "ix_glass_types_slug",
                table: "glass_types",
                column: "slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_glass_types_is_active_sort_order",
                table: "glass_types",
                columns: new[] { "is_active", "sort_order" });

            // Many-to-many compatibility link. No domain entity — Dapper-only
            // reads. Composite PK prevents duplicate rows.
            migrationBuilder.CreateTable(
                name: "material_glass_compatibility",
                columns: table => new
                {
                    material_id = table.Column<Guid>(type: "TEXT", nullable: false),
                    glass_type_id = table.Column<Guid>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_material_glass_compatibility", x => new { x.material_id, x.glass_type_id });
                    table.ForeignKey(
                        name: "fk_material_glass_compatibility_materials_material_id",
                        column: x => x.material_id,
                        principalTable: "materials",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_material_glass_compatibility_glass_types_glass_type_id",
                        column: x => x.glass_type_id,
                        principalTable: "glass_types",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_material_glass_compatibility_glass_type_id",
                table: "material_glass_compatibility",
                column: "glass_type_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "material_glass_compatibility");
            migrationBuilder.DropTable(name: "glass_types");
        }
    }
}
