using BEQSAN.Domain.Admin;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BEQSAN.Infrastructure.Persistence.Configurations;

internal sealed class AdminUserConfiguration : IEntityTypeConfiguration<AdminUser>
{
    public void Configure(EntityTypeBuilder<AdminUser> builder)
    {
        builder.ToTable("admin_users");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.Id).ValueGeneratedNever();
        // SQLite NOCASE collation: usernames compare case-insensitively at the
        // SQL layer, so a single == predicate matches "Roman"/"roman"/"ROMAN"
        // without forcing ToLower() into LINQ (which trips CA1311/CA1862).
        builder.Property(x => x.Username).HasMaxLength(64).IsRequired().UseCollation("NOCASE");
        builder.HasIndex(x => x.Username).IsUnique();

        builder.Property(x => x.PasswordHash).HasMaxLength(256).IsRequired();
        builder.Property(x => x.DisplayName).HasMaxLength(128).IsRequired();
        builder.Property(x => x.IsOwner).IsRequired();
        builder.Property(x => x.CreatedAtUtc).IsRequired();
        builder.Property(x => x.LastLoginAtUtc);
    }
}
