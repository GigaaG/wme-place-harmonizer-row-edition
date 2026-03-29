// ==UserScript==
// @name         WME Place Harmonizer ROW Edition (Beta)
// @namespace    https://github.com/
// @version      0.1.1-beta.18
// @description  TypeScript userscript for Waze Map Editor ROW Edition place harmonization
// @author       Contributors
// @include      https://www.waze.com/editor*
// @include      https://www.waze.com/*/editor*
// @include      https://beta.waze.com/editor*
// @include      https://beta.waze.com/*/editor*
// @exclude      https://www.waze.com/user*
// @exclude      https://www.waze.com/*/user*
// @downloadURL  https://raw.githubusercontent.com/GigaaG/wme-place-harmonizer-row-edition/beta/dist/wme-place-harmonizer-row-edition.beta.user.js
// @updateURL    https://raw.githubusercontent.com/GigaaG/wme-place-harmonizer-row-edition/beta/dist/wme-place-harmonizer-row-edition.beta.user.js
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @connect      raw.githubusercontent.com
// @run-at       document-end
// ==/UserScript==

globalThis.__WMEPH_ROW_BUILD_CHANNEL__ = "beta";
(function() {
  "use strict";
  class Logger {
    constructor() {
      this.prefix = "[WMEPH-ROW]";
    }
    info(message) {
      this.write("info", message);
    }
    warn(message) {
      this.write("warn", message);
    }
    error(message) {
      this.write("error", message);
    }
    write(level, message) {
      const text = `${this.prefix} ${message}`;
      switch (level) {
        case "info":
          console.log(text);
          break;
        case "warn":
          console.warn(text);
          break;
        case "error":
          console.error(text);
          break;
      }
    }
  }
  const logger = new Logger();
  function hasWindowObject() {
    return typeof window !== "undefined";
  }
  function hasDocumentObject() {
    return typeof document !== "undefined";
  }
  function isSupportedEnvironment() {
    return hasWindowObject() && hasDocumentObject();
  }
  const BUILD_MODE = "development";
  function resolveScriptBuildChannel(mode) {
    if (mode === "production") {
      return "stable";
    }
    if (mode === "beta") {
      return "beta";
    }
    return "dev";
  }
  const runtimeScriptBuildChannel = globalThis.__WMEPH_ROW_BUILD_CHANNEL__;
  const SCRIPT_BUILD_CHANNEL = resolveScriptBuildChannel(
    runtimeScriptBuildChannel ?? BUILD_MODE
  );
  const IS_DEV_SCRIPT_BUILD = SCRIPT_BUILD_CHANNEL !== "stable";
  const APP_NAME = "WME Place Harmonizer ROW Edition";
  const APP_SHORT_NAME = "WMEPH-ROW";
  const APP_STORAGE_PREFIX = IS_DEV_SCRIPT_BUILD ? `${APP_SHORT_NAME}:${SCRIPT_BUILD_CHANNEL}` : APP_SHORT_NAME;
  const DEFAULT_DATA_CHANNEL = IS_DEV_SCRIPT_BUILD ? "dev" : "stable";
  const STORAGE_KEYS = {
    settings: `${APP_STORAGE_PREFIX}:settings`
  };
  function getDefaultSettings() {
    return {
      dataChannel: DEFAULT_DATA_CHANNEL,
      debugEnabled: false,
      fallbackCountry: void 0,
      autoScanVisibleVenues: true,
      googleMapsValidation: {
        enabled: true,
        checks: {
          notFound: true,
          closed: true,
          locationDrift: true,
          nameMismatch: true,
          category: true,
          openingHours: true
        }
      }
    };
  }
  class SettingsManager {
    load() {
      const raw = window.localStorage.getItem(STORAGE_KEYS.settings);
      if (!raw) {
        return getDefaultSettings();
      }
      try {
        const parsed = JSON.parse(raw);
        const defaults = getDefaultSettings();
        return {
          ...defaults,
          ...parsed,
          googleMapsValidation: {
            ...defaults.googleMapsValidation,
            ...parsed.googleMapsValidation,
            checks: {
              ...defaults.googleMapsValidation.checks,
              ...parsed.googleMapsValidation?.checks
            }
          }
        };
      } catch {
        return getDefaultSettings();
      }
    }
    save(settings) {
      window.localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings));
    }
  }
  const settingsManager = new SettingsManager();
  const GOOGLE_MAPS_VALIDATION_CHECK_KEYS = [
    "notFound",
    "closed",
    "locationDrift",
    "nameMismatch",
    "category",
    "openingHours"
  ];
  const DEFAULT_GOOGLE_MAPS_VALIDATION_SEVERITIES = {
    notFound: "warning",
    closed: "warning",
    locationDrift: "warning",
    nameMismatch: "info",
    category: "info",
    openingHours: "info"
  };
  function getDefaultGoogleMapsValidationAvailability() {
    return {
      enabled: true,
      checks: Object.fromEntries(
        GOOGLE_MAPS_VALIDATION_CHECK_KEYS.map((checkKey) => [checkKey, true])
      )
    };
  }
  function getDefaultGoogleMapsValidationSeverities() {
    return {
      ...DEFAULT_GOOGLE_MAPS_VALIDATION_SEVERITIES
    };
  }
  function resolveGoogleMapsValidationAvailability(config) {
    const enabled = config?.googleMapsValidation?.enabled !== false;
    return {
      enabled,
      checks: Object.fromEntries(
        GOOGLE_MAPS_VALIDATION_CHECK_KEYS.map((checkKey) => [
          checkKey,
          enabled && config?.googleMapsValidation?.checks?.[checkKey] !== false
        ])
      )
    };
  }
  function getEffectiveGoogleMapsValidationSettings(params) {
    return {
      enabled: params.availability.enabled && params.user.enabled,
      checks: Object.fromEntries(
        GOOGLE_MAPS_VALIDATION_CHECK_KEYS.map((checkKey) => [
          checkKey,
          params.availability.checks[checkKey] && params.user.checks[checkKey]
        ])
      )
    };
  }
  function mountSidebarPlaceholder() {
    logger.info("Sidebar placeholder mount requested");
  }
  function fetchJson(url) {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: "GET",
        url,
        headers: {
          Accept: "application/json"
        },
        onload: (response) => {
          if (response.status < 200 || response.status >= 300) {
            reject(
              new Error(`Request failed with status ${response.status} for ${url}`)
            );
            return;
          }
          try {
            const parsed = JSON.parse(response.responseText);
            resolve(parsed);
          } catch (_error) {
            reject(
              new Error(`Invalid JSON received from ${url}`)
            );
          }
        },
        onerror: (_error) => {
          reject(new Error(`Network error while loading ${url}`));
        }
      });
    });
  }
  const DATA_REPOSITORY_OWNER = "GigaaG";
  const DATA_REPOSITORY_NAME = "wme-place-harmonizer-row-data";
  const DATA_REPOSITORY_BRANCH = IS_DEV_SCRIPT_BUILD ? "dev" : "main";
  function appendQueryParam(url, key, value) {
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}${key}=${encodeURIComponent(value)}`;
  }
  function getManifestUrl(channel) {
    const url = `https://raw.githubusercontent.com/${DATA_REPOSITORY_OWNER}/${DATA_REPOSITORY_NAME}/${DATA_REPOSITORY_BRANCH}/manifest/${channel}.json`;
    return appendQueryParam(url, "ts", String(Date.now()));
  }
  class CacheManager {
    get(key) {
      const raw = window.localStorage.getItem(key);
      if (!raw) {
        return null;
      }
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    }
    set(key, value) {
      window.localStorage.setItem(key, JSON.stringify(value));
    }
    remove(key) {
      window.localStorage.removeItem(key);
    }
  }
  const cacheManager = new CacheManager();
  const CACHE_KEYS = {
    manifest: `${APP_STORAGE_PREFIX}:cache:manifest`,
    manifestRevision: `${APP_STORAGE_PREFIX}:cache:manifestRevision`
  };
  const REQUIRED_MANIFEST_FILES = [
    "config/global.json",
    "chains/global.json"
  ];
  function isPlainObject$4(value) {
    return !!value && typeof value === "object" && !Array.isArray(value);
  }
  function hasNonEmptyString$2(value) {
    return typeof value === "string" && value.trim().length > 0;
  }
  function getErrorMessage$2(error) {
    return error instanceof Error ? error.message : "Unknown manifest loading error";
  }
  function validateManifest(value) {
    if (!isPlainObject$4(value)) {
      throw new Error("Manifest must be a JSON object");
    }
    const manifest = value;
    const { files } = manifest;
    if (manifest.channel !== "stable" && manifest.channel !== "dev") {
      throw new Error("Manifest channel must be 'stable' or 'dev'");
    }
    if (!hasNonEmptyString$2(manifest.version)) {
      throw new Error("Manifest version must be a non-empty string");
    }
    if (!hasNonEmptyString$2(manifest.generatedAt) || Number.isNaN(Date.parse(manifest.generatedAt))) {
      throw new Error("Manifest generatedAt must be a valid ISO timestamp");
    }
    if (!hasNonEmptyString$2(manifest.dataRevision)) {
      throw new Error("Manifest dataRevision must be a non-empty string");
    }
    if (!isPlainObject$4(files)) {
      throw new Error("Manifest files must be an object");
    }
    for (const [path, entry] of Object.entries(files)) {
      if (!isPlainObject$4(entry)) {
        throw new Error(`Manifest file entry must be an object: ${path}`);
      }
      if (typeof entry.required !== "boolean") {
        throw new Error(`Manifest file entry must contain boolean 'required': ${path}`);
      }
    }
    for (const requiredPath of REQUIRED_MANIFEST_FILES) {
      const entry = files[requiredPath];
      if (!isPlainObject$4(entry) || entry.required !== true) {
        throw new Error(`Manifest must mark core file as required: ${requiredPath}`);
      }
    }
    return manifest;
  }
  async function loadManifest(channel) {
    const url = getManifestUrl(channel);
    logger.info(`Loading manifest from ${url}`);
    try {
      const manifest = validateManifest(await fetchJson(url));
      logger.info(
        `Loaded manifest ${manifest.channel} v${manifest.version} (revision: ${manifest.dataRevision})`
      );
      cacheManager.set(CACHE_KEYS.manifest, manifest);
      cacheManager.set(CACHE_KEYS.manifestRevision, manifest.dataRevision);
      return manifest;
    } catch (error) {
      const message = getErrorMessage$2(error);
      logger.warn(`Manifest load failed: ${message}. Trying cached manifest`);
      const cached = cacheManager.get(CACHE_KEYS.manifest);
      if (cached) {
        try {
          const manifest = validateManifest(cached);
          logger.warn(
            `Using cached manifest ${manifest.channel} v${manifest.version} (revision: ${manifest.dataRevision})`
          );
          return manifest;
        } catch (cachedError) {
          logger.warn(`Cached manifest is invalid: ${getErrorMessage$2(cachedError)}`);
        }
      }
      throw new Error(`No valid manifest available: ${message}`);
    }
  }
  function getManifestRevision() {
    try {
      const revision = cacheManager.get(CACHE_KEYS.manifestRevision);
      if (typeof revision === "string" && revision.trim().length > 0) {
        return revision.trim();
      }
    } catch {
    }
    return void 0;
  }
  function getConfigUrl(path) {
    const url = `https://raw.githubusercontent.com/${DATA_REPOSITORY_OWNER}/${DATA_REPOSITORY_NAME}/${DATA_REPOSITORY_BRANCH}/${path}`;
    const manifestRevision = getManifestRevision();
    return manifestRevision ? appendQueryParam(url, "rev", manifestRevision) : url;
  }
  const SUPPORTED_CONFIG_TYPES = /* @__PURE__ */ new Set([
    "global-config",
    "community-config",
    "country-config",
    "state-config"
  ]);
  function isPlainObject$3(value) {
    return !!value && typeof value === "object" && !Array.isArray(value);
  }
  function hasNonEmptyString$1(value) {
    return typeof value === "string" && value.trim().length > 0;
  }
  function isValidSeverity(value) {
    return value === "info" || value === "warning" || value === "error";
  }
  function validateRules(value, path) {
    if (value === void 0) {
      return void 0;
    }
    if (!isPlainObject$3(value)) {
      throw new Error(`Config rules must be an object: ${path}`);
    }
    for (const [ruleId, rule] of Object.entries(value)) {
      if (!isPlainObject$3(rule)) {
        throw new Error(`Config rule must be an object: ${path} -> ${ruleId}`);
      }
      if (typeof rule.enabled !== "boolean") {
        throw new Error(`Config rule must define boolean enabled: ${path} -> ${ruleId}`);
      }
      if (!isValidSeverity(rule.severity)) {
        throw new Error(`Config rule must define valid severity: ${path} -> ${ruleId}`);
      }
    }
    return value;
  }
  function validateGoogleMapsValidationConfig(value, path) {
    if (value === void 0) {
      return;
    }
    if (!isPlainObject$3(value)) {
      throw new Error(`Config googleMapsValidation must be an object: ${path}`);
    }
    if (value.enabled !== void 0 && typeof value.enabled !== "boolean") {
      throw new Error(
        `Config googleMapsValidation.enabled must be a boolean: ${path}`
      );
    }
    if (value.checks !== void 0) {
      if (!isPlainObject$3(value.checks)) {
        throw new Error(
          `Config googleMapsValidation.checks must be an object: ${path}`
        );
      }
      for (const checkKey of GOOGLE_MAPS_VALIDATION_CHECK_KEYS) {
        const checkValue = value.checks[checkKey];
        if (checkValue !== void 0 && typeof checkValue !== "boolean") {
          throw new Error(
            `Config googleMapsValidation.checks.${checkKey} must be a boolean: ${path}`
          );
        }
      }
    }
    if (value.nameLocales !== void 0) {
      if (!Array.isArray(value.nameLocales)) {
        throw new Error(
          `Config googleMapsValidation.nameLocales must be an array: ${path}`
        );
      }
      if (value.nameLocales.length === 0) {
        throw new Error(
          `Config googleMapsValidation.nameLocales must contain at least one locale: ${path}`
        );
      }
      for (const [index, locale] of value.nameLocales.entries()) {
        if (!hasNonEmptyString$1(locale)) {
          throw new Error(
            `Config googleMapsValidation.nameLocales[${index}] must be a non-empty string: ${path}`
          );
        }
      }
    }
    if (value.severity === void 0) {
      return;
    }
    if (!isPlainObject$3(value.severity)) {
      throw new Error(
        `Config googleMapsValidation.severity must be an object: ${path}`
      );
    }
    for (const checkKey of GOOGLE_MAPS_VALIDATION_CHECK_KEYS) {
      const severityValue = value.severity[checkKey];
      if (severityValue !== void 0 && !isValidSeverity(severityValue)) {
        throw new Error(
          `Config googleMapsValidation.severity.${checkKey} must be a valid severity: ${path}`
        );
      }
    }
  }
  function validateConfigFile(value, path) {
    if (!isPlainObject$3(value)) {
      throw new Error(`Config must be a JSON object: ${path}`);
    }
    if (!hasNonEmptyString$1(value.id)) {
      throw new Error(`Config id must be a non-empty string: ${path}`);
    }
    if (!hasNonEmptyString$1(value.type) || !SUPPORTED_CONFIG_TYPES.has(value.type)) {
      throw new Error(`Config type must be a supported config type: ${path}`);
    }
    if (!Number.isInteger(value.version) || value.version < 1) {
      throw new Error(`Config version must be a positive integer: ${path}`);
    }
    if (value.extends !== void 0 && !hasNonEmptyString$1(value.extends)) {
      throw new Error(`Config extends must be a non-empty string when present: ${path}`);
    }
    if (value.defaults !== void 0) {
      if (!isPlainObject$3(value.defaults)) {
        throw new Error(`Config defaults must be an object: ${path}`);
      }
      if (value.defaults.locale !== void 0 && !hasNonEmptyString$1(value.defaults.locale)) {
        throw new Error(`Config defaults.locale must be a non-empty string: ${path}`);
      }
    }
    if (value.formatting !== void 0 && !isPlainObject$3(value.formatting)) {
      throw new Error(`Config formatting must be an object: ${path}`);
    }
    if (isPlainObject$3(value.formatting)) {
      for (const sectionName of ["phone", "url"]) {
        const section = value.formatting[sectionName];
        if (section !== void 0 && !isPlainObject$3(section)) {
          throw new Error(`Config formatting.${sectionName} must be an object: ${path}`);
        }
      }
    }
    validateRules(value.rules, path);
    validateGoogleMapsValidationConfig(value.googleMapsValidation, path);
    if (value.categoryStandards !== void 0) {
      if (!isPlainObject$3(value.categoryStandards)) {
        throw new Error(`Config categoryStandards must be an object: ${path}`);
      }
      for (const [categoryKey, standard] of Object.entries(value.categoryStandards)) {
        if (!isPlainObject$3(standard)) {
          throw new Error(
            `Config category standard must be an object: ${path} -> ${categoryKey}`
          );
        }
      }
    }
    return value;
  }
  async function loadConfigFile(path) {
    const url = getConfigUrl(path);
    logger.info(`Loading config ${path}`);
    const result = validateConfigFile(await fetchJson(url), path);
    logger.info(`Loaded config ${result.id} v${result.version} from ${path}`);
    return result;
  }
  function isPlainObject$2(value) {
    return !!value && typeof value === "object" && !Array.isArray(value);
  }
  function deepMerge$1(base, override) {
    if (!isPlainObject$2(base) || !isPlainObject$2(override)) {
      return override;
    }
    const result = {
      ...base
    };
    for (const [key, overrideValue] of Object.entries(override)) {
      const baseValue = result[key];
      if (isPlainObject$2(baseValue) && isPlainObject$2(overrideValue)) {
        result[key] = deepMerge$1(baseValue, overrideValue);
        continue;
      }
      result[key] = overrideValue;
    }
    return result;
  }
  function mergeConfigs(base, override) {
    return deepMerge$1(base, override);
  }
  function normalizeCountryCode(country) {
    if (typeof country !== "string") {
      return void 0;
    }
    const normalized = country.trim().toLowerCase();
    return normalized.length > 0 ? normalized : void 0;
  }
  const ISO3_TO_ISO2 = {
    nld: "nl"
  };
  function getCountryCodeCandidates(country) {
    const normalized = normalizeCountryCode(country);
    if (!normalized) {
      return [];
    }
    const candidates = /* @__PURE__ */ new Set([normalized]);
    const iso2 = ISO3_TO_ISO2[normalized];
    if (iso2) {
      candidates.add(iso2);
    }
    if (/^[a-z]{3}$/.test(normalized)) {
      candidates.add(normalized.slice(0, 2));
    }
    return Array.from(candidates);
  }
  function getErrorMessage$1(error) {
    return error instanceof Error ? error.message : "Unknown config loading error";
  }
  function resolveConfigExtendsPath(extendsId) {
    const normalizedExtendsId = extendsId.trim();
    if (normalizedExtendsId === "global") {
      return "config/global.json";
    }
    if (normalizedExtendsId.startsWith("community:")) {
      return `config/communities/${normalizedExtendsId.slice("community:".length)}.json`;
    }
    if (normalizedExtendsId.startsWith("country:")) {
      return `config/countries/${normalizedExtendsId.slice("country:".length)}.json`;
    }
    if (normalizedExtendsId.startsWith("state:")) {
      return `config/states/${normalizedExtendsId.slice("state:".length)}.json`;
    }
    throw new Error(`Unsupported config extends reference: ${extendsId}`);
  }
  async function loadResolvedConfig(path, seen = /* @__PURE__ */ new Set()) {
    if (seen.has(path)) {
      throw new Error(`Circular config inheritance detected for ${path}`);
    }
    seen.add(path);
    const config = await loadConfigFile(path);
    if (!config.extends) {
      return config;
    }
    const parentPath = resolveConfigExtendsPath(config.extends);
    const parent = await loadResolvedConfig(parentPath, seen);
    return mergeConfigs(parent, config);
  }
  async function resolveRuntimeConfig(country) {
    const countryCandidates = getCountryCodeCandidates(country);
    const globalConfig = await loadResolvedConfig("config/global.json");
    if (countryCandidates.length === 0) {
      logger.info("Using global config only");
      return globalConfig;
    }
    for (const countryCode of countryCandidates) {
      try {
        const countryConfig = await loadResolvedConfig(
          `config/countries/${countryCode}.json`
        );
        logger.info(`Applying country config: ${countryCode}`);
        return mergeConfigs(globalConfig, countryConfig);
      } catch (error) {
        logger.warn(
          `Country config ${countryCode} could not be loaded: ${getErrorMessage$1(error)}`
        );
      }
    }
    logger.warn(
      `No valid country config found for ${countryCandidates.join(", ")}; using global`
    );
    return globalConfig;
  }
  function isPlainObject$1(value) {
    return !!value && typeof value === "object" && !Array.isArray(value);
  }
  function hasNonEmptyString(value) {
    return typeof value === "string" && value.trim().length > 0;
  }
  function isStringArray(value) {
    return Array.isArray(value) && value.every((entry) => typeof entry === "string");
  }
  function validateChainDataset(value, path) {
    if (!isPlainObject$1(value)) {
      throw new Error(`Chain dataset must be a JSON object: ${path}`);
    }
    const dataset = value;
    if (dataset.type !== "chain-dataset") {
      throw new Error(`Chain dataset type must be 'chain-dataset': ${path}`);
    }
    if (!hasNonEmptyString(dataset.id)) {
      throw new Error(`Chain dataset id must be a non-empty string: ${path}`);
    }
    if (!Number.isInteger(dataset.version) || dataset.version < 1) {
      throw new Error(`Chain dataset version must be a positive integer: ${path}`);
    }
    if (!Array.isArray(dataset.items)) {
      throw new Error(`Chain dataset items must be an array: ${path}`);
    }
    for (const item of dataset.items) {
      if (!isPlainObject$1(item)) {
        throw new Error(`Chain dataset item must be an object: ${path}`);
      }
      if (!hasNonEmptyString(item.id)) {
        throw new Error(`Chain item id must be a non-empty string: ${path}`);
      }
      if (!hasNonEmptyString(item.canonicalName)) {
        throw new Error(`Chain item canonicalName must be a non-empty string: ${path}`);
      }
      if (item.match !== void 0) {
        if (!isPlainObject$1(item.match)) {
          throw new Error(`Chain item match must be an object: ${path} -> ${item.id}`);
        }
        if (item.match.aliases !== void 0 && !isStringArray(item.match.aliases)) {
          throw new Error(`Chain match.aliases must be string[]: ${path} -> ${item.id}`);
        }
        if (item.match.regex !== void 0 && !isStringArray(item.match.regex)) {
          throw new Error(`Chain match.regex must be string[]: ${path} -> ${item.id}`);
        }
      }
      for (const optionalObjectKey of ["standard", "policy", "editorNotes"]) {
        if (item[optionalObjectKey] !== void 0 && !isPlainObject$1(item[optionalObjectKey])) {
          throw new Error(
            `Chain item ${optionalObjectKey} must be an object: ${path} -> ${item.id}`
          );
        }
      }
    }
    return dataset;
  }
  async function loadChainFile(path) {
    const url = getConfigUrl(path);
    logger.info(`Loading chains ${path}`);
    const result = validateChainDataset(await fetchJson(url), path);
    logger.info(
      `Loaded chain dataset ${result.id} v${result.version} with ${result.items.length} items`
    );
    return result;
  }
  function isPlainObject(value) {
    return !!value && typeof value === "object" && !Array.isArray(value);
  }
  function deepMerge(base, override) {
    if (!isPlainObject(base) || !isPlainObject(override)) {
      return override;
    }
    const result = {
      ...base
    };
    for (const [key, overrideValue] of Object.entries(override)) {
      const baseValue = result[key];
      if (isPlainObject(baseValue) && isPlainObject(overrideValue)) {
        result[key] = deepMerge(baseValue, overrideValue);
        continue;
      }
      result[key] = overrideValue;
    }
    return result;
  }
  function mergeChainRecord(base, override) {
    return deepMerge(base, override);
  }
  function mergeChainDatasets(base, override) {
    const mergedItems = /* @__PURE__ */ new Map();
    for (const item of base.items) {
      mergedItems.set(item.id, item);
    }
    for (const item of override.items) {
      const existing = mergedItems.get(item.id);
      if (existing) {
        mergedItems.set(item.id, mergeChainRecord(existing, item));
      } else {
        mergedItems.set(item.id, item);
      }
    }
    return {
      ...base,
      id: override.id || base.id,
      version: Math.max(base.version, override.version),
      items: Array.from(mergedItems.values())
    };
  }
  function getErrorMessage(error) {
    return error instanceof Error ? error.message : "Unknown chain loading error";
  }
  async function resolveRuntimeChains(country) {
    const countryCandidates = getCountryCodeCandidates(country);
    const globalChains = await loadChainFile("chains/global.json");
    if (countryCandidates.length === 0) {
      logger.info(`Using global chains only (country input: ${country ?? "none"})`);
      return globalChains;
    }
    for (const countryCode of countryCandidates) {
      try {
        const countryChains = await loadChainFile(`chains/countries/${countryCode}.json`);
        logger.info(`Applying country chains: ${countryCode}`);
        return mergeChainDatasets(globalChains, countryChains);
      } catch (error) {
        logger.warn(
          `Country chain dataset ${countryCode} could not be loaded: ${getErrorMessage(error)}`
        );
      }
    }
    logger.warn(
      `No valid country chain dataset found for ${countryCandidates.join(", ")}; using global chains`
    );
    return globalChains;
  }
  function normalizeText(value) {
    return value.normalize("NFKC").toLowerCase().replace(/[’']/g, "'").replace(/[^\p{L}\p{N}\s']/gu, " ").replace(/\s+/g, " ").trim();
  }
  function matchesCanonicalName(placeName, chain) {
    return normalizeText(placeName) === normalizeText(chain.canonicalName);
  }
  function matchesAlias(placeName, chain) {
    const aliases = chain.match?.aliases ?? [];
    const normalizedPlaceName = normalizeText(placeName);
    for (const alias of aliases) {
      if (normalizedPlaceName === normalizeText(alias)) {
        return alias;
      }
    }
    return null;
  }
  function matchesRegex(placeName, chain) {
    const patterns = chain.match?.regex ?? [];
    for (const pattern of patterns) {
      try {
        const regex = new RegExp(pattern, "i");
        if (regex.test(placeName)) {
          return pattern;
        }
      } catch {
      }
    }
    return null;
  }
  function matchPlaceToChain(place, dataset) {
    for (const chain of dataset.items) {
      if (matchesCanonicalName(place.name, chain)) {
        return {
          matched: true,
          method: "canonical",
          chain,
          matchedValue: chain.canonicalName
        };
      }
      const aliasMatch = matchesAlias(place.name, chain);
      if (aliasMatch) {
        return {
          matched: true,
          method: "alias",
          chain,
          matchedValue: aliasMatch
        };
      }
      const regexMatch = matchesRegex(place.name, chain);
      if (regexMatch) {
        return {
          matched: true,
          method: "regex",
          chain,
          matchedValue: regexMatch
        };
      }
    }
    return {
      matched: false,
      method: "none"
    };
  }
  const DESCRIPTIVE_CATEGORY_FIELD_CANDIDATES = [
    "category",
    "name",
    "localizedName",
    "key",
    "slug",
    "value",
    "code"
  ];
  const IDENTIFIER_CATEGORY_FIELD_CANDIDATES = [
    "subCategoryId",
    "categoryId",
    "categoryID",
    "id"
  ];
  function looksCanonicalCategoryId(value) {
    return /^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*$/.test(value.trim());
  }
  function normalizeCategoryString(value) {
    const normalized = value.trim().replace(/([a-z0-9])([A-Z])/g, "$1_$2").replace(/[^A-Za-z0-9]+/g, "_").replace(/^_+|_+$/g, "").replace(/_+/g, "_").toUpperCase();
    return normalized.length > 0 ? normalized : void 0;
  }
  function readFirstCategoryField(record, fields) {
    for (const field of fields) {
      const value = record[field];
      if (typeof value === "string" && value.trim().length > 0) {
        return value;
      }
    }
    return void 0;
  }
  function extractCanonicalCategoryHierarchy(record) {
    const normalized = [];
    const seen = /* @__PURE__ */ new Set();
    const parentIdentifier = readFirstCategoryField(record, [
      "categoryId",
      "categoryID"
    ]);
    const subCategoryIdentifier = readFirstCategoryField(record, ["subCategoryId"]);
    for (const candidate of [parentIdentifier, subCategoryIdentifier]) {
      if (!candidate || !looksCanonicalCategoryId(candidate)) {
        continue;
      }
      const normalizedCandidate = normalizeCategoryString(candidate);
      if (!normalizedCandidate || seen.has(normalizedCandidate)) {
        continue;
      }
      seen.add(normalizedCandidate);
      normalized.push(normalizedCandidate);
    }
    return normalized;
  }
  function extractCategoryString(category) {
    if (typeof category === "string") {
      return category;
    }
    if (!category || typeof category !== "object") {
      return void 0;
    }
    const record = category;
    const identifierValue = readFirstCategoryField(
      record,
      IDENTIFIER_CATEGORY_FIELD_CANDIDATES
    );
    if (identifierValue && looksCanonicalCategoryId(identifierValue)) {
      return identifierValue;
    }
    const descriptiveValue = readFirstCategoryField(
      record,
      DESCRIPTIVE_CATEGORY_FIELD_CANDIDATES
    );
    if (descriptiveValue) {
      return descriptiveValue;
    }
    if (record.attributes && typeof record.attributes === "object") {
      const nestedValue = extractCategoryString(record.attributes);
      if (nestedValue) {
        return nestedValue;
      }
    }
    return identifierValue;
  }
  function normalizeCategoryKey(category) {
    const value = extractCategoryString(category);
    return value ? normalizeCategoryString(value) : void 0;
  }
  function normalizeCategoryKeys(categories) {
    const values = Array.isArray(categories) ? categories : [categories];
    const seen = /* @__PURE__ */ new Set();
    const normalized = [];
    for (const value of values) {
      if (value && typeof value === "object") {
        const hierarchy = extractCanonicalCategoryHierarchy(
          value
        );
        if (hierarchy.length > 0) {
          for (const key2 of hierarchy) {
            if (seen.has(key2)) {
              continue;
            }
            seen.add(key2);
            normalized.push(key2);
          }
          continue;
        }
      }
      const key = normalizeCategoryKey(value);
      if (!key || seen.has(key)) {
        continue;
      }
      seen.add(key);
      normalized.push(key);
    }
    return normalized;
  }
  const subCategoriesByMainCategory = { "CAR_SERVICES": ["CAR_WASH", "CHARGING_STATION", "GARAGE_AUTOMOTIVE_SHOP", "GAS_STATION"], "CRISIS_LOCATIONS": ["DONATION_CENTERS", "SHELTER_LOCATIONS"], "CULTURE_AND_ENTERTAINEMENT": ["ART_GALLERY", "CASINO", "CLUB", "TOURIST_ATTRACTION_HISTORIC_SITE", "MOVIE_THEATER", "MUSEUM", "MUSIC_VENUE", "PERFORMING_ARTS_VENUE", "GAME_CLUB", "STADIUM_ARENA", "THEME_PARK", "ZOO_AQUARIUM", "RACING_TRACK", "THEATER"], "FOOD_AND_DRINK": ["RESTAURANT", "BAKERY", "DESSERT", "CAFE", "FAST_FOOD", "FOOD_COURT", "BAR", "ICE_CREAM"], "LODGING": ["HOTEL", "HOSTEL", "CAMPING_TRAILER_PARK", "COTTAGE_CABIN", "BED_AND_BREAKFAST"], "NATURAL_FEATURES": ["ISLAND", "SEA_LAKE_POOL", "RIVER_STREAM", "FOREST_GROVE", "FARM", "CANAL", "SWAMP_MARSH", "DAM"], "OTHER": ["CONSTRUCTION_SITE"], "OUTDOORS": ["PARK", "PLAYGROUND", "BEACH", "SPORTS_COURT", "GOLF_COURSE", "PLAZA", "PROMENADE", "POOL", "SCENIC_LOOKOUT_VIEWPOINT", "SKI_AREA"], "PARKING_LOT": [], "PROFESSIONAL_AND_PUBLIC": ["COLLEGE_UNIVERSITY", "SCHOOL", "CONVENTIONS_EVENT_CENTER", "GOVERNMENT", "LIBRARY", "CITY_HALL", "ORGANIZATION_OR_ASSOCIATION", "PRISON_CORRECTIONAL_FACILITY", "COURTHOUSE", "CEMETERY", "FIRE_DEPARTMENT", "POLICE_STATION", "MILITARY", "HOSPITAL_URGENT_CARE", "DOCTOR_CLINIC", "OFFICES", "POST_OFFICE", "RELIGIOUS_CENTER", "KINDERGARDEN", "FACTORY_INDUSTRIAL", "EMBASSY_CONSULATE", "INFORMATION_POINT", "EMERGENCY_SHELTER", "TRASH_AND_RECYCLING_FACILITIES"], "SHOPPING_AND_SERVICES": ["ARTS_AND_CRAFTS", "BANK_FINANCIAL", "SPORTING_GOODS", "BOOKSTORE", "PHOTOGRAPHY", "CAR_DEALERSHIP", "FASHION_AND_CLOTHING", "CONVENIENCE_STORE", "PERSONAL_CARE", "DEPARTMENT_STORE", "PHARMACY", "ELECTRONICS", "FLOWERS", "FURNITURE_HOME_STORE", "GIFTS", "GYM_FITNESS", "SWIMMING_POOL", "HARDWARE_STORE", "MARKET", "SUPERMARKET_GROCERY", "JEWELRY", "LAUNDRY_DRY_CLEAN", "SHOPPING_CENTER", "MUSIC_STORE", "PET_STORE_VETERINARIAN_SERVICES", "TOY_STORE", "TRAVEL_AGENCY", "ATM", "CURRENCY_EXCHANGE", "CAR_RENTAL", "TELECOM"], "TRANSPORTATION": ["AIRPORT", "BUS_STATION", "FERRY_PIER", "SEAPORT_MARINA_HARBOR", "SUBWAY_STATION", "TRAIN_STATION", "BRIDGE", "TUNNEL", "TAXI_STATION", "JUNCTION_INTERCHANGE", "REST_AREAS", "CARPOOL_SPOT"] };
  const sdkValues = {
    subCategoriesByMainCategory
  };
  const snapshot = sdkValues;
  const PARENT_BY_SUBCATEGORY = /* @__PURE__ */ new Map();
  for (const [mainCategory, subCategories] of Object.entries(
    snapshot.subCategoriesByMainCategory ?? {}
  )) {
    for (const subCategory of subCategories) {
      PARENT_BY_SUBCATEGORY.set(subCategory, mainCategory);
    }
  }
  function expandCategoryHierarchy(categoryKey) {
    const parentCategory = PARENT_BY_SUBCATEGORY.get(categoryKey);
    if (!parentCategory || parentCategory === categoryKey) {
      return [categoryKey];
    }
    return [parentCategory, categoryKey];
  }
  function resolveCategoryStandards(config, categories) {
    const standards = config.categoryStandards ?? {};
    const standardLookup = /* @__PURE__ */ new Map();
    const matches = [];
    const matchedKeys = /* @__PURE__ */ new Set();
    for (const [key, standard] of Object.entries(standards)) {
      const normalizedKey = normalizeCategoryKey(key);
      if (!normalizedKey || standardLookup.has(normalizedKey)) {
        continue;
      }
      standardLookup.set(normalizedKey, { key, standard });
    }
    for (const category of categories) {
      const normalizedCategory = normalizeCategoryKey(category);
      if (!normalizedCategory) {
        continue;
      }
      for (const categoryKey of expandCategoryHierarchy(normalizedCategory)) {
        if (matchedKeys.has(categoryKey)) {
          continue;
        }
        const matched = standardLookup.get(categoryKey);
        if (matched) {
          logger.info(`Matched category standard: ${matched.key}`);
          matches.push(matched.standard);
          matchedKeys.add(categoryKey);
        }
      }
    }
    return matches;
  }
  function normalizeWhitespace$1(value) {
    return value.replace(/\s+/g, " ").trim();
  }
  function normalizeLocaleCode(locale) {
    if (typeof locale !== "string") {
      return void 0;
    }
    const normalized = locale.trim().replace(/_/g, "-").toLowerCase();
    return normalized.length > 0 ? normalized : void 0;
  }
  function getLocaleCandidates(preferredLocale, fallbackLocale) {
    const candidates = [];
    const seen = /* @__PURE__ */ new Set();
    const addLocale = (locale) => {
      const normalized = normalizeLocaleCode(locale);
      if (!normalized) {
        return;
      }
      const variants = [normalized];
      const separatorIndex = normalized.indexOf("-");
      if (separatorIndex > 0) {
        variants.push(normalized.slice(0, separatorIndex));
      }
      for (const variant of variants) {
        if (seen.has(variant)) {
          continue;
        }
        seen.add(variant);
        candidates.push(variant);
      }
    };
    addLocale(preferredLocale);
    addLocale(fallbackLocale);
    addLocale("en");
    return candidates;
  }
  function resolveLocalizedTextList(value, preferredLocale, fallbackLocale) {
    if (Array.isArray(value)) {
      return Array.from(
        new Set(
          value.map((entry) => typeof entry === "string" ? normalizeWhitespace$1(entry) : "").filter((entry) => entry.length > 0)
        )
      );
    }
    if (!value || typeof value !== "object") {
      return [];
    }
    for (const locale of getLocaleCandidates(preferredLocale, fallbackLocale)) {
      const entries = value[locale];
      if (!Array.isArray(entries)) {
        continue;
      }
      const normalizedEntries = Array.from(
        new Set(
          entries.map((entry) => typeof entry === "string" ? normalizeWhitespace$1(entry) : "").filter((entry) => entry.length > 0)
        )
      );
      if (normalizedEntries.length > 0) {
        return normalizedEntries;
      }
    }
    return [];
  }
  function mergeLocalizedTextLists(base, override) {
    if (!base && !override) {
      return void 0;
    }
    const merged = {};
    const localeKeys = /* @__PURE__ */ new Set([
      ...Object.keys(base ?? {}),
      ...Object.keys(override ?? {})
    ]);
    for (const localeKey of localeKeys) {
      const entries = resolveLocalizedTextList(
        {
          [localeKey]: [
            ...base?.[localeKey] ?? [],
            ...override?.[localeKey] ?? []
          ]
        },
        localeKey
      );
      if (entries.length > 0) {
        merged[localeKey] = entries;
      }
    }
    return Object.keys(merged).length > 0 ? merged : void 0;
  }
  function mergeGeometryPolicy(base, override) {
    if (!base && !override) {
      return void 0;
    }
    return {
      ...base,
      ...override,
      allowed: override?.allowed ?? base?.allowed
    };
  }
  function mergeServicePolicy(base, override) {
    if (!base && !override) {
      return void 0;
    }
    return {
      required: override?.required ?? base?.required,
      recommended: override?.recommended ?? base?.recommended,
      discouraged: override?.discouraged ?? base?.discouraged,
      forbidden: override?.forbidden ?? base?.forbidden
    };
  }
  function mergeAddressPolicy(base, override) {
    if (!base && !override) {
      return void 0;
    }
    return {
      ...base,
      ...override
    };
  }
  function mergePresenceRequirement(current, override, legacyOverride) {
    if (override !== void 0) {
      return override;
    }
    if (legacyOverride !== void 0) {
      return legacyOverride;
    }
    return current;
  }
  function readLegacyBooleanFlag(source, key) {
    if (!source || typeof source !== "object") {
      return void 0;
    }
    const value = source[key];
    return typeof value === "boolean" ? value : void 0;
  }
  function readLegacyPresenceRequirement(params) {
    const legacyValue = readLegacyBooleanFlag(params.source, params.key);
    if (legacyValue === true) {
      return params.trueValue;
    }
    if (legacyValue === false) {
      return params.falseValue;
    }
    return void 0;
  }
  function mergeCategoryStandardIntoPolicy(current, standard) {
    return {
      ...current,
      geometry: mergeGeometryPolicy(current.geometry, standard.geometry),
      lockLevel: standard.lockLevel ?? current.lockLevel,
      cityInVenueName: standard.cityInVenueName ?? current.cityInVenueName,
      phone: mergePresenceRequirement(
        current.phone,
        standard.phone,
        readLegacyPresenceRequirement({
          source: standard,
          key: "requirePhone",
          trueValue: "required"
        })
      ),
      url: mergePresenceRequirement(
        current.url,
        standard.url,
        readLegacyPresenceRequirement({
          source: standard,
          key: "requireUrl",
          trueValue: "required"
        })
      ),
      openingHours: mergePresenceRequirement(
        current.openingHours,
        standard.openingHours,
        readLegacyPresenceRequirement({
          source: standard,
          key: "requireOpeningHours",
          trueValue: "required"
        })
      ),
      navigationPoints: mergePresenceRequirement(
        current.navigationPoints,
        standard.navigationPoints
      ),
      externalProviderIds: mergePresenceRequirement(
        current.externalProviderIds,
        standard.externalProviderIds,
        readLegacyPresenceRequirement({
          source: standard,
          key: "requireExternalProvider",
          trueValue: "required",
          falseValue: "forbidden"
        })
      ),
      services: mergeServicePolicy(current.services, standard.services),
      address: mergeAddressPolicy(current.address, standard.address),
      editorNotes: mergeLocalizedTextLists(current.editorNotes, standard.editorNotes)
    };
  }
  function mergeChainPolicyIntoPolicy(current, chainPolicy) {
    if (!chainPolicy) {
      return current;
    }
    return {
      ...current,
      geometry: mergeGeometryPolicy(current.geometry, chainPolicy.geometry),
      lockLevel: chainPolicy.lockLevel ?? current.lockLevel,
      cityInVenueName: chainPolicy.cityInVenueName ?? current.cityInVenueName,
      phone: mergePresenceRequirement(
        current.phone,
        chainPolicy.phone,
        readLegacyPresenceRequirement({
          source: chainPolicy,
          key: "requirePhone",
          trueValue: "required"
        })
      ),
      url: mergePresenceRequirement(
        current.url,
        chainPolicy.url,
        readLegacyPresenceRequirement({
          source: chainPolicy,
          key: "requireUrl",
          trueValue: "required"
        })
      ),
      openingHours: mergePresenceRequirement(
        current.openingHours,
        chainPolicy.openingHours,
        readLegacyPresenceRequirement({
          source: chainPolicy,
          key: "requireOpeningHours",
          trueValue: "required"
        })
      ),
      navigationPoints: mergePresenceRequirement(
        current.navigationPoints,
        chainPolicy.navigationPoints
      ),
      externalProviderIds: mergePresenceRequirement(
        current.externalProviderIds,
        chainPolicy.externalProviderIds,
        readLegacyPresenceRequirement({
          source: chainPolicy,
          key: "requireExternalProvider",
          trueValue: "required",
          falseValue: "forbidden"
        })
      ),
      services: mergeServicePolicy(current.services, chainPolicy.services),
      address: mergeAddressPolicy(current.address, chainPolicy.address)
    };
  }
  function resolveEffectivePolicy(params) {
    let effective = {};
    for (const standard of params.categoryStandards) {
      effective = mergeCategoryStandardIntoPolicy(effective, standard);
    }
    effective = mergeChainPolicyIntoPolicy(effective, params.chainPolicy);
    return effective;
  }
  const SCRIPT_ID = "wme-place-harmonizer-row-edition";
  const SCRIPT_NAME = "WME Place Harmonizer ROW Edition";
  function getSdkHostWindow() {
    try {
      if (typeof unsafeWindow !== "undefined") {
        return unsafeWindow;
      }
    } catch {
    }
    return window;
  }
  function getWmeSdk() {
    const hostWindow = getSdkHostWindow();
    if (typeof hostWindow.getWmeSdk !== "function") {
      return null;
    }
    try {
      return hostWindow.getWmeSdk({
        scriptId: SCRIPT_ID,
        scriptName: SCRIPT_NAME
      });
    } catch {
      return null;
    }
  }
  function readNumericValue$1(value) {
    return typeof value === "number" && Number.isFinite(value) ? value : void 0;
  }
  function getCurrentEditorLockLevel() {
    const sdk = getWmeSdk();
    const userInfoCandidates = [
      (() => {
        try {
          return sdk?.State?.getUserInfo?.();
        } catch {
          return void 0;
        }
      })(),
      sdk?.State?.userInfo
    ];
    for (const userInfo of userInfoCandidates) {
      const rank = readNumericValue$1(userInfo?.rank);
      if (typeof rank === "number" && Number.isInteger(rank) && rank >= 0) {
        return rank + 1;
      }
    }
    return void 0;
  }
  function getCurrentWmeLocale() {
    const sdk = getWmeSdk();
    try {
      const locale = sdk?.Settings?.getLocale?.();
      return typeof locale?.localeCode === "string" ? locale.localeCode.trim() || void 0 : void 0;
    } catch {
      return void 0;
    }
  }
  async function waitForWmeSdkReady(timeoutMs = 2e4) {
    const hostWindow = getSdkHostWindow();
    if (typeof document === "undefined") {
      throw new Error("Document is not available");
    }
    if (document.readyState === "loading") {
      logger.info("Waiting for DOMContentLoaded before checking SDK");
      await new Promise((resolve) => {
        document.addEventListener("DOMContentLoaded", () => resolve(), { once: true });
      });
    }
    if (!hostWindow.SDK_INITIALIZED) {
      throw new Error("SDK_INITIALIZED is not available on host window");
    }
    logger.info("Waiting for WME SDK initialization");
    const timeoutPromise = new Promise((_, reject) => {
      window.setTimeout(() => {
        reject(new Error("Timed out waiting for WME SDK initialization"));
      }, timeoutMs);
    });
    await Promise.race([hostWindow.SDK_INITIALIZED, timeoutPromise]);
    const sdk = getWmeSdk();
    if (!sdk) {
      throw new Error("WME SDK initialized, but getWmeSdk() returned no SDK instance");
    }
    logger.info("WME SDK detected via SDK_INITIALIZED/getWmeSdk");
    return sdk;
  }
  async function waitForInitialMapDataLoaded(timeoutMs = 15e3) {
    const sdk = getWmeSdk();
    if (!sdk) {
      throw new Error("WME SDK not available while waiting for map data");
    }
    if (sdk.State?.isInitialMapDataLoaded?.()) {
      logger.info("Initial map data is already loaded");
      return;
    }
    logger.info("Waiting for initial map data load");
    const timeoutPromise = new Promise((_, reject) => {
      window.setTimeout(() => {
        reject(new Error("Timed out waiting for initial map data"));
      }, timeoutMs);
    });
    await Promise.race([
      sdk.Events.once({ eventName: "wme-map-initial-data-loaded" }),
      timeoutPromise
    ]);
    logger.info("Initial map data loaded");
  }
  function processCurrentSelection(onVenue, onNonVenue) {
    const sdk = getWmeSdk();
    if (!sdk) {
      logger.warn("Cannot process selection: SDK unavailable");
      onNonVenue();
      return;
    }
    const selection = sdk.Editing.getSelection();
    if (!selection) {
      logger.info("No current selection");
      onNonVenue();
      return;
    }
    logger.info(
      `Selection detected: type=${selection.objectType}, ids=${JSON.stringify(selection.ids)}`
    );
    if (selection.objectType !== "venue") {
      logger.info(`Current selection is not a venue: ${selection.objectType}`);
      onNonVenue();
      return;
    }
    const venueId = selection.ids?.[0];
    if (!venueId) {
      logger.warn("Venue selection exists, but no venue id was found");
      onNonVenue();
      return;
    }
    const venue = sdk.DataModel.Venues.getById({ venueId });
    if (!venue) {
      logger.warn(`Selected venue ${venueId} not found in SDK data model`);
      onNonVenue();
      return;
    }
    logger.info(`Venue selected via SDK: ${venue.name} (${venueId})`);
    onVenue(venue);
  }
  function onVenueSelected(onVenue, onNonVenue) {
    const sdk = getWmeSdk();
    if (!sdk) {
      logger.warn("WME SDK not available when registering venue selection listener");
      return;
    }
    sdk.Events.on({
      eventName: "wme-selection-changed",
      eventHandler: () => {
        logger.info("Received wme-selection-changed event");
        processCurrentSelection(onVenue, onNonVenue);
      }
    });
    logger.info("Venue selection listener registered via SDK");
    processCurrentSelection(onVenue, onNonVenue);
  }
  const COUNTRY_NAME_TO_CODE = {
    netherlands: "nl",
    nederland: "nl",
    "the netherlands": "nl"
  };
  const COUNTRY_ALPHA_FIELDS = [
    "code",
    "abbr",
    "iso2",
    "iso",
    "iso3",
    "alpha2",
    "alpha3",
    "countryCode",
    "isoCode",
    "id",
    "countryId",
    "countryID"
  ];
  const COUNTRY_NAME_FIELDS = [
    "name",
    "fullName",
    "displayName"
  ];
  function normalizeAlphaCountryCode(value) {
    if (typeof value !== "string") {
      return void 0;
    }
    const normalized = normalizeCountryCode(value);
    if (!normalized) {
      return void 0;
    }
    if (!/^[a-z]{2,3}$/.test(normalized)) {
      return void 0;
    }
    const candidates = getCountryCodeCandidates(normalized);
    return candidates[0];
  }
  function resolveCountryCodeFromName(value) {
    if (typeof value !== "string") {
      return void 0;
    }
    const key = value.trim().toLowerCase();
    return COUNTRY_NAME_TO_CODE[key];
  }
  function resolveCountryCodeFromRecord(record) {
    for (const field of COUNTRY_ALPHA_FIELDS) {
      const candidate = normalizeAlphaCountryCode(record[field]);
      if (candidate) {
        return candidate;
      }
    }
    for (const field of COUNTRY_NAME_FIELDS) {
      const candidate = resolveCountryCodeFromName(record[field]);
      if (candidate) {
        return candidate;
      }
    }
    return void 0;
  }
  function resolveCountryCodeFromObject(country) {
    if (!country || typeof country !== "object") {
      return void 0;
    }
    return resolveCountryCodeFromRecord(country);
  }
  function resolveCountryCodeFromCountryEntity(country) {
    const fromObject = resolveCountryCodeFromObject(country);
    if (fromObject) {
      return fromObject;
    }
    return normalizeAlphaCountryCode(country);
  }
  function isNumericLike(value) {
    return typeof value === "number" || typeof value === "string" && /^[0-9]+$/.test(value.trim());
  }
  function normalizeNumericLike(value) {
    if (typeof value === "number") {
      return value;
    }
    if (typeof value === "string" && /^[0-9]+$/.test(value.trim())) {
      return Number(value);
    }
    return void 0;
  }
  function findCountryById(countryId) {
    const sdk = getWmeSdk();
    const countries = sdk?.DataModel?.Countries;
    if (!countries || !isNumericLike(countryId)) {
      return void 0;
    }
    const normalizedId = normalizeNumericLike(countryId);
    if (normalizedId === void 0) {
      return void 0;
    }
    const lookups = [
      () => countries.getById?.({ countryId: normalizedId }),
      () => countries.getById?.({ id: normalizedId }),
      () => countries.getById?.(normalizedId)
    ];
    for (const lookup of lookups) {
      try {
        const result = lookup();
        if (result) {
          return result;
        }
      } catch {
      }
    }
    const allCountries = countries.getAll?.();
    if (!Array.isArray(allCountries)) {
      return void 0;
    }
    return allCountries.find((country) => {
      const id = country?.id ?? country?.countryId ?? country?.attributes?.id ?? country?.attributes?.countryId;
      if (typeof id === "number" && typeof normalizedId === "number") {
        return id === normalizedId;
      }
      if (typeof id === "string") {
        return id.trim() === String(normalizedId);
      }
      return false;
    });
  }
  function resolveCountryCodeFromCountryId(countryId) {
    const country = findCountryById(countryId);
    return resolveCountryCodeFromCountryEntity(country);
  }
  function resolveVenueCountryCode(venue) {
    const sdk = getWmeSdk();
    const venueId = typeof venue?.id === "string" && venue.id.trim().length > 0 ? venue.id : void 0;
    if (!sdk || !venueId) {
      return void 0;
    }
    try {
      const address = sdk.DataModel?.Venues?.getAddress?.({ venueId });
      return resolveCountryCodeFromCountryEntity(address?.country);
    } catch {
      return void 0;
    }
  }
  function mapGeometry(geometry) {
    if (geometry?.type === "Point" || geometry?.type === "point") {
      return "point";
    }
    if (geometry?.type === "Polygon" || geometry?.type === "polygon") {
      return "polygon";
    }
    return void 0;
  }
  function mapOpeningHours(openingHours) {
    if (!Array.isArray(openingHours)) {
      return [];
    }
    return openingHours.filter((entry) => entry && Array.isArray(entry.days)).map((entry) => ({
      days: entry.days,
      fromHour: entry.fromHour,
      toHour: entry.toHour
    }));
  }
  function mapNavigationPointCount(venue) {
    const candidates = [venue?.navigationPoints, venue?.navigationPoint];
    for (const candidate of candidates) {
      if (Array.isArray(candidate)) {
        return candidate.filter((point) => point !== null && point !== void 0).length;
      }
      if (candidate && typeof candidate === "object") {
        return 1;
      }
    }
    return void 0;
  }
  function readNumericValue(value) {
    return typeof value === "number" && Number.isFinite(value) ? value : void 0;
  }
  function readStringValue(value) {
    if (typeof value === "string") {
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : void 0;
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
    return void 0;
  }
  function firstString(...candidates) {
    for (const candidate of candidates) {
      const value = readStringValue(candidate);
      if (value) {
        return value;
      }
    }
    return void 0;
  }
  function mapLockLevel(venue) {
    const lockRank = readNumericValue(venue?.lockRank);
    return typeof lockRank === "number" && Number.isInteger(lockRank) && lockRank >= 0 ? lockRank + 1 : void 0;
  }
  function mapCategories(venue) {
    return normalizeCategoryKeys(
      Array.isArray(venue?.categories) ? venue.categories : []
    );
  }
  function getVenueAddressFromSdk(venue) {
    const sdk = getWmeSdk();
    const venueId = readStringValue(venue?.id);
    if (!sdk || !venueId) {
      return void 0;
    }
    try {
      return sdk.DataModel?.Venues?.getAddress?.({ venueId });
    } catch {
      return void 0;
    }
  }
  function mapAddress(venue) {
    const sdkAddress = getVenueAddressFromSdk(venue);
    if (!sdkAddress || sdkAddress.isEmpty) {
      return void 0;
    }
    const address = {
      city: readStringValue(sdkAddress.city?.name),
      street: firstString(
        sdkAddress.street?.name,
        sdkAddress.street?.englishName
      ),
      houseNumber: readStringValue(sdkAddress.houseNumber)
    };
    return address.city || address.street || address.houseNumber ? address : void 0;
  }
  function mapVenueToPlaceLike(venue) {
    return {
      name: venue.name ?? "",
      categories: mapCategories(venue),
      brand: venue.brand ?? void 0,
      aliases: venue.aliases ?? [],
      phone: venue.phone ?? void 0,
      url: venue.url ?? void 0,
      geometry: mapGeometry(venue.geometry),
      lockLevel: mapLockLevel(venue),
      services: venue.services ?? [],
      openingHours: mapOpeningHours(venue.openingHours),
      navigationPointCount: mapNavigationPointCount(venue),
      externalProviderIds: venue.externalProviderIds ?? [],
      address: mapAddress(venue),
      country: resolveVenueCountryCode(venue)
    };
  }
  let runtimeLocaleCode = "en";
  let runtimeMessages = {};
  function interpolate(template, params) {
    if (!params) {
      return template;
    }
    return template.replace(/\{([a-zA-Z0-9_.-]+)\}/g, (_, key) => {
      const value = params[key];
      return value === void 0 ? `{${key}}` : String(value);
    });
  }
  function setRuntimeLocale(localeFile) {
    runtimeLocaleCode = normalizeLocaleCode(localeFile.locale) ?? "en";
    runtimeMessages = { ...localeFile.messages };
  }
  function getRuntimeLocaleCode() {
    return runtimeLocaleCode;
  }
  function t(key, params) {
    const template = runtimeMessages[key] ?? key;
    return interpolate(template, params);
  }
  const DUTCH_TWO_DIGIT_AREA_CODES = /* @__PURE__ */ new Set([
    "10",
    "13",
    "15",
    "20",
    "23",
    "24",
    "26",
    "30",
    "33",
    "35",
    "36",
    "38",
    "40",
    "43",
    "45",
    "46",
    "50",
    "53",
    "55",
    "58",
    "70",
    "71",
    "72",
    "73",
    "74",
    "75",
    "76",
    "77",
    "78",
    "79",
    "88"
  ]);
  function isSupportedDutchNationalNumber(nationalDigits) {
    if (!/^\d{9}$/.test(nationalDigits)) {
      return false;
    }
    const twoDigitPrefix = nationalDigits.slice(0, 2);
    if (DUTCH_TWO_DIGIT_AREA_CODES.has(twoDigitPrefix)) {
      return true;
    }
    return /^[1-57]\d{8}$/.test(nationalDigits);
  }
  function hasText$2(value) {
    return typeof value === "string" && value.trim().length > 0;
  }
  function normalizePhoneInput(phone) {
    const trimmed = phone.trim();
    if (trimmed.startsWith("+")) {
      return `+${trimmed.slice(1).replace(/\D+/g, "")}`;
    }
    if (trimmed.startsWith("00")) {
      return `00${trimmed.slice(2).replace(/\D+/g, "")}`;
    }
    return trimmed.replace(/\D+/g, "");
  }
  function normalizeInternationalSeparators(phone) {
    const trimmed = phone.trim();
    if (!trimmed.startsWith("+") && !trimmed.startsWith("00")) {
      return void 0;
    }
    const normalized = trimmed.replace(/^00/, "+").replace(/[()./\\-]+/g, " ").replace(/\s+/g, " ").replace(/^\+\s+/, "+").trim();
    return normalized.length > 0 ? normalized : void 0;
  }
  function getValidationRegexes$1(formatting) {
    const patterns = formatting?.validationPatterns;
    if (!Array.isArray(patterns) || patterns.length === 0) {
      return [];
    }
    return patterns.flatMap((pattern) => {
      if (!hasText$2(pattern)) {
        return [];
      }
      try {
        return [new RegExp(pattern)];
      } catch {
        return [];
      }
    });
  }
  function isPhoneFormatValid(phone, formatting) {
    const validationRegexes = getValidationRegexes$1(formatting);
    if (validationRegexes.length === 0) {
      return true;
    }
    const normalizedPhone = phone.trim();
    return validationRegexes.some((regex) => regex.test(normalizedPhone));
  }
  function formatDutchNationalNumber(nationalDigits) {
    if (nationalDigits.length === 0) {
      return void 0;
    }
    if ((nationalDigits.startsWith("800") || nationalDigits.startsWith("900")) && nationalDigits.length > 3) {
      return `0${nationalDigits.slice(0, 3)} ${nationalDigits.slice(3)}`;
    }
    if (nationalDigits.startsWith("6") && nationalDigits.length === 9) {
      return `+31 6 ${nationalDigits.slice(1)}`;
    }
    if (!isSupportedDutchNationalNumber(nationalDigits)) {
      return void 0;
    }
    const areaCodeLength = DUTCH_TWO_DIGIT_AREA_CODES.has(
      nationalDigits.slice(0, 2)
    ) ? 2 : 3;
    return `+31 ${nationalDigits.slice(0, areaCodeLength)} ${nationalDigits.slice(areaCodeLength)}`;
  }
  function suggestDutchPhoneFormat(phone, formatting) {
    const countryCode = formatting?.countryCode?.trim() ?? "+31";
    if (countryCode !== "+31") {
      return void 0;
    }
    const normalized = normalizePhoneInput(phone);
    if (!normalized) {
      return void 0;
    }
    if (normalized.startsWith("0800") || normalized.startsWith("0900")) {
      return formatDutchNationalNumber(normalized.slice(1));
    }
    if (normalized.startsWith("+31")) {
      const nationalDigits = normalized.slice(3).replace(/^0/, "");
      return formatDutchNationalNumber(nationalDigits);
    }
    if (normalized.startsWith("0031")) {
      const nationalDigits = normalized.slice(4).replace(/^0/, "");
      return formatDutchNationalNumber(nationalDigits);
    }
    if (normalized.startsWith("0")) {
      return formatDutchNationalNumber(normalized.slice(1));
    }
    return void 0;
  }
  function suggestPhoneFormat(phone, formatting) {
    if (!hasText$2(phone)) {
      return void 0;
    }
    const suggestions = [
      suggestDutchPhoneFormat(phone, formatting),
      normalizeInternationalSeparators(phone)
    ];
    const trimmedPhone = phone.trim();
    for (const suggestion of suggestions) {
      if (!hasText$2(suggestion) || suggestion === trimmedPhone) {
        continue;
      }
      if (isPhoneFormatValid(suggestion, formatting)) {
        return suggestion;
      }
    }
    return void 0;
  }
  function buildPhoneFormatIssue(phone, formatting) {
    if (!hasText$2(phone) || isPhoneFormatValid(phone, formatting)) {
      return void 0;
    }
    const message = hasText$2(formatting?.validationMessage) ? formatting.validationMessage.trim() : hasText$2(formatting?.validationMessageKey) ? t(formatting.validationMessageKey.trim()) : t("issue.phone.format.invalid");
    const suggestedPhone = suggestPhoneFormat(phone, formatting);
    return {
      field: "phone",
      severity: "warning",
      message,
      currentValue: phone,
      expectedValue: suggestedPhone,
      ruleId: "phoneValidation.format"
    };
  }
  function hasText$1(value) {
    return typeof value === "string" && value.trim().length > 0;
  }
  function getValidationRegexes(formatting) {
    const patterns = formatting?.validationPatterns;
    if (!Array.isArray(patterns) || patterns.length === 0) {
      return [];
    }
    return patterns.flatMap((pattern) => {
      if (!hasText$1(pattern)) {
        return [];
      }
      try {
        return [new RegExp(pattern)];
      } catch {
        return [];
      }
    });
  }
  function isUrlFormatValid(url, formatting) {
    const validationRegexes = getValidationRegexes(formatting);
    if (validationRegexes.length === 0) {
      return true;
    }
    const normalizedUrl = url.trim();
    return validationRegexes.some((regex) => regex.test(normalizedUrl));
  }
  function stripProtocol(url) {
    const trimmed = url.trim();
    const normalized = trimmed.replace(/^https?:\/\//i, "");
    if (normalized === trimmed || normalized.length === 0) {
      return void 0;
    }
    return normalized;
  }
  function addHttpsProtocol(url) {
    const trimmed = url.trim();
    if (trimmed.length === 0 || /^[A-Za-z][A-Za-z\d+\-.]*:\/\//.test(trimmed)) {
      return void 0;
    }
    return `https://${trimmed}`;
  }
  function suggestUrlFormat(url, formatting) {
    if (!hasText$1(url)) {
      return void 0;
    }
    const trimmedUrl = url.trim();
    const suggestions = [stripProtocol(trimmedUrl), addHttpsProtocol(trimmedUrl)];
    for (const suggestion of suggestions) {
      if (!hasText$1(suggestion) || suggestion === trimmedUrl) {
        continue;
      }
      if (isUrlFormatValid(suggestion, formatting)) {
        return suggestion;
      }
    }
    return void 0;
  }
  function buildUrlFormatIssue(url, formatting) {
    if (!hasText$1(url) || isUrlFormatValid(url, formatting)) {
      return void 0;
    }
    const message = hasText$1(formatting?.validationMessage) ? formatting.validationMessage.trim() : hasText$1(formatting?.validationMessageKey) ? t(formatting.validationMessageKey.trim()) : t("issue.url.format.invalid");
    const suggestedUrl = suggestUrlFormat(url, formatting);
    return {
      field: "url",
      severity: "warning",
      message,
      currentValue: url,
      expectedValue: suggestedUrl,
      ruleId: "urlValidation.format"
    };
  }
  function arraysEqual$1(a = [], b = []) {
    if (a.length !== b.length) {
      return false;
    }
    const left = [...a].sort();
    const right = [...b].sort();
    return left.every((value, index) => value === right[index]);
  }
  function normalizeExternalProviderIds(ids) {
    if (!Array.isArray(ids)) {
      return [];
    }
    return Array.from(
      new Set(
        ids.map((id) => String(id).trim()).filter((id) => id.length > 0)
      )
    );
  }
  function normalizeAliases(aliases) {
    if (!Array.isArray(aliases)) {
      return [];
    }
    return Array.from(
      new Set(
        aliases.map((alias) => normalizeWhitespace(String(alias))).filter((alias) => alias.length > 0)
      )
    );
  }
  const ADDRESS_FIELD_METADATA = [
    { key: "city", labelKey: "field.address.city" },
    { key: "street", labelKey: "field.address.street" },
    { key: "houseNumber", labelKey: "field.address.houseNumber" }
  ];
  function hasText(value) {
    return typeof value === "string" && value.trim().length > 0;
  }
  function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  function normalizeWhitespace(value) {
    return value.replace(/\s+/g, " ").trim();
  }
  function containsWholeCityName(name, city) {
    const pattern = new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRegExp(city)}([^\\p{L}\\p{N}]|$)`, "iu");
    return pattern.test(name);
  }
  function stripCityFromVenueName(name, city) {
    const trimmedName = normalizeWhitespace(name);
    const trimmedCity = normalizeWhitespace(city);
    if (!trimmedName || !trimmedCity || !containsWholeCityName(trimmedName, trimmedCity)) {
      return void 0;
    }
    const removalPatterns = [
      new RegExp(`\\s*\\(${escapeRegExp(trimmedCity)}\\)\\s*$`, "iu"),
      new RegExp(`\\s*[,\\-|/|]\\s*${escapeRegExp(trimmedCity)}\\s*$`, "iu"),
      new RegExp(`^${escapeRegExp(trimmedCity)}\\s*[-,:/|]\\s*`, "iu"),
      new RegExp(`\\s+${escapeRegExp(trimmedCity)}\\s*$`, "iu"),
      new RegExp(`^${escapeRegExp(trimmedCity)}\\s+`, "iu")
    ];
    for (const pattern of removalPatterns) {
      const updated = normalizeWhitespace(trimmedName.replace(pattern, " "));
      if (updated && updated !== trimmedName) {
        return updated;
      }
    }
    return void 0;
  }
  function buildPresenceIssue(params) {
    const { field, rulePrefix, requirement, hasValue, currentValue, messages } = params;
    const ruleId = `${rulePrefix}.${requirement}`;
    if (requirement === "required" && !hasValue) {
      return {
        field,
        severity: "error",
        message: messages.required,
        expectedValue: "present",
        ruleId
      };
    }
    if (requirement === "recommended" && !hasValue) {
      return {
        field,
        severity: "warning",
        message: messages.recommended,
        expectedValue: "present",
        ruleId
      };
    }
    if (requirement === "discouraged" && hasValue) {
      return {
        field,
        severity: "warning",
        message: messages.discouraged,
        currentValue,
        expectedValue: "absent",
        ruleId
      };
    }
    if (requirement === "forbidden" && hasValue) {
      return {
        field,
        severity: "error",
        message: messages.forbidden,
        currentValue,
        expectedValue: "absent",
        ruleId
      };
    }
  }
  function pushAddressIssue(params) {
    const { issues, fieldKey, labelKey, requirement, currentValue } = params;
    const label = t(labelKey);
    const issue = buildPresenceIssue({
      field: `address.${fieldKey}`,
      rulePrefix: `address.${fieldKey}`,
      requirement,
      hasValue: hasText(currentValue),
      currentValue,
      messages: {
        required: t("issue.address.required", { field: label }),
        recommended: t("issue.address.recommended", { field: label }),
        discouraged: t("issue.address.discouraged", { field: label }),
        forbidden: t("issue.address.forbidden", { field: label })
      }
    });
    if (issue) {
      issues.push(issue);
    }
  }
  function evaluatePlace(place, policy, chain, options) {
    const issues = [];
    const aliases = normalizeAliases(place.aliases);
    const runtimeLocaleCode2 = getRuntimeLocaleCode();
    const categoryEditorNotes = resolveLocalizedTextList(
      policy.editorNotes,
      runtimeLocaleCode2
    );
    const chainEditorNotes = resolveLocalizedTextList(
      chain?.editorNotes,
      runtimeLocaleCode2
    );
    const externalProviderIds = normalizeExternalProviderIds(
      place.externalProviderIds
    );
    const hasExternalProviders = externalProviderIds.length > 0;
    const cityInVenueNameRule = options?.cityInVenueNameRule;
    const isCityInVenueNameEnabled = policy.cityInVenueName ?? cityInVenueNameRule?.enabled ?? false;
    const cityInVenueNameSeverity = cityInVenueNameRule?.severity ?? "warning";
    const seenEditorNotes = /* @__PURE__ */ new Set();
    const pushEditorNote = (message, ruleId) => {
      if (seenEditorNotes.has(message)) {
        return;
      }
      seenEditorNotes.add(message);
      issues.push({
        field: "",
        severity: "info",
        message,
        ruleId
      });
    };
    const expectedName = chain?.standard?.name;
    if (expectedName && place.name.trim() !== expectedName.trim()) {
      issues.push({
        field: "name",
        severity: "warning",
        message: t("issue.name.shouldBe", { expectedName }),
        currentValue: place.name,
        expectedValue: expectedName,
        ruleId: "nameNormalization"
      });
    }
    if (!expectedName && isCityInVenueNameEnabled && hasText(place.address?.city)) {
      const suggestedName = stripCityFromVenueName(place.name, place.address.city);
      if (suggestedName) {
        issues.push({
          field: "name",
          severity: cityInVenueNameSeverity,
          message: t("issue.name.cityShouldBeExcluded", {
            cityName: place.address.city
          }),
          currentValue: place.name,
          expectedValue: suggestedName,
          ruleId: "cityInVenueName"
        });
      }
    }
    if (policy.geometry && place.geometry) {
      if (policy.geometry.required) {
        if (place.geometry !== policy.geometry.required) {
          issues.push({
            field: "geometry",
            severity: "error",
            message: t("issue.geometry.required", {
              geometry: policy.geometry.required
            }),
            currentValue: place.geometry,
            expectedValue: policy.geometry.required,
            ruleId: "geometry.required"
          });
        }
      } else if (policy.geometry.recommended && place.geometry !== policy.geometry.recommended) {
        issues.push({
          field: "geometry",
          severity: "warning",
          message: t("issue.geometry.recommended", {
            geometry: policy.geometry.recommended
          }),
          currentValue: place.geometry,
          expectedValue: policy.geometry.recommended,
          ruleId: "geometry.recommended"
        });
      }
    }
    if (policy.lockLevel !== void 0 && place.lockLevel !== void 0 && place.lockLevel < policy.lockLevel) {
      issues.push({
        field: "lockLevel",
        severity: "warning",
        message: t("issue.lockLevel.minimum", {
          lockLevel: policy.lockLevel
        }),
        currentValue: place.lockLevel,
        expectedValue: policy.lockLevel,
        ruleId: "lockLevelRecommendation"
      });
    }
    if (policy.phone) {
      const issue = buildPresenceIssue({
        field: "phone",
        rulePrefix: "phoneValidation",
        requirement: policy.phone,
        hasValue: hasText(place.phone),
        currentValue: place.phone,
        messages: {
          required: t("issue.phone.required"),
          recommended: t("issue.phone.recommended"),
          discouraged: t("issue.phone.discouraged"),
          forbidden: t("issue.phone.forbidden")
        }
      });
      if (issue) {
        issues.push(issue);
      }
    }
    if (hasText(place.phone)) {
      const issue = buildPhoneFormatIssue(place.phone, options?.phoneFormatting);
      if (issue) {
        issues.push(issue);
      }
    }
    if (policy.url) {
      const issue = buildPresenceIssue({
        field: "url",
        rulePrefix: "urlValidation",
        requirement: policy.url,
        hasValue: hasText(place.url),
        currentValue: place.url,
        messages: {
          required: t("issue.url.required"),
          recommended: t("issue.url.recommended"),
          discouraged: t("issue.url.discouraged"),
          forbidden: t("issue.url.forbidden")
        }
      });
      if (issue) {
        issues.push(issue);
      }
    }
    if (hasText(place.url)) {
      const issue = buildUrlFormatIssue(place.url, options?.urlFormatting);
      if (issue) {
        issues.push(issue);
      }
    }
    const expectedUrl = chain?.standard?.url;
    if (expectedUrl && (place.url ?? "").trim() !== expectedUrl.trim()) {
      issues.push({
        field: "url",
        severity: "warning",
        message: t("issue.url.shouldBe", { expectedUrl }),
        currentValue: place.url,
        expectedValue: expectedUrl,
        ruleId: "urlNormalization"
      });
    }
    if (policy.openingHours) {
      const issue = buildPresenceIssue({
        field: "openingHours",
        rulePrefix: "openingHours",
        requirement: policy.openingHours,
        hasValue: Boolean(place.openingHours && place.openingHours.length > 0),
        currentValue: place.openingHours,
        messages: {
          required: t("issue.openingHours.required"),
          recommended: t("issue.openingHours.recommended"),
          discouraged: t("issue.openingHours.discouraged"),
          forbidden: t("issue.openingHours.forbidden")
        }
      });
      if (issue) {
        issues.push(issue);
      }
    }
    if (policy.navigationPoints && place.geometry === "polygon") {
      const navigationPointCount = typeof place.navigationPointCount === "number" && place.navigationPointCount > 0 ? place.navigationPointCount : 0;
      const issue = buildPresenceIssue({
        field: "navigationPoints",
        rulePrefix: "navigationPoints",
        requirement: policy.navigationPoints,
        hasValue: navigationPointCount > 0,
        currentValue: navigationPointCount,
        messages: {
          required: t("issue.navigationPoints.required"),
          recommended: t("issue.navigationPoints.recommended"),
          discouraged: t("issue.navigationPoints.discouraged"),
          forbidden: t("issue.navigationPoints.forbidden")
        }
      });
      if (issue) {
        issues.push(issue);
      }
    }
    const expectedOpeningHours = chain?.standard?.openingHoursTemplate;
    if (expectedOpeningHours && expectedOpeningHours.length > 0) {
      const normalizeHours = (hours) => hours.map((entry) => JSON.stringify(entry)).sort();
      const currentOpeningHours = place.openingHours ?? [];
      if (currentOpeningHours.length === 0) {
        issues.push({
          field: "openingHours",
          severity: "warning",
          message: t("issue.openingHours.templateMissing"),
          currentValue: currentOpeningHours,
          expectedValue: expectedOpeningHours,
          ruleId: "openingHours.template"
        });
      } else {
        const current = normalizeHours(currentOpeningHours);
        const expected = normalizeHours(expectedOpeningHours);
        if (!arraysEqual$1(current, expected)) {
          issues.push({
            field: "openingHours",
            severity: "warning",
            message: t("issue.openingHours.templateDifferent"),
            currentValue: currentOpeningHours,
            expectedValue: expectedOpeningHours,
            ruleId: "openingHours.template"
          });
        }
      }
    }
    const requiredAliases = normalizeAliases(chain?.standard?.aliases);
    const optionalAliases = normalizeAliases(chain?.standard?.optionalAliases);
    const normalizedCurrentAliases = new Set(
      aliases.map((alias) => alias.toLocaleLowerCase())
    );
    for (const requiredAlias of requiredAliases) {
      if (normalizedCurrentAliases.has(requiredAlias.toLocaleLowerCase())) {
        continue;
      }
      issues.push({
        field: "aliases",
        severity: "warning",
        message: t("issue.alias.requiredMissing", { alias: requiredAlias }),
        groupKey: "aliases.suggested",
        groupMessage: t("issue.alias.groupMissing"),
        currentValue: aliases,
        expectedValue: requiredAlias,
        ruleId: `aliases.suggested.${requiredAlias}`
      });
    }
    for (const optionalAlias of optionalAliases) {
      if (normalizedCurrentAliases.has(optionalAlias.toLocaleLowerCase())) {
        continue;
      }
      issues.push({
        field: "aliases",
        severity: "info",
        message: t("issue.alias.optionalSuggestion", { alias: optionalAlias }),
        groupKey: "aliases.suggested",
        groupMessage: t("issue.alias.groupMissing"),
        currentValue: aliases,
        expectedValue: optionalAlias,
        ruleId: `aliases.optional.${optionalAlias}`
      });
    }
    if (policy.externalProviderIds) {
      const issue = buildPresenceIssue({
        field: "externalProviderIds",
        rulePrefix: "externalProvider",
        requirement: policy.externalProviderIds,
        hasValue: hasExternalProviders,
        currentValue: externalProviderIds,
        messages: {
          required: t("issue.externalProvider.required"),
          recommended: t("issue.externalProvider.recommended"),
          discouraged: t("issue.externalProvider.discouraged"),
          forbidden: t("issue.externalProvider.forbidden")
        }
      });
      if (issue) {
        issues.push(issue);
      }
    }
    const expectedExternalProviderIds = chain?.standard?.externalProviderIds;
    if (expectedExternalProviderIds && (expectedExternalProviderIds.length === 0 ? hasExternalProviders : !expectedExternalProviderIds.every(
      (id) => externalProviderIds.includes(id)
    ))) {
      issues.push({
        field: "externalProviderIds",
        severity: "warning",
        message: t("issue.externalProvider.chainMismatch"),
        currentValue: externalProviderIds,
        expectedValue: expectedExternalProviderIds,
        ruleId: "externalProvider.match"
      });
    }
    if (policy.address) {
      for (const { key, labelKey } of ADDRESS_FIELD_METADATA) {
        const requirement = policy.address[key];
        if (!requirement) {
          continue;
        }
        pushAddressIssue({
          issues,
          fieldKey: key,
          labelKey,
          requirement,
          currentValue: place.address?.[key]
        });
      }
    }
    if (policy.services) {
      const services = place.services ?? [];
      if (policy.services.required) {
        for (const required of policy.services.required) {
          if (!services.includes(required)) {
            issues.push({
              field: "services",
              severity: "error",
              message: t("issue.service.requiredMissing", { service: required }),
              groupKey: "services.required",
              groupMessage: t("issue.service.groupRequiredMissing"),
              currentValue: services,
              expectedValue: required,
              ruleId: `services.required.${required}`
            });
          }
        }
      }
      if (policy.services.recommended) {
        for (const recommended of policy.services.recommended) {
          if (!services.includes(recommended)) {
            issues.push({
              field: "services",
              severity: "warning",
              message: t("issue.service.recommendedMissing", {
                service: recommended
              }),
              groupKey: "services.recommended",
              groupMessage: t("issue.service.groupRecommendedMissing"),
              currentValue: services,
              expectedValue: recommended,
              ruleId: `services.recommended.${recommended}`
            });
          }
        }
      }
      if (policy.services.discouraged) {
        for (const discouraged of policy.services.discouraged) {
          if (services.includes(discouraged)) {
            issues.push({
              field: "services",
              severity: "warning",
              message: t("issue.service.discouragedPresent", {
                service: discouraged
              }),
              groupKey: "services.discouraged",
              groupMessage: t("issue.service.groupDiscouragedPresent"),
              currentValue: services,
              expectedValue: discouraged,
              ruleId: `services.discouraged.${discouraged}`
            });
          }
        }
      }
      if (policy.services.forbidden) {
        for (const forbidden of policy.services.forbidden) {
          if (services.includes(forbidden)) {
            issues.push({
              field: "services",
              severity: "error",
              message: t("issue.service.forbiddenPresent", {
                service: forbidden
              }),
              groupKey: "services.forbidden",
              groupMessage: t("issue.service.groupForbiddenPresent"),
              currentValue: services,
              expectedValue: forbidden,
              ruleId: `services.forbidden.${forbidden}`
            });
          }
        }
      }
    }
    for (let index = 0; index < categoryEditorNotes.length; index += 1) {
      pushEditorNote(categoryEditorNotes[index], `editorNote.category.${index + 1}`);
    }
    for (let index = 0; index < chainEditorNotes.length; index += 1) {
      pushEditorNote(chainEditorNotes[index], `editorNote.chain.${index + 1}`);
    }
    return issues;
  }
  const FEATURE_EDITOR_SELECTORS = [
    "#edit-panel > div > div > div > wz-section-header",
    "#edit-panel wz-section-header"
  ];
  let featureEditorObserverRegistered = false;
  let featureEditorAnchor = null;
  let featureEditorNotifyTimer = null;
  let featureEditorObserver = null;
  function findFeatureEditorAnchor() {
    for (const selector of FEATURE_EDITOR_SELECTORS) {
      const match = document.querySelector(selector);
      if (match) {
        return match;
      }
    }
    return null;
  }
  function scheduleFeatureEditorCallback(callback) {
    if (featureEditorNotifyTimer !== null) {
      return;
    }
    featureEditorNotifyTimer = window.setTimeout(() => {
      featureEditorNotifyTimer = null;
      const anchor = findFeatureEditorAnchor();
      if (!anchor) {
        return;
      }
      featureEditorAnchor = anchor;
      logger.info("Feature editor DOM detected");
      callback();
    }, 0);
  }
  function handleFeatureEditorDomChange(callback) {
    const anchor = findFeatureEditorAnchor();
    if (!anchor) {
      featureEditorAnchor = null;
      return;
    }
    if (anchor !== featureEditorAnchor) {
      scheduleFeatureEditorCallback(callback);
    }
  }
  function onFeatureEditorOpened(callback) {
    if (typeof document === "undefined" || !document.body) {
      logger.warn("Document body not available when registering feature editor observer");
      return;
    }
    if (featureEditorObserverRegistered) {
      handleFeatureEditorDomChange(callback);
      return;
    }
    featureEditorObserver = new MutationObserver(() => {
      handleFeatureEditorDomChange(callback);
    });
    featureEditorObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
    featureEditorObserverRegistered = true;
    logger.info("Feature editor observer registered");
    handleFeatureEditorDomChange(callback);
  }
  const CONTAINER_ID = "wmeph-row-feature-editor";
  let retryTimer = null;
  function findAnchor() {
    return document.querySelector("#edit-panel > div > div > div > wz-section-header") ?? document.querySelector("#edit-panel wz-section-header");
  }
  function ensureFeatureEditorContainer() {
    let container = document.getElementById(CONTAINER_ID);
    if (container) {
      return container;
    }
    const anchor = findAnchor();
    if (!anchor) {
      logger.warn("Feature editor header not found");
      return null;
    }
    container = document.createElement("div");
    container.id = CONTAINER_ID;
    container.style.padding = "8px";
    container.style.borderBottom = "1px solid #ddd";
    container.style.marginBottom = "8px";
    anchor.parentElement?.insertBefore(container, anchor.nextSibling);
    logger.info("Feature editor harmonizer container mounted");
    return container;
  }
  function retryEnsureFeatureEditorContainer(shouldContinue, attempts = 10, delayMs = 200) {
    cancelFeatureEditorContainerRetry();
    let remaining = attempts;
    const tryMount = () => {
      if (!shouldContinue()) {
        logger.info("Feature editor mount retry cancelled because state is no longer valid");
        return;
      }
      const container = ensureFeatureEditorContainer();
      if (container) {
        retryTimer = null;
        return;
      }
      remaining -= 1;
      if (remaining <= 0) {
        logger.warn("Feature editor container could not be mounted after retries");
        retryTimer = null;
        return;
      }
      retryTimer = window.setTimeout(tryMount, delayMs);
    };
    tryMount();
  }
  function cancelFeatureEditorContainerRetry() {
    if (retryTimer !== null) {
      window.clearTimeout(retryTimer);
      retryTimer = null;
    }
  }
  function removeFeatureEditorContainer() {
    cancelFeatureEditorContainerRetry();
    const container = document.getElementById(CONTAINER_ID);
    if (container) {
      container.remove();
      logger.info("Feature editor harmonizer container removed");
    }
  }
  function getIssueGroupKey(issue) {
    return issue.groupKey ?? `${issue.field}::${issue.ruleId ?? issue.message}`;
  }
  function getProposalGroupKey(proposal) {
    return proposal.groupKey ?? `${proposal.field}::${proposal.issueRuleId ?? proposal.reason}`;
  }
  function getSeverityRank(severity) {
    if (severity === "error") {
      return 3;
    }
    if (severity === "warning") {
      return 2;
    }
    return 1;
  }
  function groupIssuesForFeatureEditor(issues, proposals) {
    const proposalGroups = /* @__PURE__ */ new Map();
    for (const proposal of proposals) {
      const key = getProposalGroupKey(proposal);
      const existing = proposalGroups.get(key);
      if (existing) {
        existing.push(proposal);
      } else {
        proposalGroups.set(key, [proposal]);
      }
    }
    const groups = /* @__PURE__ */ new Map();
    for (const issue of issues) {
      const key = getIssueGroupKey(issue);
      const existing = groups.get(key);
      if (existing) {
        existing.issues.push(issue);
        if (getSeverityRank(issue.severity) > getSeverityRank(existing.severity)) {
          existing.severity = issue.severity;
        }
        continue;
      }
      groups.set(key, {
        key,
        field: issue.field,
        severity: issue.severity,
        message: issue.groupMessage ?? issue.message,
        issues: [issue],
        proposals: proposalGroups.get(key) ?? []
      });
    }
    return Array.from(groups.values());
  }
  function getSeverityIcon(severity) {
    if (severity === "error") {
      return "❌";
    }
    if (severity === "warning") {
      return "⚠️";
    }
    return "ℹ️";
  }
  function getSeverityLabel(severity) {
    if (severity === "error") {
      return t("severity.error");
    }
    if (severity === "warning") {
      return t("severity.warning");
    }
    return t("severity.info");
  }
  function getSeverityColors(severity) {
    if (severity === "error") {
      return {
        border: "#d32f2f",
        background: "#fff5f5",
        text: "#8b1e1e"
      };
    }
    if (severity === "warning") {
      return {
        border: "#f9a825",
        background: "#fff8e1",
        text: "#8a5a00"
      };
    }
    return {
      border: "#1e88e5",
      background: "#f1f8ff",
      text: "#0b5394"
    };
  }
  function escapeHtml$1(value) {
    return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function formatDisplayValue(value) {
    const serialized = JSON.stringify(value);
    return escapeHtml$1(serialized ?? t("common.missing"));
  }
  function formatProposalValue(value, displayValue) {
    if (typeof displayValue === "string" && displayValue.trim().length > 0) {
      return escapeHtml$1(displayValue);
    }
    return formatDisplayValue(value);
  }
  function formatLinkedProposalValue(value, displayValue, valueUrl) {
    const formattedValue = formatProposalValue(value, displayValue);
    if (typeof valueUrl !== "string" || valueUrl.trim().length === 0) {
      return formattedValue;
    }
    return `
    <a
      href="${escapeHtml$1(valueUrl)}"
      target="_blank"
      rel="noopener noreferrer"
      style="color:#1a73e8;text-decoration:underline;"
    >
      ${formattedValue}
    </a>
  `;
  }
  function renderProposal(issue, proposal, index) {
    let html = "";
    html += `
    <div style="
      font-size:12px;
      margin-top:6px;
      ${index > 0 ? "padding-top:6px;border-top:1px solid #eee;" : ""}
    ">
  `;
    if (proposal.currentValue !== void 0 || (proposal.displayCurrentValue ?? "").trim().length > 0) {
      html += `
      <div>
        <b>${escapeHtml$1(t("featureEditor.current"))}:</b> ${formatProposalValue(
        proposal.currentValue,
        proposal.displayCurrentValue
      )}
      </div>
    `;
    }
    if (proposal.proposedValue !== void 0 || (proposal.displayProposedValue ?? "").trim().length > 0) {
      html += `
      <div>
        <b>${escapeHtml$1(t("featureEditor.suggested"))}:</b> ${formatLinkedProposalValue(
        proposal.proposedValue,
        proposal.displayProposedValue,
        proposal.displayProposedValueUrl
      )}
      </div>
    `;
    }
    if (proposal.reason && proposal.reason !== issue.message) {
      html += `
      <div style="color:#666;margin-top:4px;">
        ${escapeHtml$1(proposal.reason)}
      </div>
    `;
    }
    if (proposal.isApplySupported) {
      html += `
      <label style="display:block;margin-top:6px;">
        <input
          type="checkbox"
          class="wmeph-row-apply-checkbox"
          data-proposal-id="${escapeHtml$1(proposal.id ?? "")}"
        />
        ${escapeHtml$1(t("featureEditor.applyThisFix"))}
      </label>
    `;
    } else {
      const manualText = proposal.actionType === "manual-only" ? t("featureEditor.manualActionRequired") : t("featureEditor.suggestionNotApplicableYet");
      html += `
      <div style="color:#888;margin-top:6px;">
        ${escapeHtml$1(manualText)}
      </div>
    `;
    }
    html += `</div>`;
    return html;
  }
  function isExternalProviderChoiceProposal(proposal) {
    return proposal.field === "externalProviderIds" && proposal.isApplySupported && typeof proposal.externalProviderTargetId === "string" && proposal.externalProviderTargetId.trim().length > 0;
  }
  function shouldRenderAsSingleChoiceGroup(group) {
    return group.field === "externalProviderIds" && group.proposals.filter((proposal) => isExternalProviderChoiceProposal(proposal)).length > 1;
  }
  function renderExternalProviderChoiceGroup(issue, group) {
    let html = "";
    const currentValue = group.proposals[0];
    const radioName = `wmeph-row-external-provider-${group.key}`;
    if (currentValue && (currentValue.currentValue !== void 0 || (currentValue.displayCurrentValue ?? "").trim().length > 0)) {
      html += `
      <div style="font-size:12px;margin-top:6px;">
        <b>${escapeHtml$1(t("featureEditor.current"))}:</b> ${formatProposalValue(
        currentValue.currentValue,
        currentValue.displayCurrentValue
      )}
      </div>
    `;
    }
    for (let index = 0; index < group.proposals.length; index += 1) {
      const proposal = group.proposals[index];
      const suggestedValue = formatLinkedProposalValue(
        proposal.proposedValue,
        proposal.displayProposedValue,
        proposal.displayProposedValueUrl
      );
      html += `
      <label style="
        display:block;
        font-size:12px;
        margin-top:${index === 0 ? 6 : 8}px;
        ${index > 0 ? "padding-top:8px;border-top:1px solid #eee;" : ""}
      ">
        <input
          type="radio"
          name="${escapeHtml$1(radioName)}"
          class="wmeph-row-apply-radio"
          data-proposal-id="${escapeHtml$1(proposal.id ?? "")}"
        />
        <span style="margin-left:4px;">
          <b>${escapeHtml$1(t("featureEditor.suggested"))}:</b> ${suggestedValue}
        </span>
      </label>
    `;
      if (proposal.reason && proposal.reason !== issue.message) {
        html += `
        <div style="font-size:12px;color:#666;margin-top:4px;margin-left:20px;">
          ${escapeHtml$1(proposal.reason)}
        </div>
      `;
      }
    }
    return html;
  }
  function renderIssue(group) {
    let html = "";
    const colors = getSeverityColors(group.severity);
    const canWhitelist = group.issues.some((issue) => !!issue.ruleId);
    html += `
    <div style="
      border: 1px solid ${colors.border};
      border-radius: 4px;
      padding: 8px;
      margin-top: 8px;
      background: ${colors.background};
    ">
  `;
    html += `
    <div style="font-weight:600; margin-bottom:4px; color:${colors.text};">
      ${getSeverityIcon(group.severity)} ${escapeHtml$1(getSeverityLabel(group.severity))}: ${escapeHtml$1(group.message)}
    </div>
  `;
    if (group.field) {
      html += `
      <div style="font-size:12px;color:#666;margin-bottom:4px;">
        ${escapeHtml$1(t("featureEditor.field"))}: ${escapeHtml$1(group.field)}
      </div>
    `;
    }
    if (shouldRenderAsSingleChoiceGroup(group)) {
      html += renderExternalProviderChoiceGroup(group.issues[0], group);
    } else {
      for (let index = 0; index < group.proposals.length; index += 1) {
        html += renderProposal(group.issues[0], group.proposals[index], index);
      }
    }
    if (canWhitelist) {
      html += `
      <div style="margin-top:8px;">
        <button
          type="button"
          class="wmeph-row-whitelist-issue"
          data-group-key="${escapeHtml$1(group.key)}"
        >
          ${escapeHtml$1(t("featureEditor.ignoreForThisVenue"))}
        </button>
      </div>
    `;
    }
    html += `</div>`;
    return html;
  }
  function renderFeatureEditorAnalysis(placeName, chainId, issues, proposals, statusMessage) {
    const container = ensureFeatureEditorContainer();
    if (!container) {
      return;
    }
    let html = "";
    const issueGroups = groupIssuesForFeatureEditor(issues, proposals);
    html += `
  <div style="
    display:flex;
    flex-direction:column;
    max-height:300px;
  ">

  <div style=" font-weight:600; margin-bottom:8px;">
    ${escapeHtml$1(t("featureEditor.title"))}
  </div>

  <div style="
    overflow-y:auto;
    max-height:260px;
    padding-right:4px;
  ">
  `;
    if (statusMessage) {
      let color = "#2e7d32";
      if (statusMessage.kind === "warning") {
        color = "#b26a00";
      }
      if (statusMessage.kind === "error") {
        color = "#b00020";
      }
      html += `
      <div style="
        border: 1px solid ${color};
        border-radius: 4px;
        padding: 8px;
        margin-bottom: 8px;
        color: ${color};
        background: #fff;
      ">
        ${escapeHtml$1(statusMessage.text)}
      </div>
    `;
    }
    html += `
    <div style="margin-bottom:8px;">
      <div><b>${escapeHtml$1(t("featureEditor.place"))}</b></div>
      <div>${escapeHtml$1(placeName)}</div>
    </div>
  `;
    html += `
    <div style="margin-bottom:8px;">
      <div><b>${escapeHtml$1(t("featureEditor.chain"))}</b></div>
      <div>${escapeHtml$1(chainId ?? t("common.none"))}</div>
    </div>
  `;
    html += `
    <div style="margin-bottom:8px;">
      <div><b>${escapeHtml$1(t("featureEditor.findings"))}</b></div>
      <div>${issueGroups.length}</div>
    </div>
  `;
    if (issueGroups.length === 0) {
      html += `
      <div style="
        border: 1px solid #ddd;
        border-radius: 4px;
        padding: 8px;
        background: #fff;
        color: green;
      ">
        ${escapeHtml$1(t("featureEditor.noFindings"))}
      </div>
    `;
    } else {
      for (const group of issueGroups) {
        html += renderIssue(group);
      }
    }
    const hasApplyableProposals = proposals.some((proposal) => proposal.isApplySupported);
    if (hasApplyableProposals) {
      html += `
      <div style="margin-top:12px;">
        <button id="wmeph-row-apply-selected" type="button">
          ${escapeHtml$1(t("featureEditor.applySelectedFixes"))}
        </button>
      </div>
    `;
    }
    html += `
  </div>
  </div>
  `;
    container.innerHTML = html;
  }
  let latestAnalysisState = null;
  function setLatestAnalysisState(state) {
    latestAnalysisState = state;
  }
  function getLatestAnalysisState() {
    return latestAnalysisState;
  }
  function clearLatestAnalysisState() {
    latestAnalysisState = null;
  }
  const APPLY_SUPPORTED_FIELDS = /* @__PURE__ */ new Set([
    "name",
    "lockLevel",
    "phone",
    "url",
    "openingHours"
  ]);
  function readInteger(value) {
    return typeof value === "number" && Number.isInteger(value) ? value : void 0;
  }
  function isPresenceExpectation(value) {
    return value === "present" || value === "absent";
  }
  function buildProposalId(issue, suffix) {
    return [
      issue.groupKey ?? issue.field,
      issue.ruleId ?? "no-rule",
      suffix ?? String(issue.expectedValue ?? issue.currentValue ?? "")
    ].join("::");
  }
  function generateProposals(issues, options) {
    const proposals = [];
    for (const issue of issues) {
      if (issue.field === "brand") {
        continue;
      }
      if (issue.field === "services" && typeof issue.expectedValue === "string") {
        const serviceName = issue.expectedValue;
        if (issue.ruleId?.startsWith("services.required.") || issue.ruleId?.startsWith("services.recommended.")) {
          proposals.push({
            id: buildProposalId(issue, serviceName),
            field: "services",
            groupKey: issue.groupKey,
            currentValue: issue.currentValue,
            proposedValue: serviceName,
            displayProposedValue: serviceName,
            reason: issue.message,
            issueRuleId: issue.ruleId,
            isApplySupported: true,
            actionType: "add-service",
            serviceName
          });
          continue;
        }
        if (issue.ruleId?.startsWith("services.discouraged.") || issue.ruleId?.startsWith("services.forbidden.")) {
          proposals.push({
            id: buildProposalId(issue, serviceName),
            field: "services",
            groupKey: issue.groupKey,
            currentValue: issue.currentValue,
            proposedValue: serviceName,
            displayProposedValue: serviceName,
            reason: issue.message,
            issueRuleId: issue.ruleId,
            isApplySupported: true,
            actionType: "remove-service",
            serviceName
          });
          continue;
        }
      }
      if (issue.field === "aliases" && typeof issue.expectedValue === "string") {
        const aliasName = issue.expectedValue;
        proposals.push({
          id: buildProposalId(issue, aliasName),
          field: "aliases",
          groupKey: issue.groupKey,
          currentValue: issue.currentValue,
          proposedValue: aliasName,
          displayProposedValue: aliasName,
          reason: issue.message,
          issueRuleId: issue.ruleId,
          isApplySupported: true,
          actionType: "add-alias",
          aliasName
        });
        continue;
      }
      if (issue.field === "geometry" && typeof issue.expectedValue === "string") {
        const current = issue.currentValue;
        const expected = issue.expectedValue;
        const isPolygonToPoint = current === "polygon" && expected === "point";
        const isPointToPolygon = current === "point" && expected === "polygon";
        const isApplySupported = isPolygonToPoint || isPointToPolygon;
        proposals.push({
          id: buildProposalId(issue),
          field: "geometry",
          groupKey: issue.groupKey,
          currentValue: current,
          proposedValue: expected,
          reason: issue.message,
          issueRuleId: issue.ruleId,
          isApplySupported,
          actionType: isApplySupported ? "set-field" : "manual-only"
        });
        continue;
      }
      if (issue.field === "lockLevel") {
        const currentLockLevel = readInteger(issue.currentValue);
        const recommendedLockLevel = readInteger(issue.expectedValue);
        const editorLockLevel = readInteger(options?.editorLockLevel);
        if (recommendedLockLevel === void 0) {
          continue;
        }
        const appliedLockLevel = editorLockLevel !== void 0 ? Math.min(recommendedLockLevel, editorLockLevel) : recommendedLockLevel;
        const canApply = currentLockLevel === void 0 || appliedLockLevel > currentLockLevel;
        const isCappedByEditor = editorLockLevel !== void 0 && editorLockLevel < recommendedLockLevel;
        const reason = isCappedByEditor ? canApply ? t("proposal.lockLevel.cappedRaise", {
          issueMessage: issue.message,
          lockLevel: appliedLockLevel,
          editorLockLevel
        }) : t("proposal.lockLevel.cappedCannotRaise", {
          issueMessage: issue.message,
          editorLockLevel
        }) : issue.message;
        proposals.push({
          id: buildProposalId(issue),
          field: "lockLevel",
          groupKey: issue.groupKey,
          currentValue: currentLockLevel,
          proposedValue: canApply ? appliedLockLevel : recommendedLockLevel,
          reason,
          issueRuleId: issue.ruleId,
          isApplySupported: canApply,
          actionType: canApply ? "set-field" : "manual-only"
        });
        continue;
      }
      if (isPresenceExpectation(issue.expectedValue)) {
        continue;
      }
      if (issue.expectedValue !== void 0) {
        proposals.push({
          id: buildProposalId(issue),
          field: issue.field,
          groupKey: issue.groupKey,
          currentValue: issue.currentValue,
          proposedValue: issue.expectedValue,
          reason: issue.message,
          issueRuleId: issue.ruleId,
          isApplySupported: APPLY_SUPPORTED_FIELDS.has(issue.field),
          actionType: APPLY_SUPPORTED_FIELDS.has(issue.field) ? "set-field" : "manual-only"
        });
      }
    }
    return proposals;
  }
  function getSelectedProposals(proposals) {
    const selectedInputs = [
      ...Array.from(
        document.querySelectorAll(
          ".wmeph-row-apply-checkbox:checked"
        )
      ),
      ...Array.from(
        document.querySelectorAll(
          ".wmeph-row-apply-radio:checked"
        )
      )
    ];
    const selectedIds = new Set(
      selectedInputs.map((input) => input.dataset.proposalId ?? "").filter((proposalId) => proposalId.length > 0)
    );
    return proposals.filter(
      (proposal) => proposal.id && selectedIds.has(proposal.id)
    );
  }
  const EXTERNAL_PROVIDER_ADD_BUTTON_SELECTORS = [
    ".external-providers-control .external-provider-add-new"
  ];
  const EXTERNAL_PROVIDER_AUTOCOMPLETE_SELECTORS = [
    ".external-providers-control > wz-list.external-providers-list > wz-list-item.external-provider-edit > div.external-provider-edit-form > div.form-group > wz-autocomplete",
    'wz-autocomplete[name="external-providers-control"]',
    ".external-providers-control wz-autocomplete"
  ];
  function wait$1(ms) {
    return new Promise((resolve) => {
      window.setTimeout(resolve, ms);
    });
  }
  function findExternalProviderAddButton() {
    for (const selector of EXTERNAL_PROVIDER_ADD_BUTTON_SELECTORS) {
      const button = document.querySelector(selector);
      if (button) {
        return button;
      }
    }
    return null;
  }
  function readAutocompleteInput(autocomplete) {
    const shadowRoot = autocomplete.shadowRoot;
    if (!shadowRoot) {
      return null;
    }
    return shadowRoot.querySelector("#text-input") ?? shadowRoot.querySelector("input");
  }
  function findExternalProviderAutocomplete() {
    for (const selector of EXTERNAL_PROVIDER_AUTOCOMPLETE_SELECTORS) {
      const autocomplete = document.querySelector(selector);
      if (!autocomplete) {
        continue;
      }
      return autocomplete;
    }
    return null;
  }
  function findExternalProviderInput() {
    const autocomplete = findExternalProviderAutocomplete();
    if (!autocomplete) {
      return null;
    }
    const input = readAutocompleteInput(autocomplete);
    if (input) {
      return input;
    }
    return null;
  }
  function resolveInputValueSetter(input) {
    const ownerWindow = input.ownerDocument?.defaultView;
    const prototypeCandidates = [
      Object.getPrototypeOf(input),
      ownerWindow?.HTMLInputElement?.prototype,
      typeof HTMLInputElement !== "undefined" ? HTMLInputElement.prototype : void 0
    ];
    for (const prototype of prototypeCandidates) {
      const valueSetter = Object.getOwnPropertyDescriptor(
        prototype ?? {},
        "value"
      )?.set;
      if (typeof valueSetter === "function") {
        return (value) => {
          valueSetter.call(input, value);
        };
      }
    }
    return void 0;
  }
  function dismissExternalProviderAutocompleteInput(input) {
    const ownerWindow = input.ownerDocument?.defaultView;
    const KeyboardEventCtor = ownerWindow?.KeyboardEvent ?? (typeof KeyboardEvent !== "undefined" ? KeyboardEvent : void 0);
    if (KeyboardEventCtor) {
      input.dispatchEvent(
        new KeyboardEventCtor("keydown", {
          key: "Escape",
          code: "Escape",
          bubbles: true,
          composed: true
        })
      );
      input.dispatchEvent(
        new KeyboardEventCtor("keyup", {
          key: "Escape",
          code: "Escape",
          bubbles: true,
          composed: true
        })
      );
    }
    input.blur?.();
  }
  function setInputValue(input, value) {
    const valueSetter = resolveInputValueSetter(input);
    const ownerWindow = input.ownerDocument?.defaultView;
    if (valueSetter) {
      valueSetter(value);
    } else {
      input.value = value;
    }
    const InputEventCtor = ownerWindow?.Event ?? Event;
    input.dispatchEvent(new InputEventCtor("input", { bubbles: true }));
    input.dispatchEvent(new InputEventCtor("change", { bubbles: true }));
  }
  function dismissExternalProviderAutocomplete() {
    const input = findExternalProviderInput();
    if (input) {
      dismissExternalProviderAutocompleteInput(input);
    }
  }
  async function populateExternalProviderEditorInput(searchText) {
    const inputText = searchText.trim();
    if (!inputText) {
      return false;
    }
    const addButton = findExternalProviderAddButton();
    if (addButton) {
      addButton.focus();
      addButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    }
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const input = findExternalProviderInput();
      if (input) {
        input.focus();
        setInputValue(input, inputText);
        logger.info(
          `Filled external provider editor input with suggestion "${inputText}"`
        );
        return true;
      }
      await wait$1(150);
    }
    logger.warn("Could not find external provider editor input");
    return false;
  }
  function parseMenuItemText(menuItem) {
    return (menuItem.textContent ?? "").split(/\r?\n+/).map((part) => part.trim()).filter((part) => part.length > 0);
  }
  function buildCandidateId(name, address, index) {
    const base = `${name}|${address ?? ""}|${index}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    return base.length > 0 ? `editor-${base}` : `editor-${index}`;
  }
  function readExternalProviderEditorMenuCandidatesFromAutocomplete(autocomplete) {
    const shadowRoot = autocomplete.shadowRoot;
    if (!shadowRoot) {
      return [];
    }
    const menuItems = Array.from(
      shadowRoot.querySelectorAll("wz-menu-item")
    );
    const candidates = [];
    for (let index = 0; index < menuItems.length; index += 1) {
      const menuItem = menuItems[index];
      const lines = parseMenuItemText(menuItem);
      if (lines.length === 0) {
        continue;
      }
      const name = lines[0];
      if (/^no results$/i.test(name) || /^geen resultaten$/i.test(name)) {
        continue;
      }
      const address = lines.slice(1).join(" | ") || void 0;
      const rawId = menuItem.getAttribute("value") ?? menuItem.getAttribute("data-value") ?? menuItem.getAttribute("id");
      candidates.push({
        element: menuItem,
        providerId: typeof rawId === "string" && rawId.trim().length > 0 ? rawId.trim() : buildCandidateId(name, address, index),
        name,
        address,
        sortIndex: index
      });
    }
    return candidates;
  }
  function normalizeOptionalText(value) {
    return value ? normalizeText(value) : void 0;
  }
  function addressLooksEquivalent(leftAddress, rightAddress) {
    const normalizedLeft = normalizeOptionalText(leftAddress);
    const normalizedRight = normalizeOptionalText(rightAddress);
    if (!normalizedLeft || !normalizedRight) {
      return false;
    }
    return normalizedLeft === normalizedRight || normalizedLeft.includes(normalizedRight) || normalizedRight.includes(normalizedLeft);
  }
  function chooseExternalProviderEditorCandidate(candidates, target) {
    if (candidates.length === 0) {
      return void 0;
    }
    const trimmedProviderId = typeof target.providerId === "string" ? target.providerId.trim() : "";
    const normalizedName = normalizeOptionalText(target.name);
    const normalizedAddress = normalizeOptionalText(target.address);
    if (trimmedProviderId) {
      const idMatch = candidates.find(
        (candidate) => candidate.providerId === trimmedProviderId
      );
      if (idMatch) {
        return idMatch;
      }
    }
    if (normalizedName && normalizedAddress) {
      const exactNameAndAddressMatch = candidates.find((candidate) => {
        return normalizeOptionalText(candidate.name) === normalizedName && addressLooksEquivalent(candidate.address, target.address);
      });
      if (exactNameAndAddressMatch) {
        return exactNameAndAddressMatch;
      }
    }
    if (normalizedName) {
      const exactNameMatches = candidates.filter(
        (candidate) => normalizeOptionalText(candidate.name) === normalizedName
      );
      if (exactNameMatches.length === 1) {
        return exactNameMatches[0];
      }
      if (exactNameMatches.length > 1 && normalizedAddress) {
        const addressMatch = exactNameMatches.find(
          (candidate) => addressLooksEquivalent(candidate.address, target.address)
        );
        if (addressMatch) {
          return addressMatch;
        }
      }
    }
    if (candidates.length === 1) {
      const [onlyCandidate] = candidates;
      const normalizedCandidateName = normalizeOptionalText(onlyCandidate.name);
      if (!normalizedName || normalizedCandidateName === normalizedName || normalizedCandidateName?.includes(normalizedName) || normalizedName.includes(normalizedCandidateName ?? "")) {
        return onlyCandidate;
      }
    }
    return void 0;
  }
  function triggerMenuItemSelection(menuItem) {
    menuItem.scrollIntoView({ block: "nearest" });
    menuItem.dispatchEvent(
      new MouseEvent("mousedown", { bubbles: true, composed: true })
    );
    menuItem.dispatchEvent(
      new MouseEvent("mouseup", { bubbles: true, composed: true })
    );
    menuItem.dispatchEvent(
      new MouseEvent("click", { bubbles: true, composed: true })
    );
  }
  async function applyExternalProviderProposalInEditor(proposal) {
    const searchText = proposal.externalProviderSearchText?.trim();
    if (!searchText) {
      logger.warn("External provider proposal is missing search text");
      return false;
    }
    const isInputReady = await populateExternalProviderEditorInput(searchText);
    if (!isInputReady) {
      return false;
    }
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const autocomplete = findExternalProviderAutocomplete();
      if (!autocomplete) {
        await wait$1(150);
        continue;
      }
      const candidates = readExternalProviderEditorMenuCandidatesFromAutocomplete(
        autocomplete
      );
      const selectedCandidate = chooseExternalProviderEditorCandidate(candidates, {
        providerId: proposal.externalProviderTargetId,
        name: proposal.externalProviderTargetName,
        address: proposal.externalProviderTargetAddress
      });
      if (!selectedCandidate) {
        await wait$1(150);
        continue;
      }
      triggerMenuItemSelection(
        selectedCandidate.element
      );
      logger.info(
        `Selected external provider "${selectedCandidate.name}" from editor autocomplete`
      );
      return true;
    }
    logger.warn("Could not select a matching external provider autocomplete candidate");
    dismissExternalProviderAutocomplete();
    return false;
  }
  async function findExternalProviderEditorCandidates(searchText) {
    const isInputReady = await populateExternalProviderEditorInput(searchText);
    if (!isInputReady) {
      return [];
    }
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const autocomplete = findExternalProviderAutocomplete();
      if (!autocomplete) {
        await wait$1(150);
        continue;
      }
      const candidates = readExternalProviderEditorMenuCandidatesFromAutocomplete(
        autocomplete
      );
      if (candidates.length > 0) {
        logger.info(
          `Read ${candidates.length} external provider autocomplete candidate(s)`
        );
        dismissExternalProviderAutocomplete();
        return candidates;
      }
      await wait$1(150);
    }
    logger.info("No external provider autocomplete candidates became available");
    dismissExternalProviderAutocomplete();
    return [];
  }
  const EARTH_METERS_PER_LATITUDE_DEGREE = 111320;
  const POINT_TO_POLYGON_HALF_SIDE_METERS = 5;
  function normalizeOpeningHourTime(value) {
    if (typeof value !== "string") {
      return void 0;
    }
    const trimmed = value.trim();
    if (!/^\d{2}:\d{2}$/.test(trimmed)) {
      return void 0;
    }
    const hours = Number(trimmed.slice(0, 2));
    const minutes = Number(trimmed.slice(3, 5));
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      return void 0;
    }
    return trimmed;
  }
  function sanitizeOpeningHoursForSdkUpdate(value) {
    if (!Array.isArray(value)) {
      return void 0;
    }
    const sanitized = [];
    for (const entry of value) {
      if (!entry || typeof entry !== "object") {
        return void 0;
      }
      const typedEntry = entry;
      const rawDays = Array.isArray(typedEntry.days) ? typedEntry.days : void 0;
      const fromHour = normalizeOpeningHourTime(typedEntry.fromHour);
      const toHour = normalizeOpeningHourTime(typedEntry.toHour);
      if (!rawDays || rawDays.length === 0 || !fromHour || !toHour) {
        return void 0;
      }
      const days = Array.from(
        new Set(
          rawDays.filter(
            (day) => typeof day === "number" && Number.isInteger(day) && day >= 0 && day <= 6
          )
        )
      ).sort((left, right) => left - right);
      if (days.length !== rawDays.length) {
        return void 0;
      }
      sanitized.push({
        days,
        fromHour,
        toHour
      });
    }
    return sanitized;
  }
  function buildUpdatedServices(currentServices, proposals) {
    const result = new Set(currentServices);
    for (const proposal of proposals) {
      if (proposal.field !== "services" || !proposal.serviceName) {
        continue;
      }
      if (proposal.actionType === "add-service") {
        result.add(proposal.serviceName);
      }
      if (proposal.actionType === "remove-service") {
        result.delete(proposal.serviceName);
      }
    }
    return Array.from(result.values());
  }
  function buildUpdatedAliases(currentAliases, proposals) {
    const result = new Set(currentAliases);
    for (const proposal of proposals) {
      if (proposal.field !== "aliases" || !proposal.aliasName) {
        continue;
      }
      if (proposal.actionType === "add-alias") {
        result.add(proposal.aliasName);
      }
      if (proposal.actionType === "remove-alias") {
        result.delete(proposal.aliasName);
      }
    }
    return Array.from(result.values());
  }
  function isLonLatPair(value) {
    return Array.isArray(value) && value.length >= 2 && typeof value[0] === "number" && typeof value[1] === "number";
  }
  function normalizeRingCoordinates(value) {
    if (!Array.isArray(value)) {
      return [];
    }
    return value.filter(isLonLatPair);
  }
  function calculatePolygonCentroid(ring) {
    if (ring.length === 0) {
      return void 0;
    }
    let crossSum = 0;
    let centroidX = 0;
    let centroidY = 0;
    for (let index = 0; index < ring.length; index += 1) {
      const [currentLon, currentLat] = ring[index];
      const [nextLon, nextLat] = ring[(index + 1) % ring.length];
      const cross = currentLon * nextLat - nextLon * currentLat;
      crossSum += cross;
      centroidX += (currentLon + nextLon) * cross;
      centroidY += (currentLat + nextLat) * cross;
    }
    if (crossSum !== 0) {
      return [
        centroidX / (3 * crossSum),
        centroidY / (3 * crossSum)
      ];
    }
    const total = ring.reduce(
      (result, [lon, lat]) => {
        result.lon += lon;
        result.lat += lat;
        return result;
      },
      { lon: 0, lat: 0 }
    );
    return [total.lon / ring.length, total.lat / ring.length];
  }
  function getPolygonArea(ring) {
    if (ring.length === 0) {
      return 0;
    }
    let crossSum = 0;
    for (let index = 0; index < ring.length; index += 1) {
      const [currentLon, currentLat] = ring[index];
      const [nextLon, nextLat] = ring[(index + 1) % ring.length];
      crossSum += currentLon * nextLat - nextLon * currentLat;
    }
    return Math.abs(crossSum / 2);
  }
  function extractCoordinatesFromNavigationPoint(navigationPoint) {
    if (!navigationPoint) {
      return void 0;
    }
    if (isLonLatPair(navigationPoint)) {
      return navigationPoint;
    }
    if (typeof navigationPoint !== "object") {
      return void 0;
    }
    const typedNavigationPoint = navigationPoint;
    return (isLonLatPair(typedNavigationPoint.coordinates) ? typedNavigationPoint.coordinates : void 0) ?? (isLonLatPair(typedNavigationPoint.point?.coordinates) ? typedNavigationPoint.point.coordinates : void 0) ?? (isLonLatPair(typedNavigationPoint.geometry?.coordinates) ? typedNavigationPoint.geometry.coordinates : void 0);
  }
  function buildPointGeometryFromVenue(venue) {
    const navigationPointCandidates = [
      ...Array.isArray(venue?.navigationPoints) ? venue.navigationPoints : [],
      venue?.navigationPoint
    ];
    for (const navigationPoint of navigationPointCandidates) {
      const coordinates = extractCoordinatesFromNavigationPoint(navigationPoint);
      if (coordinates) {
        return {
          type: "Point",
          coordinates
        };
      }
    }
    const geometry = venue?.geometry;
    if (!geometry) {
      return void 0;
    }
    if (geometry.type === "Point" || geometry.type === "point") {
      const coordinates = isLonLatPair(geometry.coordinates) ? geometry.coordinates : void 0;
      return coordinates ? {
        type: "Point",
        coordinates
      } : void 0;
    }
    if (geometry.type === "Polygon" || geometry.type === "polygon") {
      const outerRing = normalizeRingCoordinates(geometry.coordinates?.[0]);
      const centroid = calculatePolygonCentroid(outerRing);
      return centroid ? {
        type: "Point",
        coordinates: centroid
      } : void 0;
    }
    if (geometry.type === "MultiPolygon" || geometry.type === "multipolygon") {
      const polygons = Array.isArray(geometry.coordinates) ? geometry.coordinates : [];
      let largestRing = [];
      let largestArea = 0;
      for (const polygon of polygons) {
        const outerRing = normalizeRingCoordinates(polygon?.[0]);
        const area = getPolygonArea(outerRing);
        if (area > largestArea) {
          largestArea = area;
          largestRing = outerRing;
        }
      }
      const centroid = calculatePolygonCentroid(largestRing);
      return centroid ? {
        type: "Point",
        coordinates: centroid
      } : void 0;
    }
    return void 0;
  }
  function metersToLatitudeDegrees(meters) {
    return meters / EARTH_METERS_PER_LATITUDE_DEGREE;
  }
  function metersToLongitudeDegrees(meters, latitude) {
    const latitudeRadians = latitude * Math.PI / 180;
    const metersPerDegree = EARTH_METERS_PER_LATITUDE_DEGREE * Math.max(Math.cos(latitudeRadians), 1e-6);
    return meters / metersPerDegree;
  }
  function buildPolygonGeometryFromVenue(venue) {
    const geometry = venue?.geometry;
    if (!geometry || geometry.type !== "Point" && geometry.type !== "point" || !isLonLatPair(geometry.coordinates)) {
      return void 0;
    }
    const [lon, lat] = geometry.coordinates;
    const latOffset = metersToLatitudeDegrees(POINT_TO_POLYGON_HALF_SIDE_METERS);
    const lonOffset = metersToLongitudeDegrees(
      POINT_TO_POLYGON_HALF_SIDE_METERS,
      lat
    );
    return {
      type: "Polygon",
      coordinates: [[
        [lon - lonOffset, lat - latOffset],
        [lon + lonOffset, lat - latOffset],
        [lon + lonOffset, lat + latOffset],
        [lon - lonOffset, lat + latOffset],
        [lon - lonOffset, lat - latOffset]
      ]]
    };
  }
  function buildUpdateArgs(venueId, currentServices, currentAliases, proposals, editorLockLevel, currentVenue) {
    const args = { venueId };
    const errors = [];
    let appliedProposalCount = 0;
    const serviceProposals = proposals.filter(
      (proposal) => proposal.field === "services" && proposal.isApplySupported
    );
    if (serviceProposals.length > 0) {
      args.services = buildUpdatedServices(currentServices, serviceProposals);
      appliedProposalCount += serviceProposals.length;
    }
    const aliasProposals = proposals.filter(
      (proposal) => proposal.field === "aliases" && proposal.isApplySupported
    );
    if (aliasProposals.length > 0) {
      args.aliases = buildUpdatedAliases(currentAliases, aliasProposals);
      appliedProposalCount += aliasProposals.length;
    }
    for (const proposal of proposals) {
      if (!proposal.isApplySupported) {
        continue;
      }
      if (proposal.field === "services" || proposal.field === "aliases") {
        continue;
      }
      switch (proposal.field) {
        case "name":
          args.name = proposal.proposedValue;
          appliedProposalCount += 1;
          break;
        case "lockLevel": {
          const requestedLockLevel = proposal.proposedValue;
          if (typeof requestedLockLevel === "number" && Number.isInteger(requestedLockLevel) && requestedLockLevel >= 1) {
            const appliedLockLevel = typeof editorLockLevel === "number" ? Math.min(requestedLockLevel, editorLockLevel) : requestedLockLevel;
            args.lockRank = appliedLockLevel - 1;
            appliedProposalCount += 1;
          }
          break;
        }
        case "phone":
          args.phone = proposal.proposedValue;
          appliedProposalCount += 1;
          break;
        case "url":
          args.url = proposal.proposedValue;
          appliedProposalCount += 1;
          break;
        case "openingHours":
          {
            const openingHours = sanitizeOpeningHoursForSdkUpdate(
              proposal.proposedValue
            );
            if (!openingHours) {
              errors.push(
                "Opening-hours proposal could not be converted to a valid WME SDK openingHours payload"
              );
              break;
            }
            args.openingHours = openingHours;
            appliedProposalCount += 1;
          }
          break;
        case "geometry": {
          if (proposal.proposedValue === "point") {
            const geometry = buildPointGeometryFromVenue(currentVenue);
            if (!geometry) {
              errors.push("Could not derive a point geometry from the current venue");
              break;
            }
            args.geometry = geometry;
            appliedProposalCount += 1;
            break;
          }
          if (proposal.proposedValue === "polygon") {
            const geometry = buildPolygonGeometryFromVenue(currentVenue);
            if (!geometry) {
              errors.push("Could not derive a polygon geometry from the current venue");
              break;
            }
            args.geometry = geometry;
            appliedProposalCount += 1;
            break;
          }
          errors.push(
            `Geometry proposal "${String(proposal.proposedValue)}" is not supported for apply`
          );
          break;
        }
      }
    }
    return {
      args,
      appliedProposalCount,
      errors
    };
  }
  async function applyVenueProposals(venueId, currentServices, currentAliases, proposals) {
    const supported = proposals.filter((proposal) => proposal.isApplySupported);
    const sdkSupported = supported.filter(
      (proposal) => proposal.field !== "externalProviderIds"
    );
    const editorSupported = supported.filter(
      (proposal) => proposal.field === "externalProviderIds"
    );
    const skipped = proposals.length - supported.length;
    const errors = [];
    let applied = 0;
    if (supported.length === 0) {
      return {
        applied: 0,
        skipped,
        errors: []
      };
    }
    if (sdkSupported.length > 0) {
      const sdk = getWmeSdk();
      if (!sdk) {
        errors.push("WME SDK is not available");
      } else {
        const editorLockLevel = getCurrentEditorLockLevel();
        const currentVenue = sdk.DataModel?.Venues?.getById?.({ venueId });
        const buildResult = buildUpdateArgs(
          venueId,
          currentServices,
          currentAliases,
          sdkSupported,
          editorLockLevel,
          currentVenue
        );
        errors.push(...buildResult.errors);
        if (buildResult.appliedProposalCount > 0) {
          try {
            sdk.DataModel.Venues.updateVenue(buildResult.args);
            applied += buildResult.appliedProposalCount;
          } catch (error) {
            const message = error instanceof Error ? error.message : "Unknown apply error";
            logger.error(`Failed to apply SDK proposals: ${message}`);
            errors.push(message);
          }
        }
      }
    }
    for (const proposal of editorSupported) {
      const appliedInEditor = await applyExternalProviderProposalInEditor(proposal);
      if (appliedInEditor) {
        applied += 1;
        continue;
      }
      errors.push("Could not select the suggested external provider in the editor");
    }
    logger.info(`Applied ${applied} proposal(s) to venue ${venueId}`);
    return {
      applied,
      skipped,
      errors
    };
  }
  let sidebarDebugState = null;
  function setSidebarDebugState(state) {
    sidebarDebugState = state;
  }
  function getSidebarDebugState() {
    return sidebarDebugState;
  }
  const SCRIPT_TAB_ID = "wmeph-row-script-tab";
  let registeredTabPane = null;
  async function ensureScriptSidebarTab() {
    if (registeredTabPane && document.contains(registeredTabPane)) {
      return registeredTabPane;
    }
    const sdk = getWmeSdk();
    if (!sdk?.Sidebar?.registerScriptTab) {
      logger.warn("SDK Sidebar.registerScriptTab is not available");
      return null;
    }
    try {
      const result = await sdk.Sidebar.registerScriptTab({
        scriptId: SCRIPT_TAB_ID
      });
      result.tabLabel.textContent = "PH";
      result.tabLabel.title = t("app.sidebarTabTitle");
      registeredTabPane = result.tabPane;
      registeredTabPane.innerHTML = "";
      logger.info("SDK script sidebar tab registered");
      return registeredTabPane;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown sidebar tab registration error";
      logger.warn(`Failed to register script sidebar tab: ${message}`);
      return null;
    }
  }
  function escapeHtml(value) {
    return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  async function renderSidebarDebugPanel(state) {
    const panel = await ensureScriptSidebarTab();
    if (!panel) {
      return;
    }
    let html = "";
    html += `
    <div style="padding:10px;font-size:13px;line-height:1.4;">
      <div style="font-weight:600; margin-bottom:8px;">
        ${escapeHtml(t("app.name"))}
      </div>
  `;
    html += `
      <div style="margin-bottom:8px;">
        <b>${escapeHtml(t("sidebar.channel"))}</b><br>
        ${escapeHtml(state.dataChannel)}
      </div>
  `;
    html += `
      <div style="margin-bottom:8px;">
        <b>${escapeHtml(t("sidebar.manifest"))}</b><br>
        ${escapeHtml(state.manifestVersion)}<br>
        <span style="font-size:12px;color:#666;">${escapeHtml(state.manifestRevision)}</span>
      </div>
  `;
    html += `
      <div style="margin-bottom:8px;">
        <b>${escapeHtml(t("sidebar.runtimeConfig"))}</b><br>
        ${escapeHtml(state.runtimeConfigId)} v${escapeHtml(state.runtimeConfigVersion)}
      </div>
  `;
    html += `
      <div style="margin-bottom:8px;">
        <b>${escapeHtml(t("sidebar.chains"))}</b><br>
        ${escapeHtml(state.runtimeChainsId)} (${escapeHtml(state.runtimeChainsCount)})
      </div>
  `;
    html += `
      <div style="margin-bottom:8px;">
        <b>${escapeHtml(t("sidebar.status"))}</b><br>
        ${escapeHtml(state.lastStatus ?? t("status.ready"))}
      </div>
  `;
    if (state.lastScanSummary) {
      html += `
      <div style="margin-bottom:8px;">
        <b>${escapeHtml(t("sidebar.lastScan"))}</b><br>
        ${escapeHtml(t("sidebar.lastScan.total"))}: ${escapeHtml(state.lastScanSummary.total)}<br>
        ${escapeHtml(t("sidebar.lastScan.ok"))}: ${escapeHtml(state.lastScanSummary.ok)}<br>
        ${escapeHtml(t("sidebar.lastScan.warning"))}: ${escapeHtml(state.lastScanSummary.warning)}<br>
        ${escapeHtml(t("sidebar.lastScan.error"))}: ${escapeHtml(state.lastScanSummary.error)}
      </div>
    `;
    }
    html += `
    <div style="margin-bottom:8px;">
      <b>${escapeHtml(t("sidebar.highlights"))}</b><br>
      ${escapeHtml(state.highlightsEnabled ? t("common.enabled") : t("common.disabled"))}
    </div>
  `;
    html += `
    <div style="margin-bottom:8px;">
      <b>${escapeHtml(t("sidebar.autoScan"))}</b><br>
      <label style="font-size:12px;">
        <input
          id="wmeph-row-auto-scan-toggle"
          type="checkbox"
          ${state.autoScanVisibleVenues ? "checked" : ""}
        />
        ${escapeHtml(t("sidebar.autoScan.label"))}
      </label>
    </div>
  `;
    const googleValidationEnabled = state.googleMapsValidation?.enabled ?? true;
    const googleValidationChecks = state.googleMapsValidation?.checks;
    const googleValidationAvailability = state.googleMapsValidationAvailability;
    const googleValidationAvailable = googleValidationAvailability?.enabled ?? true;
    const showGoogleValidationChecks = googleValidationAvailable && googleValidationEnabled;
    html += `
    <div style="margin-bottom:8px;">
      <b>${escapeHtml(t("sidebar.googleMapsValidation"))}</b><br>
      <label style="font-size:12px;display:block;margin-top:4px;">
        <input
          id="wmeph-row-google-validation-toggle"
          type="checkbox"
          ${googleValidationEnabled ? "checked" : ""}
          ${googleValidationAvailable ? "" : "disabled"}
        />
        ${escapeHtml(t("sidebar.googleMapsValidation.enabled"))}
      </label>
  `;
    if (showGoogleValidationChecks) {
      html += `
      <div style="font-size:12px;color:#666;margin:6px 0 4px 18px;">
        ${escapeHtml(t("sidebar.googleMapsValidation.checks"))}
      </div>
    `;
      for (const checkKey of GOOGLE_MAPS_VALIDATION_CHECK_KEYS) {
        const isChecked = googleValidationChecks?.[checkKey] ?? true;
        const isAvailable = googleValidationAvailability?.checks?.[checkKey] ?? true;
        const textColor = !isAvailable ? "#888" : "#222";
        html += `
        <label style="font-size:12px;display:block;margin-left:18px;color:${textColor};">
          <input
            id="wmeph-row-google-validation-${escapeHtml(checkKey)}"
            type="checkbox"
            ${isChecked ? "checked" : ""}
            ${isAvailable ? "" : "disabled"}
          />
          ${escapeHtml(t(`sidebar.googleMapsValidation.${checkKey}`))}
        </label>
      `;
      }
    }
    html += `
    </div>
  `;
    html += `
    <div style="margin-top:10px;">
      <button id="wmeph-row-reload-data" type="button">
        ${escapeHtml(t("sidebar.reloadData"))}
      </button>
    </div>

    <div style="margin-top:8px;">
      <button id="wmeph-row-scan-visible" type="button">
        ${escapeHtml(t("sidebar.scanVisibleVenues"))}
      </button>
    </div>
  `;
    panel.innerHTML = html;
  }
  function wireSidebarPanelActions() {
    const button = document.getElementById("wmeph-row-sidebar-refresh");
    if (!button) {
      return;
    }
    button.onclick = async () => {
      const state = getSidebarDebugState();
      if (!state) {
        return;
      }
      await renderSidebarDebugPanel(state);
    };
  }
  function wireSidebarReloadButton(reloadHandler) {
    const button = document.getElementById("wmeph-row-reload-data");
    if (!button) {
      return;
    }
    button.onclick = async () => {
      button.setAttribute("disabled", "true");
      try {
        await reloadHandler();
      } finally {
        button.removeAttribute("disabled");
      }
    };
  }
  function wireSidebarScanButton(scanHandler) {
    const button = document.getElementById("wmeph-row-scan-visible");
    if (!button) {
      return;
    }
    button.onclick = async () => {
      button.setAttribute("disabled", "true");
      try {
        await scanHandler();
      } finally {
        button.removeAttribute("disabled");
      }
    };
  }
  function wireSidebarAutoScanToggle(currentValue, changeHandler) {
    const checkbox = document.getElementById(
      "wmeph-row-auto-scan-toggle"
    );
    if (!checkbox) {
      return;
    }
    checkbox.checked = currentValue;
    checkbox.onchange = async () => {
      await changeHandler(checkbox.checked);
    };
  }
  function wireSidebarGoogleMapsValidationToggle(currentValue, changeHandler) {
    const checkbox = document.getElementById(
      "wmeph-row-google-validation-toggle"
    );
    if (!checkbox) {
      return;
    }
    checkbox.checked = currentValue;
    checkbox.onchange = async () => {
      await changeHandler(checkbox.checked);
    };
  }
  function wireSidebarGoogleMapsValidationChecks(currentValue, changeHandler) {
    for (const checkKey of GOOGLE_MAPS_VALIDATION_CHECK_KEYS) {
      const checkbox = document.getElementById(
        `wmeph-row-google-validation-${checkKey}`
      );
      if (!checkbox) {
        continue;
      }
      checkbox.checked = currentValue[checkKey];
      checkbox.onchange = async () => {
        await changeHandler(checkKey, checkbox.checked);
      };
    }
  }
  function isCoordinateInsideExtent(lon, lat, extent) {
    const [left, bottom, right, top] = extent;
    return lon >= left && lon <= right && lat >= bottom && lat <= top;
  }
  function getBoundsForPolygonCoordinates(coordinates) {
    if (!Array.isArray(coordinates) || coordinates.length === 0) {
      return null;
    }
    const outerRing = coordinates[0];
    if (!Array.isArray(outerRing) || outerRing.length === 0) {
      return null;
    }
    let left = Number.POSITIVE_INFINITY;
    let right = Number.NEGATIVE_INFINITY;
    let bottom = Number.POSITIVE_INFINITY;
    let top = Number.NEGATIVE_INFINITY;
    let hasPoint = false;
    for (const point of outerRing) {
      const [lon, lat] = point ?? [];
      if (typeof lon !== "number" || typeof lat !== "number") {
        continue;
      }
      left = Math.min(left, lon);
      right = Math.max(right, lon);
      bottom = Math.min(bottom, lat);
      top = Math.max(top, lat);
      hasPoint = true;
    }
    if (!hasPoint) {
      return null;
    }
    return {
      left,
      bottom,
      right,
      top
    };
  }
  function intersectsExtent(bounds, extent) {
    const [extentLeft, extentBottom, extentRight, extentTop] = extent;
    return bounds.right >= extentLeft && bounds.left <= extentRight && bounds.top >= extentBottom && bounds.bottom <= extentTop;
  }
  function isVenueVisible(venue, extent) {
    const geometry = venue.geometry;
    if (!geometry) {
      return false;
    }
    if (geometry.type === "Point" || geometry.type === "point") {
      const [lon, lat] = geometry.coordinates ?? [];
      if (typeof lon === "number" && typeof lat === "number") {
        return isCoordinateInsideExtent(lon, lat, extent);
      }
      return false;
    }
    if (geometry.type === "Polygon" || geometry.type === "polygon") {
      const polygonBounds = getBoundsForPolygonCoordinates(geometry.coordinates);
      return !!polygonBounds && intersectsExtent(polygonBounds, extent);
    }
    if (geometry.type === "MultiPolygon" || geometry.type === "multipolygon") {
      const polygons = geometry.coordinates;
      if (!Array.isArray(polygons)) {
        return false;
      }
      for (const polygonCoordinates of polygons) {
        const polygonBounds = getBoundsForPolygonCoordinates(polygonCoordinates);
        if (polygonBounds && intersectsExtent(polygonBounds, extent)) {
          return true;
        }
      }
      return false;
    }
    return false;
  }
  function getVisibleVenues() {
    const sdk = getWmeSdk();
    if (!sdk) {
      return [];
    }
    const extent = sdk.Map.getMapExtent();
    const allVenues = sdk.DataModel.Venues.getAll();
    if (!extent || !Array.isArray(allVenues)) {
      return [];
    }
    return allVenues.filter((venue) => isVenueVisible(venue, extent));
  }
  function trimString(value) {
    if (typeof value !== "string") {
      return void 0;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : void 0;
  }
  function normalizeBusinessStatus(value) {
    const trimmed = trimString(value);
    return trimmed ? trimmed.toUpperCase() : void 0;
  }
  function buildValidationGroupKey(providerId, ruleId) {
    return `externalProviderIds::validation:${providerId}:${ruleId}`;
  }
  function appendReasonDetail(reason, detail) {
    return detail ? `${reason} | ${detail}` : reason;
  }
  function normalizeTime(value, allow2400 = true) {
    if (typeof value !== "string") {
      return void 0;
    }
    let digits = value.trim().replace(/:/g, "");
    if (digits.length === 3) {
      digits = digits.padStart(4, "0");
    }
    if (!/^\d{4}$/.test(digits)) {
      return void 0;
    }
    if (digits === "2400") {
      return allow2400 ? "24:00" : void 0;
    }
    const hours = Number(digits.slice(0, 2));
    const minutes = Number(digits.slice(2, 4));
    if (hours > 23 || minutes > 59) {
      return void 0;
    }
    return `${digits.slice(0, 2)}:${digits.slice(2, 4)}`;
  }
  function isValidDay(value) {
    return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 6;
  }
  function buildDaySlot(day, fromHour, toHour) {
    return `${day}:${fromHour}-${toHour}`;
  }
  function expandDailyHoursRange(openDay, openTime, closeDay, closeTime) {
    if (openDay === closeDay && openTime < closeTime) {
      return [buildDaySlot(openDay, openTime, closeTime)];
    }
    const slots = [];
    let currentDay = openDay;
    let safety = 0;
    while (safety < 8) {
      const fromHour = currentDay === openDay ? openTime : "00:00";
      const toHour = currentDay === closeDay ? closeTime : "24:00";
      if (fromHour !== toHour) {
        slots.push(buildDaySlot(currentDay, fromHour, toHour));
      }
      if (currentDay === closeDay) {
        break;
      }
      currentDay = (currentDay + 1) % 7;
      safety += 1;
    }
    return slots;
  }
  function normalizeCurrentOpeningHours(openingHours = []) {
    const slots = [];
    for (const entry of openingHours) {
      const fromHour = normalizeTime(entry?.fromHour, false);
      const toHour = normalizeTime(entry?.toHour);
      if (!fromHour || !toHour || !Array.isArray(entry?.days)) {
        return null;
      }
      for (const day of entry.days) {
        if (!isValidDay(day)) {
          return null;
        }
        if (fromHour === "00:00" && toHour === "00:00") {
          slots.push(buildDaySlot(day, "00:00", "24:00"));
        } else if (fromHour < toHour) {
          slots.push(buildDaySlot(day, fromHour, toHour));
        } else if (fromHour > toHour) {
          slots.push(
            ...expandDailyHoursRange(day, fromHour, (day + 1) % 7, toHour)
          );
        }
      }
    }
    return Array.from(new Set(slots)).sort();
  }
  function normalizeGoogleOpeningHours(openingHours) {
    const periods = Array.isArray(openingHours?.periods) ? openingHours.periods : [];
    if (periods.length === 0) {
      return [];
    }
    if (periods.length === 1 && isValidDay(periods[0]?.open?.day) && periods[0]?.open?.day === 0 && normalizeTime(periods[0]?.open?.time, false) === "00:00" && !periods[0]?.close) {
      return Array.from(
        { length: 7 },
        (_, day) => buildDaySlot(day, "00:00", "24:00")
      );
    }
    const slots = [];
    for (const period of periods) {
      const openDay = period?.open?.day;
      const closeDay = period?.close?.day;
      const openTime = normalizeTime(period?.open?.time, false);
      const closeTime = normalizeTime(period?.close?.time);
      if (!isValidDay(openDay) || !isValidDay(closeDay) || !openTime || !closeTime) {
        return null;
      }
      slots.push(...expandDailyHoursRange(openDay, openTime, closeDay, closeTime));
    }
    return Array.from(new Set(slots)).sort();
  }
  function isTwentyFourSevenNormalizedHours(normalizedHours) {
    if (!Array.isArray(normalizedHours) || normalizedHours.length !== 7) {
      return false;
    }
    return normalizedHours.every((slot, day) => slot === `${day}:00:00-24:00`);
  }
  function formatOpeningHoursDisplay(weekdayText, normalizedHours) {
    if (isTwentyFourSevenNormalizedHours(normalizedHours)) {
      return t("common.twentyFourSeven");
    }
    if (Array.isArray(weekdayText) && weekdayText.length > 0) {
      return weekdayText.join(" | ");
    }
    if (Array.isArray(normalizedHours) && normalizedHours.length > 0) {
      return normalizedHours.join(", ");
    }
    return void 0;
  }
  function formatWmeOpeningHoursDisplay(openingHours = []) {
    const normalizedHours = normalizeCurrentOpeningHours(openingHours);
    if (isTwentyFourSevenNormalizedHours(normalizedHours)) {
      return t("common.twentyFourSeven");
    }
    if (normalizedHours && normalizedHours.length > 0) {
      return normalizedHours.join(", ");
    }
    if (openingHours.length === 0) {
      return void 0;
    }
    return openingHours.map((entry) => {
      const days = Array.isArray(entry.days) ? entry.days.join("/") : "?";
      const fromHour = trimString(entry.fromHour) ?? "?";
      const toHour = trimString(entry.toHour) ?? "?";
      return `${days}:${fromHour}-${toHour}`;
    }).join(", ");
  }
  function buildOpeningHoursValueFromNormalizedSlots(normalizedHours) {
    if (!Array.isArray(normalizedHours) || normalizedHours.length === 0) {
      return [];
    }
    const groupedDays = /* @__PURE__ */ new Map();
    for (const slot of normalizedHours) {
      const match = /^([0-6]):(\d{2}:\d{2})-(\d{2}:\d{2})$/.exec(slot);
      if (!match) {
        return void 0;
      }
      const day = Number(match[1]);
      const fromHour = match[2];
      const toHour = match[3] === "24:00" ? "00:00" : match[3];
      if (fromHour === "24:00") {
        return void 0;
      }
      const key = `${fromHour}-${toHour}`;
      const days = groupedDays.get(key);
      if (days) {
        days.push(day);
      } else {
        groupedDays.set(key, [day]);
      }
    }
    return Array.from(groupedDays.entries()).map(([timeRange, days]) => {
      const [fromHour, toHour] = timeRange.split("-");
      return {
        days: Array.from(new Set(days)).sort((left, right) => left - right),
        fromHour,
        toHour
      };
    });
  }
  let placesServiceContainer$1 = null;
  function getGoogleHostWindow$1() {
    try {
      if (typeof unsafeWindow !== "undefined") {
        return unsafeWindow;
      }
    } catch {
    }
    return window;
  }
  function getGoogleMapsApi$1() {
    const googleMaps = getGoogleHostWindow$1().google?.maps;
    if (!googleMaps?.places?.PlacesService) {
      return null;
    }
    return googleMaps;
  }
  function ensurePlacesServiceContainer$1() {
    if (typeof document === "undefined" || !document.body) {
      return null;
    }
    if (placesServiceContainer$1) {
      return placesServiceContainer$1;
    }
    placesServiceContainer$1 = document.createElement("div");
    placesServiceContainer$1.style.display = "none";
    document.body.appendChild(placesServiceContainer$1);
    return placesServiceContainer$1;
  }
  function collectLonLatPairs$1(value, points = []) {
    if (!Array.isArray(value)) {
      return points;
    }
    if (value.length >= 2 && typeof value[0] === "number" && typeof value[1] === "number") {
      points.push([value[0], value[1]]);
      return points;
    }
    for (const nestedValue of value) {
      collectLonLatPairs$1(nestedValue, points);
    }
    return points;
  }
  function getVenueSearchOrigin$1(venue) {
    const geometry = venue?.geometry;
    if (!geometry) {
      return void 0;
    }
    if ((geometry.type === "Point" || geometry.type === "point") && Array.isArray(geometry.coordinates)) {
      const [lon, lat] = geometry.coordinates;
      if (typeof lon === "number" && typeof lat === "number") {
        return { lon, lat };
      }
    }
    const points = collectLonLatPairs$1(geometry.coordinates);
    if (points.length === 0) {
      return void 0;
    }
    let minLon = Number.POSITIVE_INFINITY;
    let maxLon = Number.NEGATIVE_INFINITY;
    let minLat = Number.POSITIVE_INFINITY;
    let maxLat = Number.NEGATIVE_INFINITY;
    for (const [lon, lat] of points) {
      minLon = Math.min(minLon, lon);
      maxLon = Math.max(maxLon, lon);
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
    }
    return {
      lon: (minLon + maxLon) / 2,
      lat: (minLat + maxLat) / 2
    };
  }
  function readLocation$1(location) {
    if (!location || typeof location !== "object") {
      return void 0;
    }
    const typedLocation = location;
    const rawLat = typeof typedLocation.lat === "function" ? typedLocation.lat() : typedLocation.lat;
    const rawLng = typeof typedLocation.lng === "function" ? typedLocation.lng() : typedLocation.lng;
    if (typeof rawLat !== "number" || typeof rawLng !== "number") {
      return void 0;
    }
    return {
      lon: rawLng,
      lat: rawLat
    };
  }
  function toRadians$1(value) {
    return value * Math.PI / 180;
  }
  function calculateDistanceMeters$1(origin, target) {
    const earthRadius = 6371e3;
    const deltaLat = toRadians$1(target.lat - origin.lat);
    const deltaLon = toRadians$1(target.lon - origin.lon);
    const originLat = toRadians$1(origin.lat);
    const targetLat = toRadians$1(target.lat);
    const a = Math.sin(deltaLat / 2) ** 2 + Math.cos(originLat) * Math.cos(targetLat) * Math.sin(deltaLon / 2) ** 2;
    return Math.round(
      earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    );
  }
  function isOkPlaceDetailsStatus(status, googleMaps) {
    const placesStatus = googleMaps?.places?.PlacesServiceStatus;
    return status === "OK" || status === placesStatus?.OK;
  }
  function isNotFoundPlaceDetailsStatus(status, googleMaps) {
    const placesStatus = googleMaps?.places?.PlacesServiceStatus;
    return status === "NOT_FOUND" || status === placesStatus?.NOT_FOUND || status === "INVALID_REQUEST" || status === placesStatus?.INVALID_REQUEST || status === "ZERO_RESULTS" || status === placesStatus?.ZERO_RESULTS;
  }
  function runPlaceDetailsLookup(service, request) {
    return new Promise((resolve) => {
      service.getDetails(request, (result, status) => {
        resolve({ result, status });
      });
    });
  }
  const MAX_EXTERNAL_PROVIDER_SUGGESTIONS = 5;
  const MIN_NAME_SCORE = 0.55;
  const MAX_SUGGESTION_DISTANCE_METERS = 500;
  const ABSOLUTE_MAX_SUGGESTION_DISTANCE_METERS = 1e3;
  const CATEGORY_GOOGLE_PLACE_TYPE_MAP = {
    CAR_SERVICES: ["car_repair", "car_wash", "gas_station"],
    CRISIS_LOCATIONS: ["lodging", "local_government_office"],
    CULTURE_AND_ENTERTAINEMENT: [
      "tourist_attraction",
      "museum",
      "movie_theater",
      "art_gallery",
      "night_club",
      "stadium",
      "amusement_park",
      "zoo",
      "aquarium",
      "casino"
    ],
    FOOD_AND_DRINK: ["restaurant", "cafe", "bar", "bakery"],
    LODGING: ["lodging", "campground", "rv_park"],
    NATURAL_FEATURES: ["park", "tourist_attraction"],
    OTHER: [],
    OUTDOORS: ["park", "tourist_attraction", "stadium"],
    PARKING_LOT: ["parking"],
    PROFESSIONAL_AND_PUBLIC: [
      "school",
      "university",
      "hospital",
      "library",
      "city_hall",
      "courthouse",
      "fire_station",
      "police",
      "post_office",
      "embassy",
      "local_government_office",
      "cemetery"
    ],
    SHOPPING_AND_SERVICES: [
      "store",
      "supermarket",
      "shopping_mall",
      "bank",
      "atm",
      "pharmacy"
    ],
    TRANSPORTATION: [
      "airport",
      "bus_station",
      "train_station",
      "subway_station",
      "transit_station",
      "taxi_stand",
      "parking"
    ],
    CAR_WASH: ["car_wash"],
    CHARGING_STATION: [],
    GARAGE_AUTOMOTIVE_SHOP: ["car_repair"],
    GAS_STATION: ["gas_station"],
    DONATION_CENTERS: [],
    SHELTER_LOCATIONS: ["lodging"],
    ART_GALLERY: ["art_gallery"],
    CASINO: ["casino"],
    CLUB: ["night_club"],
    TOURIST_ATTRACTION_HISTORIC_SITE: ["tourist_attraction"],
    MOVIE_THEATER: ["movie_theater"],
    MUSEUM: ["museum"],
    MUSIC_VENUE: ["night_club", "stadium"],
    PERFORMING_ARTS_VENUE: ["tourist_attraction", "movie_theater"],
    GAME_CLUB: ["bowling_alley", "night_club"],
    STADIUM_ARENA: ["stadium"],
    THEME_PARK: ["amusement_park"],
    ZOO_AQUARIUM: ["zoo", "aquarium"],
    RACING_TRACK: ["stadium"],
    THEATER: ["movie_theater", "tourist_attraction"],
    RESTAURANT: ["restaurant"],
    BAKERY: ["bakery"],
    DESSERT: ["bakery", "cafe"],
    CAFE: ["cafe"],
    FAST_FOOD: ["restaurant", "meal_takeaway"],
    FOOD_COURT: ["restaurant", "meal_takeaway"],
    BAR: ["bar"],
    ICE_CREAM: ["cafe", "bakery"],
    HOTEL: ["lodging"],
    HOSTEL: ["lodging"],
    CAMPING_TRAILER_PARK: ["campground", "rv_park"],
    COTTAGE_CABIN: ["lodging"],
    BED_AND_BREAKFAST: ["lodging"],
    ISLAND: ["tourist_attraction", "park"],
    SEA_LAKE_POOL: ["tourist_attraction", "park"],
    RIVER_STREAM: ["tourist_attraction", "park"],
    FOREST_GROVE: ["park"],
    FARM: ["tourist_attraction"],
    CANAL: ["tourist_attraction", "park"],
    SWAMP_MARSH: ["tourist_attraction", "park"],
    DAM: ["tourist_attraction"],
    CONSTRUCTION_SITE: [],
    PARK: ["park"],
    PLAYGROUND: ["park"],
    BEACH: ["tourist_attraction", "park"],
    SPORTS_COURT: ["stadium"],
    GOLF_COURSE: ["park", "stadium"],
    PLAZA: ["tourist_attraction", "park"],
    PROMENADE: ["tourist_attraction", "park"],
    POOL: ["gym", "park"],
    SCENIC_LOOKOUT_VIEWPOINT: ["tourist_attraction", "park"],
    SKI_AREA: ["tourist_attraction", "park"],
    COLLEGE_UNIVERSITY: ["university"],
    SCHOOL: ["school"],
    CONVENTIONS_EVENT_CENTER: ["stadium", "tourist_attraction"],
    GOVERNMENT: ["local_government_office"],
    LIBRARY: ["library"],
    CITY_HALL: ["city_hall"],
    ORGANIZATION_OR_ASSOCIATION: [],
    PRISON_CORRECTIONAL_FACILITY: [],
    COURTHOUSE: ["courthouse"],
    CEMETERY: ["cemetery"],
    FIRE_DEPARTMENT: ["fire_station"],
    POLICE_STATION: ["police"],
    MILITARY: [],
    HOSPITAL_URGENT_CARE: ["hospital"],
    DOCTOR_CLINIC: ["doctor"],
    OFFICES: [],
    POST_OFFICE: ["post_office"],
    RELIGIOUS_CENTER: ["church", "mosque", "synagogue", "hindu_temple"],
    KINDERGARDEN: ["primary_school", "school"],
    FACTORY_INDUSTRIAL: [],
    EMBASSY_CONSULATE: ["embassy"],
    INFORMATION_POINT: ["tourist_attraction"],
    EMERGENCY_SHELTER: ["lodging"],
    TRASH_AND_RECYCLING_FACILITIES: [],
    ARTS_AND_CRAFTS: ["store"],
    BANK_FINANCIAL: ["bank"],
    SPORTING_GOODS: ["store"],
    BOOKSTORE: ["book_store"],
    PHOTOGRAPHY: ["store"],
    CAR_DEALERSHIP: ["car_dealer"],
    FASHION_AND_CLOTHING: ["clothing_store"],
    CONVENIENCE_STORE: ["convenience_store"],
    PERSONAL_CARE: ["beauty_salon", "hair_care", "spa"],
    DEPARTMENT_STORE: ["department_store"],
    PHARMACY: ["pharmacy"],
    ELECTRONICS: ["electronics_store"],
    FLOWERS: ["florist"],
    FURNITURE_HOME_STORE: ["furniture_store", "home_goods_store"],
    GIFTS: ["store"],
    GYM_FITNESS: ["gym"],
    SWIMMING_POOL: ["gym", "park"],
    HARDWARE_STORE: ["hardware_store"],
    MARKET: ["supermarket", "store"],
    SUPERMARKET_GROCERY: ["supermarket"],
    JEWELRY: ["jewelry_store"],
    LAUNDRY_DRY_CLEAN: ["laundry"],
    SHOPPING_CENTER: ["shopping_mall"],
    MUSIC_STORE: ["store"],
    PET_STORE_VETERINARIAN_SERVICES: ["pet_store", "veterinary_care"],
    TOY_STORE: ["store"],
    TRAVEL_AGENCY: ["travel_agency"],
    ATM: ["atm"],
    CURRENCY_EXCHANGE: ["bank", "atm"],
    CAR_RENTAL: ["car_rental"],
    TELECOM: ["store"],
    AIRPORT: ["airport"],
    BUS_STATION: ["bus_station"],
    FERRY_PIER: ["transit_station"],
    SEAPORT_MARINA_HARBOR: ["tourist_attraction", "transit_station"],
    SUBWAY_STATION: ["subway_station"],
    TRAIN_STATION: ["train_station"],
    BRIDGE: ["tourist_attraction"],
    TUNNEL: [],
    TAXI_STATION: ["taxi_stand"],
    JUNCTION_INTERCHANGE: [],
    REST_AREAS: ["parking"],
    CARPOOL_SPOT: ["parking"],
    RESIDENTIAL: [],
    FOREST: ["park"],
    HOSPITAL_MEDICAL_CARE: ["hospital"],
    UNIVERSITY: ["university"]
  };
  let placesServiceContainer = null;
  function getGoogleHostWindow() {
    try {
      if (typeof unsafeWindow !== "undefined") {
        return unsafeWindow;
      }
    } catch {
    }
    return window;
  }
  function getGoogleMapsApi() {
    const googleMaps = getGoogleHostWindow().google?.maps;
    if (!googleMaps?.places?.PlacesService) {
      return null;
    }
    return googleMaps;
  }
  function ensurePlacesServiceContainer() {
    if (typeof document === "undefined" || !document.body) {
      return null;
    }
    if (placesServiceContainer) {
      return placesServiceContainer;
    }
    placesServiceContainer = document.createElement("div");
    placesServiceContainer.style.display = "none";
    document.body.appendChild(placesServiceContainer);
    return placesServiceContainer;
  }
  function collectLonLatPairs(value, points = []) {
    if (!Array.isArray(value)) {
      return points;
    }
    if (value.length >= 2 && typeof value[0] === "number" && typeof value[1] === "number") {
      points.push([value[0], value[1]]);
      return points;
    }
    for (const nestedValue of value) {
      collectLonLatPairs(nestedValue, points);
    }
    return points;
  }
  function getVenueSearchOrigin(venue) {
    const geometry = venue?.geometry;
    if (!geometry) {
      return void 0;
    }
    if ((geometry.type === "Point" || geometry.type === "point") && Array.isArray(geometry.coordinates)) {
      const [lon, lat] = geometry.coordinates;
      if (typeof lon === "number" && typeof lat === "number") {
        return { lon, lat };
      }
    }
    const points = collectLonLatPairs(geometry.coordinates);
    if (points.length === 0) {
      return void 0;
    }
    let minLon = Number.POSITIVE_INFINITY;
    let maxLon = Number.NEGATIVE_INFINITY;
    let minLat = Number.POSITIVE_INFINITY;
    let maxLat = Number.NEGATIVE_INFINITY;
    for (const [lon, lat] of points) {
      minLon = Math.min(minLon, lon);
      maxLon = Math.max(maxLon, lon);
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
    }
    return {
      lon: (minLon + maxLon) / 2,
      lat: (minLat + maxLat) / 2
    };
  }
  function readLocation(location) {
    if (!location || typeof location !== "object") {
      return void 0;
    }
    const typedLocation = location;
    const rawLat = typeof typedLocation.lat === "function" ? typedLocation.lat() : typedLocation.lat;
    const rawLng = typeof typedLocation.lng === "function" ? typedLocation.lng() : typedLocation.lng;
    if (typeof rawLat !== "number" || typeof rawLng !== "number") {
      return void 0;
    }
    return {
      lon: rawLng,
      lat: rawLat
    };
  }
  function toRadians(value) {
    return value * Math.PI / 180;
  }
  function calculateDistanceMeters(origin, target) {
    const earthRadius = 6371e3;
    const deltaLat = toRadians(target.lat - origin.lat);
    const deltaLon = toRadians(target.lon - origin.lon);
    const originLat = toRadians(origin.lat);
    const targetLat = toRadians(target.lat);
    const a = Math.sin(deltaLat / 2) ** 2 + Math.cos(originLat) * Math.cos(targetLat) * Math.sin(deltaLon / 2) ** 2;
    return Math.round(earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  }
  function tokenize(value) {
    return Array.from(
      new Set(
        normalizeText(value).split(" ").filter((token) => token.length > 0)
      )
    );
  }
  function compactNormalizedName(value) {
    return normalizeText(value).replace(/ /g, "").replace(/'/g, "");
  }
  function scoreExternalProviderName(query, candidateName) {
    const normalizedQuery = normalizeText(query);
    const normalizedCandidate = normalizeText(candidateName);
    const compactQuery = compactNormalizedName(query);
    const compactCandidate = compactNormalizedName(candidateName);
    if (!normalizedQuery || !normalizedCandidate) {
      return 0;
    }
    if (normalizedQuery === normalizedCandidate || compactQuery === compactCandidate) {
      return 1;
    }
    if (normalizedCandidate.startsWith(normalizedQuery) || normalizedQuery.startsWith(normalizedCandidate)) {
      return 0.92;
    }
    if (normalizedCandidate.includes(normalizedQuery) || normalizedQuery.includes(normalizedCandidate)) {
      return 0.84;
    }
    const queryTokens = tokenize(normalizedQuery);
    const candidateTokens = tokenize(normalizedCandidate);
    if (queryTokens.length === 0 || candidateTokens.length === 0) {
      return 0;
    }
    const sharedTokenCount = queryTokens.filter(
      (token) => candidateTokens.includes(token)
    ).length;
    if (sharedTokenCount === 0) {
      return 0;
    }
    const queryCoverage = sharedTokenCount / queryTokens.length;
    const candidateCoverage = sharedTokenCount / candidateTokens.length;
    return Math.min(0.89, queryCoverage * 0.7 + candidateCoverage * 0.2 + 0.1);
  }
  function rankExternalProviderSuggestions(query, origin, candidates) {
    const seenProviderIds = /* @__PURE__ */ new Set();
    const suggestions = [];
    for (const candidate of candidates) {
      const providerId = typeof candidate.providerId === "string" ? candidate.providerId.trim() : "";
      const name = typeof candidate.name === "string" ? candidate.name.trim() : "";
      if (!providerId || !name || seenProviderIds.has(providerId)) {
        continue;
      }
      const nameScore = scoreExternalProviderName(query, name);
      if (nameScore < MIN_NAME_SCORE) {
        continue;
      }
      const distanceMeters = candidate.location ? calculateDistanceMeters(origin, candidate.location) : void 0;
      if (typeof distanceMeters === "number" && distanceMeters > ABSOLUTE_MAX_SUGGESTION_DISTANCE_METERS) {
        continue;
      }
      if (typeof distanceMeters === "number" && distanceMeters > MAX_SUGGESTION_DISTANCE_METERS && nameScore < 0.84) {
        continue;
      }
      seenProviderIds.add(providerId);
      suggestions.push({
        providerId,
        name,
        address: candidate.address,
        distanceMeters,
        nameScore,
        sortIndex: candidate.sortIndex
      });
    }
    return suggestions.sort((left, right) => {
      if (right.nameScore !== left.nameScore) {
        return right.nameScore - left.nameScore;
      }
      if (typeof left.distanceMeters === "number" && typeof right.distanceMeters === "number" && left.distanceMeters !== right.distanceMeters) {
        return left.distanceMeters - right.distanceMeters;
      }
      if (typeof left.distanceMeters === "number") {
        return -1;
      }
      if (typeof right.distanceMeters === "number") {
        return 1;
      }
      if (typeof left.sortIndex === "number" && typeof right.sortIndex === "number" && left.sortIndex !== right.sortIndex) {
        return left.sortIndex - right.sortIndex;
      }
      return left.name.localeCompare(right.name);
    }).slice(0, MAX_EXTERNAL_PROVIDER_SUGGESTIONS);
  }
  function mapGoogleCandidate(result) {
    const providerId = typeof result?.place_id === "string" ? result.place_id.trim() : "";
    const name = typeof result?.name === "string" ? result.name.trim() : "";
    if (!providerId || !name) {
      return void 0;
    }
    const addressCandidates = [result?.vicinity, result?.formatted_address];
    const address = addressCandidates.find(
      (candidate) => typeof candidate === "string" && candidate.trim().length > 0
    );
    return {
      providerId,
      name,
      address,
      location: readLocation(result?.geometry?.location)
    };
  }
  function isSuccessfulPlacesStatus(status, googleMaps) {
    const placesStatus = googleMaps?.places?.PlacesServiceStatus;
    return status === "OK" || status === placesStatus?.OK || status === "ZERO_RESULTS" || status === placesStatus?.ZERO_RESULTS;
  }
  function runNearbySearch(service, googleMaps, request) {
    return new Promise((resolve) => {
      service.nearbySearch(request, (results, status) => {
        if (!isSuccessfulPlacesStatus(status, googleMaps)) {
          logger.warn(`External provider nearbySearch failed: ${String(status)}`);
          resolve([]);
          return;
        }
        resolve(Array.isArray(results) ? results : []);
      });
    });
  }
  function resolveNearbySearchTypes(venue) {
    const categories = normalizeCategoryKeys(venue?.categories ?? []);
    const seen = /* @__PURE__ */ new Set();
    const placeTypes = [];
    for (const category of categories) {
      const placeTypesForCategory = CATEGORY_GOOGLE_PLACE_TYPE_MAP[category] ?? [];
      for (const placeType of placeTypesForCategory) {
        if (seen.has(placeType)) {
          continue;
        }
        seen.add(placeType);
        placeTypes.push(placeType);
      }
    }
    return placeTypes;
  }
  async function runCategoryTypedNearbySearch(params) {
    const { service, googleMaps, origin, venue } = params;
    const searchTypes = resolveNearbySearchTypes(venue);
    if (searchTypes.length === 0) {
      return [];
    }
    const location = new googleMaps.LatLng(origin.lat, origin.lon);
    const candidates = [];
    const seenProviderIds = /* @__PURE__ */ new Set();
    for (const searchType of searchTypes) {
      const request = {
        location,
        type: searchType
      };
      if (googleMaps.places?.RankBy?.DISTANCE !== void 0) {
        request.rankBy = googleMaps.places.RankBy.DISTANCE;
      } else {
        request.radius = MAX_SUGGESTION_DISTANCE_METERS;
      }
      const results = await runNearbySearch(service, googleMaps, request);
      for (const result of results) {
        const candidate = mapGoogleCandidate(result);
        if (!candidate?.providerId || seenProviderIds.has(candidate.providerId)) {
          continue;
        }
        seenProviderIds.add(candidate.providerId);
        candidates.push(candidate);
      }
    }
    return candidates;
  }
  function runTextSearch(service, googleMaps, request) {
    return new Promise((resolve) => {
      if (typeof service.textSearch !== "function") {
        resolve([]);
        return;
      }
      service.textSearch(request, (results, status) => {
        if (!isSuccessfulPlacesStatus(status, googleMaps)) {
          logger.warn(`External provider textSearch failed: ${String(status)}`);
          resolve([]);
          return;
        }
        resolve(Array.isArray(results) ? results : []);
      });
    });
  }
  async function findSuggestedExternalProviders(venue, query) {
    const searchQuery = query.trim();
    if (!searchQuery) {
      return [];
    }
    if (typeof window === "undefined") {
      return [];
    }
    const origin = getVenueSearchOrigin(venue);
    if (!origin) {
      logger.info("Venue geometry unavailable; skipping external provider suggestions");
      return [];
    }
    const googleMaps = getGoogleMapsApi();
    if (googleMaps) {
      const container = ensurePlacesServiceContainer();
      if (container) {
        const service = new googleMaps.places.PlacesService(container);
        const typedNearbyCandidates = await runCategoryTypedNearbySearch({
          service,
          googleMaps,
          origin,
          venue
        });
        const typedNearbySuggestions = rankExternalProviderSuggestions(
          searchQuery,
          origin,
          typedNearbyCandidates
        );
        if (typedNearbySuggestions.length > 0) {
          logger.info(
            `Found ${typedNearbySuggestions.length} category-typed nearby external provider suggestion(s)`
          );
          return typedNearbySuggestions;
        }
        const location = new googleMaps.LatLng(origin.lat, origin.lon);
        const nearbySearchRequest = {
          keyword: searchQuery,
          location
        };
        if (googleMaps.places?.RankBy?.DISTANCE !== void 0) {
          nearbySearchRequest.rankBy = googleMaps.places.RankBy.DISTANCE;
        } else {
          nearbySearchRequest.radius = MAX_SUGGESTION_DISTANCE_METERS;
        }
        const nearbyResults = await runNearbySearch(
          service,
          googleMaps,
          nearbySearchRequest
        );
        const nearbyCandidates = nearbyResults.map((result) => mapGoogleCandidate(result)).filter((candidate) => candidate !== void 0);
        const nearbySuggestions = rankExternalProviderSuggestions(
          searchQuery,
          origin,
          nearbyCandidates
        );
        if (nearbySuggestions.length > 0) {
          return nearbySuggestions;
        }
        const textResults = await runTextSearch(service, googleMaps, {
          query: searchQuery,
          location,
          radius: MAX_SUGGESTION_DISTANCE_METERS
        });
        const textCandidates = textResults.map((result) => mapGoogleCandidate(result)).filter((candidate) => candidate !== void 0);
        const textSuggestions = rankExternalProviderSuggestions(
          searchQuery,
          origin,
          textCandidates
        );
        if (textSuggestions.length > 0) {
          return textSuggestions;
        }
      } else {
        logger.warn("Cannot initialize Google Places container for external provider suggestions");
      }
    } else {
      logger.info("Google Places service unavailable on host window; falling back to editor autocomplete suggestions");
    }
    const editorCandidates = await findExternalProviderEditorCandidates(searchQuery);
    return rankExternalProviderSuggestions(
      searchQuery,
      origin,
      editorCandidates
    );
  }
  function buildSuggestionReason(suggestion) {
    const details = [];
    if (suggestion.address) {
      details.push(suggestion.address);
    }
    if (typeof suggestion.distanceMeters === "number") {
      details.push(
        t("proposal.externalProvider.reason.distanceAway", {
          distanceMeters: suggestion.distanceMeters
        })
      );
    }
    return details.length > 0 ? details.join(" | ") : t("proposal.externalProvider.reason.nearbyName");
  }
  function buildSearchProposalId(issue, suffix) {
    return `${issue.ruleId ?? issue.field}:external-provider:${suffix}`;
  }
  function buildExternalProviderSuggestionGroupKey(issue) {
    return issue.groupKey ?? `${issue.field}::${issue.ruleId ?? issue.message}`;
  }
  function buildGoogleMapsPlaceUrl(suggestion) {
    const params = new URLSearchParams({
      api: "1",
      query: suggestion.address ? `${suggestion.name} ${suggestion.address}` : suggestion.name
    });
    if (suggestion.providerId) {
      params.set("query_place_id", suggestion.providerId);
    }
    return `https://www.google.com/maps/search/?${params.toString()}`;
  }
  function buildExternalProviderSuggestionProposals(issue, suggestions, currentExternalProviderIds = []) {
    return suggestions.map((suggestion) => {
      const mergedProviderIds = Array.from(
        /* @__PURE__ */ new Set([...currentExternalProviderIds, suggestion.providerId])
      );
      return {
        id: buildSearchProposalId(issue, suggestion.providerId),
        field: issue.field,
        groupKey: buildExternalProviderSuggestionGroupKey(issue),
        currentValue: currentExternalProviderIds,
        proposedValue: mergedProviderIds,
        displayCurrentValue: currentExternalProviderIds.length > 0 ? currentExternalProviderIds.join(", ") : t("common.missing"),
        displayProposedValue: typeof suggestion.distanceMeters === "number" ? t("proposal.externalProvider.displayWithDistance", {
          name: suggestion.name,
          distanceMeters: suggestion.distanceMeters
        }) : suggestion.name,
        displayProposedValueUrl: buildGoogleMapsPlaceUrl(suggestion),
        externalProviderSearchText: suggestion.address ? `${suggestion.name}, ${suggestion.address}` : suggestion.name,
        externalProviderTargetId: suggestion.providerId,
        externalProviderTargetName: suggestion.name,
        externalProviderTargetAddress: suggestion.address,
        reason: buildSuggestionReason(suggestion),
        issueRuleId: issue.ruleId,
        isApplySupported: true,
        actionType: "set-field"
      };
    });
  }
  function buildSuggestedExternalProviderIssueMessage(issue, suggestion) {
    if (!suggestion) {
      return issue.message;
    }
    const details = [suggestion.name];
    if (suggestion.address) {
      details.push(suggestion.address);
    }
    return t("issue.externalProvider.suggestedNearbyMatch", {
      issueMessage: issue.message,
      details: details.join(" | ")
    });
  }
  const EXTERNAL_PROVIDER_VALIDATION_NAME_MATCH_THRESHOLD = 0.92;
  const EXTERNAL_PROVIDER_VALIDATION_LOCATION_DRIFT_THRESHOLD_METERS = 250;
  const EXTERNAL_PROVIDER_VALIDATION_RULE_ID_PREFIX = "externalProvider.validation.";
  function normalizeGooglePlaceTypes(types) {
    if (!Array.isArray(types)) {
      return [];
    }
    return Array.from(
      new Set(
        types.map((type) => trimString(type)?.toLowerCase()).filter((type) => !!type)
      )
    ).sort();
  }
  function resolveExpectedGooglePlaceTypes(categories = []) {
    const expectedTypes = /* @__PURE__ */ new Set();
    for (const category of categories) {
      for (const placeType of CATEGORY_GOOGLE_PLACE_TYPE_MAP[category] ?? []) {
        expectedTypes.add(placeType.toLowerCase());
      }
    }
    return Array.from(expectedTypes).sort();
  }
  function arraysEqual(left, right) {
    if (left.length !== right.length) {
      return false;
    }
    return left.every((value, index) => value === right[index]);
  }
  function buildExternalProviderValidationProposal(params) {
    return {
      id: `${params.ruleId}:${params.providerId}`,
      field: params.field ?? "externalProviderIds",
      groupKey: buildValidationGroupKey(params.providerId, params.ruleId),
      currentValue: params.currentValue ?? params.providerId,
      displayCurrentValue: params.displayCurrentValue ?? params.providerId,
      proposedValue: params.proposedValue ?? params.displayProposedValue,
      displayProposedValue: params.displayProposedValue,
      displayProposedValueUrl: params.displayProposedValueUrl,
      reason: params.reason,
      issueRuleId: params.ruleId,
      isApplySupported: params.isApplySupported ?? false,
      actionType: params.actionType ?? "manual-only"
    };
  }
  function isValidationEnabled(settings, checkKey) {
    if (settings?.enabled === false) {
      return false;
    }
    return settings?.checks?.[checkKey] ?? true;
  }
  function buildValidationFinding(params) {
    const ruleId = `${EXTERNAL_PROVIDER_VALIDATION_RULE_ID_PREFIX}${params.ruleIdSuffix}`;
    return {
      issue: {
        field: params.field ?? "externalProviderIds",
        severity: params.severity,
        message: params.message,
        groupKey: buildValidationGroupKey(params.providerId, ruleId),
        ruleId
      },
      proposal: buildExternalProviderValidationProposal({
        providerId: params.providerId,
        ruleId,
        field: params.field,
        currentValue: params.currentValue,
        proposedValue: params.proposedValue,
        displayCurrentValue: params.displayCurrentValue,
        displayProposedValue: params.displayProposedValue,
        displayProposedValueUrl: params.displayProposedValueUrl,
        reason: params.reason,
        isApplySupported: params.isApplySupported,
        actionType: params.actionType
      })
    };
  }
  function isExternalProviderValidationRuleId(ruleId) {
    return typeof ruleId === "string" && ruleId.startsWith(EXTERNAL_PROVIDER_VALIDATION_RULE_ID_PREFIX);
  }
  function buildExternalProviderValidationFindings(snapshot2, settings, config) {
    const providerId = trimString(snapshot2.providerId);
    if (!providerId) {
      return [];
    }
    const venueName = trimString(snapshot2.venueName) ?? "";
    const placeName = trimString(snapshot2.placeName);
    const address = trimString(snapshot2.address);
    const googleUrl = trimString(snapshot2.url) ?? (placeName ? buildGoogleMapsPlaceUrl({
      providerId,
      name: placeName,
      address
    }) : void 0);
    const businessStatus = normalizeBusinessStatus(snapshot2.businessStatus);
    const googleOpeningHoursValue = snapshot2.googleOpeningHoursValue ?? buildOpeningHoursValueFromNormalizedSlots(snapshot2.googleOpeningHours);
    const googleOpeningHoursDisplay = isTwentyFourSevenNormalizedHours(snapshot2.googleOpeningHours) ? t("common.twentyFourSeven") : snapshot2.googleOpeningHoursDisplay;
    const severities = {
      ...getDefaultGoogleMapsValidationSeverities(),
      ...config?.severity ?? {}
    };
    const findings = [];
    if (snapshot2.notFound && isValidationEnabled(settings, "notFound")) {
      findings.push(
        buildValidationFinding({
          providerId,
          ruleIdSuffix: "notFound",
          severity: severities.notFound,
          message: t("issue.externalProvider.validation.notFound", {
            providerId
          }),
          displayProposedValue: t("proposal.externalProvider.validation.notFound"),
          reason: t("proposal.externalProvider.validation.reason.notFound")
        })
      );
    }
    if ((businessStatus === "CLOSED_PERMANENTLY" || snapshot2.businessStatus === "permanently_closed") && isValidationEnabled(settings, "closed")) {
      findings.push(
        buildValidationFinding({
          providerId,
          ruleIdSuffix: "closed",
          severity: severities.closed,
          message: t("issue.externalProvider.validation.closed", {
            placeName: placeName ?? providerId
          }),
          displayProposedValue: placeName,
          displayProposedValueUrl: googleUrl,
          reason: appendReasonDetail(
            t("proposal.externalProvider.validation.reason.closed"),
            address
          )
        })
      );
    }
    if (typeof snapshot2.distanceMeters === "number" && snapshot2.distanceMeters >= EXTERNAL_PROVIDER_VALIDATION_LOCATION_DRIFT_THRESHOLD_METERS && isValidationEnabled(settings, "locationDrift")) {
      findings.push(
        buildValidationFinding({
          providerId,
          ruleIdSuffix: "locationDrift",
          severity: severities.locationDrift,
          message: t("issue.externalProvider.validation.locationDrift", {
            placeName: placeName ?? providerId,
            distanceMeters: snapshot2.distanceMeters
          }),
          displayProposedValue: placeName ? t("proposal.externalProvider.displayWithDistance", {
            name: placeName,
            distanceMeters: snapshot2.distanceMeters
          }) : void 0,
          displayProposedValueUrl: googleUrl,
          reason: appendReasonDetail(
            t("proposal.externalProvider.validation.reason.locationDrift", {
              distanceMeters: snapshot2.distanceMeters
            }),
            address
          )
        })
      );
    }
    if (venueName && placeName && scoreExternalProviderName(venueName, placeName) < EXTERNAL_PROVIDER_VALIDATION_NAME_MATCH_THRESHOLD && isValidationEnabled(settings, "nameMismatch")) {
      findings.push(
        buildValidationFinding({
          providerId,
          field: "name",
          ruleIdSuffix: "nameMismatch",
          severity: severities.nameMismatch,
          message: t("issue.externalProvider.validation.nameMismatch", {
            venueName,
            placeName
          }),
          currentValue: venueName,
          proposedValue: placeName,
          displayCurrentValue: venueName,
          displayProposedValue: placeName,
          displayProposedValueUrl: googleUrl,
          reason: appendReasonDetail(
            t("proposal.externalProvider.validation.reason.nameMismatch"),
            address
          ),
          isApplySupported: true,
          actionType: "set-field"
        })
      );
    }
    const googleTypes = normalizeGooglePlaceTypes(snapshot2.googleTypes);
    const expectedGoogleTypes = resolveExpectedGooglePlaceTypes(
      snapshot2.currentCategories ?? []
    );
    if (isValidationEnabled(settings, "category") && googleTypes.length > 0 && expectedGoogleTypes.length > 0 && !googleTypes.some((type) => expectedGoogleTypes.includes(type))) {
      findings.push(
        buildValidationFinding({
          providerId,
          field: "categories",
          ruleIdSuffix: "categoryMismatch",
          severity: severities.category,
          message: t("issue.externalProvider.validation.categoryMismatch", {
            placeName: placeName ?? providerId
          }),
          currentValue: snapshot2.currentCategories ?? [],
          displayCurrentValue: (snapshot2.currentCategories ?? []).length > 0 ? snapshot2.currentCategories.join(", ") : void 0,
          displayProposedValue: googleTypes.join(", "),
          displayProposedValueUrl: googleUrl,
          reason: t("proposal.externalProvider.validation.reason.categoryMismatch", {
            googleTypes: googleTypes.join(", "),
            expectedTypes: expectedGoogleTypes.join(", ")
          })
        })
      );
    }
    const normalizedCurrentOpeningHours = snapshot2.currentOpeningHours ? normalizeCurrentOpeningHours(snapshot2.currentOpeningHours) : [];
    if (isValidationEnabled(settings, "openingHours") && normalizedCurrentOpeningHours !== null && snapshot2.googleOpeningHours && !arraysEqual(normalizedCurrentOpeningHours, snapshot2.googleOpeningHours)) {
      findings.push(
        buildValidationFinding({
          providerId,
          field: "openingHours",
          ruleIdSuffix: "openingHoursDifferent",
          severity: severities.openingHours,
          message: t("issue.externalProvider.validation.openingHoursDifferent", {
            placeName: placeName ?? providerId
          }),
          currentValue: snapshot2.currentOpeningHours ?? [],
          proposedValue: googleOpeningHoursValue ?? [],
          displayCurrentValue: formatWmeOpeningHoursDisplay(snapshot2.currentOpeningHours ?? []) ?? t("common.missing"),
          displayProposedValue: googleOpeningHoursDisplay,
          displayProposedValueUrl: googleUrl,
          reason: appendReasonDetail(
            t("proposal.externalProvider.validation.reason.openingHoursDifferent"),
            address
          ),
          isApplySupported: Array.isArray(googleOpeningHoursValue),
          actionType: Array.isArray(googleOpeningHoursValue) ? "set-field" : "manual-only"
        })
      );
    }
    return findings;
  }
  function hasEnabledValidationChecks(settings) {
    if (settings?.enabled === false) {
      return false;
    }
    if (!settings?.checks) {
      return true;
    }
    return Object.values(settings.checks).some(Boolean);
  }
  const GOOGLE_PLACE_DETAILS_FIELDS = [
    "place_id",
    "name",
    "formatted_address",
    "geometry",
    "url",
    "types",
    "business_status",
    "permanently_closed",
    "opening_hours"
  ];
  function appendLocaleCandidates(locales, seen, locale) {
    const normalized = normalizeLocaleCode(locale);
    if (!normalized) {
      return;
    }
    const variants = [normalized];
    const separatorIndex = normalized.indexOf("-");
    if (separatorIndex > 0) {
      variants.push(normalized.slice(0, separatorIndex));
    }
    for (const variant of variants) {
      if (seen.has(variant)) {
        continue;
      }
      seen.add(variant);
      locales.push(variant);
    }
  }
  function resolveGooglePlaceNameLocales(params) {
    const locales = [];
    const seen = /* @__PURE__ */ new Set();
    for (const locale of params.config?.nameLocales ?? []) {
      appendLocaleCandidates(locales, seen, locale);
    }
    appendLocaleCandidates(locales, seen, getCurrentWmeLocale());
    appendLocaleCandidates(locales, seen, "en");
    return locales;
  }
  async function runLocalizedPlaceDetailsLookup(params) {
    let bestMatch;
    let lastStatus;
    let notFoundStatus;
    const locales = params.locales.length > 0 ? params.locales : [void 0];
    for (const locale of locales) {
      const detailsRequest = {
        placeId: params.providerId,
        fields: GOOGLE_PLACE_DETAILS_FIELDS
      };
      if (locale) {
        detailsRequest.language = locale;
      }
      const { result, status } = await runPlaceDetailsLookup(
        params.service,
        detailsRequest
      );
      lastStatus = status;
      if (isOkPlaceDetailsStatus(status, params.googleMaps)) {
        const placeName = trimString(result?.name);
        const score = placeName ? scoreExternalProviderName(params.venueName, placeName) : 0;
        const currentMatch = {
          result,
          status,
          language: locale,
          placeName,
          score
        };
        if (!bestMatch || currentMatch.score > bestMatch.score) {
          bestMatch = currentMatch;
        }
        if (currentMatch.score >= 1) {
          break;
        }
      } else if (isNotFoundPlaceDetailsStatus(status, params.googleMaps) && notFoundStatus === void 0) {
        notFoundStatus = status;
      }
    }
    if (bestMatch) {
      return {
        result: bestMatch.result,
        status: bestMatch.status,
        language: bestMatch.language
      };
    }
    if (notFoundStatus !== void 0) {
      return {
        result: void 0,
        status: notFoundStatus
      };
    }
    return {
      result: void 0,
      status: lastStatus
    };
  }
  async function validateLinkedExternalProviders(params) {
    const uniqueProviderIds = Array.from(
      new Set(
        params.externalProviderIds.map((providerId) => trimString(providerId)).filter((providerId) => !!providerId)
      )
    );
    if (uniqueProviderIds.length === 0 || typeof window === "undefined" || params.settings?.enabled === false || !hasEnabledValidationChecks(params.settings)) {
      return {
        issues: [],
        proposals: []
      };
    }
    const googleMaps = getGoogleMapsApi$1();
    if (!googleMaps) {
      logger.info(
        "Google Places service unavailable on host window; skipping linked external provider validation"
      );
      return {
        issues: [],
        proposals: []
      };
    }
    const container = ensurePlacesServiceContainer$1();
    if (!container) {
      logger.warn(
        "Cannot initialize Google Places container for linked external provider validation"
      );
      return {
        issues: [],
        proposals: []
      };
    }
    const venueOrigin = getVenueSearchOrigin$1(params.venue);
    const normalizedCurrentOpeningHours = normalizeCurrentOpeningHours(
      params.currentOpeningHours ?? []
    );
    const googleNameLocales = resolveGooglePlaceNameLocales(params);
    logger.info(
      `Validating ${uniqueProviderIds.length} linked external provider(s) for venue "${params.venueName}"` + (venueOrigin ? ` at ${venueOrigin.lat.toFixed(6)},${venueOrigin.lon.toFixed(6)}` : " without usable venue geometry")
    );
    const service = new googleMaps.places.PlacesService(container);
    const issues = [];
    const proposals = [];
    for (const providerId of uniqueProviderIds) {
      logger.info(`Validating linked external provider ${providerId}`);
      const { result, status, language } = await runLocalizedPlaceDetailsLookup({
        service,
        googleMaps,
        providerId,
        venueName: params.venueName,
        locales: googleNameLocales
      });
      let findings = [];
      if (isOkPlaceDetailsStatus(status, googleMaps)) {
        const placeLocation = readLocation$1(result?.geometry?.location);
        const distanceMeters = venueOrigin && placeLocation ? calculateDistanceMeters$1(venueOrigin, placeLocation) : void 0;
        const googleOpeningHours = normalizeGoogleOpeningHours(
          result?.opening_hours
        );
        const googleOpeningHoursValue = buildOpeningHoursValueFromNormalizedSlots(
          googleOpeningHours
        );
        const googleOpeningHoursDisplay = formatOpeningHoursDisplay(
          Array.isArray(result?.opening_hours?.weekday_text) ? result.opening_hours.weekday_text : void 0,
          googleOpeningHours
        );
        logger.info(
          `Linked provider ${providerId} resolved: language=${language ?? "default"}, name=${trimString(result?.name) ?? "none"}, status=${normalizeBusinessStatus(result?.business_status) ?? (result?.permanently_closed ? "CLOSED_PERMANENTLY" : "none")}, distance=${distanceMeters ?? "n/a"}, types=${Array.isArray(result?.types) ? result.types.join(",") : "none"}, openingHours=${googleOpeningHours ? googleOpeningHours.length : "unsupported"}`
        );
        findings = buildExternalProviderValidationFindings(
          {
            providerId,
            venueName: params.venueName,
            placeName: trimString(result?.name),
            address: trimString(result?.formatted_address),
            url: trimString(result?.url),
            distanceMeters,
            currentCategories: params.currentCategories ?? [],
            googleTypes: Array.isArray(result?.types) ? result.types : [],
            currentOpeningHours: params.currentOpeningHours ?? [],
            googleOpeningHours,
            googleOpeningHoursValue,
            googleOpeningHoursDisplay,
            businessStatus: normalizeBusinessStatus(result?.business_status) ?? (result?.permanently_closed ? "permanently_closed" : void 0)
          },
          params.settings,
          params.config
        );
        if (params.settings?.checks?.openingHours !== false && normalizedCurrentOpeningHours === null) {
          logger.warn(
            `Linked provider ${providerId}: current WME opening hours could not be normalized for comparison`
          );
        }
        if (params.settings?.checks?.openingHours !== false && googleOpeningHours === null) {
          logger.warn(
            `Linked provider ${providerId}: Google opening hours could not be normalized for comparison`
          );
        }
      } else if (isNotFoundPlaceDetailsStatus(status, googleMaps)) {
        logger.info(`Linked provider ${providerId} could not be resolved: ${String(status)}`);
        findings = buildExternalProviderValidationFindings(
          {
            providerId,
            venueName: params.venueName,
            notFound: true
          },
          params.settings,
          params.config
        );
      } else {
        logger.warn(
          `Linked external provider validation failed for ${providerId}: ${String(status)}`
        );
      }
      if (findings.length > 0) {
        for (const finding of findings) {
          logger.info(
            `Linked provider ${providerId} validation issue: ${finding.issue.ruleId} (${finding.issue.severity})`
          );
          issues.push(finding.issue);
          proposals.push(finding.proposal);
        }
      } else {
        logger.info(`Linked provider ${providerId} validation passed`);
      }
    }
    return {
      issues,
      proposals
    };
  }
  const WHITELIST_STORE_VERSION = 1;
  function getWhitelistStorageKey() {
    return `${APP_STORAGE_PREFIX}:whitelist`;
  }
  function getDefaultStore() {
    return {
      version: WHITELIST_STORE_VERSION,
      items: []
    };
  }
  function isValidEntry(value) {
    if (!value || typeof value !== "object") {
      return false;
    }
    const entry = value;
    return typeof entry.placeId === "string" && typeof entry.ruleId === "string" && typeof entry.field === "string" && entry.scope === "place" && typeof entry.createdAt === "string" && typeof entry.configId === "string" && typeof entry.configVersion === "number" && typeof entry.chainsId === "string" && typeof entry.chainsVersion === "number";
  }
  function isValidStore(value) {
    if (!value || typeof value !== "object") {
      return false;
    }
    const store = value;
    return store.version === WHITELIST_STORE_VERSION && Array.isArray(store.items) && store.items.every((item) => isValidEntry(item));
  }
  function buildWhitelistKey(params) {
    return `${params.placeId}::${params.ruleId}::${params.field}`;
  }
  function isEntryActive(entry, runtime) {
    return entry.configId === runtime.configId && entry.configVersion === runtime.configVersion && entry.chainsId === runtime.chainsId && entry.chainsVersion === runtime.chainsVersion;
  }
  function getLocalStorage() {
    try {
      return window.localStorage;
    } catch {
      return null;
    }
  }
  function loadWhitelistStore() {
    const storage = getLocalStorage();
    if (!storage) {
      return getDefaultStore();
    }
    const raw = storage.getItem(getWhitelistStorageKey());
    if (!raw) {
      return getDefaultStore();
    }
    try {
      const parsed = JSON.parse(raw);
      if (!isValidStore(parsed)) {
        return getDefaultStore();
      }
      return parsed;
    } catch {
      return getDefaultStore();
    }
  }
  function saveWhitelistStore(store) {
    const storage = getLocalStorage();
    if (!storage) {
      return;
    }
    storage.setItem(getWhitelistStorageKey(), JSON.stringify(store));
  }
  function upsertWhitelistEntries(entries) {
    if (entries.length === 0) {
      return 0;
    }
    const current = loadWhitelistStore();
    const keyedEntries = /* @__PURE__ */ new Map();
    for (const existing of current.items) {
      keyedEntries.set(
        buildWhitelistKey(existing),
        existing
      );
    }
    let changed = 0;
    for (const entry of entries) {
      const key = buildWhitelistKey(entry);
      const existing = keyedEntries.get(key);
      if (!existing) {
        keyedEntries.set(key, entry);
        changed += 1;
        continue;
      }
      if (existing.configId !== entry.configId || existing.configVersion !== entry.configVersion || existing.chainsId !== entry.chainsId || existing.chainsVersion !== entry.chainsVersion) {
        keyedEntries.set(key, {
          ...existing,
          ...entry,
          createdAt: existing.createdAt,
          updatedAt: entry.createdAt
        });
        changed += 1;
      }
    }
    saveWhitelistStore({
      version: WHITELIST_STORE_VERSION,
      items: Array.from(keyedEntries.values())
    });
    return changed;
  }
  function filterWhitelistedAnalysis(params) {
    const store = params.store ?? loadWhitelistStore();
    if (store.items.length === 0) {
      return {
        issues: params.issues,
        proposals: params.proposals,
        suppressedIssueCount: 0
      };
    }
    const activeKeys = new Set(
      store.items.filter((entry) => isEntryActive(entry, params.runtime)).map((entry) => buildWhitelistKey(entry))
    );
    if (activeKeys.size === 0) {
      return {
        issues: params.issues,
        proposals: params.proposals,
        suppressedIssueCount: 0
      };
    }
    const suppressedIssueKeys = /* @__PURE__ */ new Set();
    const visibleIssues = [];
    for (const issue of params.issues) {
      const ruleId = issue.ruleId;
      if (!ruleId) {
        visibleIssues.push(issue);
        continue;
      }
      const key = buildWhitelistKey({
        placeId: params.placeId,
        ruleId,
        field: issue.field
      });
      if (activeKeys.has(key)) {
        suppressedIssueKeys.add(key);
        continue;
      }
      visibleIssues.push(issue);
    }
    if (suppressedIssueKeys.size === 0) {
      return {
        issues: params.issues,
        proposals: params.proposals,
        suppressedIssueCount: 0
      };
    }
    const visibleProposals = params.proposals.filter((proposal) => {
      if (!proposal.issueRuleId) {
        return true;
      }
      const key = buildWhitelistKey({
        placeId: params.placeId,
        ruleId: proposal.issueRuleId,
        field: proposal.field
      });
      return !suppressedIssueKeys.has(key);
    });
    return {
      issues: visibleIssues,
      proposals: visibleProposals,
      suppressedIssueCount: params.issues.length - visibleIssues.length
    };
  }
  async function scanVisibleVenues(params) {
    const { venues, runtimeConfig: runtimeConfig2, runtimeChains: runtimeChains2, whitelistRuntime } = params;
    const results = [];
    const whitelistStore = whitelistRuntime ? loadWhitelistStore() : void 0;
    let ok = 0;
    let warning = 0;
    let error = 0;
    for (const venue of venues) {
      const place = mapVenueToPlaceLike(venue);
      const matchResult = matchPlaceToChain(place, runtimeChains2);
      const categoryStandards = resolveCategoryStandards(
        runtimeConfig2,
        place.categories ?? []
      );
      const effectivePolicy = resolveEffectivePolicy({
        categoryStandards,
        chainPolicy: matchResult.chain?.policy
      });
      const issues = evaluatePlace(place, effectivePolicy, matchResult.chain, {
        cityInVenueNameRule: runtimeConfig2.rules?.cityInVenueName,
        phoneFormatting: runtimeConfig2.formatting?.phone,
        urlFormatting: runtimeConfig2.formatting?.url
      });
      const googleValidation = params.googleMapsValidationSettings?.enabled && (place.externalProviderIds ?? []).length > 0 ? await validateLinkedExternalProviders({
        venueName: place.name,
        externalProviderIds: place.externalProviderIds ?? [],
        venue,
        currentCategories: place.categories ?? [],
        currentOpeningHours: place.openingHours ?? [],
        settings: params.googleMapsValidationSettings,
        config: runtimeConfig2.googleMapsValidation
      }) : { issues: [] };
      const visibleIssues = whitelistRuntime ? filterWhitelistedAnalysis({
        placeId: String(venue.id),
        issues: [...issues, ...googleValidation.issues],
        proposals: [],
        runtime: whitelistRuntime,
        store: whitelistStore
      }).issues : [...issues, ...googleValidation.issues];
      const hasErrors = visibleIssues.some((issue) => issue.severity === "error");
      const hasWarnings = visibleIssues.some((issue) => issue.severity === "warning");
      let severity = "ok";
      if (hasErrors) {
        severity = "error";
        error += 1;
      } else if (hasWarnings) {
        severity = "warning";
        warning += 1;
      } else {
        severity = "ok";
        ok += 1;
      }
      results.push({
        venueId: venue.id,
        name: place.name,
        issueCount: visibleIssues.length,
        hasErrors,
        hasWarnings,
        severity
      });
    }
    return {
      total: venues.length,
      ok,
      warning,
      error,
      results
    };
  }
  const HIGHLIGHT_LAYER_NAME = "wmeph-row-visible-venues";
  const MIN_POINT_HIGHLIGHT_ZOOM = 17;
  const POINT_HIGHLIGHT_RADIUS = 12;
  const POINT_HIGHLIGHT_STROKE = 5;
  const POLYGON_HIGHLIGHT_STROKE = 4;
  const POLYGON_OUTLINE_STROKE = 6;
  const POLYGON_OUTLINE_HALO_STROKE = 10;
  let layerInitialized = false;
  let checkboxInitialized = false;
  let highlightedFeatureIds = [];
  function buildFeatureId(venueId, variant) {
    return `wmeph-row-highlight-${venueId}-${variant}`;
  }
  function getSeverityColor(severity) {
    if (severity === "error") {
      return "#d32f2f";
    }
    if (severity === "warning") {
      return "#f9a825";
    }
    return "#2e7d32";
  }
  function getSeverityOutlineColor(severity) {
    if (severity === "error") {
      return "#d32f2f";
    }
    if (severity === "warning") {
      return "#f9a825";
    }
    return "#00c853";
  }
  function getPolygonFillOpacity(severity) {
    if (severity === "ok") {
      return 0.36;
    }
    return 0.28;
  }
  function getPointHighlightStyle(severity) {
    return {
      strokeColor: getSeverityColor(severity),
      fillColor: "#ffffff",
      strokeOpacity: 1,
      fillOpacity: 0,
      strokeWidth: POINT_HIGHLIGHT_STROKE,
      pointRadius: POINT_HIGHLIGHT_RADIUS
    };
  }
  function getPolygonHighlightStyle(severity) {
    return {
      strokeColor: getSeverityColor(severity),
      fillColor: getSeverityColor(severity),
      strokeOpacity: 1,
      fillOpacity: getPolygonFillOpacity(severity),
      strokeWidth: POLYGON_HIGHLIGHT_STROKE
    };
  }
  function getPolygonOutlineStyle(severity) {
    return {
      strokeColor: getSeverityOutlineColor(severity),
      fillColor: getSeverityOutlineColor(severity),
      strokeOpacity: 1,
      fillOpacity: 0,
      strokeWidth: POLYGON_OUTLINE_STROKE
    };
  }
  function getPolygonOutlineHaloStyle() {
    return {
      strokeColor: "#ffffff",
      fillColor: "#ffffff",
      strokeOpacity: 0.95,
      fillOpacity: 0,
      strokeWidth: POLYGON_OUTLINE_HALO_STROKE
    };
  }
  function createPointFeature(result, coordinates, variant) {
    return {
      id: buildFeatureId(result.venueId, variant),
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates
      },
      properties: {
        severity: result.severity,
        venueId: result.venueId,
        venueName: result.name,
        issueCount: result.issueCount,
        geometryKind: "point",
        highlightVariant: variant,
        featureType: "SDKFeature"
      }
    };
  }
  function createPolygonFeature(result, coordinates, variant, geometryKind) {
    return {
      id: buildFeatureId(result.venueId, variant),
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates
      },
      properties: {
        severity: result.severity,
        venueId: result.venueId,
        venueName: result.name,
        issueCount: result.issueCount,
        geometryKind,
        highlightVariant: variant,
        featureType: "SDKFeature"
      }
    };
  }
  function buildSdkFeatures(venue, result, allowPointHighlights) {
    const geometry = venue.geometry;
    if (!geometry) {
      return [];
    }
    if ((geometry.type === "Point" || geometry.type === "point") && Array.isArray(geometry.coordinates)) {
      if (!allowPointHighlights) {
        return [];
      }
      return [
        createPointFeature(result, geometry.coordinates, "point-marker")
      ];
    }
    if ((geometry.type === "Polygon" || geometry.type === "polygon") && Array.isArray(geometry.coordinates)) {
      return [
        createPolygonFeature(result, geometry.coordinates, "polygon-shape-fill", "polygon-fill"),
        createPolygonFeature(
          result,
          geometry.coordinates,
          "polygon-shape-outline-halo",
          "polygon-outline-halo"
        ),
        createPolygonFeature(result, geometry.coordinates, "polygon-shape-outline", "polygon-outline")
      ];
    }
    if ((geometry.type === "MultiPolygon" || geometry.type === "multipolygon") && Array.isArray(geometry.coordinates)) {
      const features = [];
      for (let index = 0; index < geometry.coordinates.length; index += 1) {
        const polygonCoordinates = geometry.coordinates[index];
        if (!Array.isArray(polygonCoordinates)) {
          continue;
        }
        const variant = `polygon-part-${index}`;
        features.push(
          createPolygonFeature(result, polygonCoordinates, `${variant}-fill`, "polygon-fill")
        );
        features.push(
          createPolygonFeature(
            result,
            polygonCoordinates,
            `${variant}-outline-halo`,
            "polygon-outline-halo"
          )
        );
        features.push(
          createPolygonFeature(result, polygonCoordinates, `${variant}-outline`, "polygon-outline")
        );
      }
      return features;
    }
    return [];
  }
  function toNumber(value) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string" && value.trim() !== "") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
    return null;
  }
  function resolveCurrentZoomLevel(sdk) {
    const map = sdk?.Map;
    if (!map) {
      return null;
    }
    const zoomCandidates = [];
    const lookups = [
      () => map.getZoomLevel?.(),
      () => map.getZoom?.(),
      () => map.getMapZoom?.(),
      () => map.zoomLevel,
      () => map.zoom,
      () => map.currentZoom
    ];
    for (const lookup of lookups) {
      try {
        zoomCandidates.push(lookup());
      } catch {
      }
    }
    for (const candidate of zoomCandidates) {
      const directNumber = toNumber(candidate);
      if (directNumber !== null) {
        return directNumber;
      }
      if (candidate && typeof candidate === "object") {
        const typedCandidate = candidate;
        const nestedNumber = toNumber(
          typedCandidate.zoom ?? typedCandidate.level ?? typedCandidate.value
        );
        if (nestedNumber !== null) {
          return nestedNumber;
        }
      }
    }
    return null;
  }
  function buildStyleRules() {
    const severities = ["error", "warning", "ok"];
    const rules = [];
    for (const severity of severities) {
      rules.push({
        predicate: (featureProperties) => featureProperties?.severity === severity && featureProperties?.geometryKind === "point",
        style: getPointHighlightStyle(severity)
      });
      rules.push({
        predicate: (featureProperties) => featureProperties?.severity === severity && featureProperties?.geometryKind === "polygon-fill",
        style: getPolygonHighlightStyle(severity)
      });
      rules.push({
        predicate: (featureProperties) => featureProperties?.severity === severity && featureProperties?.geometryKind === "polygon-outline-halo",
        style: getPolygonOutlineHaloStyle()
      });
      rules.push({
        predicate: (featureProperties) => featureProperties?.severity === severity && featureProperties?.geometryKind === "polygon-outline",
        style: getPolygonOutlineStyle(severity)
      });
    }
    return rules;
  }
  function ensureHighlightLayer() {
    const sdk = getWmeSdk();
    if (!sdk) {
      logger.warn("Cannot initialize highlight layer: SDK unavailable");
      return;
    }
    if (!layerInitialized) {
      sdk.Map.addLayer({
        layerName: HIGHLIGHT_LAYER_NAME,
        styleRules: buildStyleRules()
      });
      layerInitialized = true;
      logger.info("Highlight layer initialized");
    }
    if (!checkboxInitialized) {
      sdk.LayerSwitcher.addLayerCheckbox({
        name: t("highlighter.layerCheckboxName"),
        isChecked: true
      });
      checkboxInitialized = true;
      logger.info("Highlight layer checkbox initialized");
    }
  }
  function clearHighlights() {
    const sdk = getWmeSdk();
    if (!sdk || highlightedFeatureIds.length === 0) {
      highlightedFeatureIds = [];
      return;
    }
    for (const featureId of highlightedFeatureIds) {
      try {
        sdk.Map.removeFeatureFromLayer({
          layerName: HIGHLIGHT_LAYER_NAME,
          featureId
        });
      } catch {
      }
    }
    highlightedFeatureIds = [];
    logger.info("Highlight layer cleared");
  }
  function renderHighlights(summary, venues, options = {}) {
    const sdk = getWmeSdk();
    if (!sdk) {
      logger.warn("Cannot render highlights: SDK unavailable");
      return {
        renderedFeatureCount: 0,
        keptExisting: false
      };
    }
    ensureHighlightLayer();
    const currentZoomLevel = resolveCurrentZoomLevel(sdk);
    const allowPointHighlights = currentZoomLevel === null || currentZoomLevel >= MIN_POINT_HIGHLIGHT_ZOOM;
    const venueMap = /* @__PURE__ */ new Map();
    for (const venue of venues) {
      venueMap.set(String(venue.id), venue);
    }
    const polygonFillFeatures = [];
    const polygonOutlineHaloFeatures = [];
    const polygonOutlineFeatures = [];
    const pointFeatures = [];
    const nextFeatureIds = [];
    for (const result of summary.results) {
      const venue = venueMap.get(String(result.venueId));
      if (!venue) {
        continue;
      }
      const venueFeatures = buildSdkFeatures(venue, result, allowPointHighlights);
      if (venueFeatures.length === 0) {
        continue;
      }
      for (const feature of venueFeatures) {
        const geometryKind = feature?.properties?.geometryKind;
        if (geometryKind === "polygon-fill") {
          polygonFillFeatures.push(feature);
        } else if (geometryKind === "polygon-outline-halo") {
          polygonOutlineHaloFeatures.push(feature);
        } else if (geometryKind === "polygon-outline") {
          polygonOutlineFeatures.push(feature);
        } else {
          pointFeatures.push(feature);
        }
        nextFeatureIds.push(feature.id);
      }
    }
    const features = [
      ...polygonFillFeatures,
      ...polygonOutlineHaloFeatures,
      ...polygonOutlineFeatures,
      ...pointFeatures
    ];
    if (features.length === 0) {
      if (options.keepExistingOnEmpty && allowPointHighlights && highlightedFeatureIds.length > 0) {
        logger.info("No drawable highlights, keeping existing rendered layer");
        return {
          renderedFeatureCount: 0,
          keptExisting: true
        };
      }
      clearHighlights();
      logger.info("No highlight features to render");
      return {
        renderedFeatureCount: 0,
        keptExisting: false
      };
    }
    clearHighlights();
    sdk.Map.addFeaturesToLayer({
      layerName: HIGHLIGHT_LAYER_NAME,
      features
    });
    highlightedFeatureIds = nextFeatureIds;
    logger.info(`Rendered ${features.length} highlight feature(s)`);
    return {
      renderedFeatureCount: features.length,
      keptExisting: false
    };
  }
  let listenersRegistered$1 = false;
  let debounceTimer$1 = null;
  function debounce$1(fn, delayMs) {
    if (debounceTimer$1 !== null) {
      window.clearTimeout(debounceTimer$1);
    }
    debounceTimer$1 = window.setTimeout(() => {
      debounceTimer$1 = null;
      fn();
    }, delayMs);
  }
  function registerAutoScanListeners(shouldAutoScan, scanHandler) {
    if (listenersRegistered$1) {
      return;
    }
    const sdk = getWmeSdk();
    if (!sdk) {
      logger.warn("Cannot register auto scan listeners: SDK unavailable");
      return;
    }
    const runIfEnabled = () => {
      if (!shouldAutoScan()) {
        return;
      }
      debounce$1(() => {
        void scanHandler();
      }, 300);
    };
    sdk.Events.on({
      eventName: "wme-map-move-end",
      eventHandler: () => {
        logger.info("Map move end detected");
        runIfEnabled();
      }
    });
    sdk.Events.on({
      eventName: "wme-map-zoom-changed",
      eventHandler: () => {
        logger.info("Map zoom changed detected");
        runIfEnabled();
      }
    });
    listenersRegistered$1 = true;
    logger.info("Auto scan listeners registered");
  }
  const TRACKED_DATA_MODEL_NAME = "venues";
  const SAVE_SCAN_DEBOUNCE_MS = 300;
  let listenersRegistered = false;
  let debounceTimer = null;
  function getSavedVenueIds(event) {
    if (event?.dataModelName !== TRACKED_DATA_MODEL_NAME || !Array.isArray(event.objectIds)) {
      return [];
    }
    return [...new Set(event.objectIds.map((objectId) => String(objectId)).filter(Boolean))];
  }
  function debounce(fn, delayMs) {
    if (debounceTimer !== null) {
      globalThis.clearTimeout(debounceTimer);
    }
    debounceTimer = globalThis.setTimeout(() => {
      debounceTimer = null;
      fn();
    }, delayMs);
  }
  function registerVenueSaveScanListener(scanHandler) {
    if (listenersRegistered) {
      return;
    }
    const sdk = getWmeSdk();
    if (!sdk) {
      logger.warn("Cannot register venue save scan listener: SDK unavailable");
      return;
    }
    if (typeof sdk.Events?.trackDataModelEvents !== "function") {
      logger.warn("Cannot register venue save scan listener: SDK data model tracking unavailable");
      return;
    }
    sdk.Events.trackDataModelEvents({
      dataModelName: TRACKED_DATA_MODEL_NAME
    });
    sdk.Events.on({
      eventName: "wme-data-model-objects-saved",
      eventHandler: (event) => {
        const savedVenueIds = getSavedVenueIds(event);
        if (savedVenueIds.length === 0) {
          return;
        }
        logger.info(
          `Detected saved venue edit(s): ${savedVenueIds.join(", ")}; rescanning visible venues`
        );
        debounce(() => {
          void scanHandler();
        }, SAVE_SCAN_DEBOUNCE_MS);
      }
    });
    listenersRegistered = true;
    logger.info("Venue save scan listener registered");
  }
  function isLocaleFile(value) {
    if (!value || typeof value !== "object") {
      return false;
    }
    const localeFile = value;
    return typeof localeFile.locale === "string" && !!localeFile.messages && typeof localeFile.messages === "object" && !Array.isArray(localeFile.messages);
  }
  function hasManifestFile(manifest, path) {
    return !!manifest.files[path];
  }
  async function loadLocaleFile(path) {
    logger.info(`Loading locale ${path}`);
    const result = await fetchJson(getConfigUrl(path));
    if (!isLocaleFile(result)) {
      throw new Error(`Invalid locale file: ${path}`);
    }
    return result;
  }
  async function loadBestAvailableLocale(params) {
    const candidates = getLocaleCandidates(
      params.preferredLocale,
      params.fallbackLocale
    );
    for (const locale of candidates) {
      const path = `locales/${locale}.json`;
      if (!hasManifestFile(params.manifest, path)) {
        continue;
      }
      try {
        return await loadLocaleFile(path);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown locale loading error";
        logger.warn(`Failed to load locale ${locale}: ${message}`);
      }
    }
    throw new Error("No locale file available");
  }
  let runtimeManifest = null;
  let runtimeConfig = null;
  let runtimeChains = null;
  let runtimeSettings = null;
  let runtimeCountry;
  let externalProviderSuggestionRequestId = 0;
  let externalProviderValidationRequestId = 0;
  function resolvePreferredCountry(params) {
    const candidates = [
      params.primaryCountry,
      params.mapContextCountry,
      params.runtimeCountry,
      params.fallbackCountry
    ];
    for (const candidate of candidates) {
      const normalizedCountry = normalizeCountryCode(candidate);
      if (normalizedCountry) {
        return normalizedCountry;
      }
    }
    return void 0;
  }
  function getCountryFromCurrentSelection() {
    const sdk = getWmeSdk();
    if (!sdk) {
      return void 0;
    }
    const selection = sdk.Editing?.getSelection?.();
    if (!selection || selection.objectType !== "venue") {
      return void 0;
    }
    const venueId = selection.ids?.[0];
    if (!venueId) {
      return void 0;
    }
    const venue = sdk.DataModel?.Venues?.getById?.({ venueId });
    if (!venue) {
      return void 0;
    }
    return resolveVenueCountryCode(venue);
  }
  function getCountryFromVisibleMapContext() {
    const sdk = getWmeSdk();
    const countries = sdk?.DataModel?.Countries;
    const topCountry = resolveCountryCodeFromCountryEntity(
      countries?.getTopCountry?.()
    );
    let centerCountry;
    const mapCenter = sdk?.Map?.getMapCenter?.() ?? sdk?.Map?.getCenter?.();
    let lon;
    let lat;
    if (Array.isArray(mapCenter) && mapCenter.length >= 2) {
      const [centerLon, centerLat] = mapCenter;
      if (typeof centerLon === "number" && typeof centerLat === "number") {
        lon = centerLon;
        lat = centerLat;
      }
    } else if (mapCenter && typeof mapCenter === "object") {
      const center = mapCenter;
      const rawLon = center.lon ?? center.lng ?? center.x;
      const rawLat = center.lat ?? center.y;
      if (typeof rawLon === "number" && typeof rawLat === "number") {
        lon = rawLon;
        lat = rawLat;
      }
    }
    if (countries && typeof lon === "number" && typeof lat === "number") {
      const lookups = [
        () => countries.getByPoint?.({ lon, lat }),
        () => countries.getByPoint?.([lon, lat]),
        () => countries.getByPoint?.(lon, lat),
        () => countries.getByCoordinates?.({ lon, lat }),
        () => countries.getByCoordinates?.([lon, lat]),
        () => countries.getByCoordinates?.(lon, lat),
        () => countries.getByLocation?.({ lon, lat }),
        () => countries.getByLocation?.({ lat, lon }),
        () => countries.getByLocation?.(lon, lat),
        () => countries.getByLonLat?.({ lon, lat }),
        () => countries.getByLonLat?.(lon, lat),
        () => countries.getByLatLon?.({ lat, lon }),
        () => countries.getByLatLon?.(lat, lon)
      ];
      for (const lookup of lookups) {
        try {
          const result = lookup();
          const entries = Array.isArray(result) ? result : [result];
          for (const entry of entries) {
            const country = resolveCountryCodeFromCountryEntity(entry);
            if (country) {
              centerCountry = country;
              break;
            }
          }
          if (centerCountry) {
            break;
          }
        } catch {
        }
      }
    }
    const venues = getVisibleVenues();
    let venueCountry;
    for (const venue of venues) {
      const country = resolveVenueCountryCode(venue);
      if (country) {
        venueCountry = country;
        break;
      }
    }
    const segments = sdk?.DataModel?.Segments?.getAll?.();
    let segmentCountry;
    if (Array.isArray(segments)) {
      for (const segment of segments) {
        const countryIdCandidates = [
          segment?.countryID,
          segment?.countryId,
          segment?.attributes?.countryID,
          segment?.attributes?.countryId,
          segment?.address?.countryID,
          segment?.address?.countryId
        ];
        for (const countryId of countryIdCandidates) {
          const resolved = resolveCountryCodeFromCountryId(countryId);
          if (resolved) {
            segmentCountry = resolved;
            break;
          }
        }
        if (segmentCountry) {
          break;
        }
        const countryObjectCandidates = [
          segment?.country,
          segment?.address?.country
        ];
        for (const countryObject of countryObjectCandidates) {
          const resolved = resolveCountryCodeFromCountryEntity(countryObject);
          if (resolved) {
            segmentCountry = resolved;
            break;
          }
        }
        if (segmentCountry) {
          break;
        }
      }
    }
    const hostWindow = (() => {
      try {
        if (typeof unsafeWindow !== "undefined") {
          return unsafeWindow;
        }
      } catch {
      }
      return window;
    })();
    let legacyCountry;
    const legacySegments = hostWindow?.W?.model?.segments?.objects;
    const legacyCountriesModel = hostWindow?.W?.model?.countries;
    if (legacySegments && typeof legacySegments === "object") {
      for (const segment of Object.values(legacySegments)) {
        const countryId = segment?.attributes?.countryID ?? segment?.attributes?.countryId ?? segment?.countryID ?? segment?.countryId;
        if (countryId === void 0 || countryId === null) {
          continue;
        }
        const countryObject = legacyCountriesModel?.getObjectById?.(countryId) ?? legacyCountriesModel?.objects?.[countryId];
        const resolved = resolveCountryCodeFromCountryEntity(countryObject?.attributes ?? countryObject) ?? resolveCountryCodeFromCountryId(countryId);
        if (resolved) {
          legacyCountry = resolved;
          break;
        }
      }
    }
    logger.info(
      `Map country candidates: top=${topCountry ?? "none"}, center=${centerCountry ?? "none"}, venues=${venueCountry ?? "none"}, segments=${segmentCountry ?? "none"}, legacy=${legacyCountry ?? "none"}`
    );
    return topCountry ?? centerCountry ?? venueCountry ?? segmentCountry ?? legacyCountry;
  }
  function wait(ms) {
    return new Promise((resolve) => {
      window.setTimeout(resolve, ms);
    });
  }
  function findMissingExternalProviderIssue(issues) {
    return issues.find(
      (issue) => issue.field === "externalProviderIds" && (issue.ruleId === "externalProvider.required" || issue.ruleId === "externalProvider.recommended")
    );
  }
  function readConfigDefaultLocale(config) {
    return typeof config?.defaults?.locale === "string" ? config.defaults.locale : void 0;
  }
  function formatAnalysisCountLabel(issues) {
    const findingsLabel = t("status.analysisCount.findings", {
      count: issues.length
    });
    const warningOrErrorCount = issues.filter(
      (issue) => issue.severity === "warning" || issue.severity === "error"
    ).length;
    if (warningOrErrorCount === issues.length) {
      return findingsLabel;
    }
    const infoCount = issues.length - warningOrErrorCount;
    return t("status.analysisCount.findingsWithInfo", {
      count: issues.length,
      infoCount
    });
  }
  function getCurrentWhitelistRuntimeSnapshot() {
    if (!runtimeConfig || !runtimeChains) {
      return null;
    }
    return {
      configId: runtimeConfig.id,
      configVersion: runtimeConfig.version,
      chainsId: runtimeChains.id,
      chainsVersion: runtimeChains.version
    };
  }
  function applyWhitelistToAnalysis(params) {
    const whitelistRuntime = getCurrentWhitelistRuntimeSnapshot();
    if (!whitelistRuntime) {
      return {
        issues: params.issues,
        proposals: params.proposals,
        suppressedIssueCount: 0
      };
    }
    return filterWhitelistedAnalysis({
      placeId: params.venueId,
      issues: params.issues,
      proposals: params.proposals,
      runtime: whitelistRuntime
    });
  }
  function renderLatestVenueAnalysis() {
    const latest = getLatestAnalysisState();
    if (!latest?.isVenueSelection) {
      return;
    }
    renderFeatureEditorAnalysis(
      latest.placeName,
      latest.chainId,
      latest.issues,
      latest.proposals,
      latest.statusMessage
    );
    wireApplyButton();
    wireWhitelistButtons();
  }
  async function refreshRuntimeLocale() {
    if (!runtimeManifest || !runtimeConfig) {
      return;
    }
    try {
      const localeFile = await loadBestAvailableLocale({
        manifest: runtimeManifest,
        preferredLocale: getCurrentWmeLocale(),
        fallbackLocale: readConfigDefaultLocale(runtimeConfig)
      });
      setRuntimeLocale(localeFile);
      logger.info(`Runtime locale loaded: ${localeFile.locale}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown locale loading error";
      logger.warn(`Runtime locale could not be loaded: ${message}`);
    }
  }
  function applyExternalProviderSuggestionToIssues(issues, targetIssue, suggestionMessage) {
    return issues.map((issue) => {
      if (issue.field !== targetIssue.field || issue.ruleId !== targetIssue.ruleId) {
        return issue;
      }
      return {
        ...issue,
        message: suggestionMessage ?? targetIssue.message
      };
    });
  }
  function removeExternalProviderValidationIssues(issues) {
    return issues.filter(
      (issue) => !isExternalProviderValidationRuleId(issue.ruleId)
    );
  }
  function removeExternalProviderValidationProposals(proposals) {
    return proposals.filter(
      (proposal) => !isExternalProviderValidationRuleId(proposal.issueRuleId)
    );
  }
  async function refreshExternalProviderSuggestions(params) {
    const suggestions = await findSuggestedExternalProviders(
      params.venue,
      params.query
    );
    if (params.requestId !== externalProviderSuggestionRequestId) {
      return;
    }
    const latest = getLatestAnalysisState();
    if (!latest?.isVenueSelection || latest.venueId !== String(params.venue.id)) {
      return;
    }
    const retainedProposals = latest.proposals.filter(
      (proposal) => !(proposal.field === params.issue.field && proposal.issueRuleId === params.issue.ruleId)
    );
    const suggestionProposals = buildExternalProviderSuggestionProposals(
      params.issue,
      suggestions,
      latest.currentExternalProviderIds
    );
    const topSuggestion = suggestions[0];
    const issuesWithSuggestion = applyExternalProviderSuggestionToIssues(
      latest.issues,
      params.issue,
      buildSuggestedExternalProviderIssueMessage(params.issue, topSuggestion)
    );
    const filteredAnalysis = applyWhitelistToAnalysis({
      venueId: latest.venueId,
      issues: issuesWithSuggestion,
      proposals: [...retainedProposals, ...suggestionProposals]
    });
    setLatestAnalysisState({
      ...latest,
      issues: filteredAnalysis.issues,
      proposals: filteredAnalysis.proposals
    });
    logger.info(
      suggestions.length > 0 ? `Found ${suggestions.length} external provider suggestion(s) for venue ${params.venue.id}` : `No nearby external provider suggestions found for venue ${params.venue.id}`
    );
    renderLatestVenueAnalysis();
  }
  async function refreshExternalProviderValidation(params) {
    const googleMapsValidationSettings = getEffectiveRuntimeGoogleMapsValidationSettings();
    const validation = await validateLinkedExternalProviders({
      venueName: params.venueName,
      externalProviderIds: params.externalProviderIds,
      venue: params.venue,
      currentCategories: params.currentCategories,
      currentOpeningHours: params.currentOpeningHours,
      settings: googleMapsValidationSettings,
      config: runtimeConfig?.googleMapsValidation
    });
    if (params.requestId !== externalProviderValidationRequestId) {
      return;
    }
    const latest = getLatestAnalysisState();
    if (!latest?.isVenueSelection || latest.venueId !== params.venueId) {
      return;
    }
    const retainedIssues = removeExternalProviderValidationIssues(latest.issues);
    const retainedProposals = removeExternalProviderValidationProposals(
      latest.proposals
    );
    const filteredAnalysis = applyWhitelistToAnalysis({
      venueId: latest.venueId,
      issues: [...retainedIssues, ...validation.issues],
      proposals: [...retainedProposals, ...validation.proposals]
    });
    setLatestAnalysisState({
      ...latest,
      issues: filteredAnalysis.issues,
      proposals: filteredAnalysis.proposals
    });
    if (validation.issues.length > 0) {
      logger.info(
        `Linked external provider validation found ${validation.issues.length} issue(s) for venue ${params.venueId}`
      );
    }
    renderLatestVenueAnalysis();
  }
  async function resolveStartupCountry(fallbackCountry, attempts = 8, delayMs = 400) {
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      const mapCountry = getCountryFromVisibleMapContext();
      const selectionCountry = getCountryFromCurrentSelection();
      const resolved = mapCountry ?? selectionCountry;
      if (resolved) {
        logger.info(
          `Startup country resolved on attempt ${attempt}: ${normalizeCountryCode(resolved)}`
        );
        return resolved;
      }
      if (attempt < attempts) {
        await wait(delayMs);
      }
    }
    return fallbackCountry;
  }
  async function loadRuntimeDataForCountry(country) {
    const normalizedCountry = normalizeCountryCode(country);
    logger.info(`Loading runtime data for country: ${normalizedCountry ?? "global"}`);
    runtimeConfig = await resolveRuntimeConfig(normalizedCountry);
    runtimeChains = await resolveRuntimeChains(normalizedCountry);
    runtimeCountry = normalizedCountry;
    await refreshRuntimeLocale();
  }
  function getGoogleMapsValidationAvailability() {
    return runtimeConfig ? resolveGoogleMapsValidationAvailability(runtimeConfig) : getDefaultGoogleMapsValidationAvailability();
  }
  function getEffectiveRuntimeGoogleMapsValidationSettings() {
    if (!runtimeSettings) {
      return void 0;
    }
    return getEffectiveGoogleMapsValidationSettings({
      user: runtimeSettings.googleMapsValidation,
      availability: getGoogleMapsValidationAvailability()
    });
  }
  function buildGoogleMapsValidationSidebarState() {
    const googleMapsValidationAvailability = getGoogleMapsValidationAvailability();
    return {
      googleMapsValidation: getEffectiveRuntimeGoogleMapsValidationSettings(),
      googleMapsValidationAvailability
    };
  }
  async function setAutoScanVisibleVenues(enabled) {
    if (!runtimeSettings) {
      logger.warn("Cannot update auto scan setting: runtime settings unavailable");
      return;
    }
    runtimeSettings = {
      ...runtimeSettings,
      autoScanVisibleVenues: enabled
    };
    settingsManager.save(runtimeSettings);
    const sidebarState = getSidebarDebugState();
    if (sidebarState) {
      setSidebarDebugState({
        ...sidebarState,
        ...buildGoogleMapsValidationSidebarState(),
        autoScanVisibleVenues: enabled,
        lastStatus: enabled ? t("status.autoScanEnabled") : t("status.autoScanDisabled")
      });
      await rerenderSidebar();
    }
  }
  function hasEnabledGoogleMapsValidationChecks() {
    const checks = getEffectiveRuntimeGoogleMapsValidationSettings()?.checks;
    if (!checks) {
      return false;
    }
    return Object.values(checks).some(Boolean);
  }
  async function reanalyzeCurrentVenueSelection() {
    const latest = getLatestAnalysisState();
    if (!latest?.isVenueSelection) {
      return;
    }
    const sdk = getWmeSdk();
    if (!sdk) {
      logger.warn("Cannot re-analyze current venue: SDK unavailable");
      return;
    }
    const venue = sdk.DataModel?.Venues?.getById?.({
      venueId: latest.venueId
    });
    if (!venue) {
      logger.warn(`Cannot re-analyze current venue: ${latest.venueId} not found`);
      return;
    }
    await analyzeVenue({
      venue
    });
  }
  async function setGoogleMapsValidationEnabled(enabled) {
    if (!runtimeSettings) {
      logger.warn(
        "Cannot update Google Maps validation setting: runtime settings unavailable"
      );
      return;
    }
    const availability = getGoogleMapsValidationAvailability();
    if (!availability.enabled) {
      logger.info(
        "Ignoring Google Maps validation toggle because runtime config disables it"
      );
      return;
    }
    runtimeSettings = {
      ...runtimeSettings,
      googleMapsValidation: {
        ...runtimeSettings.googleMapsValidation,
        enabled
      }
    };
    settingsManager.save(runtimeSettings);
    const sidebarState = getSidebarDebugState();
    if (sidebarState) {
      setSidebarDebugState({
        ...sidebarState,
        ...buildGoogleMapsValidationSidebarState(),
        lastStatus: enabled ? t("status.googleMapsValidation.enabled") : t("status.googleMapsValidation.disabled")
      });
      await rerenderSidebar();
    }
    await reanalyzeCurrentVenueSelection();
  }
  async function setGoogleMapsValidationCheck(checkKey, enabled) {
    if (!runtimeSettings) {
      logger.warn(
        "Cannot update Google Maps validation checks: runtime settings unavailable"
      );
      return;
    }
    const availability = getGoogleMapsValidationAvailability();
    if (!availability.enabled || !availability.checks[checkKey]) {
      logger.info(
        `Ignoring Google Maps validation check toggle because runtime config disables ${checkKey}`
      );
      return;
    }
    runtimeSettings = {
      ...runtimeSettings,
      googleMapsValidation: {
        ...runtimeSettings.googleMapsValidation,
        checks: {
          ...runtimeSettings.googleMapsValidation.checks,
          [checkKey]: enabled
        }
      }
    };
    settingsManager.save(runtimeSettings);
    const sidebarState = getSidebarDebugState();
    if (sidebarState) {
      setSidebarDebugState({
        ...sidebarState,
        ...buildGoogleMapsValidationSidebarState(),
        lastStatus: t("status.googleMapsValidation.checkUpdated", {
          checkName: t(`sidebar.googleMapsValidation.${checkKey}`),
          state: enabled ? t("common.enabled") : t("common.disabled")
        })
      });
      await rerenderSidebar();
    }
    await reanalyzeCurrentVenueSelection();
  }
  async function rerenderSidebar() {
    const state = getSidebarDebugState();
    if (!state) {
      return;
    }
    await renderSidebarDebugPanel(state);
    wireSidebarPanelActions();
    wireSidebarReloadButton(reloadData);
    wireSidebarScanButton(() => scanVisibleVenuesFromMap("manual"));
    wireSidebarAutoScanToggle(
      !!state.autoScanVisibleVenues,
      setAutoScanVisibleVenues
    );
    wireSidebarGoogleMapsValidationToggle(
      state.googleMapsValidation?.enabled ?? true,
      setGoogleMapsValidationEnabled
    );
    wireSidebarGoogleMapsValidationChecks(
      state.googleMapsValidation?.checks ?? getEffectiveRuntimeGoogleMapsValidationSettings()?.checks ?? settingsManager.load().googleMapsValidation.checks,
      setGoogleMapsValidationCheck
    );
  }
  async function scanVisibleVenuesFromMap(trigger = "manual") {
    if (!runtimeConfig || !runtimeChains) {
      logger.warn("Cannot scan visible venues: runtime not initialized");
      return;
    }
    const venues = getVisibleVenues();
    let detectedCountry;
    for (const venue of venues) {
      const resolved = resolveVenueCountryCode(venue);
      if (resolved) {
        detectedCountry = resolved;
        break;
      }
    }
    const mapContextCountry = getCountryFromVisibleMapContext();
    const targetCountry = resolvePreferredCountry({
      primaryCountry: detectedCountry,
      mapContextCountry,
      runtimeCountry,
      fallbackCountry: runtimeSettings?.fallbackCountry
    });
    logger.info(
      `Scan country resolved: detected=${detectedCountry ?? "none"}, map=${mapContextCountry ?? "none"}, runtime=${runtimeCountry ?? "none"}, fallback=${normalizeCountryCode(runtimeSettings?.fallbackCountry) ?? "none"}, active=${targetCountry ?? "global"}`
    );
    if (runtimeCountry !== targetCountry) {
      await loadRuntimeDataForCountry(targetCountry);
    }
    if (!runtimeConfig || !runtimeChains) {
      logger.warn("Cannot scan visible venues: runtime not initialized");
      return;
    }
    logger.info(`Scanning ${venues.length} visible venue(s)`);
    const summary = await scanVisibleVenues({
      venues,
      runtimeConfig,
      runtimeChains,
      googleMapsValidationSettings: getEffectiveRuntimeGoogleMapsValidationSettings(),
      whitelistRuntime: getCurrentWhitelistRuntimeSnapshot() ?? void 0
    });
    const highlightRenderResult = renderHighlights(summary, venues, {
      keepExistingOnEmpty: trigger === "auto"
    });
    let statusText = t("status.scannedVisibleVenues", {
      count: summary.total
    });
    if (highlightRenderResult.keptExisting) {
      statusText = t("status.autoScanKeptHighlights");
    }
    const sidebarState = getSidebarDebugState();
    if (sidebarState) {
      setSidebarDebugState({
        ...sidebarState,
        ...buildGoogleMapsValidationSidebarState(),
        runtimeConfigId: runtimeConfig.id,
        runtimeConfigVersion: runtimeConfig.version,
        runtimeChainsId: runtimeChains.id,
        runtimeChainsCount: runtimeChains.items.length,
        lastStatus: statusText,
        lastScanSummary: {
          total: summary.total,
          ok: summary.ok,
          warning: summary.warning,
          error: summary.error
        }
      });
      await rerenderSidebar();
    }
  }
  async function reloadData() {
    if (!runtimeSettings) {
      logger.warn("Reload requested but settings not initialized");
      return;
    }
    logger.info("Reloading runtime data");
    const selectionCountry = getCountryFromCurrentSelection();
    const mapContextCountry = getCountryFromVisibleMapContext();
    const preferredCountry = mapContextCountry ?? selectionCountry ?? runtimeCountry ?? runtimeSettings.fallbackCountry;
    logger.info(
      `Reload country context: selection=${selectionCountry ?? "none"}, map=${mapContextCountry ?? "none"}, runtime=${runtimeCountry ?? "none"}, fallback=${normalizeCountryCode(runtimeSettings.fallbackCountry) ?? "none"}, chosen=${normalizeCountryCode(preferredCountry) ?? "global"}`
    );
    runtimeManifest = await loadManifest(runtimeSettings.dataChannel);
    await loadRuntimeDataForCountry(preferredCountry);
    logger.info("Runtime data reloaded");
    const sidebarState = getSidebarDebugState();
    if (sidebarState && runtimeManifest && runtimeConfig && runtimeChains) {
      setSidebarDebugState({
        ...sidebarState,
        ...buildGoogleMapsValidationSidebarState(),
        manifestVersion: runtimeManifest.version,
        manifestRevision: runtimeManifest.dataRevision,
        runtimeConfigId: runtimeConfig.id,
        runtimeConfigVersion: runtimeConfig.version,
        runtimeChainsId: runtimeChains.id,
        runtimeChainsCount: runtimeChains.items.length,
        lastStatus: t("status.runtimeDataReloaded")
      });
      const updated = getSidebarDebugState();
      if (updated) {
        await rerenderSidebar();
      }
    }
    const latest = getLatestAnalysisState();
    if (latest?.isVenueSelection) {
      const sdk = getWmeSdk();
      if (!sdk) {
        logger.warn("Cannot re-analyze after reload: SDK unavailable");
        return;
      }
      const venue = sdk.DataModel.Venues.getById({
        venueId: latest.venueId
      });
      if (!venue) {
        logger.warn(`Cannot re-analyze venue ${latest.venueId} after reload`);
        return;
      }
      logger.info("Re-analyzing venue after runtime reload");
      await analyzeVenue({
        venue
      });
    }
  }
  function wireApplyButton() {
    const button = document.getElementById("wmeph-row-apply-selected");
    if (!button) {
      return;
    }
    button.onclick = async () => {
      const latest = getLatestAnalysisState();
      if (!latest?.isVenueSelection) {
        logger.warn("Apply clicked, but no venue analysis state is available");
        return;
      }
      const selected = getSelectedProposals(latest.proposals);
      const includesExternalProviderProposal = selected.some(
        (proposal) => proposal.field === "externalProviderIds"
      );
      const result = await applyVenueProposals(
        latest.venueId,
        latest.currentServices,
        latest.currentAliases,
        selected
      );
      logger.info(
        `Apply result: applied=${result.applied}, skipped=${result.skipped}, errors=${result.errors.length}`
      );
      for (const error of result.errors) {
        logger.error(`Apply error: ${error}`);
      }
      const currentState = getLatestAnalysisState();
      if (currentState) {
        let statusMessage;
        if (result.errors.length > 0) {
          statusMessage = {
            kind: "error",
            text: t("status.apply.failedSomeFixes", {
              errorCount: result.errors.length
            })
          };
        } else if (result.applied > 0) {
          statusMessage = {
            kind: "success",
            text: includesExternalProviderProposal ? t("status.apply.appliedWithExternalProvider", {
              appliedCount: result.applied,
              skippedCount: result.skipped
            }) : t("status.apply.applied", {
              appliedCount: result.applied,
              skippedCount: result.skipped
            })
          };
        } else {
          statusMessage = {
            kind: "warning",
            text: t("status.apply.noneSelected")
          };
        }
        setLatestAnalysisState({
          ...currentState,
          statusMessage
        });
      }
      const sdk = getWmeSdk();
      if (!sdk) {
        logger.warn("Cannot re-analyze after apply: SDK unavailable");
        return;
      }
      if (includesExternalProviderProposal) {
        await wait(500);
      }
      const refreshedVenue = sdk.DataModel.Venues.getById({ venueId: latest.venueId });
      if (!refreshedVenue) {
        logger.warn(`Cannot re-analyze after apply: venue ${latest.venueId} not found`);
        return;
      }
      await analyzeVenue({
        venue: refreshedVenue
      });
    };
  }
  function buildWhitelistEntriesForGroup(params) {
    const whitelistRuntime = getCurrentWhitelistRuntimeSnapshot();
    if (!whitelistRuntime) {
      return [];
    }
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const entries = /* @__PURE__ */ new Map();
    for (const issue of params.issues) {
      if (!issue.ruleId) {
        continue;
      }
      const entry = {
        placeId: params.venueId,
        ruleId: issue.ruleId,
        field: issue.field,
        scope: "place",
        createdAt: now,
        reason: "Locally ignored from the feature editor",
        chainId: params.chainId ?? void 0,
        country: runtimeCountry,
        configId: whitelistRuntime.configId,
        configVersion: whitelistRuntime.configVersion,
        chainsId: whitelistRuntime.chainsId,
        chainsVersion: whitelistRuntime.chainsVersion
      };
      entries.set(`${entry.placeId}::${entry.ruleId}::${entry.field}`, entry);
    }
    return Array.from(entries.values());
  }
  function wireWhitelistButtons() {
    const buttons = Array.from(
      document.querySelectorAll(".wmeph-row-whitelist-issue")
    );
    if (buttons.length === 0) {
      return;
    }
    for (const button of buttons) {
      button.onclick = async () => {
        button.setAttribute("disabled", "true");
        try {
          const latest = getLatestAnalysisState();
          if (!latest?.isVenueSelection) {
            logger.warn("Whitelist clicked, but no venue analysis state is available");
            return;
          }
          const groupKey = button.dataset.groupKey;
          if (!groupKey) {
            logger.warn("Whitelist clicked without an issue-group key");
            return;
          }
          const group = groupIssuesForFeatureEditor(
            latest.issues,
            latest.proposals
          ).find((candidate) => candidate.key === groupKey);
          if (!group) {
            logger.warn(`Whitelist group not found: ${groupKey}`);
            return;
          }
          const entries = buildWhitelistEntriesForGroup({
            venueId: latest.venueId,
            chainId: latest.chainId,
            issues: group.issues
          });
          if (entries.length === 0) {
            logger.warn(`Whitelist group ${groupKey} has no rule-bound issues`);
            return;
          }
          const changedCount = upsertWhitelistEntries(entries);
          const filteredAnalysis = applyWhitelistToAnalysis({
            venueId: latest.venueId,
            issues: latest.issues,
            proposals: latest.proposals
          });
          setLatestAnalysisState({
            ...latest,
            issues: filteredAnalysis.issues,
            proposals: filteredAnalysis.proposals,
            statusMessage: {
              kind: "success",
              text: changedCount > 0 ? t("status.whitelist.ignored", {
                count: entries.length
              }) : t("status.whitelist.alreadyIgnored")
            }
          });
          renderLatestVenueAnalysis();
          await scanVisibleVenuesFromMap("manual");
        } finally {
          button.removeAttribute("disabled");
        }
      };
    }
  }
  async function analyzeVenue(params) {
    const { venue } = params;
    logger.info(`Selected venue: ${venue.name}`);
    const place = mapVenueToPlaceLike(venue);
    const venueCountry = resolveVenueCountryCode(venue);
    const mapContextCountry = getCountryFromVisibleMapContext();
    const targetCountry = resolvePreferredCountry({
      primaryCountry: venueCountry ?? place.country,
      mapContextCountry,
      runtimeCountry,
      fallbackCountry: runtimeSettings?.fallbackCountry
    });
    place.country = targetCountry;
    logger.info(
      `Country resolved: venue=${venueCountry ?? "none"}, map=${mapContextCountry ?? "none"}, runtime=${runtimeCountry ?? "none"}, fallback=${normalizeCountryCode(runtimeSettings?.fallbackCountry) ?? "none"}, active=${targetCountry ?? "global"}`
    );
    logger.info(
      `Venue contact fields: rawPhone=${venue.phone ?? "none"}, rawUrl=${venue.url ?? "none"}, mappedPhone=${place.phone ?? "none"}, mappedUrl=${place.url ?? "none"}`
    );
    if (runtimeCountry !== targetCountry || !runtimeConfig || !runtimeChains) {
      await loadRuntimeDataForCountry(targetCountry);
    }
    if (!runtimeConfig || !runtimeChains) {
      logger.warn("Cannot analyze venue: runtime not initialized");
      return;
    }
    const matchResult = matchPlaceToChain(place, runtimeChains);
    if (matchResult.matched && matchResult.chain) {
      logger.info(
        `Chain match found: ${matchResult.chain.id} via ${matchResult.method}`
      );
    }
    const categoryStandards = resolveCategoryStandards(
      runtimeConfig,
      place.categories ?? []
    );
    const effectivePolicy = resolveEffectivePolicy({
      categoryStandards,
      chainPolicy: matchResult.chain?.policy
    });
    logger.info(
      `Effective policy resolved: ${JSON.stringify(effectivePolicy)}`
    );
    logger.info(
      `Formatting config loaded: phone=${runtimeConfig.formatting?.phone ? "yes" : "no"}, url=${runtimeConfig.formatting?.url ? "yes" : "no"}`
    );
    const issues = evaluatePlace(place, effectivePolicy, matchResult.chain, {
      cityInVenueNameRule: runtimeConfig.rules?.cityInVenueName,
      phoneFormatting: runtimeConfig.formatting?.phone,
      urlFormatting: runtimeConfig.formatting?.url
    });
    const editorLockLevel = getCurrentEditorLockLevel();
    const proposals = generateProposals(issues, { editorLockLevel });
    const filteredAnalysis = applyWhitelistToAnalysis({
      venueId: String(venue.id),
      issues,
      proposals
    });
    for (const issue of issues) {
      logger.info(
        `[ISSUE] ${issue.severity.toUpperCase()} ${issue.field}: ${issue.message}`
      );
    }
    if (editorLockLevel !== void 0) {
      logger.info(`Editor lock level resolved: ${editorLockLevel}`);
    }
    const sidebarState = getSidebarDebugState();
    if (sidebarState) {
      setSidebarDebugState({
        ...sidebarState,
        ...buildGoogleMapsValidationSidebarState(),
        runtimeConfigId: runtimeConfig.id,
        runtimeConfigVersion: runtimeConfig.version,
        runtimeChainsId: runtimeChains.id,
        runtimeChainsCount: runtimeChains.items.length,
        lastStatus: t("status.analyzedVenue", {
          placeName: place.name,
          findings: formatAnalysisCountLabel(filteredAnalysis.issues)
        })
      });
      const updatedSidebarState = getSidebarDebugState();
      if (updatedSidebarState) {
        await rerenderSidebar();
      }
    }
    const previous = getLatestAnalysisState();
    setLatestAnalysisState({
      venueId: String(venue.id),
      placeName: place.name,
      chainId: matchResult.chain?.id ?? null,
      issues: filteredAnalysis.issues,
      proposals: filteredAnalysis.proposals,
      currentServices: place.services ?? [],
      currentAliases: place.aliases ?? [],
      currentExternalProviderIds: place.externalProviderIds ?? [],
      isVenueSelection: true,
      statusMessage: previous?.statusMessage
    });
    retryEnsureFeatureEditorContainer(() => {
      const latest = getLatestAnalysisState();
      return !!latest?.isVenueSelection;
    });
    renderLatestVenueAnalysis();
    externalProviderSuggestionRequestId += 1;
    const suggestionIssue = findMissingExternalProviderIssue(issues);
    if (suggestionIssue) {
      void refreshExternalProviderSuggestions({
        requestId: externalProviderSuggestionRequestId,
        venue,
        issue: suggestionIssue,
        query: place.name
      });
    }
    externalProviderValidationRequestId += 1;
    const effectiveGoogleMapsValidation = getEffectiveRuntimeGoogleMapsValidationSettings();
    if (effectiveGoogleMapsValidation?.enabled && hasEnabledGoogleMapsValidationChecks() && (place.externalProviderIds ?? []).length > 0) {
      void refreshExternalProviderValidation({
        requestId: externalProviderValidationRequestId,
        venueId: String(venue.id),
        venueName: place.name,
        externalProviderIds: place.externalProviderIds ?? [],
        venue,
        currentCategories: place.categories ?? [],
        currentOpeningHours: place.openingHours ?? []
      });
    }
  }
  async function startApplication() {
    logger.info(`Starting ${APP_NAME}`);
    const settings = settingsManager.load();
    runtimeSettings = settings;
    logger.info(`Loaded settings for channel: ${settings.dataChannel}`);
    logger.info(
      `Runtime source: scriptBuild=${SCRIPT_BUILD_CHANNEL}, dataBranch=${DATA_REPOSITORY_BRANCH}, dataChannel=${settings.dataChannel}`
    );
    try {
      await waitForWmeSdkReady();
      logger.info("WME context is ready");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown WME SDK readiness error";
      logger.warn(`WME context is not ready: ${message}`);
      return;
    }
    try {
      await waitForInitialMapDataLoaded();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown initial map data readiness error";
      logger.warn(`Initial map data not ready yet: ${message}`);
    }
    mountSidebarPlaceholder();
    const manifest = await loadManifest(settings.dataChannel);
    runtimeManifest = manifest;
    logger.info(
      `Active manifest loaded: ${manifest.channel} / ${manifest.version} / ${manifest.dataRevision}`
    );
    const selectionCountry = getCountryFromCurrentSelection();
    const mapContextCountry = getCountryFromVisibleMapContext();
    const initialCountry = await resolveStartupCountry(settings.fallbackCountry);
    logger.info(
      `Startup country context: selection=${selectionCountry ?? "none"}, map=${mapContextCountry ?? "none"}, fallback=${normalizeCountryCode(settings.fallbackCountry) ?? "none"}, chosen=${normalizeCountryCode(initialCountry) ?? "global"}`
    );
    await loadRuntimeDataForCountry(initialCountry);
    if (!runtimeConfig || !runtimeChains) {
      logger.warn("Runtime data failed to initialize");
      return;
    }
    logger.info(
      `Runtime config loaded: ${runtimeConfig.id} v${runtimeConfig.version}`
    );
    logger.info(
      `Runtime chains loaded: ${runtimeChains.id} with ${runtimeChains.items.length} items`
    );
    setSidebarDebugState({
      scriptName: t("app.name"),
      dataChannel: settings.dataChannel,
      manifestVersion: manifest.version,
      manifestRevision: manifest.dataRevision,
      runtimeConfigId: runtimeConfig.id,
      runtimeConfigVersion: runtimeConfig.version,
      runtimeChainsId: runtimeChains.id,
      runtimeChainsCount: runtimeChains.items.length,
      lastStatus: t("status.ready"),
      highlightsEnabled: true,
      autoScanVisibleVenues: runtimeSettings?.autoScanVisibleVenues ?? true,
      ...buildGoogleMapsValidationSidebarState()
    });
    const sidebarState = getSidebarDebugState();
    if (sidebarState) {
      await rerenderSidebar();
    }
    wireSidebarReloadButton(reloadData);
    ensureHighlightLayer();
    registerAutoScanListeners(
      () => !!runtimeSettings?.autoScanVisibleVenues,
      () => scanVisibleVenuesFromMap("auto")
    );
    registerVenueSaveScanListener(() => scanVisibleVenuesFromMap("manual"));
    logger.info("Registering selected venue analysis flow");
    onFeatureEditorOpened(() => {
      const latest = getLatestAnalysisState();
      if (!latest?.isVenueSelection) {
        logger.info("Feature editor opened, but current analysis state is not a venue");
        removeFeatureEditorContainer();
        return;
      }
      retryEnsureFeatureEditorContainer(() => {
        const current = getLatestAnalysisState();
        return !!current?.isVenueSelection;
      });
      renderLatestVenueAnalysis();
    });
    onVenueSelected(
      async (venue) => {
        await analyzeVenue({
          venue
        });
      },
      async () => {
        logger.info("Selection is not a venue, hiding Place Harmonizer block");
        externalProviderSuggestionRequestId += 1;
        clearLatestAnalysisState();
        const sidebarState2 = getSidebarDebugState();
        if (sidebarState2) {
          setSidebarDebugState({
            ...sidebarState2,
            ...buildGoogleMapsValidationSidebarState(),
            lastStatus: t("status.selectionNotVenue")
          });
          const updatedSidebarState = getSidebarDebugState();
          if (updatedSidebarState) {
            await rerenderSidebar();
          }
        }
        removeFeatureEditorContainer();
      }
    );
  }
  function bootstrap() {
    logger.info("Bootstrapping WME Place Harmonizer ROW Edition");
    if (!isSupportedEnvironment()) {
      logger.warn("Unsupported environment detected. Script will not continue.");
      return;
    }
    void startApplication();
  }
  bootstrap();
})();
//# sourceMappingURL=wme-place-harmonizer-row-edition.dev.user.js.map
