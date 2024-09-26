{ inputs, ... }:

{
  perSystem = { inputs', self', system, pkgs, lib, ... }: {
    packages.living_power_coordinator =
      inputs.hc-infra.outputs.builders.${system}.rustZome {
        workspacePath = inputs.self.outPath;
        crateCargoToml = ./Cargo.toml;
        cargoArtifacts = inputs'.hc-infra.packages.zomeCargoArtifacts;
      };
  };
}

