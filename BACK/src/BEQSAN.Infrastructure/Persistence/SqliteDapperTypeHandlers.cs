using System.Data;
using System.Globalization;
using Dapper;

namespace BEQSAN.Infrastructure.Persistence;

/// <summary>
/// SQLite stores GUIDs and DateTimes as TEXT — Dapper's default mapping
/// (System.Convert) refuses those casts. Register these handlers once at
/// startup so column types match property types across every Dapper query.
/// </summary>
internal static class SqliteDapperTypeHandlers
{
    private static bool _registered;
    private static readonly object RegistrationLock = new();

    public static void Register()
    {
        if (_registered)
        {
            return;
        }

        lock (RegistrationLock)
        {
            if (_registered)
            {
                return;
            }

            SqlMapper.RemoveTypeMap(typeof(Guid));
            SqlMapper.RemoveTypeMap(typeof(Guid?));
            SqlMapper.AddTypeHandler(new GuidHandler());
            SqlMapper.AddTypeHandler(new NullableGuidHandler());

            SqlMapper.RemoveTypeMap(typeof(DateTime));
            SqlMapper.RemoveTypeMap(typeof(DateTime?));
            SqlMapper.AddTypeHandler(new DateTimeHandler());
            SqlMapper.AddTypeHandler(new NullableDateTimeHandler());

            _registered = true;
        }
    }

    private sealed class GuidHandler : SqlMapper.TypeHandler<Guid>
    {
        public override Guid Parse(object value) =>
            value switch
            {
                Guid g => g,
                string s => Guid.Parse(s, CultureInfo.InvariantCulture),
                _ => throw new InvalidCastException($"Cannot convert {value?.GetType().Name ?? "null"} to Guid."),
            };

        public override void SetValue(IDbDataParameter parameter, Guid value) =>
            parameter.Value = value.ToString();
    }

    private sealed class NullableGuidHandler : SqlMapper.TypeHandler<Guid?>
    {
        public override Guid? Parse(object value) =>
            value switch
            {
                null => null,
                DBNull => null,
                Guid g => g,
                string s when string.IsNullOrEmpty(s) => null,
                string s => Guid.Parse(s, CultureInfo.InvariantCulture),
                _ => throw new InvalidCastException($"Cannot convert {value.GetType().Name} to Guid?."),
            };

        public override void SetValue(IDbDataParameter parameter, Guid? value) =>
            parameter.Value = value?.ToString() ?? (object)DBNull.Value;
    }

    private sealed class DateTimeHandler : SqlMapper.TypeHandler<DateTime>
    {
        public override DateTime Parse(object value) =>
            value switch
            {
                DateTime dt => DateTime.SpecifyKind(dt, DateTimeKind.Utc),
                string s => DateTime.SpecifyKind(
                    DateTime.Parse(s, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal),
                    DateTimeKind.Utc),
                _ => throw new InvalidCastException($"Cannot convert {value?.GetType().Name ?? "null"} to DateTime."),
            };

        public override void SetValue(IDbDataParameter parameter, DateTime value) =>
            parameter.Value = value.ToString("o", CultureInfo.InvariantCulture);
    }

    private sealed class NullableDateTimeHandler : SqlMapper.TypeHandler<DateTime?>
    {
        public override DateTime? Parse(object value) =>
            value switch
            {
                null => null,
                DBNull => null,
                DateTime dt => DateTime.SpecifyKind(dt, DateTimeKind.Utc),
                string s when string.IsNullOrEmpty(s) => null,
                string s => DateTime.SpecifyKind(
                    DateTime.Parse(s, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal),
                    DateTimeKind.Utc),
                _ => throw new InvalidCastException($"Cannot convert {value.GetType().Name} to DateTime?."),
            };

        public override void SetValue(IDbDataParameter parameter, DateTime? value) =>
            parameter.Value = value?.ToString("o", CultureInfo.InvariantCulture) ?? (object)DBNull.Value;
    }
}
