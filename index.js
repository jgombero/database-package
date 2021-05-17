const NodeCache = require("node-cache");
const cache = new NodeCache();
const Firestore = require("@google-cloud/firestore");
const sizeof = require("object-sizeof");

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

    const customId = `${collection}-${id}`;

    // Write to database
    try {
      await this.db.collection(collection).doc(customId).set(document);
    } catch (error) {
      throw Error(`Error: ${error}`);
    }

    // Check if cache memory is full before adding document
    const allKeys = cache.keys();
    const allCacheData = cache.mget([...allKeys]);

    if (
      sizeof(allCacheData) + sizeof({ [customId]: document }) <=
      this.cache_allocated_memory * 1000000
    ) {
      // Write to cache
      cache.set(customId, document, this.cache_max_age);
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

    const customId = `${collection}-${id}`;

    // Check if document is in cache. Return if found
    const cachedData = cache.get(customId);

    if (cachedData) {
      return cachedData;
    }

    // If not in cache, query database
    let doc;
    try {
      doc = await this.db.collection(collection).doc(customId).get();
    } catch (error) {
      throw Error(`Error: ${error}`);
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

    // If filter object is empty
    if (Object.keys(filters).length === 0 && filters.constructor === Object) {
      // Check cache first
      for (const cacheKey in allCacheData) {
        if (cacheKey.search(collection) !== -1) {
          matches.push(allCacheData[cacheKey]);
          matchIds.push(cacheKey);
        }
      }
      // Then check database
      const example = await this.db.collection(collection).get();
      example.forEach((doc) => {
        if (!matchIds.includes(doc.id)) {
          matches.push(doc.data());
          matchIds.push(doc.id);
        }
      });
      // If filter object is populated
    } else {
      for (const filtersKey in filters) {
        for (const cacheKey in allCacheData) {
          const value = filters[filtersKey];
          if (
            allCacheData[cacheKey].hasOwnProperty(filtersKey) &&
            allCacheData[cacheKey][filtersKey] === value
          ) {
            if (!matchIds.includes(cacheKey)) {
              matches.push(allCacheData[cacheKey]);
              matchIds.push(cacheKey);
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
    }

    return matches;
  }
}

module.exports = Database;
