namespace BEQSAN.Application.Common.Abstractions;

public interface IStorageService
{
    Task<string> SaveAsync(Stream content, string fileName, string contentType, CancellationToken ct = default);

    Task<Stream?> OpenReadAsync(string storageKey, CancellationToken ct = default);

    Task<bool> DeleteAsync(string storageKey, CancellationToken ct = default);

    Task<bool> ExistsAsync(string storageKey, CancellationToken ct = default);

    /// <summary>
    /// Writes a tiny probe file under a reserved key, reads it back, and deletes it.
    /// Used by the /health probe to verify the storage backend is writable.
    /// Returns true on success, false if any step fails.
    /// </summary>
    Task<bool> PingAsync(CancellationToken ct = default);
}
