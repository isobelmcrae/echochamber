import * as v from "valibot";

export const Id = v.pipe(v.string(), v.uuid());
