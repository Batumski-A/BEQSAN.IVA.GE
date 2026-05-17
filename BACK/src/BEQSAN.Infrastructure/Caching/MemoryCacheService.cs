using BEQSAN.Application.Common.Abstractions;
using Microsoft.Extensions.Caching.Memory;

namespace BEQSAN.Infrastructure.Caching;

internal sealed class MemoryCacheService(IMemoryCache cache) : ICacheService
{
    private static readonly TimeSpan DefaultTtl = TimeSpan.FromMinutes(5);
    private readonly IMemoryCache _cache = cache;

    public Task<T?> GetAsync<T>(string key, CancellationToken ct = default) =>
        Task.FromResult(_cache.TryGetValue<T>(key, out var value) ? value : default);

    public Task SetAsync<T>(string key, T value, TimeSpan? ttl = null, CancellationToken ct = default)
    {
        _cache.Set(key, value, ttl ?? DefaultTtl);
        return Task.CompletedTask;
    }

    public Task RemoveAsync(string key, CancellationToken ct = default)
    {
        _cache.Remove(key);
        return Task.CompletedTask;
    }

    public async Task<T> GetOrCreateAsync<T>(
        string key,
        Func<CancellationToken, Task<T>> factory,
        TimeSpan? ttl = null,
        CancellationToken ct = default)
    {
        if (_cache.TryGetValue<T>(key, out var cached) && cached is not null)
        {
            return cached;
        }

        var value = await factory(ct).ConfigureAwait(false);
        _cache.Set(key, value, ttl ?? DefaultTtl);
        return value;
    }

    public Task<bool> PingAsync(CancellationToken ct = default)
    {
        const string ProbeKey = "health:probe";
        var probeValue = DateTime.UtcNow.Ticks;
        _cache.Set(ProbeKey, probeValue, TimeSpan.FromSeconds(5));
        var found = _cache.TryGetValue<long>(ProbeKey, out var roundTripped) && roundTripped == probeValue;
        _cache.Remove(ProbeKey);
        return Task.FromResult(found);
    }
}
