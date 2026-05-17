using System.Text.Json;
using BEQSAN.Domain.Catalog;
using BEQSAN.Domain.ValueObjects;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BEQSAN.Infrastructure.Persistence.Configurations;

internal sealed class ProductTypeConfiguration : IEntityTypeConfiguration<ProductType>
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull,
    };

    public void Configure(EntityTypeBuilder<ProductType> builder)
    {
        builder.ToTable("product_types");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.Id).ValueGeneratedNever();

        builder.Property(x => x.Slug)
            .HasMaxLength(64)
            .IsRequired();

        builder.HasIndex(x => x.Slug).IsUnique();

        builder.Property(x => x.Name)
            .HasConversion(
                v => JsonSerializer.Serialize(v, JsonOptions),
                v => JsonSerializer.Deserialize<LocalizedText>(v, JsonOptions) ?? new LocalizedText())
            .HasColumnType("TEXT")
            .IsRequired();

        builder.Property(x => x.ShortDescription)
            .HasConversion(
                v => JsonSerializer.Serialize(v, JsonOptions),
                v => JsonSerializer.Deserialize<LocalizedText>(v, JsonOptions) ?? new LocalizedText())
            .HasColumnType("TEXT")
            .IsRequired();

        builder.Property(x => x.HeroImageUrl).HasMaxLength(512);

        builder.Property(x => x.SortOrder).IsRequired();
        builder.Property(x => x.IsActive).IsRequired();
        builder.Property(x => x.CreatedAtUtc).IsRequired();

        builder.Property(x => x.MinWidthCm).IsRequired().HasDefaultValue(30);
        builder.Property(x => x.MaxWidthCm).IsRequired().HasDefaultValue(400);
        builder.Property(x => x.MinHeightCm).IsRequired().HasDefaultValue(30);
        builder.Property(x => x.MaxHeightCm).IsRequired().HasDefaultValue(400);

        builder.HasIndex(x => new { x.IsActive, x.SortOrder });
    }
}
