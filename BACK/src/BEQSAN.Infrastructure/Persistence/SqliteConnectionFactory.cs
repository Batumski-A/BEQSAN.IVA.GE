using System.Data;
using BEQSAN.Application.Common.Abstractions;
using Microsoft.Data.Sqlite;
using Microsoft.Extensions.Options;

namespace BEQSAN.Infrastructure.Persistence;

internal sealed class SqliteConnectionFactory(IOptions<DatabaseOptions> options) : IDbConnectionFactory
{
    private readonly DatabaseOptions _options = options.Value;

    public async Task<IDbConnection> OpenAsync(CancellationToken ct = default)
    {
        var connection = new SqliteConnection(_options.ConnectionString);
        await connection.OpenAsync(ct).ConfigureAwait(false);

        await using var pragma = connection.CreateCommand();
        pragma.CommandText = "PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;";
        await pragma.ExecuteNonQueryAsync(ct).ConfigureAwait(false);

        return connection;
    }
}
