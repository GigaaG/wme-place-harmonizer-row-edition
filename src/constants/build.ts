// Vite preserves the requested mode during `vite build --mode ...`.
export const BUILD_MODE = import.meta.env.MODE;
export const IS_DEV_SCRIPT_BUILD = BUILD_MODE === "development";
