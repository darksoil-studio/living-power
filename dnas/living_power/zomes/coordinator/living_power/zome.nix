{ inputs, ... }:

{
  perSystem = { inputs', self', system, pkgs, lib, ... }: rec {
    packages.living_power_coordinator = inputs.hc-infra.outputs.lib.rustZome {
      workspacePath = inputs.self.outPath;
      holochain = inputs'.holochain;
      crateCargoToml = ./Cargo.toml;
      cargoArtifacts =
        inputs.hc-infra.outputs.lib.zomeCargoArtifacts { inherit system; };
    };

    # Test only this zome and its integrity in isolation
    checks.living_power_coordinator = inputs.hc-infra.outputs.lib.sweettest {
      workspacePath = inputs.self.outPath;
      holochain = inputs'.holochain;
      dna = (inputs.hc-infra.outputs.lib.dna {
        dnaManifest = builtins.toFile "dna.yaml" ''
          ---
          manifest_version: "1"
          name: test_dna
          integrity:
            network_seed: ~
            properties: ~
            origin_time: 1709638576394039
            zomes: 
              - name: living_power_integrity
          coordinator:
            zomes:
              - name: living_power
                hash: ~
                dependencies: 
                  - name: living_power_integrity
                dylib: ~
        '';
        zomes = {
          living_power = packages.living_power_coordinator;
          living_power_integrity = self'.packages.living_power_integrity;
        };
        holochain = inputs'.holochain;
      });
      crateCargoToml = ./Cargo.toml;
      buildInputs = [ pkgs.udev ]
        ++ inputs.p2p-shipyard.outputs.lib.tauriHappDeps.buildInputs {
          inherit pkgs lib;
        };
      nativeBuildInputs =
        inputs.p2p-shipyard.outputs.lib.tauriHappDeps.nativeBuildInputs {
          inherit pkgs lib;
        };
      cargoArtifacts = inputs.p2p-shipyard.outputs.lib.tauriHappCargoArtifacts {
        inherit pkgs lib;
      };
    };
  };
}

