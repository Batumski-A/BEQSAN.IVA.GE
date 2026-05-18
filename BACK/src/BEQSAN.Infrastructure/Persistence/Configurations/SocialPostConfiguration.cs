using System.Text.Json;
using BEQSAN.Domain.Social;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BEQSAN.Infrastructure.Persistence.Configurations;

internal sealed class SocialPostConfiguration : IEntityTypeConfiguration<SocialPost>
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public void Configure(EntityTypeBuilder<SocialPost> builder)
    {
        builder.ToTable("social_posts");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).ValueGeneratedNever();
        builder.Property(x => x.ComposerId).IsRequired();
        builder.Property(x => x.PageId).IsRequired();
        builder.Property(x => x.Platform).HasConversion<string>().HasMaxLength(16).IsRequired();
        builder.Property(x => x.Caption).IsRequired().HasMaxLength(4000);
        builder.Property(x => x.Status).HasConversion<string>().HasMaxLength(16).IsRequired();
        builder.Property(x => x.ExternalPostId).HasMaxLength(128);
        builder.Property(x => x.ExternalPermalink).HasMaxLength(512);
        builder.Property(x => x.FailureReason).HasMaxLength(2000);
        builder.Property(x => x.CreatedAtUtc).IsRequired();
        builder.Property(x => x.PublishedAtUtc);

        var comparer = new ValueComparer<IReadOnlyList<string>>(
            (a, b) => (a == null && b == null) || (a != null && b != null && a.SequenceEqual(b)),
            v => v.Aggregate(0, (acc, s) => HashCode.Combine(acc, s.GetHashCode())),
            v => v.ToArray());

        builder.Property(x => x.ImageUrls)
            .HasConversion(
                v => JsonSerializer.Serialize(v, JsonOptions),
                v => string.IsNullOrEmpty(v)
                    ? Array.Empty<string>()
                    : JsonSerializer.Deserialize<List<string>>(v, JsonOptions) ?? new List<string>())
            .Metadata.SetValueComparer(comparer);

        builder.HasIndex(x => x.PageId);
        builder.HasIndex(x => x.ComposerId);
        builder.HasIndex(x => x.CreatedAtUtc);
    }
}
