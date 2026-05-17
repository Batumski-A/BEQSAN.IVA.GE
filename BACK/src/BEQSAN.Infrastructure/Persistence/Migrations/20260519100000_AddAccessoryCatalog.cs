using System;
using BEQSAN.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BEQSAN.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    [DbContext(typeof(BeqsanDbContext))]
    [Migration("20260519100000_AddAccessoryCatalog")]
    public partial class AddAccessoryCatalog : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // ── Handle styles ──────────────────────────────────────────────
            migrationBuilder.CreateTable(
                name: "handle_styles",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "TEXT", nullable: false),
                    slug = table.Column<string>(type: "TEXT", maxLength: 64, nullable: false),
                    name = table.Column<string>(type: "TEXT", nullable: false),
                    short_description = table.Column<string>(type: "TEXT", nullable: false),
                    family = table.Column<string>(type: "TEXT", maxLength: 16, nullable: false),
                    image_url = table.Column<string>(type: "TEXT", maxLength: 256, nullable: true),
                    surcharge_per_pane_minor = table.Column<int>(type: "INTEGER", nullable: false),
                    currency = table.Column<string>(type: "TEXT", maxLength: 8, nullable: false),
                    sort_order = table.Column<int>(type: "INTEGER", nullable: false),
                    is_default = table.Column<bool>(type: "INTEGER", nullable: false),
                    is_active = table.Column<bool>(type: "INTEGER", nullable: false),
                    created_at_utc = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table => table.PrimaryKey("pk_handle_styles", x => x.id));
            migrationBuilder.CreateIndex("ix_handle_styles_slug", "handle_styles", "slug", unique: true);
            migrationBuilder.CreateIndex("ix_handle_styles_is_active_sort_order", "handle_styles",
                new[] { "is_active", "sort_order" });

            // ── Lock types ─────────────────────────────────────────────────
            migrationBuilder.CreateTable(
                name: "lock_types",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "TEXT", nullable: false),
                    slug = table.Column<string>(type: "TEXT", maxLength: 64, nullable: false),
                    name = table.Column<string>(type: "TEXT", nullable: false),
                    short_description = table.Column<string>(type: "TEXT", nullable: false),
                    grade = table.Column<int>(type: "INTEGER", nullable: false),
                    security_rating = table.Column<int>(type: "INTEGER", nullable: false),
                    requires_casement_or_turn = table.Column<bool>(type: "INTEGER", nullable: false),
                    surcharge_per_pane_minor = table.Column<int>(type: "INTEGER", nullable: false),
                    currency = table.Column<string>(type: "TEXT", maxLength: 8, nullable: false),
                    sort_order = table.Column<int>(type: "INTEGER", nullable: false),
                    is_default = table.Column<bool>(type: "INTEGER", nullable: false),
                    is_active = table.Column<bool>(type: "INTEGER", nullable: false),
                    created_at_utc = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table => table.PrimaryKey("pk_lock_types", x => x.id));
            migrationBuilder.CreateIndex("ix_lock_types_slug", "lock_types", "slug", unique: true);
            migrationBuilder.CreateIndex("ix_lock_types_is_active_sort_order", "lock_types",
                new[] { "is_active", "sort_order" });

            // ── Blind types ────────────────────────────────────────────────
            migrationBuilder.CreateTable(
                name: "blind_types",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "TEXT", nullable: false),
                    slug = table.Column<string>(type: "TEXT", maxLength: 64, nullable: false),
                    name = table.Column<string>(type: "TEXT", nullable: false),
                    short_description = table.Column<string>(type: "TEXT", nullable: false),
                    placement = table.Column<int>(type: "INTEGER", nullable: false),
                    supports_electric = table.Column<bool>(type: "INTEGER", nullable: false),
                    base_mounting_minor = table.Column<int>(type: "INTEGER", nullable: false),
                    surcharge_per_sqm_minor = table.Column<int>(type: "INTEGER", nullable: false),
                    currency = table.Column<string>(type: "TEXT", maxLength: 8, nullable: false),
                    sort_order = table.Column<int>(type: "INTEGER", nullable: false),
                    is_active = table.Column<bool>(type: "INTEGER", nullable: false),
                    created_at_utc = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table => table.PrimaryKey("pk_blind_types", x => x.id));
            migrationBuilder.CreateIndex("ix_blind_types_slug", "blind_types", "slug", unique: true);
            migrationBuilder.CreateIndex("ix_blind_types_is_active_sort_order", "blind_types",
                new[] { "is_active", "sort_order" });

            // ── Compatibility tables (M:M, Dapper-only reads) ──────────────
            migrationBuilder.CreateTable(
                name: "material_handle_compatibility",
                columns: table => new
                {
                    material_id = table.Column<Guid>(type: "TEXT", nullable: false),
                    handle_style_id = table.Column<Guid>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_material_handle_compatibility", x => new { x.material_id, x.handle_style_id });
                    table.ForeignKey("fk_material_handle_materials", x => x.material_id, "materials", "id", onDelete: ReferentialAction.Cascade);
                    table.ForeignKey("fk_material_handle_styles", x => x.handle_style_id, "handle_styles", "id", onDelete: ReferentialAction.Cascade);
                });
            migrationBuilder.CreateIndex("ix_material_handle_handle_id", "material_handle_compatibility", "handle_style_id");

            migrationBuilder.CreateTable(
                name: "product_type_lock_compatibility",
                columns: table => new
                {
                    product_type_id = table.Column<Guid>(type: "TEXT", nullable: false),
                    lock_type_id = table.Column<Guid>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_product_type_lock_compatibility", x => new { x.product_type_id, x.lock_type_id });
                    table.ForeignKey("fk_product_type_lock_product_types", x => x.product_type_id, "product_types", "id", onDelete: ReferentialAction.Cascade);
                    table.ForeignKey("fk_product_type_lock_lock_types", x => x.lock_type_id, "lock_types", "id", onDelete: ReferentialAction.Cascade);
                });
            migrationBuilder.CreateIndex("ix_product_type_lock_lock_id", "product_type_lock_compatibility", "lock_type_id");

            migrationBuilder.CreateTable(
                name: "product_type_blind_compatibility",
                columns: table => new
                {
                    product_type_id = table.Column<Guid>(type: "TEXT", nullable: false),
                    blind_type_id = table.Column<Guid>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_product_type_blind_compatibility", x => new { x.product_type_id, x.blind_type_id });
                    table.ForeignKey("fk_product_type_blind_product_types", x => x.product_type_id, "product_types", "id", onDelete: ReferentialAction.Cascade);
                    table.ForeignKey("fk_product_type_blind_blind_types", x => x.blind_type_id, "blind_types", "id", onDelete: ReferentialAction.Cascade);
                });
            migrationBuilder.CreateIndex("ix_product_type_blind_blind_id", "product_type_blind_compatibility", "blind_type_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable("material_handle_compatibility");
            migrationBuilder.DropTable("product_type_lock_compatibility");
            migrationBuilder.DropTable("product_type_blind_compatibility");
            migrationBuilder.DropTable("handle_styles");
            migrationBuilder.DropTable("lock_types");
            migrationBuilder.DropTable("blind_types");
        }
    }
}
