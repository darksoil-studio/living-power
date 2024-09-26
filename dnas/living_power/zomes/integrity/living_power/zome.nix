{ inputs, ... }:

{
  perSystem = { inputs', system, ... }: {
    packages.living_power_integrity =
      inputs.hc-infra.outputs.builders.${system}.rustZome {
        workspacePath = inputs.self.outPath;
        crateCargoToml = ./Cargo.toml;
        cargoArtifacts = inputs'.hc-infra.packages.zomeCargoArtifacts;
      };
  };
}

