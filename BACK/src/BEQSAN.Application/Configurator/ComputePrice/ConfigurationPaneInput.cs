namespace BEQSAN.Application.Configurator.ComputePrice;

/// <summary>
/// Wire shape for one pane in the price-request body. String-typed enums so
/// the FRONT can author requests by hand and the API doc reads cleanly:
///   openingType: "Fixed" | "Casement" | "Tilt" | "TiltAndTurn" | "Sliding"
///   hingeSide:   "Left"  | "Right" | null
/// </summary>
public sealed record ConfigurationPaneInput(
    int Position,
    decimal WidthRatio,
    string OpeningType,
    string? HingeSide,
    bool HasMosquitoNet);
