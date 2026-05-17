using System.Text.Json;
using BEQSAN.Domain.Catalog;
using BEQSAN.Domain.ValueObjects;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BEQSAN.Infrastructure.Persistence.Configurations;

internal sealed class MaterialConfiguration : IEntityTypeConfiguration<Material>
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull,
    };

    public void Configure(EntityTypeBuilder<Material> builder)
    {
        builder.ToTable("materials");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.Id).ValueGeneratedNever();
        builder.Property(x => x.ProductTypeId).IsRequired();

        builder.HasOne<ProductType>()
            .WithMany()
            .HasForeignKey(x => x.ProductTypeId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Property(x => x.Slug).HasMaxLength(64).IsRequired();
        builder.HasIndex(x => new { x.ProductTypeId, x.Slug }).IsUnique();
        builder.HasIndex(x => new { x.IsActive, x.ProductTypeId, x.SortOrder });

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

        builder.Property(x => x.Family)
            .HasConversion<int>()
            .IsRequired();

        builder.Property(x => x.ThermalRating)
            .HasConversion<int>()
            .IsRequired();

        builder.Property(x => x.BasePricePerSqmMinor).IsRequired();

        builder.Property(x => x.Currency)
            .HasConversion<string>()
            .HasMaxLength(8)
            .IsRequired();

        builder.Property(x => x.SortOrder).IsRequired();
        builder.Property(x => x.IsActive).IsRequired();
        builder.Property(x => x.CreatedAtUtc).IsRequired();
    }
}
