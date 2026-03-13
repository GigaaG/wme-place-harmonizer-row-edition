import type { DataChannel } from "../constants/app";
import { IS_DEV_SCRIPT_BUILD } from "../constants/build";

export const DATA_REPOSITORY_OWNER = "GigaaG";
export const DATA_REPOSITORY_NAME = "wme-place-harmonizer-row-data";
export const DATA_REPOSITORY_BRANCH = IS_DEV_SCRIPT_BUILD ? "dev" : "main";

export function getManifestUrl(channel: DataChannel): string {
  return `https://raw.githubusercontent.com/${DATA_REPOSITORY_OWNER}/${DATA_REPOSITORY_NAME}/${DATA_REPOSITORY_BRANCH}/manifest/${channel}.json`;
}
