using BEQSAN.Domain.Social;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BEQSAN.Infrastructure.Persistence.Configurations;

internal sealed class InboxThreadConfiguration : IEntityTypeConfiguration<InboxThread>
{
    public void Configure(EntityTypeBuilder<InboxThread> builder)
    {
        builder.ToTable("inbox_threads");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).ValueGeneratedNever();
        builder.Property(x => x.PageId).IsRequired();
        builder.Property(x => x.Channel).HasConversion<string>().HasMaxLength(24).IsRequired();
        builder.Property(x => x.ExternalThreadId).IsRequired().HasMaxLength(256);
        builder.Property(x => x.ParticipantId).IsRequired().HasMaxLength(128);
        builder.Property(x => x.ParticipantName).HasMaxLength(256);
        builder.Property(x => x.LastMessagePreview).HasMaxLength(256);
        builder.Property(x => x.LastMessageAtUtc).IsRequired();
        builder.Property(x => x.HasUnread).IsRequired();
        builder.Property(x => x.CreatedAtUtc).IsRequired();

        builder.HasIndex(x => new { x.PageId, x.ExternalThreadId }).IsUnique();
        builder.HasIndex(x => new { x.PageId, x.LastMessageAtUtc });
    }
}

internal sealed class InboxMessageConfiguration : IEntityTypeConfiguration<InboxMessage>
{
    public void Configure(EntityTypeBuilder<InboxMessage> builder)
    {
        builder.ToTable("inbox_messages");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).ValueGeneratedNever();
        builder.Property(x => x.ThreadId).IsRequired();
        builder.Property(x => x.PageId).IsRequired();
        builder.Property(x => x.ExternalMessageId).IsRequired().HasMaxLength(256);
        builder.Property(x => x.Direction).HasConversion<string>().HasMaxLength(16).IsRequired();
        builder.Property(x => x.AuthorId).IsRequired().HasMaxLength(128);
        builder.Property(x => x.AuthorName).HasMaxLength(256);
        builder.Property(x => x.Text).IsRequired().HasMaxLength(8000);
        builder.Property(x => x.AttachmentUrl).HasMaxLength(1024);
        builder.Property(x => x.AtUtc).IsRequired();
        builder.Property(x => x.CreatedAtUtc).IsRequired();

        builder.HasIndex(x => x.ExternalMessageId).IsUnique();
        builder.HasIndex(x => new { x.ThreadId, x.AtUtc });
    }
}
