{ inputs, ... }:

{
  # Import all ./zomes/coordinator/*/zome.nix and ./zomes/integrity/*/zome.nix  
  imports = (map (m: "${./.}/zomes/coordinator/${m}/zome.nix")
    (builtins.attrNames (builtins.readDir ./zomes/coordinator)))
    ++ (map (m: "${./.}/zomes/integrity/${m}/zome.nix")
      (builtins.attrNames (builtins.readDir ./zomes/integrity)));

  perSystem = { inputs', self', lib, system, ... }: {
    packages.living_power_dna = inputs.hc-infra.outputs.builders.${system}.dna {
      dnaManifest = ./workdir/dna.yaml;
      zomes = {
        # profiles_integrity = inputs'.profiles.packages.profiles_integrity;
        # profiles = inputs'.profiles.packages.profiles;
        # Include here the zome packages for this DNA, e.g.:
        # profiles_integrity = inputs'.profiles.packages.profiles_integrity;
        # This overrides all the "bundled" properties for the DNA manifest
        living_power_integrity = self'.packages.living_power_integrity;
        living_power = self'.packages.living_power_coordinator;
      };
    };
  };
}
