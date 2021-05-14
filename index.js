const NodeCache = require("node-cache");
const cache = new NodeCache();

class Database {
  constructor(project_id, cache_max_age = 3600, cache_allocated_memory = 64) {
    this.project_id = project_id;
    this.cache_max_age = cache_max_age;
    this.cache_allocated_memory = cache_allocated_memory;
  }

  async write(collectionData, document) {
    const { collection, id } = collectionData;
    const data = { ...document };
    const cache_max_age = this.cache_max_age;

    // Validations
    if (!collection) {
      throw Error("No collection received");
    } else if (!id) {
      throw Error("No id received");
    } else if (!document) {
      throw Error("No document received");
    }

    // Write to database
    // const res = await db.collection(collection).doc(id).set(data);

    // Write to cache
    // cache.set({ id, document, cache_max_age });
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

    // If not in cache, query database. Return if found

    // If document doesn't exist, throw error
  }

  async readMany(collectionData, filters) {
    const { collection } = collectionData;

    // Validations
    if (!collection) {
      throw Error("No collection received");
    }

    // Check if documents are in cache. Return array if found.

    // If not in cache, query database. Return array if found.

    // If document doesn't exist, throw error
  }
}

module.exports = Database;
