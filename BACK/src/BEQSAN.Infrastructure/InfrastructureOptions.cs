namespace BEQSAN.Infrastructure;

public sealed class StorageOptions
{
    public const string SectionName = "Storage";

    public string LocalRoot { get; set; } = "data/uploads";
}

public sealed class DatabaseOptions
{
    public const string SectionName = "Database";

    public string ConnectionString { get; set; } = "Data Source=data/beqsan.db";
}
