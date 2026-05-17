using BEQSAN.Application.Catalog.GetMaterialsByProductType;
using BEQSAN.Application.Configurator.ComputePrice;
using BEQSAN.Domain.Catalog;
using BEQSAN.Domain.ValueObjects;
using NSubstitute;

namespace BEQSAN.UnitTests.Configurator;

public class ComputePriceHandlerTests
{
    private static readonly Guid WindowId = Guid.Parse("66242680-01f2-125b-a8db-02681c98c0b9");
    private static readonly Guid DoorId = Guid.Parse("9fc941a2-da7e-d954-a71d-87636cf810d0");
    private static readonly Guid AluminumThermalWindowMatId = Guid.Parse("c70855dc-c79d-5f53-94d1-1edfa11d5114");

    private static Material AluminumThermal(Guid productTypeId, int priceMinor = 38000) =>
        new()
        {
            Id = AluminumThermalWindowMatId,
            ProductTypeId = productTypeId,
            Slug = "aluminum-thermal",
            Name = LocalizedText.Create("ალუმინი თერმო").Value,
            ShortDescription = LocalizedText.Create("...").Value,
            Family = MaterialFamily.Aluminum,
            ThermalRating = ThermalRating.Thermal,
            BasePricePerSqmMinor = priceMinor,
            Currency = Currency.Gel,
            SortOrder = 1,
            IsActive = true,
            CreatedAtUtc = DateTime.UtcNow,
        };

    private static (ComputePriceHandler handler, IMaterialReader materials, IProductTypeExistsCheck exists)
        BuildHandler(bool productTypeExists = true, Material? material = null)
    {
        var materials = Substitute.For<IMaterialReader>();
        materials.GetByIdAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>()).Returns(material);

        var exists = Substitute.For<IProductTypeExistsCheck>();
        exists.ExistsAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>()).Returns(productTypeExists);

        return (new ComputePriceHandler(materials, exists), materials, exists);
    }

    [Fact]
    public async Task Handle_HappyPath_ReturnsBreakdown_With_753_31()
    {
        var (handler, _, _) = BuildHandler(material: AluminumThermal(WindowId));

        var result = await handler.Handle(
            new ComputePriceCommand(WindowId, AluminumThermalWindowMatId, 120, 140),
            CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        var dto = result.Value;
        dto.AreaSqm.Should().Be("1.68");
        dto.TotalMinor.Should().Be(75331L);
        dto.TotalDisplay.Should().Be("753.31");
        dto.Currency.Should().Be("GEL");
        dto.Lines.Should().HaveCount(2);
        dto.Lines[0].Code.Should().Be("material");
        dto.Lines[0].AmountMinor.Should().Be(63840L);
        dto.Lines[0].AmountDisplay.Should().Be("638.40");
        dto.Lines[1].Code.Should().Be("vat");
        dto.Lines[1].AmountMinor.Should().Be(11491L);
        dto.Lines[1].AmountDisplay.Should().Be("114.91");
    }

    [Fact]
    public async Task Handle_ProductTypeMissing_ReturnsProductTypeNotFound()
    {
        var (handler, materials, _) = BuildHandler(productTypeExists: false);

        var result = await handler.Handle(
            new ComputePriceCommand(WindowId, AluminumThermalWindowMatId, 120, 140),
            CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("productType.notFound");
        await materials.DidNotReceiveWithAnyArgs().GetByIdAsync(default, default);
    }

    [Fact]
    public async Task Handle_MaterialMissing_ReturnsMaterialNotFound()
    {
        var (handler, _, _) = BuildHandler(material: null);

        var result = await handler.Handle(
            new ComputePriceCommand(WindowId, AluminumThermalWindowMatId, 120, 140),
            CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("material.notFound");
    }

    [Fact]
    public async Task Handle_MaterialBelongsToDifferentProductType_Returns422()
    {
        // Material says it lives under DoorId; request says WindowId.
        var (handler, _, _) = BuildHandler(material: AluminumThermal(DoorId));

        var result = await handler.Handle(
            new ComputePriceCommand(WindowId, AluminumThermalWindowMatId, 120, 140),
            CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("configurator.material.notInProductType");
        result.Error.Type.Should().Be(BEQSAN.Domain.Common.ErrorType.BusinessRule);
    }

    [Fact]
    public async Task Handle_DimensionsOutOfRange_BubblesValidationFromCalculator()
    {
        var (handler, _, _) = BuildHandler(material: AluminumThermal(WindowId));

        var result = await handler.Handle(
            new ComputePriceCommand(WindowId, AluminumThermalWindowMatId, 10, 140),
            CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("configurator.dimensions.widthOutOfRange");
        result.Error.Field.Should().Be("widthCm");
    }

    [Fact]
    public async Task Handle_InactiveMaterial_ReturnsMaterialNotFound()
    {
        var live = AluminumThermal(WindowId);
        var inactive = new Material
        {
            Id = live.Id,
            ProductTypeId = live.ProductTypeId,
            Slug = live.Slug,
            Name = live.Name,
            ShortDescription = live.ShortDescription,
            Family = live.Family,
            ThermalRating = live.ThermalRating,
            BasePricePerSqmMinor = live.BasePricePerSqmMinor,
            Currency = live.Currency,
            SortOrder = live.SortOrder,
            IsActive = false, // deactivated
            CreatedAtUtc = live.CreatedAtUtc,
        };

        var (handler, _, _) = BuildHandler(material: inactive);
        var result = await handler.Handle(
            new ComputePriceCommand(WindowId, AluminumThermalWindowMatId, 120, 140),
            CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("material.notFound");
    }
}
