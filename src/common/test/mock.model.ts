type Exec<T> = { exec: () => T };
type Lean<T> = { lean: () => Exec<T> };
type Sort<T> = { sort: () => Exec<T> };
export abstract class MockModel<T> {
  protected abstract entityStub: T;

  findOne(): Sort<T> | Lean<T> | Exec<T> {
    return {
      lean: () => ({
        exec: (): T => this.entityStub,
      }),
    };
  }

  find(): Sort<T[]> | Exec<T[]> {
    return {
      sort: () => ({
        exec: () => [this.entityStub],
      }),
    };
  }

  async create(): Promise<T> {
    return this.entityStub;
  }

  async save(): Promise<T> {
    return this.entityStub;
  }

  findOneAndUpdate(): { exec: () => Promise<T> } {
    return {
      exec: async (): Promise<T> => this.entityStub,
    };
  }

  lean(): Sort<T> | Lean<T> | Exec<T> {
    return {
      lean: () => ({
        exec: (): T => this.entityStub,
      }),
    };
  }

  updateOne(): Exec<unknown> {
    return {
      exec: () => {},
    };
  }

  deleteOne(): Exec<unknown> {
    return this.updateOne();
  }

  getUserByEmail(): Sort<T> | Lean<T> | Exec<T> {
    return {
      lean: () => ({
        exec: (): T => this.entityStub,
      }),
    };
  }
}
