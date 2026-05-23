namespace BEQSAN.Application.Configurator.ComputePrice;

/// <summary>
/// Wire shape for the configurator's Step-8 installation decision. Region
/// is a camelCase string that the handler parses defensively with
/// <c>Enum.TryParse&lt;InstallationRegion&gt;</c>; invalid tokens flow back
/// as a structured <c>configurator.installation.regionInvalid</c> error
/// with metadata.got.
/// </summary>
public sealed record InstallationOptionInput(
    string Region,
    string? CityHint = null,
    bool Dismantling = false,
    string? DwellingType = null,
    int Floor = 1,
    bool HasElevator = false);
