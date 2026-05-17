using BEQSAN.Application.Catalog.GetProductTypes;
using BEQSAN.Application.Common.Abstractions;
using BEQSAN.Domain.ValueObjects;
using Microsoft.Extensions.Logging.Abstractions;
using NSubstitute;

namespace BEQSAN.UnitTests.Catalog;

public class GetProductTypesHandlerTests
{
    private static List<ProductTypeDto> SampleDtos() =>
    [
        new ProductTypeDto(
            Id: Guid.Parse("66242680-01f2-125b-a8db-02681c98c0b9"),
            Slug: "window",
            Name: LocalizedText.Create("ფანჯარა").Value,
            ShortDescription: LocalizedText.Create("ფაბრიკული ფანჯრები").Value,
            HeroImageUrl: "/images/catalog/window.jpg",
            SortOrder: 1),
        new ProductTypeDto(
            Id: Guid.Parse("9fc941a2-da7e-d954-a71d-87636cf810d0"),
            Slug: "door",
            Name: LocalizedText.Create("კარი").Value,
            ShortDescription: LocalizedText.Create("შესასვლელი კარები").Value,
            HeroImageUrl: "/images/catalog/door.jpg",
            SortOrder: 2),
    ];

    [Fact]
    public async Task Handle_ReturnsSuccessWithReaderResults()
    {
        var reader = Substitute.For<IProductTypeReader>();
        reader.ListActiveAsync(Arg.Any<CancellationToken>()).Returns(SampleDtos());

        var cache = new PassThroughCache();
        var handler = new GetProductTypesHandler(reader, cache, NullLogger<GetProductTypesHandler>.Instance);

        var result = await handler.Handle(new GetProductTypesQuery(), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Should().HaveCount(2);
        result.Value[0].Slug.Should().Be("window");
        result.Value[0].Name.Ka.Should().Be("ფანჯარა");
        await reader.Received(1).ListActiveAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_SecondCall_HitsCacheAndSkipsReader()
    {
        var reader = Substitute.For<IProductTypeReader>();
        reader.ListActiveAsync(Arg.Any<CancellationToken>()).Returns(SampleDtos());

        var cache = new PassThroughCache();
        var handler = new GetProductTypesHandler(reader, cache, NullLogger<GetProductTypesHandler>.Instance);

        var first = await handler.Handle(new GetProductTypesQuery(), CancellationToken.None);
        var second = await handler.Handle(new GetProductTypesQuery(), CancellationToken.None);

        first.IsSuccess.Should().BeTrue();
        second.IsSuccess.Should().BeTrue();
        await reader.Received(1).ListActiveAsync(Arg.Any<CancellationToken>());
        cache.HitCount.Should().Be(1);
    }

    [Fact]
    public async Task Handle_EmptyReader_ReturnsSuccessWithEmptyList()
    {
        var reader = Substitute.For<IProductTypeReader>();
        reader.ListActiveAsync(Arg.Any<CancellationToken>()).Returns(Array.Empty<ProductTypeDto>());

        var handler = new GetProductTypesHandler(reader, new PassThroughCache(), NullLogger<GetProductTypesHandler>.Instance);
        var result = await handler.Handle(new GetProductTypesQuery(), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Should().BeEmpty();
    }

    /// <summary>
    /// Minimal ICacheService that actually caches in a Dictionary — enough to
    /// exercise the GetOrCreateAsync hit/miss path without depending on
    /// MemoryCacheService's TTL machinery.
    /// </summary>
    private sealed class PassThroughCache : ICacheService
    {
        private readonly Dictionary<string, object?> _store = new(StringComparer.Ordinal);

        public int HitCount { get; private set; }

        public Task<T?> GetAsync<T>(string key, CancellationToken ct = default) =>
            Task.FromResult(_store.TryGetValue(key, out var v) ? (T?)v : default);

        public Task SetAsync<T>(string key, T value, TimeSpan? ttl = null, CancellationToken ct = default)
        {
            _store[key] = value;
            return Task.CompletedTask;
        }

        public Task RemoveAsync(string key, CancellationToken ct = default)
        {
            _store.Remove(key);
            return Task.CompletedTask;
        }

        public async Task<T> GetOrCreateAsync<T>(
            string key,
            Func<CancellationToken, Task<T>> factory,
            TimeSpan? ttl = null,
            CancellationToken ct = default)
        {
            if (_store.TryGetValue(key, out var existing) && existing is T cached)
            {
                HitCount++;
                return cached;
            }

            var fresh = await factory(ct);
            _store[key] = fresh;
            return fresh;
        }

        public Task<bool> PingAsync(CancellationToken ct = default) => Task.FromResult(true);
    }
}
