import { createDatabase } from '../dist/db/database.js';
import { GawRepository } from '../dist/db/repository.js';
import { seedDemoMarketplace } from '../dist/db/seed.js';
import { createApp } from '../dist/api/app.js';

const port = Number(process.env.PORT ?? 3001);
const db = createDatabase(process.env.GAW_DB_PATH ?? ':memory:');
const repo = new GawRepository(db);
const seeded = seedDemoMarketplace(repo);
const app = createApp(db);

app.listen(port, () => {
  console.log(
    `GAW Davao API listening on http://localhost:${port}/api/v1 (seeded ${seeded.usersSeeded} users, ${seeded.gigsSeeded} gigs)`,
  );
});
