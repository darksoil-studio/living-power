{ inputs, ... }:

{
  perSystem = { inputs', system, ... }: {
    packages.living_power_integrity = inputs.hc-infra.outputs.lib.rustZome {
      inherit system;
      workspacePath = inputs.self.outPath;
      crateCargoToml = ./Cargo.toml;
      cargoArtifacts =
        inputs.hc-infra.outputs.lib.zomeCargoArtifacts { inherit system; };
    };
  };
}
