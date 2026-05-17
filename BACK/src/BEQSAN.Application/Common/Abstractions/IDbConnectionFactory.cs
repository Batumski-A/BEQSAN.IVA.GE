using System.Data;

namespace BEQSAN.Application.Common.Abstractions;

public interface IDbConnectionFactory
{
    Task<IDbConnection> OpenAsync(CancellationToken ct = default);
}
