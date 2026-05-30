# Database Migrations

NexaSphere uses a multi-stack architecture with three database backends, each with its own migration system.

## Migration Systems

### Node.js Server (`server/migrations/`)

- **Tool**: Node-pg-migrate
- **Database**: PostgreSQL
- **Config**: `server/.postgres_migrations_config.json`

| Migration | Description |
|-----------|-------------|
| `1705945200000_create-initial-schema.js` | Baseline schema for admin sessions, events, core team, form submissions, and recommendation engine tables |
| `1705945201000_seed-recommendation-data.js` | Seed data for collaborative filtering recommendation system |
| `1705945202000_canonicalize-portfolio-usernames.js` | Canonicalize portfolio username format |

### Java Server (`server-java/src/main/resources/db/migration/`)

- **Tool**: Flyway
- **Database**: PostgreSQL / H2 (dev fallback)
- **Config**: `application.properties`

| Migration | Description |
|-----------|-------------|
| `V1__Create_Initial_Schema.sql` | Baseline schema — admin sessions, events, activity events, core team, form submissions, recommendation engine tables |
| `V2__Seed_Recommendation_Data.sql` | Seed data for recommendation engine (profiles, events, participation history) |
| `V3__Extend_Event_Metadata.sql` | Extended events table with KSS metadata fields (category, dates, capacity, location) and dynamic gradient colors |

### Python Server (`server-python/alembic/versions/`)

- **Tool**: Alembic
- **Database**: PostgreSQL
- **Config**: `server-python/alembic.ini`

| Migration | Description |
|-----------|-------------|
| `001_initial_schema.py` | Initial schema creation |
| `002_seed_recommendation_data.py` | Seed data for recommendation engine |

## Running Migrations

### Node.js
```bash
cd server
npm run migrate:latest    # Apply all pending migrations
npm run migrate:rollback  # Rollback last migration batch
```

### Java
Migrations run automatically on application startup via Flyway. To run manually:
```bash
cd server-java
mvn flyway:migrate
```

### Python
```bash
cd server-python
alembic upgrade head       # Apply all pending migrations
alembic downgrade -1       # Rollback one migration
```

## Adding New Migrations

- **Node.js**: Create a new timestamped file in `server/migrations/` following the naming convention `YYYYMMDDHHMMSS_description.js`
- **Java**: Create a new versioned file in `server-java/src/main/resources/db/migration/` named `V{N}__Description.sql` where N is the next version number
- **Python**: Use `alembic revision -m "description"` to generate a new migration file in `server-python/alembic/versions/`

## Best Practices

1. **Always test migrations** against a clean database before merging
2. **Never modify applied migrations** — create a new one instead
3. **Use `IF NOT EXISTS` / `IF EXISTS`** guards where possible for idempotency
4. **Include rollback logic** in Node.js and Python migrations
5. **Document schema changes** in this file when adding new migrations
