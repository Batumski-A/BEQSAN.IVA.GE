namespace BEQSAN.Domain.Configurator;

/// <summary>
/// One line in a price breakdown. Code is machine-readable English
/// (matches docs/api/result-envelope.md code taxonomy: "material", "vat",
/// "glass", "color", "accessories"); label is Georgian for direct display.
/// AmountMinor is tetri/cents — never decimal in storage or transport.
/// </summary>
public sealed record PriceLine(string Code, string Label, long AmountMinor);
