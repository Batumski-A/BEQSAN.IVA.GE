using BEQSAN.Domain.Social;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BEQSAN.Infrastructure.Persistence.Configurations;

internal sealed class SocialPageConfiguration : IEntityTypeConfiguration<SocialPage>
{
    public void Configure(EntityTypeBuilder<SocialPage> builder)
    {
        builder.ToTable("social_pages");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).ValueGeneratedNever();
        builder.Property(x => x.AccountId).IsRequired();
        builder.Property(x => x.MetaPageId).IsRequired().HasMaxLength(64);
        builder.Property(x => x.Name).IsRequired().HasMaxLength(256);
        builder.Property(x => x.IgUserId).HasMaxLength(64);
        builder.Property(x => x.IgUsername).HasMaxLength(256);
        builder.Property(x => x.ConnectedAtUtc).IsRequired();
        builder.Property(x => x.LastSyncedAtUtc).IsRequired();
        builder.Property(x => x.IsActive).IsRequired();
        builder.HasIndex(x => x.MetaPageId).IsUnique();
        builder.HasIndex(x => x.AccountId);

        builder.OwnsOne(x => x.PageToken, t =>
        {
            t.Property(p => p.Iv).HasColumnName("page_token_iv").IsRequired();
            t.Property(p => p.Cipher).HasColumnName("page_token_cipher").IsRequired();
            t.Property(p => p.ExpiresAtUtc).HasColumnName("page_token_expires_at_utc").IsRequired();
        });
    }
}
