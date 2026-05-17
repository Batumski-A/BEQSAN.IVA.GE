using System.Text.Json;
using BEQSAN.Domain.Catalog;
using BEQSAN.Domain.ValueObjects;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BEQSAN.Infrastructure.Persistence.Configurations;

internal sealed class GlassTypeConfiguration : IEntityTypeConfiguration<GlassType>
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull,
    };

    public void Configure(EntityTypeBuilder<GlassType> builder)
    {
        builder.ToTable("glass_types");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.Id).ValueGeneratedNever();

        builder.Property(x => x.Slug).HasMaxLength(64).IsRequired();
        builder.HasIndex(x => x.Slug).IsUnique();
        builder.HasIndex(x => new { x.IsActive, x.SortOrder });

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

        builder.Property(x => x.PaneCount).IsRequired();
        builder.Property(x => x.SurchargePerSqmMinor).IsRequired();

        builder.Property(x => x.Currency)
            .HasConversion<string>()
            .HasMaxLength(8)
            .IsRequired();

        // SQLite stores decimals as TEXT for round-trip fidelity (matches the
        // money handling elsewhere). U-value is small (≤ 10) so this is just
        // about avoiding floating-point drift on read-back.
        builder.Property(x => x.UValue)
            .HasColumnType("TEXT")
            .IsRequired();

        builder.Property(x => x.SortOrder).IsRequired();
        builder.Property(x => x.IsDefault).IsRequired();
        builder.Property(x => x.IsActive).IsRequired();
        builder.Property(x => x.CreatedAtUtc).IsRequired();
    }
}
