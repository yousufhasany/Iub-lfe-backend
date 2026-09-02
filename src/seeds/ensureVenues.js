import { loadEnv } from '../config/env.js';
import { connectDb, disconnectDb } from '../config/db.js';
import { logger } from '../config/logger.js';
import { Venue } from '../models/Venue.js';
import { OFFICIAL_VENUES } from './venues.js';

loadEnv();

async function ensureVenues() {
  await connectDb();
  let created = 0;
  let updated = 0;
  for (const data of OFFICIAL_VENUES) {
    const existing = await Venue.findOne({ slug: data.slug });
    if (existing) {
      await Venue.updateOne(
        { _id: existing._id },
        {
          $set: {
            name: data.name,
            district: data.district,
            division: data.division,
            description: data.description,
            location: data.location,
            historicalNotes: data.historicalNotes,
          },
          $unset: { coverImage: 1 },
        },
      );
      updated += 1;
      logger.info({ slug: data.slug }, 'Updated venue');
    } else {
      await Venue.create(data);
      created += 1;
      logger.info({ slug: data.slug }, 'Created venue');
    }
  }
  logger.info({ created, updated, total: OFFICIAL_VENUES.length }, 'Official venues synced');
  await disconnectDb();
}

ensureVenues().catch((err) => {
  logger.error(err, 'Failed to sync venues');
  process.exit(1);
});
