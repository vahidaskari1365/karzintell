import 'dotenv/config';
import { DataSource, DataSourceOptions } from 'typeorm';
import { ALL_ENTITIES } from './entities';
import { InitialStoreMySql1750000000000 } from './migrations/1750000000000-InitialStoreMySql';
import { env } from '../config/configuration';

/**
 * TypeORM DataSource used for CLI commands and programmatic migrations.
 *
 * Production = MySQL / MariaDB on cPanel. The database itself is created by
 * cPanel; this project never attempts to create or drop the database.
 */
export const dataSourceOptions: DataSourceOptions = {
  type: 'mysql',
  host: env.db.host,
  port: env.db.port,
  username: env.db.username,
  password: env.db.password,
  database: env.db.database,
  charset: env.db.charset,
  timezone: env.db.timezone,
  synchronize: false,
  logging: env.db.logging,
  entities: ALL_ENTITIES,
  migrations: [InitialStoreMySql1750000000000],
  migrationsTableName: 'migrations',
  extra: {
    connectionLimit: env.db.poolSize,
    multipleStatements: true,
  },
};

export default new DataSource(dataSourceOptions);
