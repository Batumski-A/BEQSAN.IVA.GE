namespace BEQSAN.Domain.Admin;

/// <summary>
/// First-class admin account stored in the database. Replaces the Phase-1
/// env-var single-admin model. The first user created via the setup
/// endpoint becomes the owner; subsequent users are created by the owner
/// through the admin UI (Phase 3).
/// </summary>
public sealed class AdminUser
{
    public Guid Id { get; init; }

    /// <summary>Login handle. Case-insensitive; stored as the user typed it but compared lowercased.</summary>
    public string Username { get; set; } = null!;

    /// <summary>PBKDF2 hash with embedded salt + iterations. See PasswordHasher.</summary>
    public string PasswordHash { get; set; } = null!;

    /// <summary>Display name shown in the admin header. Defaults to Username on creation.</summary>
    public string DisplayName { get; set; } = null!;

    /// <summary>True for the original owner created via /setup. Cannot be revoked.</summary>
    public bool IsOwner { get; init; }

    public DateTime CreatedAtUtc { get; init; }

    public DateTime? LastLoginAtUtc { get; set; }
}
