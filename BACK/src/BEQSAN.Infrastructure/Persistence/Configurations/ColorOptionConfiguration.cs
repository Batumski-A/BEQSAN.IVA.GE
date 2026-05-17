using System.Text.Json;
using BEQSAN.Domain.Catalog;
using BEQSAN.Domain.ValueObjects;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BEQSAN.Infrastructure.Persistence.Configurations;

internal sealed class ColorOptionConfiguration : IEntityTypeConfiguration<ColorOption>
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull,
    };

    public void Configure(EntityTypeBuilder<ColorOption> builder)
    {
        builder.ToTable("color_options");
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

        builder.Property(x => x.Family)
            .HasConversion<int>()
            .IsRequired();

        builder.Property(x => x.HexCode).HasMaxLength(7).IsRequired();
        builder.Property(x => x.RalCode).HasMaxLength(16);
        builder.Property(x => x.WoodTextureUrl).HasMaxLength(256);

        builder.Property(x => x.SurchargeMinor).IsRequired();

        builder.Property(x => x.Currency)
            .HasConversion<string>()
            .HasMaxLength(8)
            .IsRequired();

        builder.Property(x => x.SortOrder).IsRequired();
        builder.Property(x => x.IsDefault).IsRequired();
        builder.Property(x => x.IsActive).IsRequired();
        builder.Property(x => x.CreatedAtUtc).IsRequired();
    }
}
