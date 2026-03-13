import type { ChainPolicyDefinition, GeometryPolicy, ServicePolicy } from "../types/chains";
import type { AddressPolicy, PresenceRequirement } from "../types/address";
import type { CategoryStandard } from "../types/config";
import type { EffectivePlacePolicy } from "../types/policy";

function mergeGeometryPolicy(
  base?: GeometryPolicy,
  override?: GeometryPolicy
): GeometryPolicy | undefined {
  if (!base && !override) {
    return undefined;
  }

  return {
    ...base,
    ...override,
    allowed: override?.allowed ?? base?.allowed
  };
}

function mergeServicePolicy(
  base?: ServicePolicy,
  override?: ServicePolicy
): ServicePolicy | undefined {
  if (!base && !override) {
    return undefined;
  }

  return {
    required: override?.required ?? base?.required,
    recommended: override?.recommended ?? base?.recommended,
    discouraged: override?.discouraged ?? base?.discouraged,
    forbidden: override?.forbidden ?? base?.forbidden
  };
}

function mergeAddressPolicy(
  base?: AddressPolicy,
  override?: AddressPolicy
): AddressPolicy | undefined {
  if (!base && !override) {
    return undefined;
  }

  return {
    ...base,
    ...override
  };
}

function mergePresenceRequirement(
  current: PresenceRequirement | undefined,
  override?: PresenceRequirement,
  legacyOverride?: PresenceRequirement
): PresenceRequirement | undefined {
  if (override !== undefined) {
    return override;
  }

  if (legacyOverride !== undefined) {
    return legacyOverride;
  }

  return current;
}

function readLegacyBooleanFlag(
  source: unknown,
  key:
    | "requirePhone"
    | "requireUrl"
    | "requireOpeningHours"
    | "requireExternalProvider"
): boolean | undefined {
  if (!source || typeof source !== "object") {
    return undefined;
  }

  const value = (source as Record<string, unknown>)[key];
  return typeof value === "boolean" ? value : undefined;
}

function readLegacyPresenceRequirement(params: {
  source: unknown;
  key:
    | "requirePhone"
    | "requireUrl"
    | "requireOpeningHours"
    | "requireExternalProvider";
  trueValue?: PresenceRequirement;
  falseValue?: PresenceRequirement;
}): PresenceRequirement | undefined {
  const legacyValue = readLegacyBooleanFlag(params.source, params.key);

  if (legacyValue === true) {
    return params.trueValue;
  }

  if (legacyValue === false) {
    return params.falseValue;
  }

  return undefined;
}

function mergeCategoryStandardIntoPolicy(
  current: EffectivePlacePolicy,
  standard: CategoryStandard
): EffectivePlacePolicy {
  return {
    ...current,
    geometry: mergeGeometryPolicy(current.geometry, standard.geometry),
    lockLevel: standard.lockLevel ?? current.lockLevel,
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
    address: mergeAddressPolicy(current.address, standard.address)
  };
}

function mergeChainPolicyIntoPolicy(
  current: EffectivePlacePolicy,
  chainPolicy?: ChainPolicyDefinition
): EffectivePlacePolicy {
  if (!chainPolicy) {
    return current;
  }

  return {
    ...current,
    geometry: mergeGeometryPolicy(current.geometry, chainPolicy.geometry),
    lockLevel: chainPolicy.lockLevel ?? current.lockLevel,
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

export function resolveEffectivePolicy(params: {
  categoryStandards: CategoryStandard[];
  chainPolicy?: ChainPolicyDefinition;
}): EffectivePlacePolicy {
  let effective: EffectivePlacePolicy = {};

  for (const standard of params.categoryStandards) {
    effective = mergeCategoryStandardIntoPolicy(effective, standard);
  }

  effective = mergeChainPolicyIntoPolicy(effective, params.chainPolicy);

  return effective;
}
