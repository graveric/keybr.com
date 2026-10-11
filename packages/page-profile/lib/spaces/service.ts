import { type SpaceDetails } from "@keybr/pages-shared";
import { expectType, request } from "@keybr/request";

export namespace SpaceService {
  export async function create(name: string): Promise<readonly SpaceDetails[]> {
    const response = await request
      .use(expectType("application/json"))
      .POST("/_/spaces")
      .send({ name });
    return await response.json();
  }

  export async function rename(
    id: number,
    name: string,
  ): Promise<readonly SpaceDetails[]> {
    const response = await request
      .use(expectType("application/json"))
      .PUT(`/_/spaces/${id}`)
      .send({ name });
    return await response.json();
  }

  export async function remove(id: number): Promise<readonly SpaceDetails[]> {
    const response = await request
      .use(expectType("application/json"))
      .DELETE(`/_/spaces/${id}`)
      .send();
    return await response.json();
  }

  export async function makeDefault(
    id: number,
  ): Promise<readonly SpaceDetails[]> {
    const response = await request
      .use(expectType("application/json"))
      .POST(`/_/spaces/${id}/default`)
      .send();
    return await response.json();
  }

  export async function activate(id: number): Promise<readonly SpaceDetails[]> {
    const response = await request
      .use(expectType("application/json"))
      .POST(`/_/spaces/active/${id}`)
      .send();
    return await response.json();
  }
}
