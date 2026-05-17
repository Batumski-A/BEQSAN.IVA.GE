using BEQSAN.Application.Catalog.GetMaterialsByProductType;
using BEQSAN.Application.Catalog.GetProductTypes;
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

    private static ProductType MakePt(Guid id, string slug, bool isActive = true)
    {
        var c = DimensionConstraints.ForProductType(slug);
        return new ProductType
        {
            Id = id,
            Slug = slug,
            Name = LocalizedText.Create(slug).Value,
            ShortDescription = LocalizedText.Create("...").Value,
            HeroImageUrl = string.Empty,
            SortOrder = 1,
            IsActive = isActive,
            CreatedAtUtc = DateTime.UtcNow,
            MinWidthCm = c.MinWidthCm,
            MaxWidthCm = c.MaxWidthCm,
            MinHeightCm = c.MinHeightCm,
            MaxHeightCm = c.MaxHeightCm,
        };
    }

    private static Material AluminumThermal(Guid productTypeId, int priceMinor = 38000, bool isActive = true) =>
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
            IsActive = isActive,
            CreatedAtUtc = DateTime.UtcNow,
        };

    private static (ComputePriceHandler handler, IProductTypeReader productTypes, IMaterialReader materials)
        BuildHandler(ProductType? productType, Material? material)
    {
        var productTypes = Substitute.For<IProductTypeReader>();
        productTypes.GetByIdAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>()).Returns(productType);

        var materials = Substitute.For<IMaterialReader>();
        materials.GetByIdAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>()).Returns(material);

        return (new ComputePriceHandler(productTypes, materials), productTypes, materials);
    }

    [Fact]
    public async Task Handle_HappyPath_ReturnsBreakdown_With_753_31()
    {
        var (handler, _, _) = BuildHandler(
            MakePt(WindowId, "window"),
            AluminumThermal(WindowId));

        var result = await handler.Handle(
            new ComputePriceCommand(WindowId, AluminumThermalWindowMatId, 120, 140),
            CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        var dto = result.Value;
        dto.AreaSqm.Should().Be("1.68");
        dto.TotalMinor.Should().Be(75331L);
        dto.TotalDisplay.Should().Be("753.31");
        dto.Currency.Should().Be("GEL");
    }

    [Fact]
    public async Task Handle_Door_80x210_DoorThermal_Matches_832_61()
    {
        // ADR-0002 second regression canary.
        var (handler, _, _) = BuildHandler(
            MakePt(DoorId, "door"),
            AluminumThermal(DoorId, priceMinor: 42000));

        var result = await handler.Handle(
            new ComputePriceCommand(DoorId, AluminumThermalWindowMatId, 80, 210),
            CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.TotalDisplay.Should().Be("832.61");
        result.Value.TotalMinor.Should().Be(83261L);
    }

    [Fact]
    public async Task Handle_ProductTypeMissing_ReturnsProductTypeNotFound()
    {
        var (handler, _, _) = BuildHandler(productType: null, material: AluminumThermal(WindowId));

        var result = await handler.Handle(
            new ComputePriceCommand(WindowId, AluminumThermalWindowMatId, 120, 140),
            CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("productType.notFound");
    }

    [Fact]
    public async Task Handle_MaterialMissing_ReturnsMaterialNotFound()
    {
        var (handler, _, _) = BuildHandler(MakePt(WindowId, "window"), material: null);

        var result = await handler.Handle(
            new ComputePriceCommand(WindowId, AluminumThermalWindowMatId, 120, 140),
            CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("material.notFound");
    }

    [Fact]
    public async Task Handle_MaterialBelongsToDifferentProductType_Returns422()
    {
        // Request says Window; material claims DoorId.
        var (handler, _, _) = BuildHandler(
            MakePt(WindowId, "window"),
            AluminumThermal(DoorId));

        var result = await handler.Handle(
            new ComputePriceCommand(WindowId, AluminumThermalWindowMatId, 120, 140),
            CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("configurator.material.notInProductType");
        result.Error.Type.Should().Be(BEQSAN.Domain.Common.ErrorType.BusinessRule);
    }

    [Fact]
    public async Task Handle_DimensionsOutOfRange_BubblesValidationFromCalculator_WithMetadata()
    {
        // Door min width is 60; 30 is below.
        var (handler, _, _) = BuildHandler(
            MakePt(DoorId, "door"),
            AluminumThermal(DoorId, priceMinor: 42000));

        var result = await handler.Handle(
            new ComputePriceCommand(DoorId, AluminumThermalWindowMatId, 30, 210),
            CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("configurator.dimensions.widthOutOfRange");
        result.Error.Field.Should().Be("widthCm");
        result.Error.Metadata.Should().NotBeNull();
        result.Error.Metadata!["min"].Should().Be(60);
        result.Error.Metadata["max"].Should().Be(140);
        result.Error.Metadata["actual"].Should().Be(30);
    }

    [Fact]
    public async Task Handle_InactiveMaterial_ReturnsMaterialNotFound()
    {
        var (handler, _, _) = BuildHandler(
            MakePt(WindowId, "window"),
            AluminumThermal(WindowId, isActive: false));

        var result = await handler.Handle(
            new ComputePriceCommand(WindowId, AluminumThermalWindowMatId, 120, 140),
            CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("material.notFound");
    }

    [Fact]
    public async Task Handle_InactiveProductType_ReturnsProductTypeNotFound()
    {
        var (handler, _, _) = BuildHandler(
            MakePt(WindowId, "window", isActive: false),
            AluminumThermal(WindowId));

        var result = await handler.Handle(
            new ComputePriceCommand(WindowId, AluminumThermalWindowMatId, 120, 140),
            CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("productType.notFound");
    }
}
