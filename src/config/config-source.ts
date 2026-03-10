import {
  DATA_REPOSITORY_OWNER,
  DATA_REPOSITORY_NAME,
  DATA_REPOSITORY_BRANCH
} from "./source";

export function getConfigUrl(path: string): string {
  return `https://raw.githubusercontent.com/${DATA_REPOSITORY_OWNER}/${DATA_REPOSITORY_NAME}/${DATA_REPOSITORY_BRANCH}/${path}`;
}