# infrastructure/docker — استقرار production (مرحله ۶)

فعلاً زیرساخت توسعه در `docker-compose.yml` ریشه است. این پوشه میزبانِ:

- `Dockerfile.web` و `Dockerfile.api` (multi-stage، production)
- `nginx/` — reverse proxy + gzip + cache تصاویر + TLS (certbot)
- `docker-compose.prod.yml`
- اسکریپت backup دیتابیس (pg_dump → gzip → S3)

خواهد بود.
