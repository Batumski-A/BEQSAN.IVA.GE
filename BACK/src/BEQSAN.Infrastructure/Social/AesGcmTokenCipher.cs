using System.Security.Cryptography;
using System.Text;
using BEQSAN.Application.Common.Abstractions;
using BEQSAN.Domain.Social;
using Microsoft.Extensions.Options;

namespace BEQSAN.Infrastructure.Social;

/// <summary>
/// AES-GCM 256 token cipher. Key bytes come from configuration
/// (<c>Social:Encryption:Key</c>) as base64 — generate with
/// <c>openssl rand -base64 32</c>. IV is 12 bytes (GCM standard) and unique per
/// encrypt; cipher is plaintext+16-byte tag concatenated. Reads write only the
/// IV + concatenated body, no key id — rotation is a re-encrypt-everything event,
/// which is acceptable for ~10s of rows.
/// </summary>
internal sealed class AesGcmTokenCipher : ITokenCipher
{
    private const int NonceSize = 12;
    private const int TagSize = 16;
    private readonly byte[] _key;

    public AesGcmTokenCipher(IOptions<SocialOptions> options)
    {
        var keyBase64 = options.Value.Encryption.Key;
        if (string.IsNullOrWhiteSpace(keyBase64))
        {
            throw new InvalidOperationException(
                "Social:Encryption:Key is not configured. Generate with `openssl rand -base64 32` and set it via user-secrets or environment variable.");
        }
        _key = Convert.FromBase64String(keyBase64);
        if (_key.Length != 32)
        {
            throw new InvalidOperationException(
                $"Social:Encryption:Key must decode to 32 bytes (got {_key.Length}). Generate a fresh AES-256 key.");
        }
    }

    public EncryptedToken Encrypt(string plaintext, DateTime expiresAtUtc)
    {
        var nonce = RandomNumberGenerator.GetBytes(NonceSize);
        var plain = Encoding.UTF8.GetBytes(plaintext);
        var cipher = new byte[plain.Length];
        var tag = new byte[TagSize];
        using var aes = new AesGcm(_key, TagSize);
        aes.Encrypt(nonce, plain, cipher, tag);
        var body = new byte[cipher.Length + tag.Length];
        Buffer.BlockCopy(cipher, 0, body, 0, cipher.Length);
        Buffer.BlockCopy(tag, 0, body, cipher.Length, tag.Length);
        return new EncryptedToken(nonce, body, DateTime.SpecifyKind(expiresAtUtc, DateTimeKind.Utc));
    }

    public string Decrypt(EncryptedToken token)
    {
        if (token.Iv.Length != NonceSize)
        {
            throw new CryptographicException($"Invalid nonce length {token.Iv.Length}, expected {NonceSize}.");
        }
        if (token.Cipher.Length < TagSize)
        {
            throw new CryptographicException("Cipher body too short to contain a tag.");
        }
        var cipherLen = token.Cipher.Length - TagSize;
        var cipher = token.Cipher.AsSpan(0, cipherLen);
        var tag = token.Cipher.AsSpan(cipherLen, TagSize);
        var plain = new byte[cipherLen];
        using var aes = new AesGcm(_key, TagSize);
        aes.Decrypt(token.Iv, cipher, tag, plain);
        return Encoding.UTF8.GetString(plain);
    }
}
