class Database {
  constructor(project_id, cache_max_age, cache_allocated_memory) {
    this.project_id = project_id;
    this.cache_max_age = cache_max_age;
    this.cache_allocated_memory = cache_allocated_memory;
  }

  async write() {}

  async readOne() {}

  async readMany() {}
}

module.exports = Database;
