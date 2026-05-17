using BEQSAN.Application.Catalog.GetMaterialsByProductType;
using BEQSAN.Application.Common.Abstractions;
using BEQSAN.Domain.ValueObjects;
using Microsoft.Extensions.Logging.Abstractions;
using NSubstitute;

namespace BEQSAN.UnitTests.Catalog;

public class GetMaterialsByProductTypeHandlerTests
{
    private static readonly Guid WindowId = Guid.Parse("66242680-01f2-125b-a8db-02681c98c0b9");

    private static List<MaterialDto> SampleMaterials() =>
    [
        new MaterialDto(
            Id: Guid.Parse("c70855dc-c79d-5f53-94d1-1edfa11d5114"),
            ProductTypeId: WindowId,
            Slug: "aluminum-thermal",
            Name: LocalizedText.Create("ალუმინი თერმო").Value,
            ShortDescription: LocalizedText.Create("...").Value,
            Family: "aluminum",
            ThermalRating: "thermal",
            BasePricePerSqmMinor: 38000L,
            BasePricePerSqmDisplay: "380.00",
            Currency: "Gel",
            SortOrder: 1),
    ];

    private static GetMaterialsByProductTypeHandler MakeHandler(
        IMaterialReader reader,
        IProductTypeExistsCheck existsCheck,
        ICacheService cache) =>
        new(reader, existsCheck, cache, NullLogger<GetMaterialsByProductTypeHandler>.Instance);

    [Fact]
    public async Task Handle_ProductTypeExists_ReturnsReaderResult()
    {
        var reader = Substitute.For<IMaterialReader>();
        reader.ListActiveByProductTypeAsync(WindowId, Arg.Any<CancellationToken>())
            .Returns(SampleMaterials());

        var exists = Substitute.For<IProductTypeExistsCheck>();
        exists.ExistsAsync(WindowId, Arg.Any<CancellationToken>()).Returns(true);

        var handler = MakeHandler(reader, exists, new PassThroughCache());
        var result = await handler.Handle(new GetMaterialsByProductTypeQuery(WindowId), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Should().ContainSingle()
            .Which.Slug.Should().Be("aluminum-thermal");
    }

    [Fact]
    public async Task Handle_ProductTypeMissing_ReturnsNotFound_AndSkipsReader()
    {
        var reader = Substitute.For<IMaterialReader>();
        var exists = Substitute.For<IProductTypeExistsCheck>();
        exists.ExistsAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>()).Returns(false);

        var handler = MakeHandler(reader, exists, new PassThroughCache());
        var result = await handler.Handle(new GetMaterialsByProductTypeQuery(WindowId), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("productType.notFound");
        await reader.DidNotReceiveWithAnyArgs().ListActiveByProductTypeAsync(default, default);
    }

    [Fact]
    public async Task Handle_SecondCall_HitsCacheAndSkipsReader()
    {
        var reader = Substitute.For<IMaterialReader>();
        reader.ListActiveByProductTypeAsync(WindowId, Arg.Any<CancellationToken>())
            .Returns(SampleMaterials());

        var exists = Substitute.For<IProductTypeExistsCheck>();
        exists.ExistsAsync(WindowId, Arg.Any<CancellationToken>()).Returns(true);

        var cache = new PassThroughCache();
        var handler = MakeHandler(reader, exists, cache);

        await handler.Handle(new GetMaterialsByProductTypeQuery(WindowId), CancellationToken.None);
        await handler.Handle(new GetMaterialsByProductTypeQuery(WindowId), CancellationToken.None);

        await reader.Received(1).ListActiveByProductTypeAsync(WindowId, Arg.Any<CancellationToken>());
        cache.HitCount.Should().Be(1);
    }

    [Fact]
    public async Task Handle_EmptyResult_ReturnsSuccessWithEmptyList()
    {
        var reader = Substitute.For<IMaterialReader>();
        reader.ListActiveByProductTypeAsync(WindowId, Arg.Any<CancellationToken>())
            .Returns(Array.Empty<MaterialDto>());

        var exists = Substitute.For<IProductTypeExistsCheck>();
        exists.ExistsAsync(WindowId, Arg.Any<CancellationToken>()).Returns(true);

        var handler = MakeHandler(reader, exists, new PassThroughCache());
        var result = await handler.Handle(new GetMaterialsByProductTypeQuery(WindowId), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Should().BeEmpty();
    }

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

        public async Task<T> GetOrCreateAsync<T>(string key, Func<CancellationToken, Task<T>> factory, TimeSpan? ttl = null, CancellationToken ct = default)
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
