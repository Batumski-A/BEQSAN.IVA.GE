namespace BEQSAN.Domain.Social;

/// <summary>
/// Symmetric-encrypted token at rest. Keep <see cref="Iv"/> + <see cref="Cipher"/>
/// together — the cipher is meaningless without its IV. Plaintext is never stored
/// nor logged; decryption happens at the edge of the Meta HTTP call site only.
/// </summary>
public sealed record EncryptedToken(byte[] Iv, byte[] Cipher, DateTime ExpiresAtUtc)
{
    public bool IsExpiring(TimeSpan headroom) => DateTime.UtcNow + headroom >= ExpiresAtUtc;
    public bool IsExpired() => DateTime.UtcNow >= ExpiresAtUtc;
}
