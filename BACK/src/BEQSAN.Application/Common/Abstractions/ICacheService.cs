namespace BEQSAN.Application.Common.Abstractions;

public interface ICacheService
{
    Task<T?> GetAsync<T>(string key, CancellationToken ct = default);

    Task SetAsync<T>(string key, T value, TimeSpan? ttl = null, CancellationToken ct = default);

    Task RemoveAsync(string key, CancellationToken ct = default);

    Task<T> GetOrCreateAsync<T>(
        string key,
        Func<CancellationToken, Task<T>> factory,
        TimeSpan? ttl = null,
        CancellationToken ct = default);

    /// <summary>
    /// Round-trips a tiny value (set + get + remove) under a reserved key to verify
    /// the cache backend is alive. Used by the /health probe. Returns true on success,
    /// false if any step fails or returns an unexpected value.
    /// </summary>
    Task<bool> PingAsync(CancellationToken ct = default);
}
