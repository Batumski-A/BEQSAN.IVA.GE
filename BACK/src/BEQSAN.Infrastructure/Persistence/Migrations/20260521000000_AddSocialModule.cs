using BEQSAN.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BEQSAN.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    [DbContext(typeof(BeqsanDbContext))]
    [Migration("20260521000000_AddSocialModule")]
    public partial class AddSocialModule : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "social_accounts",
                columns: table => new
                {
                    id = table.Column<System.Guid>(type: "TEXT", nullable: false),
                    meta_user_id = table.Column<string>(type: "TEXT", maxLength: 64, nullable: false),
                    display_name = table.Column<string>(type: "TEXT", maxLength: 256, nullable: false),
                    connected_at_utc = table.Column<System.DateTime>(type: "TEXT", nullable: false),
                    last_refreshed_at_utc = table.Column<System.DateTime>(type: "TEXT", nullable: false),
                    disconnected_at_utc = table.Column<System.DateTime>(type: "TEXT", nullable: true),
                    user_token_iv = table.Column<byte[]>(type: "BLOB", nullable: false),
                    user_token_cipher = table.Column<byte[]>(type: "BLOB", nullable: false),
                    user_token_expires_at_utc = table.Column<System.DateTime>(type: "TEXT", nullable: false),
                },
                constraints: table => table.PrimaryKey("pk_social_accounts", x => x.id));

            migrationBuilder.CreateIndex(
                name: "ix_social_accounts_meta_user_id",
                table: "social_accounts",
                column: "meta_user_id",
                unique: true);

            migrationBuilder.CreateTable(
                name: "social_pages",
                columns: table => new
                {
                    id = table.Column<System.Guid>(type: "TEXT", nullable: false),
                    account_id = table.Column<System.Guid>(type: "TEXT", nullable: false),
                    meta_page_id = table.Column<string>(type: "TEXT", maxLength: 64, nullable: false),
                    name = table.Column<string>(type: "TEXT", maxLength: 256, nullable: false),
                    ig_user_id = table.Column<string>(type: "TEXT", maxLength: 64, nullable: true),
                    ig_username = table.Column<string>(type: "TEXT", maxLength: 256, nullable: true),
                    connected_at_utc = table.Column<System.DateTime>(type: "TEXT", nullable: false),
                    last_synced_at_utc = table.Column<System.DateTime>(type: "TEXT", nullable: false),
                    is_active = table.Column<bool>(type: "INTEGER", nullable: false),
                    page_token_iv = table.Column<byte[]>(type: "BLOB", nullable: false),
                    page_token_cipher = table.Column<byte[]>(type: "BLOB", nullable: false),
                    page_token_expires_at_utc = table.Column<System.DateTime>(type: "TEXT", nullable: false),
                },
                constraints: table => table.PrimaryKey("pk_social_pages", x => x.id));

            migrationBuilder.CreateIndex(
                name: "ix_social_pages_meta_page_id",
                table: "social_pages",
                column: "meta_page_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_social_pages_account_id",
                table: "social_pages",
                column: "account_id");

            migrationBuilder.CreateTable(
                name: "social_posts",
                columns: table => new
                {
                    id = table.Column<System.Guid>(type: "TEXT", nullable: false),
                    composer_id = table.Column<System.Guid>(type: "TEXT", nullable: false),
                    page_id = table.Column<System.Guid>(type: "TEXT", nullable: false),
                    platform = table.Column<string>(type: "TEXT", maxLength: 16, nullable: false),
                    caption = table.Column<string>(type: "TEXT", maxLength: 4000, nullable: false),
                    image_urls = table.Column<string>(type: "TEXT", nullable: false),
                    status = table.Column<string>(type: "TEXT", maxLength: 16, nullable: false),
                    external_post_id = table.Column<string>(type: "TEXT", maxLength: 128, nullable: true),
                    external_permalink = table.Column<string>(type: "TEXT", maxLength: 512, nullable: true),
                    failure_reason = table.Column<string>(type: "TEXT", maxLength: 2000, nullable: true),
                    created_at_utc = table.Column<System.DateTime>(type: "TEXT", nullable: false),
                    published_at_utc = table.Column<System.DateTime>(type: "TEXT", nullable: true),
                },
                constraints: table => table.PrimaryKey("pk_social_posts", x => x.id));

            migrationBuilder.CreateIndex(name: "ix_social_posts_page_id", table: "social_posts", column: "page_id");
            migrationBuilder.CreateIndex(name: "ix_social_posts_composer_id", table: "social_posts", column: "composer_id");
            migrationBuilder.CreateIndex(name: "ix_social_posts_created_at_utc", table: "social_posts", column: "created_at_utc");

            migrationBuilder.CreateTable(
                name: "inbox_threads",
                columns: table => new
                {
                    id = table.Column<System.Guid>(type: "TEXT", nullable: false),
                    page_id = table.Column<System.Guid>(type: "TEXT", nullable: false),
                    channel = table.Column<string>(type: "TEXT", maxLength: 24, nullable: false),
                    external_thread_id = table.Column<string>(type: "TEXT", maxLength: 256, nullable: false),
                    participant_id = table.Column<string>(type: "TEXT", maxLength: 128, nullable: false),
                    participant_name = table.Column<string>(type: "TEXT", maxLength: 256, nullable: true),
                    last_message_preview = table.Column<string>(type: "TEXT", maxLength: 256, nullable: true),
                    last_message_at_utc = table.Column<System.DateTime>(type: "TEXT", nullable: false),
                    has_unread = table.Column<bool>(type: "INTEGER", nullable: false),
                    created_at_utc = table.Column<System.DateTime>(type: "TEXT", nullable: false),
                },
                constraints: table => table.PrimaryKey("pk_inbox_threads", x => x.id));

            migrationBuilder.CreateIndex(
                name: "ix_inbox_threads_page_id_external_thread_id",
                table: "inbox_threads",
                columns: new[] { "page_id", "external_thread_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_inbox_threads_page_id_last_message_at_utc",
                table: "inbox_threads",
                columns: new[] { "page_id", "last_message_at_utc" });

            migrationBuilder.CreateTable(
                name: "inbox_messages",
                columns: table => new
                {
                    id = table.Column<System.Guid>(type: "TEXT", nullable: false),
                    thread_id = table.Column<System.Guid>(type: "TEXT", nullable: false),
                    page_id = table.Column<System.Guid>(type: "TEXT", nullable: false),
                    external_message_id = table.Column<string>(type: "TEXT", maxLength: 256, nullable: false),
                    direction = table.Column<string>(type: "TEXT", maxLength: 16, nullable: false),
                    author_id = table.Column<string>(type: "TEXT", maxLength: 128, nullable: false),
                    author_name = table.Column<string>(type: "TEXT", maxLength: 256, nullable: true),
                    text = table.Column<string>(type: "TEXT", maxLength: 8000, nullable: false),
                    attachment_url = table.Column<string>(type: "TEXT", maxLength: 1024, nullable: true),
                    at_utc = table.Column<System.DateTime>(type: "TEXT", nullable: false),
                    created_at_utc = table.Column<System.DateTime>(type: "TEXT", nullable: false),
                },
                constraints: table => table.PrimaryKey("pk_inbox_messages", x => x.id));

            migrationBuilder.CreateIndex(
                name: "ix_inbox_messages_external_message_id",
                table: "inbox_messages",
                column: "external_message_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_inbox_messages_thread_id_at_utc",
                table: "inbox_messages",
                columns: new[] { "thread_id", "at_utc" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable("inbox_messages");
            migrationBuilder.DropTable("inbox_threads");
            migrationBuilder.DropTable("social_posts");
            migrationBuilder.DropTable("social_pages");
            migrationBuilder.DropTable("social_accounts");
        }
    }
}
