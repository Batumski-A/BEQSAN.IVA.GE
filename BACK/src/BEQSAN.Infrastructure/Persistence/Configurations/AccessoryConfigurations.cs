using System.Text.Json;
using BEQSAN.Domain.Catalog;
using BEQSAN.Domain.ValueObjects;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BEQSAN.Infrastructure.Persistence.Configurations;

/// <summary>
/// EF Core configurations for the three Step-7 accessory catalog
/// entities. Same JSON-into-TEXT pattern for LocalizedText as the earlier
/// catalogs; enum stored as int for compactness; same slug-unique +
/// active+sort_order index pair.
/// </summary>
internal sealed class HandleStyleConfiguration : IEntityTypeConfiguration<HandleStyle>
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull,
    };

    public void Configure(EntityTypeBuilder<HandleStyle> b)
    {
        b.ToTable("handle_styles");
        b.HasKey(x => x.Id);
        b.Property(x => x.Id).ValueGeneratedNever();

        b.Property(x => x.Slug).HasMaxLength(64).IsRequired();
        b.HasIndex(x => x.Slug).IsUnique();
        b.HasIndex(x => new { x.IsActive, x.SortOrder });

        b.Property(x => x.Name)
            .HasConversion(
                v => JsonSerializer.Serialize(v, JsonOptions),
                v => JsonSerializer.Deserialize<LocalizedText>(v, JsonOptions) ?? new LocalizedText())
            .HasColumnType("TEXT")
            .IsRequired();

        b.Property(x => x.ShortDescription)
            .HasConversion(
                v => JsonSerializer.Serialize(v, JsonOptions),
                v => JsonSerializer.Deserialize<LocalizedText>(v, JsonOptions) ?? new LocalizedText())
            .HasColumnType("TEXT")
            .IsRequired();

        b.Property(x => x.Family).HasMaxLength(16).IsRequired();
        b.Property(x => x.ImageUrl).HasMaxLength(256);
        b.Property(x => x.SurchargePerPaneMinor).IsRequired();
        b.Property(x => x.Currency).HasConversion<string>().HasMaxLength(8).IsRequired();
        b.Property(x => x.SortOrder).IsRequired();
        b.Property(x => x.IsDefault).IsRequired();
        b.Property(x => x.IsActive).IsRequired();
        b.Property(x => x.CreatedAtUtc).IsRequired();
    }
}

internal sealed class LockTypeConfiguration : IEntityTypeConfiguration<LockType>
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull,
    };

    public void Configure(EntityTypeBuilder<LockType> b)
    {
        b.ToTable("lock_types");
        b.HasKey(x => x.Id);
        b.Property(x => x.Id).ValueGeneratedNever();

        b.Property(x => x.Slug).HasMaxLength(64).IsRequired();
        b.HasIndex(x => x.Slug).IsUnique();
        b.HasIndex(x => new { x.IsActive, x.SortOrder });

        b.Property(x => x.Name)
            .HasConversion(
                v => JsonSerializer.Serialize(v, JsonOptions),
                v => JsonSerializer.Deserialize<LocalizedText>(v, JsonOptions) ?? new LocalizedText())
            .HasColumnType("TEXT")
            .IsRequired();

        b.Property(x => x.ShortDescription)
            .HasConversion(
                v => JsonSerializer.Serialize(v, JsonOptions),
                v => JsonSerializer.Deserialize<LocalizedText>(v, JsonOptions) ?? new LocalizedText())
            .HasColumnType("TEXT")
            .IsRequired();

        b.Property(x => x.Grade).HasConversion<int>().IsRequired();
        b.Property(x => x.SecurityRating).IsRequired();
        b.Property(x => x.RequiresCasementOrTurn).IsRequired();
        b.Property(x => x.SurchargePerPaneMinor).IsRequired();
        b.Property(x => x.Currency).HasConversion<string>().HasMaxLength(8).IsRequired();
        b.Property(x => x.SortOrder).IsRequired();
        b.Property(x => x.IsDefault).IsRequired();
        b.Property(x => x.IsActive).IsRequired();
        b.Property(x => x.CreatedAtUtc).IsRequired();
    }
}

internal sealed class BlindTypeConfiguration : IEntityTypeConfiguration<BlindType>
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull,
    };

    public void Configure(EntityTypeBuilder<BlindType> b)
    {
        b.ToTable("blind_types");
        b.HasKey(x => x.Id);
        b.Property(x => x.Id).ValueGeneratedNever();

        b.Property(x => x.Slug).HasMaxLength(64).IsRequired();
        b.HasIndex(x => x.Slug).IsUnique();
        b.HasIndex(x => new { x.IsActive, x.SortOrder });

        b.Property(x => x.Name)
            .HasConversion(
                v => JsonSerializer.Serialize(v, JsonOptions),
                v => JsonSerializer.Deserialize<LocalizedText>(v, JsonOptions) ?? new LocalizedText())
            .HasColumnType("TEXT")
            .IsRequired();

        b.Property(x => x.ShortDescription)
            .HasConversion(
                v => JsonSerializer.Serialize(v, JsonOptions),
                v => JsonSerializer.Deserialize<LocalizedText>(v, JsonOptions) ?? new LocalizedText())
            .HasColumnType("TEXT")
            .IsRequired();

        b.Property(x => x.Placement).HasConversion<int>().IsRequired();
        b.Property(x => x.SupportsElectric).IsRequired();
        b.Property(x => x.BaseMountingMinor).IsRequired();
        b.Property(x => x.SurchargePerSqmMinor).IsRequired();
        b.Property(x => x.Currency).HasConversion<string>().HasMaxLength(8).IsRequired();
        b.Property(x => x.SortOrder).IsRequired();
        b.Property(x => x.IsActive).IsRequired();
        b.Property(x => x.CreatedAtUtc).IsRequired();
    }
}
