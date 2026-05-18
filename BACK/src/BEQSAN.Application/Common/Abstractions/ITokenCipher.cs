using BEQSAN.Domain.Social;

namespace BEQSAN.Application.Common.Abstractions;

/// <summary>
/// Symmetric encrypt/decrypt for Meta access tokens. Application handlers stay
/// PlainOldDotNet — they hand the cipher a string and a TTL, get back an
/// <see cref="EncryptedToken"/> they can persist. Implementation lives in
/// Infrastructure and binds an AES-GCM key from configuration.
/// </summary>
public interface ITokenCipher
{
    EncryptedToken Encrypt(string plaintext, DateTime expiresAtUtc);
    string Decrypt(EncryptedToken token);
}
