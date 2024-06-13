{ inputs, ... }:

{
  perSystem =
    { inputs'
    , self'
    , system
    , ...
    }: {
      packages.living_power = inputs.hc-infra.outputs.lib.rustZome {
        workspacePath = inputs.self.outPath;
        holochain = inputs'.holochain;
        crateCargoToml = ./Cargo.toml;
        cargoArtifacts =
          inputs.hc-infra.outputs.lib.zomeCargoArtifacts { inherit system; };
      };

      # Test only this zome and its integrity in isolation
      checks.living_power= inputs.hc-infra.outputs.lib.sweettest {
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
          zomes = inputs.hc-infra.outputs.lib.filterZomes self'.packages;
          holochain = inputs'.holochain;
        });
        crateCargoToml = ./Cargo.toml;
        cargoArtifacts = inputs.hc-infra.outputs.lib.holochainCargoArtifacts {
          inherit system;
        };
      };

    };
}

