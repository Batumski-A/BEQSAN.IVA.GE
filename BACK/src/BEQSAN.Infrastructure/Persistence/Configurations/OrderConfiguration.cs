using BEQSAN.Domain.Orders;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BEQSAN.Infrastructure.Persistence.Configurations;

internal sealed class OrderConfiguration : IEntityTypeConfiguration<Order>
{
    public void Configure(EntityTypeBuilder<Order> builder)
    {
        builder.ToTable("orders");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.Id).ValueGeneratedNever();

        builder.Property(x => x.OrderNumber).HasMaxLength(32).IsRequired();
        builder.HasIndex(x => x.OrderNumber).IsUnique();

        builder.Property(x => x.CustomerName).HasMaxLength(128).IsRequired();
        builder.Property(x => x.CustomerPhone).HasMaxLength(20).IsRequired();
        builder.Property(x => x.CustomerEmail).HasMaxLength(254);
        builder.Property(x => x.CustomerAddress).HasMaxLength(512);
        builder.Property(x => x.Notes).HasMaxLength(2000);

        builder.Property(x => x.ConfigurationJson)
            .HasColumnType("TEXT")
            .IsRequired();

        builder.Property(x => x.TotalPriceMinor).IsRequired();
        builder.Property(x => x.Currency).HasConversion<string>().HasMaxLength(8).IsRequired();
        builder.Property(x => x.Status).HasConversion<int>().IsRequired();

        builder.Property(x => x.StatusHistoryJson)
            .HasColumnType("TEXT")
            .IsRequired();

        builder.Property(x => x.CreatedAtUtc).IsRequired();
        builder.Property(x => x.UpdatedAtUtc).IsRequired();

        builder.HasIndex(x => x.Status);
        builder.HasIndex(x => x.CreatedAtUtc);
        builder.HasIndex(x => x.CustomerPhone);
    }
}
