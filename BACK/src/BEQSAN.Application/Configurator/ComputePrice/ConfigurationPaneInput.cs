namespace BEQSAN.Application.Configurator.ComputePrice;

/// <summary>
/// Wire shape for one pane in the price-request body. String-typed enums so
/// the FRONT can author requests by hand and the API doc reads cleanly:
///   openingType: "Fixed" | "Casement" | "Tilt" | "TiltAndTurn" | "Sliding"
///   hingeSide:   "Left"  | "Right" | null
///   glassExtras: ("LowECoating" | "Tempered" | "Frosted" | "Tinted")[]  // distinct
///
/// <para>
/// <see cref="GlassTypeId"/> is optional — when null or <see cref="Guid.Empty"/>
/// the handler resolves the material's default glass package so canaries
/// from earlier slices keep their numbers without forcing the client to
/// know about the new field.
/// </para>
/// <para>
/// <see cref="GlassExtras"/> defaults to an empty list when omitted. Duplicates
/// are de-duped in the calculator; the validator rejects a Frosted + Tinted
/// pair on the same pane (visual conflict).
/// </para>
/// </summary>
public sealed record ConfigurationPaneInput(
    int Position,
    decimal WidthRatio,
    string OpeningType,
    string? HingeSide,
    bool HasMosquitoNet,
    Guid? GlassTypeId = null,
    IReadOnlyList<string>? GlassExtras = null);
