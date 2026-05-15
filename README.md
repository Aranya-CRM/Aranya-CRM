# Aranya-CRM
This is a CRM system for Aranya orgnization

## Documentation

For onboarding, local setup, Docker usage, architecture notes, and ongoing development guidance, start here:

- [Developer Guide](docs/System%20Design/developer-guide.md)

## Local PostgreSQL (Docker Compose)

PostgreSQL is managed in `infra/docker/docker-compose.yaml` with fixed local dev credentials:

- Database: `aranya_crm`
- Username: `aranya_admin`
- Password: `aranya_secret`
- Port: `5432` (bind `127.0.0.1:5432`)
- Data volume: `aranya_postgres_data`

Start database:

```powershell
docker compose -f infra/docker/docker-compose.yaml up -d
```

Stop database:

```powershell
docker compose -f infra/docker/docker-compose.yaml down
```

Reset database (drop volume and recreate a clean empty DB):

```powershell
docker compose -f infra/docker/docker-compose.yaml down -v
docker compose -f infra/docker/docker-compose.yaml up -d
```

Backend uses `backend/src/main/resources/application.yml`:

- Default local URL: `jdbc:postgresql://localhost:5432/aranya_crm`
- JPA schema mode: `spring.jpa.hibernate.ddl-auto=update`

If backend is later containerized in the same Compose network, run backend with:

- `DB_HOST=postgres`
- `DB_PORT=5432`

