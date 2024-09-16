{
  description = "Template for Holochain app development";

  inputs = {
    holonix.url = "github:holochain/holonix/main-0.3";

    profiles.url = "github:holochain-open-dev/profiles/nixify";
    p2p-shipyard.url = "github:darksoil-studio/p2p-shipyard/develop";

    nixpkgs.follows = "hc-infra/nixpkgs";
    flake-parts.follows = "holonix/flake-parts";

    hc-infra.url = "github:holochain-open-dev/infrastructure";
    scaffolding.url = "github:holochain-open-dev/templates";
  };

  outputs = inputs:
    inputs.flake-parts.lib.mkFlake { inherit inputs; } {
      imports = [ ./happ.nix ];

      systems = builtins.attrNames inputs.holonix.devShells;
      perSystem = { inputs', config, lib, pkgs, system, ... }: {
        devShells.default = pkgs.mkShell {
          inputsFrom = [
            inputs'.p2p-shipyard.devShells.holochainTauriDev
            inputs'.hc-infra.devShells.synchronized-pnpm
            inputs'.holonix.devShells.default
          ];
          packages = [ inputs'.scaffolding.packages.hc-scaffold-app-template ]
            ++ (lib.optionals pkgs.stdenv.isLinux [
              pkgs.arduino-ide
              pkgs.udev
            ]);
        };
        devShells.androidDev = pkgs.mkShell {
          inputsFrom = [
            inputs'.p2p-shipyard.devShells.holochainTauriAndroidDev
            inputs'.hc-infra.devShells.synchronized-pnpm
            inputs'.holonix.devShells.default
          ];
          packages =
            [ inputs'.scaffolding.packages.hc-scaffold-app-template pkgs.udev ];
        };
      };
    };
}
