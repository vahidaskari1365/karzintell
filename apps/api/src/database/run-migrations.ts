import 'reflect-metadata';
import dataSource from './data-source';

type MigrationMode = 'run' | 'revert' | 'show';

async function main(): Promise<void> {
  const rawMode = process.env.MIGRATE_MODE || 'run';
  const mode: MigrationMode = rawMode === 'revert' ? 'revert' : rawMode === 'show' ? 'show' : 'run';

  await dataSource.initialize();
  console.log(`[migration] connected to ${dataSource.options.database} (${dataSource.options.type})`);
  console.log(`[migration] mode = ${mode}`);

  try {
    if (mode === 'show') {
      const hasPending = await dataSource.showMigrations();
      if (!hasPending) {
        console.log('[migration] no pending migrations.');
      } else {
        console.log('[migration] there are pending migrations. Run `npm run db:migrate` to apply them.');
      }
    } else if (mode === 'revert') {
      await dataSource.undoLastMigration();
      console.log('[migration] last executed migration was reverted (if any).');
    } else {
      const applied = await dataSource.runMigrations();
      if (applied.length === 0) {
        console.log('[migration] database schema is already up to date.');
      } else {
        for (const m of applied) {
          console.log(`[migration] applied: ${m.name ?? m.constructor.name}`);
        }
      }
    }
  } finally {
    await dataSource.destroy();
  }
}

main().catch((err) => {
  console.error('[migration] failed:', err);
  process.exit(1);
});
