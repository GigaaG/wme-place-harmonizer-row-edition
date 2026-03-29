export type ScriptBuildChannel = "dev" | "beta" | "stable";

export const BUILD_MODE = import.meta.env?.MODE;

export function resolveScriptBuildChannel(
  mode: string | undefined
): ScriptBuildChannel {
  if (mode === "production") {
    return "stable";
  }

  if (mode === "beta") {
    return "beta";
  }

  return "dev";
}

type BuildChannelRuntime = {
  __WMEPH_ROW_BUILD_CHANNEL__?: ScriptBuildChannel;
};

const runtimeScriptBuildChannel = (
  globalThis as typeof globalThis & BuildChannelRuntime
).__WMEPH_ROW_BUILD_CHANNEL__;

export const SCRIPT_BUILD_CHANNEL = resolveScriptBuildChannel(
  runtimeScriptBuildChannel ?? BUILD_MODE
);
export const IS_DEV_SCRIPT_BUILD = SCRIPT_BUILD_CHANNEL !== "stable";
