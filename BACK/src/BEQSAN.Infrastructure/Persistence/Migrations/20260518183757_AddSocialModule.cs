using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BEQSAN.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddSocialModule : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "lead_time_days_max",
                table: "product_types",
                type: "INTEGER",
                nullable: false,
                defaultValue: 14);

            migrationBuilder.AddColumn<int>(
                name: "lead_time_days_min",
                table: "product_types",
                type: "INTEGER",
                nullable: false,
                defaultValue: 10);

            migrationBuilder.AddColumn<int>(
                name: "warranty_months",
                table: "product_types",
                type: "INTEGER",
                nullable: false,
                defaultValue: 36);

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
                constraints: table =>
                {
                    table.PrimaryKey("pk_blind_types", x => x.id);
                });

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
                    is_default = table.Column<bool>(type: "INTEGER", nullable: false),
                    sort_order = table.Column<int>(type: "INTEGER", nullable: false),
                    is_active = table.Column<bool>(type: "INTEGER", nullable: false),
                    created_at_utc = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_color_options", x => x.id);
                });

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
                    u_value = table.Column<decimal>(type: "TEXT", nullable: false),
                    sort_order = table.Column<int>(type: "INTEGER", nullable: false),
                    is_default = table.Column<bool>(type: "INTEGER", nullable: false),
                    is_active = table.Column<bool>(type: "INTEGER", nullable: false),
                    created_at_utc = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_glass_types", x => x.id);
                });

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
                    is_default = table.Column<bool>(type: "INTEGER", nullable: false),
                    sort_order = table.Column<int>(type: "INTEGER", nullable: false),
                    is_active = table.Column<bool>(type: "INTEGER", nullable: false),
                    created_at_utc = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_handle_styles", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "inbox_messages",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "TEXT", nullable: false),
                    thread_id = table.Column<Guid>(type: "TEXT", nullable: false),
                    page_id = table.Column<Guid>(type: "TEXT", nullable: false),
                    external_message_id = table.Column<string>(type: "TEXT", maxLength: 256, nullable: false),
                    direction = table.Column<string>(type: "TEXT", maxLength: 16, nullable: false),
                    author_id = table.Column<string>(type: "TEXT", maxLength: 128, nullable: false),
                    author_name = table.Column<string>(type: "TEXT", maxLength: 256, nullable: false),
                    text = table.Column<string>(type: "TEXT", maxLength: 8000, nullable: false),
                    attachment_url = table.Column<string>(type: "TEXT", maxLength: 1024, nullable: true),
                    at_utc = table.Column<DateTime>(type: "TEXT", nullable: false),
                    created_at_utc = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_inbox_messages", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "inbox_threads",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "TEXT", nullable: false),
                    page_id = table.Column<Guid>(type: "TEXT", nullable: false),
                    channel = table.Column<string>(type: "TEXT", maxLength: 24, nullable: false),
                    external_thread_id = table.Column<string>(type: "TEXT", maxLength: 256, nullable: false),
                    participant_id = table.Column<string>(type: "TEXT", maxLength: 128, nullable: false),
                    participant_name = table.Column<string>(type: "TEXT", maxLength: 256, nullable: false),
                    last_message_preview = table.Column<string>(type: "TEXT", maxLength: 256, nullable: false),
                    last_message_at_utc = table.Column<DateTime>(type: "TEXT", nullable: false),
                    has_unread = table.Column<bool>(type: "INTEGER", nullable: false),
                    created_at_utc = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_inbox_threads", x => x.id);
                });

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
                    is_default = table.Column<bool>(type: "INTEGER", nullable: false),
                    sort_order = table.Column<int>(type: "INTEGER", nullable: false),
                    is_active = table.Column<bool>(type: "INTEGER", nullable: false),
                    created_at_utc = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_lock_types", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "social_accounts",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "TEXT", nullable: false),
                    meta_user_id = table.Column<string>(type: "TEXT", maxLength: 64, nullable: false),
                    display_name = table.Column<string>(type: "TEXT", maxLength: 256, nullable: false),
                    user_token_iv = table.Column<byte[]>(type: "BLOB", nullable: false),
                    user_token_cipher = table.Column<byte[]>(type: "BLOB", nullable: false),
                    user_token_expires_at_utc = table.Column<DateTime>(type: "TEXT", nullable: false),
                    connected_at_utc = table.Column<DateTime>(type: "TEXT", nullable: false),
                    disconnected_at_utc = table.Column<DateTime>(type: "TEXT", nullable: true),
                    last_refreshed_at_utc = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_social_accounts", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "social_pages",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "TEXT", nullable: false),
                    account_id = table.Column<Guid>(type: "TEXT", nullable: false),
                    meta_page_id = table.Column<string>(type: "TEXT", maxLength: 64, nullable: false),
                    name = table.Column<string>(type: "TEXT", maxLength: 256, nullable: false),
                    ig_user_id = table.Column<string>(type: "TEXT", maxLength: 64, nullable: true),
                    ig_username = table.Column<string>(type: "TEXT", maxLength: 256, nullable: true),
                    page_token_iv = table.Column<byte[]>(type: "BLOB", nullable: false),
                    page_token_cipher = table.Column<byte[]>(type: "BLOB", nullable: false),
                    page_token_expires_at_utc = table.Column<DateTime>(type: "TEXT", nullable: false),
                    connected_at_utc = table.Column<DateTime>(type: "TEXT", nullable: false),
                    last_synced_at_utc = table.Column<DateTime>(type: "TEXT", nullable: false),
                    is_active = table.Column<bool>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_social_pages", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "social_posts",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "TEXT", nullable: false),
                    composer_id = table.Column<Guid>(type: "TEXT", nullable: false),
                    page_id = table.Column<Guid>(type: "TEXT", nullable: false),
                    platform = table.Column<string>(type: "TEXT", maxLength: 16, nullable: false),
                    caption = table.Column<string>(type: "TEXT", maxLength: 4000, nullable: false),
                    image_urls = table.Column<string>(type: "TEXT", nullable: false),
                    status = table.Column<string>(type: "TEXT", maxLength: 16, nullable: false),
                    external_post_id = table.Column<string>(type: "TEXT", maxLength: 128, nullable: true),
                    external_permalink = table.Column<string>(type: "TEXT", maxLength: 512, nullable: true),
                    failure_reason = table.Column<string>(type: "TEXT", maxLength: 2000, nullable: true),
                    created_at_utc = table.Column<DateTime>(type: "TEXT", nullable: false),
                    published_at_utc = table.Column<DateTime>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_social_posts", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "ix_blind_types_is_active_sort_order",
                table: "blind_types",
                columns: new[] { "is_active", "sort_order" });

            migrationBuilder.CreateIndex(
                name: "ix_blind_types_slug",
                table: "blind_types",
                column: "slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_color_options_is_active_sort_order",
                table: "color_options",
                columns: new[] { "is_active", "sort_order" });

            migrationBuilder.CreateIndex(
                name: "ix_color_options_slug",
                table: "color_options",
                column: "slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_glass_types_is_active_sort_order",
                table: "glass_types",
                columns: new[] { "is_active", "sort_order" });

            migrationBuilder.CreateIndex(
                name: "ix_glass_types_slug",
                table: "glass_types",
                column: "slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_handle_styles_is_active_sort_order",
                table: "handle_styles",
                columns: new[] { "is_active", "sort_order" });

            migrationBuilder.CreateIndex(
                name: "ix_handle_styles_slug",
                table: "handle_styles",
                column: "slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_inbox_messages_external_message_id",
                table: "inbox_messages",
                column: "external_message_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_inbox_messages_thread_id_at_utc",
                table: "inbox_messages",
                columns: new[] { "thread_id", "at_utc" });

            migrationBuilder.CreateIndex(
                name: "ix_inbox_threads_page_id_external_thread_id",
                table: "inbox_threads",
                columns: new[] { "page_id", "external_thread_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_inbox_threads_page_id_last_message_at_utc",
                table: "inbox_threads",
                columns: new[] { "page_id", "last_message_at_utc" });

            migrationBuilder.CreateIndex(
                name: "ix_lock_types_is_active_sort_order",
                table: "lock_types",
                columns: new[] { "is_active", "sort_order" });

            migrationBuilder.CreateIndex(
                name: "ix_lock_types_slug",
                table: "lock_types",
                column: "slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_social_accounts_meta_user_id",
                table: "social_accounts",
                column: "meta_user_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_social_pages_account_id",
                table: "social_pages",
                column: "account_id");

            migrationBuilder.CreateIndex(
                name: "ix_social_pages_meta_page_id",
                table: "social_pages",
                column: "meta_page_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_social_posts_composer_id",
                table: "social_posts",
                column: "composer_id");

            migrationBuilder.CreateIndex(
                name: "ix_social_posts_created_at_utc",
                table: "social_posts",
                column: "created_at_utc");

            migrationBuilder.CreateIndex(
                name: "ix_social_posts_page_id",
                table: "social_posts",
                column: "page_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "blind_types");

            migrationBuilder.DropTable(
                name: "color_options");

            migrationBuilder.DropTable(
                name: "glass_types");

            migrationBuilder.DropTable(
                name: "handle_styles");

            migrationBuilder.DropTable(
                name: "inbox_messages");

            migrationBuilder.DropTable(
                name: "inbox_threads");

            migrationBuilder.DropTable(
                name: "lock_types");

            migrationBuilder.DropTable(
                name: "social_accounts");

            migrationBuilder.DropTable(
                name: "social_pages");

            migrationBuilder.DropTable(
                name: "social_posts");

            migrationBuilder.DropColumn(
                name: "lead_time_days_max",
                table: "product_types");

            migrationBuilder.DropColumn(
                name: "lead_time_days_min",
                table: "product_types");

            migrationBuilder.DropColumn(
                name: "warranty_months",
                table: "product_types");
        }
    }
}
