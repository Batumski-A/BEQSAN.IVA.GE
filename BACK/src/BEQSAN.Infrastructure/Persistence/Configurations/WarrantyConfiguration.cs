using BEQSAN.Domain.Warranties;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BEQSAN.Infrastructure.Persistence.Configurations;

internal sealed class WarrantyConfiguration : IEntityTypeConfiguration<Warranty>
{
    public void Configure(EntityTypeBuilder<Warranty> builder)
    {
        builder.ToTable("warranties");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.Id).ValueGeneratedNever();
        builder.Property(x => x.OrderId).IsRequired();
        builder.HasIndex(x => x.OrderId).IsUnique();

        builder.Property(x => x.OrderNumber).HasMaxLength(32).IsRequired();
        builder.Property(x => x.CustomerName).HasMaxLength(128).IsRequired();
        builder.Property(x => x.CustomerPhone).HasMaxLength(20).IsRequired();

        builder.Property(x => x.DurationMonths).IsRequired();
        builder.Property(x => x.StartDateUtc).IsRequired();
        builder.Property(x => x.EndDateUtc).IsRequired();

        builder.Property(x => x.Status).HasConversion<int>().IsRequired();
        builder.Property(x => x.Notes).HasMaxLength(2000);

        builder.Property(x => x.CreatedAtUtc).IsRequired();
        builder.Property(x => x.UpdatedAtUtc).IsRequired();

        builder.HasIndex(x => x.Status);
        builder.HasIndex(x => x.EndDateUtc);
        builder.HasIndex(x => x.CustomerPhone);
    }
}
