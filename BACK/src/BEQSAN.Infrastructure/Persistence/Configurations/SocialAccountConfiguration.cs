using BEQSAN.Domain.Social;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BEQSAN.Infrastructure.Persistence.Configurations;

internal sealed class SocialAccountConfiguration : IEntityTypeConfiguration<SocialAccount>
{
    public void Configure(EntityTypeBuilder<SocialAccount> builder)
    {
        builder.ToTable("social_accounts");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).ValueGeneratedNever();
        builder.Property(x => x.MetaUserId).IsRequired().HasMaxLength(64);
        builder.Property(x => x.DisplayName).IsRequired().HasMaxLength(256);
        builder.Property(x => x.ConnectedAtUtc).IsRequired();
        builder.Property(x => x.LastRefreshedAtUtc).IsRequired();
        builder.Property(x => x.DisconnectedAtUtc);
        builder.HasIndex(x => x.MetaUserId).IsUnique();

        builder.OwnsOne(x => x.UserToken, t =>
        {
            t.Property(p => p.Iv).HasColumnName("user_token_iv").IsRequired();
            t.Property(p => p.Cipher).HasColumnName("user_token_cipher").IsRequired();
            t.Property(p => p.ExpiresAtUtc).HasColumnName("user_token_expires_at_utc").IsRequired();
        });
    }
}
