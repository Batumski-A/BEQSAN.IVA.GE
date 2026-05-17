namespace BEQSAN.Application.Configurator.ComputePrice;

/// <summary>
/// Wire shape for /configurator/price. AreaSqm is sent as a string ("1.68")
/// so JS Number precision doesn't bite — same decision the FRONT made for
/// MaterialDto.BasePricePerSqmDisplay. Money is paired (amountMinor + amountDisplay)
/// so the client never does its own currency math.
/// </summary>
public sealed record PriceBreakdownDto(
    string AreaSqm,
    IReadOnlyList<PriceLineDto> Lines,
    long TotalMinor,
    string TotalDisplay,
    string Currency);

public sealed record PriceLineDto(
    string Code,
    string Label,
    long AmountMinor,
    string AmountDisplay,
    string Currency);
