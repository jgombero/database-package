const NodeCache = require("node-cache");
const cache = new NodeCache();
const Firestore = require("@google-cloud/firestore");

const initializeFirebase = (project_id) => {
  const db = new Firestore({
    projectId: `${project_id}`,
    keyFilename: `${process.argv[1]}/../keyfile.json`,
  });
  return db;
};

class Database {
  constructor(config) {
    this.project_id = config.project_id;
    this.cache_max_age = config.cache_max_age || 3600;
    this.cache_allocated_memory = config.cache_allocated_memory || 64;
    this.db = initializeFirebase(config.project_id);
  }

  async write(collectionData, document) {
    const { collection, id } = collectionData;

    // Validations
    if (!collection) {
      throw Error("No collection received");
    } else if (!id) {
      throw Error("No id received");
    } else if (!document) {
      throw Error("No document received");
    }

    // Write to database
    try {
      await this.db.collection(collection).doc(id).set(document);
    } catch (error) {
      console.error(error);
    }

    // Write to cache
    cache.set(id, document, this.cache_max_age);

    const cacheStats = cache.getStats();
    const { ksize, vsize } = cacheStats;

    // Delete if over the memory limit
    if (ksize + vsize > this.cache_allocated_memory * 1000000) {
      cache.del(id);
    }
  }

  async readOne(collectionData) {
    const { collection, id } = collectionData;

    // Validations
    if (!collection) {
      throw Error("No collection received");
    } else if (!id) {
      throw Error("No id received");
    }

    // Check if document is in cache. Return if found
    const cachedData = cache.get(id);

    if (cachedData) {
      return cachedData;
    }

    // If not in cache, query database
    let doc;
    try {
      doc = await this.db.collection(collection).doc(id).get();
    } catch (error) {
      console.error(error);
    }

    // If document doesn't exist, throw error
    if (!doc.exists) {
      throw Error(
        `No document found in collection: ${collection} with id: ${id}`
      );
    }

    return doc.data();
  }

  async readMany(collectionData, filters) {
    const { collection } = collectionData;
    const matches = [];
    const matchIds = [];

    // Validations
    if (!collection) {
      throw Error("No collection received");
    }

    // Check if documents are in cache. Return array if found.
    const allKeys = cache.keys();
    const allCacheData = cache.mget([...allKeys]);

    if (filters) {
      for (const filter in filters) {
        for (const key in allCacheData) {
          const value = filters[filter];
          if (
            allCacheData[key].hasOwnProperty(filter) &&
            allCacheData[key][filter] === value
          ) {
            if (!matchIds.includes(key)) {
              matches.push(allCacheData[key]);
              matchIds.push(key);
            }
          }
        }
      }
    }
    // If not in cache, query database. Return array if found.
    for (const key in filters) {
      const res = await this.db
        .collection(collection)
        .where(key, "==", filters[key])
        .get();

      res.forEach((doc) => {
        if (!matchIds.includes(doc.id)) {
          matches.push(doc.data());
          matchIds.push(doc.id);
        }
      });
    }
    return matches;
  }
}

module.exports = Database;
