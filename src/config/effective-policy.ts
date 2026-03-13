import type { ChainPolicyDefinition, GeometryPolicy, ServicePolicy } from "../types/chains";
import type { AddressPolicy } from "../types/address";
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

function mergeCategoryStandardIntoPolicy(
  current: EffectivePlacePolicy,
  standard: CategoryStandard
): EffectivePlacePolicy {
  return {
    ...current,
    geometry: mergeGeometryPolicy(current.geometry, standard.geometry),
    lockLevel: standard.lockLevel ?? current.lockLevel,
    requirePhone: standard.requirePhone ?? current.requirePhone,
    requireUrl: standard.requireUrl ?? current.requireUrl,
    requireOpeningHours:
      standard.requireOpeningHours ?? current.requireOpeningHours,
    requireExternalProvider:
      standard.requireExternalProvider ?? current.requireExternalProvider,
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
    requirePhone: chainPolicy.requirePhone ?? current.requirePhone,
    requireUrl: chainPolicy.requireUrl ?? current.requireUrl,
    requireOpeningHours:
      chainPolicy.requireOpeningHours ?? current.requireOpeningHours,
    requireExternalProvider:
      chainPolicy.requireExternalProvider ?? current.requireExternalProvider,
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
