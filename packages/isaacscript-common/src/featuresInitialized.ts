let featuresInitialized = false;

/** @internal */
export function areFeaturesInitialized(): boolean {
  return featuresInitialized;
}

/** @internal */
export function errorIfFeaturesNotInitialized(featureName: string): void {
  if (!areFeaturesInitialized()) {
    error(
      `The "${featureName}" feature is not initialized. You must first upgrade your mod object by calling the "upgradeMod" function.`,
    );
  }
}

/** @internal */
export function setFeaturesInitialized(): void {
  featuresInitialized = true;
}
