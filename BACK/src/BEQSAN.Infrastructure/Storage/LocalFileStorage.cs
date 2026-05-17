using BEQSAN.Application.Common.Abstractions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace BEQSAN.Infrastructure.Storage;

internal sealed class LocalFileStorage(
    IOptions<StorageOptions> options,
    ILogger<LocalFileStorage> logger) : IStorageService
{
    private readonly StorageOptions _options = options.Value;
    private readonly ILogger<LocalFileStorage> _logger = logger;

    public async Task<string> SaveAsync(
        Stream content,
        string fileName,
        string contentType,
        CancellationToken ct = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(fileName);

        var safeName = SanitizeFileName(fileName);
        var datedFolder = DateTime.UtcNow.ToString("yyyy/MM/dd", System.Globalization.CultureInfo.InvariantCulture);
        var relativePath = Path.Combine(datedFolder, $"{Guid.NewGuid():N}_{safeName}");
        var absolutePath = Path.Combine(GetRootAbsolute(), relativePath);

        Directory.CreateDirectory(Path.GetDirectoryName(absolutePath)!);

        await using var fileStream = File.Create(absolutePath);
        await content.CopyToAsync(fileStream, ct).ConfigureAwait(false);

        _logger.LogInformation("Stored upload {RelativePath} ({ContentType})", relativePath, contentType);

        return relativePath.Replace('\\', '/');
    }

    public Task<Stream?> OpenReadAsync(string storageKey, CancellationToken ct = default)
    {
        var absolute = ResolveAbsolute(storageKey);
        if (!File.Exists(absolute))
        {
            return Task.FromResult<Stream?>(null);
        }

        Stream stream = File.OpenRead(absolute);
        return Task.FromResult<Stream?>(stream);
    }

    public Task<bool> DeleteAsync(string storageKey, CancellationToken ct = default)
    {
        var absolute = ResolveAbsolute(storageKey);
        if (!File.Exists(absolute))
        {
            return Task.FromResult(false);
        }

        File.Delete(absolute);
        return Task.FromResult(true);
    }

    public Task<bool> ExistsAsync(string storageKey, CancellationToken ct = default) =>
        Task.FromResult(File.Exists(ResolveAbsolute(storageKey)));

    private string GetRootAbsolute() =>
        Path.IsPathRooted(_options.LocalRoot)
            ? _options.LocalRoot
            : Path.Combine(Directory.GetCurrentDirectory(), _options.LocalRoot);

    private string ResolveAbsolute(string storageKey)
    {
        var root = GetRootAbsolute();
        var combined = Path.GetFullPath(Path.Combine(root, storageKey.Replace('/', Path.DirectorySeparatorChar)));

        // Defense-in-depth: don't let a crafted key escape the storage root.
        if (!combined.StartsWith(root, StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Storage key escapes configured root.");
        }

        return combined;
    }

    private static string SanitizeFileName(string fileName)
    {
        var invalid = Path.GetInvalidFileNameChars();
        var sb = new System.Text.StringBuilder(fileName.Length);
        foreach (var c in fileName)
        {
            sb.Append(Array.IndexOf(invalid, c) >= 0 ? '_' : c);
        }

        return sb.ToString();
    }
}
