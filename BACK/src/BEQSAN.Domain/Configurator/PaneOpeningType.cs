namespace BEQSAN.Domain.Configurator;

/// <summary>
/// How a single pane opens. Surcharge rates baked into <see cref="PriceCalculator"/> —
/// admin-editable per-product-type pricing matrix is Phase 2 territory.
/// </summary>
public enum PaneOpeningType
{
    /// <summary>ყრუ — fixed glass, no opening mechanism. No surcharge.</summary>
    Fixed = 0,

    /// <summary>გასაღები — single-axis swing (casement). +8%.</summary>
    Casement = 1,

    /// <summary>დასაკეცი — top-pivot tilt. +10%.</summary>
    Tilt = 2,

    /// <summary>გასაღები + დასაკეცი — combined casement + tilt. +18%.</summary>
    TiltAndTurn = 3,

    /// <summary>სლაიდინგი — horizontal slider. +12%. Only valid for sliding/balcony product types.</summary>
    Sliding = 4,
}

public enum HingeSide
{
    Left = 0,
    Right = 1,
}
